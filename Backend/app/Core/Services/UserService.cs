using Backend.app.Core.Interfaces;
using Backend.app.Core.Models.DTO;
using Backend.app.Core.Models.Entities;
using Backend.app.Core.Models.Enums;

namespace Backend.app.Core.Services;

/// <summary>
/// User management service for admin/educator operations.
/// SECURITY: This service should only be used by admin/educator roles.
/// For user registration, use AuthService.RegisterAsync() instead.
/// For password changes by the user themselves, use AuthService methods.
/// </summary>
public class UserService(
    IUserRepository repo,
    IPasswordHasher passwordHasher,
    ILogger<UserService> logger
)
{
    // Hämta alla användare
    public async Task<IEnumerable<UserResponseDto>> GetAllAsync()
    {
        logger.LogInformation("Fetching all users");

        // Hämtar alla användare från databasen
        var users = await repo.GetAllUsersAsync();

        // Konverterar till DTO och returnerar
        return users.Select(MapToDto);
    }

    // Hämta en användare via ID
    public async Task<UserResponseDto> GetByIdAsync(long id)
    {
        logger.LogDebug("Fetching user with ID {UserId}", id);

        var user = await repo.GetUserByIdAsync(id);

        if (user is null)
        {
            logger.LogWarning("User with ID {UserId} not found", id);
            throw new KeyNotFoundException($"User with ID {id} does not exist.");
        }

        // Returnerar DTO
        return MapToDto(user);
    }

    // Skapa ny användare
    public async Task<UserResponseDto> CreateUserAsync(CreateUserDto dto)
    {
        logger.LogInformation("Creating user with email {Email}", dto.Email);

        var existing = await repo.GetUserByEmailAsync(dto.Email);
        if (existing is not null)
        {
            logger.LogWarning("User with email {Email} already exists", dto.Email);
            throw new InvalidOperationException("User with this email already exists.");
        }

        // SECURITY: Hash the password using Argon2id before storing
        string hashed = passwordHasher.HashPassword(dto.Password);
        logger.LogDebug("Password hashed successfully for user {Email}", dto.Email);

        // Skapar ny användare
        var user = new User
        {
            Email = dto.Email,
            DisplayName = dto.DisplayName,
            UserClass = dto.UserClass,
            Role = dto.Role,
            PasswordHash = hashed,
            IsBanned = BannedStatus.NotBanned,
        };

        // Sparar användaren
        var success = await repo.CreateUserAsync(user);
        if (!success)
        {
            logger.LogError("Failed to create user with email {Email}", dto.Email);
            throw new Exception("Failed to create user.");
        }

        // Hämtar nyskapad användare
        var created = await repo.GetUserByEmailAsync(dto.Email);
        if (created is null)
        {
            logger.LogCritical("User created but could not be retrieved: {Email}", dto.Email);
            throw new Exception("User created but could not be retrieved.");
        }

        // Returnerar DTO
        return MapToDto(created);
    }

    // Uppdatera användare
    public async Task UpdateUserAsync(long id, UpdateUserDto dto)
    {
        logger.LogInformation("Updating user with ID {UserId}", id);

        // Hämtar användaren
        var existing = await repo.GetUserByIdAsync(id);
        if (existing is null)
        {
            logger.LogWarning("Cannot update - user with ID {UserId} not found", id);
            throw new KeyNotFoundException($"User with ID {id} does not exist.");
        }

        // SECURITY: Only hash new password if provided, otherwise keep existing hash
        // NOTE: This allows admin/educator to reset passwords without knowing the old one
        string passwordHash = existing.PasswordHash;
        if (!string.IsNullOrWhiteSpace(dto.Password))
        {
            passwordHash = passwordHasher.HashPassword(dto.Password);
            logger.LogInformation("Password updated for user {UserId} by admin/educator", id);
        }

        // Skapar uppdaterad användare
        var updated = new User
        {
            Id = id,
            Email = dto.Email,
            DisplayName = dto.DisplayName,
            UserClass = dto.UserClass,
            Role = dto.Role,
            PasswordHash = passwordHash,
            IsBanned = dto.IsBanned,
        };

        // Uppdaterar i databasen
        var success = await repo.UpdateUserAsync(id, updated);
        if (!success)
        {
            logger.LogError("Failed to update user with ID {UserId}", id);
            throw new Exception("Failed to update user.");
        }

        logger.LogInformation("User with ID {UserId} updated", id);
    }

    // Radera användare
    public async Task DeleteUserAsync(long id)
    {
        logger.LogInformation("Deleting user with ID {UserId}", id);

        // Kollar om användaren finns
        var existing = await repo.GetUserByIdAsync(id);
        if (existing is null)
        {
            logger.LogWarning("Cannot delete - user with ID {UserId} not found", id);
            throw new KeyNotFoundException($"User with ID {id} does not exist.");
        }

        // Raderar användaren
        var success = await repo.DeleteUserAsync(id);
        if (!success)
        {
            logger.LogError("Failed to delete user with ID {UserId}", id);
            throw new Exception("Failed to delete user.");
        }

        logger.LogInformation("User with ID {UserId} deleted", id);
    }

    // Mapper: Entity → DTO
    private static UserResponseDto MapToDto(User user)
    {
        return new UserResponseDto(
            user.Id,
            user.Email,
            user.DisplayName,
            user.Role,
            user.UserClass
        );
    }
}
