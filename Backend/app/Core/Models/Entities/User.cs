using Backend.app.Core.Models.Enums;

namespace Backend.app.Core.Models.Entities;

public class User
{
    // User entity matching database schema (v2.0)
    // Roles/permissions are now in the 'permissions' table
    // Class membership is now in the 'user_class' junction table

    public long Id { get; set; }
    public required string Email { get; set; }
    public required string PasswordHash { get; set; }
    public string? DisplayName { get; set; }
    public BannedStatus IsBanned { get; set; } = BannedStatus.NotBanned;
    public bool IsActive { get; set; } = false;
    public int PermissionLevel { get; set; } = 1;
    public string? ResetTokenHash { get; set; }
    public DateTime? ResetTokenExpires { get; set; }
    public DateTime TokensValidAfter { get; set; } = DateTime.UtcNow;
    public long? PermissionTemplateId { get; set; }
}
