namespace Backend.app.Core.Models.Entities;

/// <summary>
/// Maps to 'user_permission_overrides'.
/// Specific permission toggles that override the base template.
/// </summary>
public class UserPermissionOverride
{
    public long UserId { get; set; }
    public string PermissionKey { get; set; } = string.Empty;
    public bool Value { get; set; }
}
