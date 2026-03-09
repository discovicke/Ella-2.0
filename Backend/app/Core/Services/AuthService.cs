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
    public async Task<LoginResultDto> LoginAsync(LoginDto request)
    {
        logger.LogInformation("Login attempt for email: {Email}", request.Email);

        var user = await userRepo.GetUserByEmailAsync(request.Email);

        if (user is null)
        {
            logger.LogWarning("Login failed: user not found for email {Email}", request.Email);
            return new LoginResultDto();
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
