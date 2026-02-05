using Backend.app.Core.Models.Enums;

namespace Backend.app.Core.Models.Entities;

public class User
{
    // User entity (source of truth), atm matching database schema
    // ⚠️ Compare with src/modules/users/user.repo.js for schema differences

    public long Id { get; set; }
    public required string Email { get; set; }
    public required string PasswordHash { get; set; }
    public string? DisplayName { get; set; }
    public UserRole Role { get; set; } = UserRole.Student;
    public string? UserClass { get; set; }
    public BannedStatus IsBanned { get; set; } = BannedStatus.NotBanned;
    public DateTime TokensValidAfter { get; set; } = DateTime.UtcNow;
}
