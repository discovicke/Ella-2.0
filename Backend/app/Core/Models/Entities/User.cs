using Backend.app.Core.Enums;

namespace Backend.app.Core.Entities;

public class User
{
    // User entity (source of truth), atm matching database schema
    // TODO: Define properties matching Infrastructure/Data/schema.sql users table
    // ⚠️ Compare with src/modules/users/user.repo.js for schema differences

    public int Id { get; set; }
    public required string Email { get; set; }
    public required string PasswordHash { get; set; }
    public string? DisplayName { get; set; }
    public UserRole Role { get; set; } = UserRole.Student;
    public string? UserClass { get; set; }
    public BannedStatus IsBanned { get; set; } = BannedStatus.NotBanned;
    public DateTime TokensValidAfter { get; set; } = DateTime.UtcNow;
}
