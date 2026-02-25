using Backend.app.Core.Models;

namespace Backend.app.Core.Interfaces;

public interface IPermissionRepository
{
    /// <summary>
    /// Retrieves the fully resolved permissions for a user (template + overrides).
    /// </summary>
    Task<UserPermissions?> GetEffectivePermissionsAsync(long userId);

    /// <summary>
    /// Retrieves effective permissions for all users in a single query.
    /// Returns a dictionary keyed by user ID.
    /// </summary>
    Task<Dictionary<long, UserPermissions>> GetAllEffectivePermissionsAsync();

    /// <summary>
    /// Assigns a base permission template to a user.
    /// Should also clear any existing overrides to prevent stale data.
    /// If templateId is null, removes the user from any template.
    /// </summary>
    Task SetUserTemplateAsync(long userId, long? templateId);

    /// <summary>
    /// Sets multiple permission overrides for a user in a single transaction.
    /// For each key: deletes if value matches template, upserts otherwise.
    /// </summary>
    Task SetUserOverridesBatchAsync(long userId, Dictionary<string, bool> overrides);

}
