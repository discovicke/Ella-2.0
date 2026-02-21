using Backend.app.Core.Interfaces;
using Backend.app.Core.Models;
using Backend.app.Core.Models.DTO;
using Backend.app.Core.Models.Entities;
using Backend.app.Core.Models.Enums;

namespace Backend.app.Core.Services;

/// <summary>
/// User management service for admin operations.
/// </summary>
public class UserService(
    IUserRepository repo,
    IPermissionRepository permissionRepo,
    IPermissionTemplateRepository templateRepo, // Added to find templates
    IPasswordHasher passwordHasher,
    ILogger<UserService> logger
)
{
    public async Task<IEnumerable<UserResponseDto>> GetAllAsync()
    {
        logger.LogInformation("Fetching all users");
        var users = await repo.GetAllUsersAsync();

        var result = new List<UserResponseDto>();
        foreach (var user in users)
        {
            var perms = await permissionRepo.GetEffectivePermissionsAsync(user.Id);
            result.Add(MapToDto(user, perms));
        }
        return result;
    }

    public async Task<UserResponseDto> GetByIdAsync(long id)
    {
        logger.LogDebug("Fetching user with ID {UserId}", id);

        var user =
            await repo.GetUserByIdAsync(id)
            ?? throw new KeyNotFoundException($"User with ID {id} does not exist.");

        var perms = await permissionRepo.GetEffectivePermissionsAsync(user.Id);
        return MapToDto(user, perms);
    }

    public async Task<UserResponseDto> CreateUserAsync(CreateUserDto dto)
    {
        logger.LogInformation("Creating user with email {Email}", dto.Email);

        var existing = await repo.GetUserByEmailAsync(dto.Email);
        if (existing is not null)
            throw new InvalidOperationException("User with this email already exists.");

        string hashed = passwordHasher.HashPassword(dto.Password);

        var user = new User
        {
            Email = dto.Email,
            DisplayName = dto.DisplayName,
            PasswordHash = hashed,
            IsBanned = BannedStatus.NotBanned,
        };

        var success = await repo.CreateUserAsync(user);
        if (!success)
            throw new Exception("Failed to create user.");

        var created =
            await repo.GetUserByEmailAsync(dto.Email)
            ?? throw new Exception("User created but could not be retrieved.");

        // Create default permissions (User role)
        var templates = await templateRepo.GetAllAsync();
        var userTemplate = templates.FirstOrDefault(t => t.Label == "User");
        if (userTemplate?.Id != null)
        {
            await permissionRepo.SetUserTemplateAsync(created.Id, userTemplate.Id.Value);
        }
        
        var perms = await permissionRepo.GetEffectivePermissionsAsync(created.Id);
        return MapToDto(created, perms);
    }

    public async Task UpdateUserAsync(long id, UpdateUserDto dto)
    {
        logger.LogInformation("Updating user with ID {UserId}", id);

        var existing =
            await repo.GetUserByIdAsync(id)
            ?? throw new KeyNotFoundException($"User with ID {id} does not exist.");

        string passwordHash = existing.PasswordHash;
        if (!string.IsNullOrWhiteSpace(dto.Password))
        {
            passwordHash = passwordHasher.HashPassword(dto.Password);
            logger.LogInformation("Password updated for user {UserId}", id);
        }

        var updated = new User
        {
            Id = id,
            Email = dto.Email,
            DisplayName = dto.DisplayName,
            PasswordHash = passwordHash,
            IsBanned = dto.IsBanned,
            TokensValidAfter = existing.TokensValidAfter,
        };

        var success = await repo.UpdateUserAsync(id, updated);
        if (!success)
            throw new Exception("Failed to update user.");

        // If user was just banned, revoke tokens
        if (existing.IsBanned != BannedStatus.Banned && updated.IsBanned == BannedStatus.Banned)
        {
            await RevokeTokensAsync(id);
        }

        logger.LogInformation("User with ID {UserId} updated", id);
    }

    public async Task SetBannedStatusAsync(long id, BannedStatus status)
    {
        logger.LogInformation("Setting ban status to {Status} for user {UserId}", status, id);

        var user =
            await repo.GetUserByIdAsync(id)
            ?? throw new KeyNotFoundException($"User with ID {id} does not exist.");

        user.IsBanned = status;

        var success = await repo.UpdateUserAsync(id, user);
        if (!success)
            throw new Exception("Failed to update user ban status.");

        if (status == BannedStatus.Banned)
            await RevokeTokensAsync(id);

        logger.LogInformation("Ban status updated for user {UserId}", id);
    }

    public async Task RevokeTokensAsync(long id)
    {
        logger.LogInformation("Revoking all tokens for user {UserId}", id);

        var existing =
            await repo.GetUserByIdAsync(id)
            ?? throw new KeyNotFoundException($"User with ID {id} does not exist.");

        existing.TokensValidAfter = DateTime.UtcNow;

        var success = await repo.UpdateUserAsync(id, existing);
        if (!success)
            throw new Exception("Failed to revoke tokens.");

        logger.LogInformation("All tokens revoked for user {UserId}", id);
    }

    public async Task DeleteUserAsync(long id)
    {
        logger.LogInformation("Deleting user with ID {UserId}", id);

        var existing =
            await repo.GetUserByIdAsync(id)
            ?? throw new KeyNotFoundException($"User with ID {id} does not exist.");

        // Delete permissions (cleanup)
        // With new schema, ON DELETE CASCADE handles most, but we can call ClearUserOverridesAsync explicitly if needed.
        // For now, let the DB handle it via CASCADE.
        // await permissionRepo.ClearUserOverridesAsync(id);

        var success = await repo.DeleteUserAsync(id);
        if (!success)
            throw new Exception("Failed to delete user.");

        logger.LogInformation("User with ID {UserId} deleted", id);
    }

    public async Task<UserPermissions> UpdatePermissionsAsync(long userId, UpdatePermissionDto dto)
    {
        logger.LogInformation("Updating permissions for user {UserId}", userId);

        _ = await repo.GetUserByIdAsync(userId)
            ?? throw new KeyNotFoundException($"User with ID {userId} does not exist.");

        // 1. Handle Template Change (Always call to allow clearing template with null)
        await permissionRepo.SetUserTemplateAsync(userId, dto.TemplateId);

        // 2. Handle Granular Overrides
        // We set each flag as an override. 
        // Logic in repo will cleanup if it matches template.
        await permissionRepo.SetUserOverrideAsync(userId, "BookRoom", dto.BookRoom);
        await permissionRepo.SetUserOverrideAsync(userId, "MyBookings", dto.MyBookings);
        await permissionRepo.SetUserOverrideAsync(userId, "ManageUsers", dto.ManageUsers);
        await permissionRepo.SetUserOverrideAsync(userId, "ManageClasses", dto.ManageClasses);
        await permissionRepo.SetUserOverrideAsync(userId, "ManageRooms", dto.ManageRooms);
        await permissionRepo.SetUserOverrideAsync(userId, "ManageAssets", dto.ManageAssets);
        await permissionRepo.SetUserOverrideAsync(userId, "ManageBookings", dto.ManageBookings);
        await permissionRepo.SetUserOverrideAsync(userId, "ManageCampuses", dto.ManageCampuses);
        await permissionRepo.SetUserOverrideAsync(userId, "ManageRoles", dto.ManageRoles);

        var updated = await permissionRepo.GetEffectivePermissionsAsync(userId);
        if (updated is null) throw new Exception("Failed to retrieve updated permissions");

        logger.LogInformation("Permissions updated for user {UserId}", userId);
        return updated;
    }

    // Mapper: Entity → DTO
    private static UserResponseDto MapToDto(User user, UserPermissions? permissions)
    {
        return new UserResponseDto(
            user.Id,
            user.Email,
            user.DisplayName,
            user.IsBanned,
            permissions
        );
    }
}
