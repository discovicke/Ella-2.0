using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;
using Microsoft.Extensions.Configuration;
using Microsoft.IdentityModel.Tokens;

namespace Backend.app.Infrastructure.Auth;

/// <summary>
/// Service för att hantera JWT-tokens (JSON Web Tokens).
/// Hanterar generering, validering och refresh av access tokens.
/// </summary>
public class TokenService
{
    private readonly IConfiguration _configuration;
    private readonly ILogger<TokenService> _logger;
    
    // JWT-inställningar från appsettings.json
    private readonly string _secretKey;
    private readonly string _issuer;
    private readonly string _audience;
    private readonly int _accessTokenExpirationMinutes;
    
    public TokenService(IConfiguration configuration, ILogger<TokenService> logger)
    {
        _configuration = configuration;
        _logger = logger;
        
        // Läs in JWT-inställningar från konfiguration
        _secretKey = _configuration["JwtSettings:SecretKey"] 
            ?? throw new InvalidOperationException("JWT SecretKey saknas i konfiguration");
        _issuer = _configuration["JwtSettings:Issuer"] ?? "EllaBookingAPI";
        _audience = _configuration["JwtSettings:Audience"] ?? "EllaBookingClient";
        _accessTokenExpirationMinutes = int.Parse(_configuration["JwtSettings:AccessTokenExpirationMinutes"] ?? "60");
        
        // Validera att secret key är tillräckligt lång (minst 256 bitar för HS256)
        if (_secretKey.Length < 32)
        {
            _logger.LogWarning("JWT SecretKey is too short! Use at least 32 characters for secure HS256 signing.");
        }
    }
    
    /// <summary>
    /// Genererar en JWT access token för en användare.
    /// 
    /// Token innehåller:
    /// - sub (subject): User ID
    /// - email: Användarens email
    /// - iat (issued at): När token skapades (UNIX timestamp)
    /// - exp (expiration): När token går ut
    /// - iss (issuer): Vem som utfärdade token
    /// - aud (audience): Vem token är avsedd för
    /// 
    /// Denna timestamp (iat) kan jämföras med user.token_valid_after i databasen
    /// för att invalidera alla tokens vid behov (t.ex. efter lösenordsbyte).
    /// </summary>
    public string GenerateAccessToken(long userId, string email)
    {
        // Steg 1: Skapa claims (påståenden om användaren)
        var claims = new List<Claim>
        {
            new Claim(JwtRegisteredClaimNames.Sub, userId.ToString()),  // Subject: User ID
            new Claim(JwtRegisteredClaimNames.Email, email),            // Email
            new Claim(JwtRegisteredClaimNames.Jti, Guid.NewGuid().ToString()), // Unique token ID
            new Claim(JwtRegisteredClaimNames.Iat, DateTimeOffset.UtcNow.ToUnixTimeSeconds().ToString(), ClaimValueTypes.Integer64) // Issued at
        };
        
        // Steg 2: Skapa signeringsnyckel från secret
        var key = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(_secretKey));
        var credentials = new SigningCredentials(key, SecurityAlgorithms.HmacSha256);
        
        // Steg 3: Skapa JWT-token med alla parametrar
        var token = new JwtSecurityToken(
            issuer: _issuer,
            audience: _audience,
            claims: claims,
            notBefore: DateTime.UtcNow,                                    // Token giltig från nu
            expires: DateTime.UtcNow.AddMinutes(_accessTokenExpirationMinutes), // Token går ut efter X minuter
            signingCredentials: credentials
        );
        
        // Steg 4: Serialisera token till en sträng
        var tokenString = new JwtSecurityTokenHandler().WriteToken(token);
        
        _logger.LogInformation("Generated JWT for {UserId}, expires in {Minutes} minutes", userId, _accessTokenExpirationMinutes);
        
        return tokenString;
    }
    
    /// <summary>
    /// Validerar en JWT-token och returnerar claims om token är giltig.
    /// 
    /// Kontrollerar:
    /// - Signatur (att token inte är manipulerad)
    /// - Expiration (att token inte har gått ut)
    /// - Issuer och Audience (att token kommer från rätt källa)
    /// 
    /// OBS: Denna metod kollar INTE token_valid_after från databasen.
    /// Det måste göras separat i AuthService efter denna validering.
    /// </summary>
    public ClaimsPrincipal? ValidateToken(string token)
    {
        try
        {
            var tokenHandler = new JwtSecurityTokenHandler();
            var key = Encoding.UTF8.GetBytes(_secretKey);
            
            // Konfigurera valideringsparametrar
            var validationParameters = new TokenValidationParameters
            {
                ValidateIssuerSigningKey = true,
                IssuerSigningKey = new SymmetricSecurityKey(key),
                ValidateIssuer = true,
                ValidIssuer = _issuer,
                ValidateAudience = true,
                ValidAudience = _audience,
                ValidateLifetime = true,                    // Kontrollera expiration
                ClockSkew = TimeSpan.Zero                   // Ingen tolerans för klockskeskap
            };
            
            // Validera och parsa token
            var principal = tokenHandler.ValidateToken(token, validationParameters, out SecurityToken validatedToken);
            
            // Verifiera att det är en JWT med rätt algoritm (förhindra "none" algorithm attack)
            if (validatedToken is not JwtSecurityToken jwtToken ||
                !jwtToken.Header.Alg.Equals(SecurityAlgorithms.HmacSha256, StringComparison.InvariantCultureIgnoreCase))
            {
                _logger.LogWarning("Token with invalid algorithm detected");
                return null;
            }
            
            return principal;
        }
        catch (SecurityTokenExpiredException)
        {
            _logger.LogDebug("Token expired");
            return null;
        }
        catch (SecurityTokenException ex)
        {
            _logger.LogWarning(ex, "Token validation error: {Message}", ex.Message);
            return null;
        }
        catch (Exception ex)
        {
            _logger.LogError("Unexpected error while validating token: {ex}", ex);
            return null;
        }
    }
    
    /// <summary>
    /// Extraherar User ID från en validerad token.
    /// Returnerar null om user ID inte finns eller är ogiltigt.
    /// </summary>
    public int? GetUserIdFromClaims(ClaimsPrincipal principal)
    {
        var userIdClaim = principal.FindFirst(JwtRegisteredClaimNames.Sub)?.Value;
        
        if (userIdClaim != null && int.TryParse(userIdClaim, out var userId))
        {
            return userId;
        }
        
        return null;
    }
    
    /// <summary>
    /// Extraherar "issued at" timestamp från token.
    /// Denna används för att jämföra med token_valid_after i databasen.
    /// </summary>
    public DateTime? GetIssuedAtFromClaims(ClaimsPrincipal principal)
    {
        var iatClaim = principal.FindFirst(JwtRegisteredClaimNames.Iat)?.Value;
        
        if (iatClaim != null && long.TryParse(iatClaim, out var iatTimestamp))
        {
            return DateTimeOffset.FromUnixTimeSeconds(iatTimestamp).UtcDateTime;
        }
        
        return null;
    }
}
