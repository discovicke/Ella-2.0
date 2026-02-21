namespace Backend.app.Core.Models.Entities;

/// <summary>
/// Maps to 'v_user_effective_permissions'.
/// The resolved permission state for a user.
/// </summary>
public class UserEffectivePermission
{
    public long UserId { get; set; }
    public string PermissionKey { get; set; } = string.Empty;
    public bool IsGranted { get; set; }
}
