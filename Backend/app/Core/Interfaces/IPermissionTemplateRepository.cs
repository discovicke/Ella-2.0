using Backend.app.Core.Models.DTO;

namespace Backend.app.Core.Interfaces;

public interface IPermissionTemplateRepository
{
    /// <summary>Returns all templates with their flags, ordered by sort_order.</summary>
    Task<List<PermissionTemplateDto>> GetAllAsync();

    /// <summary>
    /// Replaces all templates and flags in a single transaction.
    /// Returns the persisted list.
    /// </summary>
    Task<List<PermissionTemplateDto>> ReplaceAllAsync(List<PermissionTemplateDto> templates);

    /// <summary>
    /// Returns the set of permission column names from the permissions table,
    /// excluding 'user_id'. Used by the service to auto-sync.
    /// </summary>
    Task<HashSet<string>> GetPermissionColumnsAsync();

    /// <summary>
    /// Inserts any missing permission keys into every template (value = false)
    /// and removes stale keys no longer in the permissions table.
    /// Called on startup and on every read.
    /// </summary>
    Task SyncFlagsWithColumnsAsync(HashSet<string> dbColumns);
}
