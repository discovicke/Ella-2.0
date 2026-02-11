using Backend.app.Core.Interfaces;
using Backend.app.Core.Models.DTO;
using Backend.app.Core.Models.Entities;
using Backend.app.Core.Models.Enums;

namespace Backend.app.Core.Services;

/// <summary>
/// Handles authentication logic: login, logout, and current user retrieval.
/// All password verification and JWT generation happens here, not in endpoints.
/// </summary>
public class AuthService(
    IUserRepository userRepo,
    IPasswordHasher passwordHasher,
    ITokenProvider tokenProvider,
    ILogger<AuthService> logger
)
{
    /// <summary>
    /// Authenticates a user by email and password.
    /// Returns JWT token and user info on success.
    ///
    /// Security: Uses identical error for "user not found" and "wrong password"
    /// to prevent user enumeration attacks.
    /// </summary>
    public async Task<LoginResultDto> LoginAsync(LoginDto request)
    {
        logger.LogInformation("Login attempt for email: {Email}", request.Email);

        // Find user by email
        var user = await userRepo.GetUserByEmailAsync(request.Email);

        if (user is null)
        {
            logger.LogWarning("Login failed: user not found for email {Email}", request.Email);
            return new LoginResultDto();
        }

        // Check if user is banned
        if (user.IsBanned == BannedStatus.Banned)
        {
            logger.LogWarning("Login failed: user {UserId} is banned", user.Id);
            return new LoginResultDto { IsBanned = true, Response = new AuthResponseDto 
            { 
                Message = "Account suspended", 
                Token = "", 
                User = MapToUserDto(user) 
            }};
        }

        // Verify password using Argon2id
        var isValidPassword = passwordHasher.VerifyPassword(request.Password, user.PasswordHash);

        if (!isValidPassword)
        {
            logger.LogWarning("Login failed: invalid password for user {UserId}", user.Id);
            return new LoginResultDto();
        }

        // Generate JWT token
        var token = tokenProvider.GenerateAccessToken(user.Id, user.Email, user.Role.ToString());

        logger.LogInformation("Login successful for user {UserId} ({Email})", user.Id, user.Email);

        return new LoginResultDto 
        { 
            Response = new AuthResponseDto { Message = "Login successful", Token = token, User = MapToUserDto(user) } 
        };
    }

    /// <summary>
    /// Validates a JWT token and returns the authenticated user if valid.
    /// Also checks token_valid_after to support token invalidation.
    /// </summary>
    public async Task<TokenValidationResultDto> ValidateTokenAndGetUserAsync(string token)
    {
        // Step 1: Validate JWT signature and expiration
        var principal = tokenProvider.ValidateToken(token);
        if (principal is null)
        {
            logger.LogDebug("Token validation failed: invalid JWT");
            return new TokenValidationResultDto();
        }

        // Step 2: Extract user ID from claims
        var userId = tokenProvider.GetUserIdFromClaims(principal);
        if (userId is null)
        {
            logger.LogWarning("Token validation failed: no user ID in claims");
            return new TokenValidationResultDto();
        }

        // Step 3: Get user from database
        var user = await userRepo.GetUserByIdAsync(userId.Value);
        if (user is null)
        {
            logger.LogWarning("Token validation failed: user {UserId} not found", userId);
            return new TokenValidationResultDto();
        }

        // Step 4: Check if user is banned (Check this BEFORE token expiration logic)
        if (user.IsBanned == BannedStatus.Banned)
        {
            logger.LogWarning("Token validation failed: user {UserId} is banned", userId);
            return new TokenValidationResultDto { User = user, IsBanned = true };
        }

        // Step 5: Check tokens_valid_after (invalidates all tokens issued before this timestamp)
        var issuedAt = tokenProvider.GetIssuedAtFromClaims(principal);
        if (issuedAt is null || issuedAt < user.TokensValidAfter)
        {
            logger.LogWarning(
                "Token validation failed: token issued before tokens_valid_after for user {UserId}",
                userId
            );
            return new TokenValidationResultDto();
        }

        return new TokenValidationResultDto { User = user };
    }

    /// <summary>
    /// Invalidates all tokens for a user by updating tokens_valid_after.
    /// Used for logout, password change, or security events.
    /// </summary>
    public async Task<bool> InvalidateAllTokensAsync(long userId)
    {
        var user = await userRepo.GetUserByIdAsync(userId);
        if (user is null)
        {
            logger.LogWarning("Cannot invalidate tokens: user {UserId} not found", userId);
            return false;
        }

        user.TokensValidAfter = DateTime.UtcNow;
        var success = await userRepo.UpdateUserAsync(userId, user);

        if (success)
            logger.LogInformation("All tokens invalidated for user {UserId}", userId);
        else
            logger.LogWarning("Failed to invalidate tokens for user {UserId}", userId);

        return success;
    }

    /// <summary>
    /// Registers a new user with the given credentials.
    /// </summary>
    public async Task<LoginResultDto> RegisterAsync(RegisterDto request)
    {
        logger.LogInformation("Registration attempt for email: {Email}", request.Email);

        // Check if email already exists
        var existingUser = await userRepo.GetUserByEmailAsync(request.Email);
        if (existingUser is not null)
        {
            logger.LogWarning("Registration failed: email {Email} already exists", request.Email);
            return new LoginResultDto();
        }

        // Hash password with Argon2id
        var passwordHash = passwordHasher.HashPassword(request.Password);

        // Create user entity
        var user = new User
        {
            Email = request.Email,
            PasswordHash = passwordHash,
            DisplayName = request.DisplayName,
            Role = UserRole.Student, // Default role
            TokensValidAfter = DateTime.MinValue, // Fix: Ensure new users don't have immediate token invalidation issues due to timestamp precision
        };

        var success = await userRepo.CreateUserAsync(user);
        if (!success)
        {
            logger.LogError("Registration failed: could not create user {Email}", request.Email);
            return new LoginResultDto();
        }

        // Fetch the created user to get the ID
        var createdUser = await userRepo.GetUserByEmailAsync(request.Email);
        if (createdUser is null)
        {
            logger.LogError(
                "Registration failed: user created but not found {Email}",
                request.Email
            );
            return new LoginResultDto();
        }

        // Generate JWT for immediate login
        var token = tokenProvider.GenerateAccessToken(createdUser.Id, createdUser.Email, createdUser.Role.ToString());

        logger.LogInformation(
            "Registration successful for user {UserId} ({Email})",
            createdUser.Id,
            createdUser.Email
        );

        return new LoginResultDto { Response = new AuthResponseDto { Message = "Registration successful", Token = token, User = MapToUserDto(createdUser) } };
    }

    private static AuthedUserResponseDto MapToUserDto(User user)
    {
        return new AuthedUserResponseDto()
        {
            Id = user.Id,
            Email = user.Email,
            DisplayName = user.DisplayName,
            Role = user.Role.ToString(),
            UserClass = user.UserClass,
            IsBanned = user.IsBanned == BannedStatus.Banned,
        };
    }
}
