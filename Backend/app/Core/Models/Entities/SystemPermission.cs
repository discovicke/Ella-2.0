namespace Backend.app.Core.Models.Entities;

/// <summary>
/// Maps to 'system_permissions'.
/// Registry of all available permission keys.
/// </summary>
public class SystemPermission
{
    public string Key { get; set; } = string.Empty;
    public string Description { get; set; } = string.Empty;
}
