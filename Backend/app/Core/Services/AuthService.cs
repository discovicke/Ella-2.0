using Backend.app.Core.Interfaces;
using Backend.app.Core.Models;
using Backend.app.Core.Models.DTO;
using Backend.app.Core.Models.Entities;
using Backend.app.Core.Models.Enums;

namespace Backend.app.Core.Services;

/// <summary>
/// Handles authentication logic: login, logout, register, and current user retrieval.
/// </summary>
public class AuthService(
    IUserRepository userRepo,
    IPermissionRepository permissionRepo,
    IPasswordHasher passwordHasher,
    ITokenProvider tokenProvider,
    IEmailService emailService,
    IConfiguration configuration,
    ILogger<AuthService> logger
)
{
    public async Task<bool> RequestPasswordResetAsync(string email, bool isActivation = false)
    {
        logger.LogInformation("Password reset/activation requested for email: {Email}, isActivation: {IsActivation}", email, isActivation);
        var user = await userRepo.GetUserByEmailAsync(email);

        if (user == null)
        {
            // We return true even if user not found for security (prevent email enumeration)
            logger.LogWarning("Password reset requested for non-existent email: {Email}", email);
            return true;
        }

        var token = Guid.NewGuid().ToString("N");
        user.ResetTokenHash = passwordHasher.HashPassword(token);
        user.ResetTokenExpires = DateTime.UtcNow.AddHours(24);

        await userRepo.UpdateUserAsync(user.Id, user);

        var frontendUrl = configuration["FrontendUrl"] ?? "http://localhost:4200";
        var resetLink = $"{frontendUrl}/reset-password?token={token}&email={email}";

        string subject;
        string body;

        if (isActivation || !user.IsActive)
        {
            subject = "Welcome to ELLA - Activate your account";
            body = $@"
                <div style='font-family: sans-serif; max-width: 600px; margin: 0 auto;'>
                    <h1 style='color: #9136cb;'>Welcome to ELLA!</h1>
                    <p>An account has been created for you in the ELLA Booking System.</p>
                    <p>With ELLA, you can easily book rooms, manage assets, and see your schedule.</p>
                    <p style='margin: 20px 0;'>
                        <a href='{resetLink}' style='background-color: #9136cb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold;'>
                            Activate My Account & Set Password
                        </a>
                    </p>
                    <p style='color: #666; font-size: 0.9em;'>This link will expire in 24 hours.</p>
                    <hr style='border: none; border-top: 1px solid #eee; margin: 20px 0;'>
                    <p style='color: #999; font-size: 0.8em;'>If you didn't expect this email, you can safely ignore it.</p>
                </div>";
        }
        else
        {
            subject = "Reset your ELLA password";
            body = $@"
                <div style='font-family: sans-serif; max-width: 600px; margin: 0 auto;'>
                    <h1 style='color: #9136cb;'>Password Reset</h1>
                    <p>We received a request to reset the password for your ELLA account.</p>
                    <p style='margin: 20px 0;'>
                        <a href='{resetLink}' style='background-color: #9136cb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold;'>
                            Reset My Password
                        </a>
                    </p>
                    <p style='color: #666; font-size: 0.9em;'>This link will expire in 24 hours.</p>
                    <hr style='border: none; border-top: 1px solid #eee; margin: 20px 0;'>
                    <p style='color: #999; font-size: 0.8em;'>If you didn't request this, you can safely ignore this email.</p>
                </div>";
        }

        await emailService.SendEmailAsync(user.Email, subject, body);
        return true;
    }

    public async Task<bool> ResetPasswordAsync(ResetPasswordDto request)
    {
        logger.LogInformation("Password reset attempt for email: {Email}", request.Email);
        var user = await userRepo.GetUserByEmailAsync(request.Email);

        if (user == null || user.ResetTokenHash == null || user.ResetTokenExpires < DateTime.UtcNow)
        {
            logger.LogWarning("Invalid or expired reset attempt for email: {Email}", request.Email);
            return false;
        }

        if (!passwordHasher.VerifyPassword(request.Token, user.ResetTokenHash))
        {
            logger.LogWarning("Invalid token for email: {Email}", request.Email);
            return false;
        }

        user.PasswordHash = passwordHasher.HashPassword(request.NewPassword);
        user.ResetTokenHash = null;
        user.ResetTokenExpires = null;
        user.IsActive = true;
        user.TokensValidAfter = DateTime.UtcNow; // Invalidate old tokens

        return await userRepo.UpdateUserAsync(user.Id, user);
    }

    public async Task<LoginResultDto> LoginAsync(LoginDto request)
    {
        logger.LogInformation("Login attempt for email: {Email}", request.Email);

        var user = await userRepo.GetUserByEmailAsync(request.Email);

        if (user is null)
        {
            logger.LogWarning("Login failed: user not found for email {Email}", request.Email);
            return new LoginResultDto();
        }

        if (!user.IsActive)
        {
            logger.LogWarning("Login failed: account not active for email {Email}", request.Email);
            var perms = await permissionRepo.GetEffectivePermissionsAsync(user.Id);
            return new LoginResultDto 
            { 
                Response = new AuthResponseDto 
                { 
                    Message = "Account not activated. Please check your email or click 'Activate Account'.",
                    Token = "",
                    User = MapToUserDto(user, perms)
                }
            };
        }

        if (user.IsBanned == BannedStatus.Banned)
        {
            logger.LogWarning("Login failed: user {UserId} is banned", user.Id);
            var perms = await permissionRepo.GetEffectivePermissionsAsync(user.Id);
            return new LoginResultDto
            {
                IsBanned = true,
                Response = new AuthResponseDto
                {
                    Message = "Account suspended",
                    Token = "",
                    User = MapToUserDto(user, perms),
                },
            };
        }

        var isValidPassword = passwordHasher.VerifyPassword(request.Password, user.PasswordHash);

        if (!isValidPassword)
        {
            logger.LogWarning("Login failed: invalid password for user {UserId}", user.Id);
            return new LoginResultDto();
        }

        var token = tokenProvider.GenerateAccessToken(user.Id, user.Email);

        logger.LogInformation("Login successful for user {UserId} ({Email})", user.Id, user.Email);

        var permissions = await permissionRepo.GetEffectivePermissionsAsync(user.Id);
        return new LoginResultDto
        {
            Response = new AuthResponseDto
            {
                Message = "Login successful",
                Token = token,
                User = MapToUserDto(user, permissions),
            },
        };
    }

    public async Task<TokenValidationResultDto> ValidateTokenAndGetUserAsync(string token)
    {
        var principal = tokenProvider.ValidateToken(token);
        if (principal is null)
        {
            logger.LogDebug("Token validation failed: invalid JWT");
            return new TokenValidationResultDto();
        }

        var userId = tokenProvider.GetUserIdFromClaims(principal);
        if (userId is null)
        {
            logger.LogWarning("Token validation failed: no user ID in claims");
            return new TokenValidationResultDto();
        }

        // Single DB round-trip: fetch user + effective permissions together
        var (user, permissions) = await permissionRepo.GetUserWithPermissionsAsync(userId.Value);

        if (user is null)
        {
            logger.LogWarning("Token validation failed: user {UserId} not found", userId);
            return new TokenValidationResultDto();
        }

        if (user.IsBanned == BannedStatus.Banned)
        {
            logger.LogWarning("Token validation failed: user {UserId} is banned", userId);
            return new TokenValidationResultDto { User = user, IsBanned = true };
        }

        var issuedAt = tokenProvider.GetIssuedAtFromClaims(principal);
        if (issuedAt is null || issuedAt < user.TokensValidAfter)
        {
            logger.LogWarning(
                "Token validation failed: token issued before tokens_valid_after for user {UserId}",
                userId
            );
            return new TokenValidationResultDto();
        }

        return new TokenValidationResultDto { User = user, Permissions = permissions };
    }

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

    public async Task<LoginResultDto> RegisterAsync(RegisterDto request)
    {
        logger.LogInformation("Registration attempt for email: {Email}", request.Email);

        var existingUser = await userRepo.GetUserByEmailAsync(request.Email);
        if (existingUser is not null)
        {
            logger.LogWarning("Registration failed: email {Email} already exists", request.Email);
            return new LoginResultDto();
        }

        var passwordHash = passwordHasher.HashPassword(request.Password);

        var user = new User
        {
            Email = request.Email,
            PasswordHash = passwordHash,
            DisplayName = request.DisplayName,
            IsActive = false,
            TokensValidAfter = DateTime.MinValue,
        };

        var success = await userRepo.CreateUserAsync(user);
        if (!success)
        {
            logger.LogError("Registration failed: could not create user {Email}", request.Email);
            return new LoginResultDto();
        }

        var createdUser = await userRepo.GetUserByEmailAsync(request.Email);
        if (createdUser is null)
        {
            logger.LogError(
                "Registration failed: user created but not found {Email}",
                request.Email
            );
            return new LoginResultDto();
        }

        // Note: We do not assign a default template here.
        // If a role is needed, it should be assigned explicitly via the User Management API or
        // passed in the registration request (if we decide to support that in the future).
        // By default, a new user is a "Custom User" with 0 permissions.

        var token = tokenProvider.GenerateAccessToken(createdUser.Id, createdUser.Email);

        logger.LogInformation(
            "Registration successful for user {UserId} ({Email})",
            createdUser.Id,
            createdUser.Email
        );

        var perms = await permissionRepo.GetEffectivePermissionsAsync(createdUser.Id);

        return new LoginResultDto
        {
            Response = new AuthResponseDto
            {
                Message = "Registration successful",
                Token = token,
                User = MapToUserDto(createdUser, perms),
            },
        };
    }

    private static AuthedUserResponseDto MapToUserDto(User user, UserPermissions? permissions)
    {
        return new AuthedUserResponseDto
        {
            Id = user.Id,
            Email = user.Email,
            DisplayName = user.DisplayName,
            Permissions = permissions ?? new UserPermissions { UserId = user.Id }, // Fallback to empty permissions
            IsBanned = user.IsBanned == BannedStatus.Banned,
        };
    }
}
