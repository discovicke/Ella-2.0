using Backend.app.Core.Models;

namespace Backend.app.Core.Interfaces;

public interface IPermissionRepository
{
    /// <summary>
    /// Retrieves the fully resolved permissions for a user (template + overrides).
    /// </summary>
    Task<UserPermissions?> GetEffectivePermissionsAsync(long userId);

    /// <summary>
    /// Assigns a base permission template to a user.
    /// Should also clear any existing overrides to prevent stale data.
    /// </summary>
    Task SetUserTemplateAsync(long userId, long templateId);

    /// <summary>
    /// Sets a granular permission override for a user.
    /// Handles the logic of checking against the template value:
    /// - If new value matches template -> Delete override (cleanup).
    /// - If new value differs -> Upsert override.
    /// </summary>
    Task SetUserOverrideAsync(long userId, string permissionKey, bool value);

    /// <summary>
    /// Clears all overrides for a user.
    /// </summary>
    Task ClearUserOverridesAsync(long userId);
}
