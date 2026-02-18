using Backend.app.Core.Interfaces;
using Backend.app.Core.Models.DTO;

namespace Backend.app.Core.Services;

/// <summary>
/// Manages permission templates stored in the database.
/// On every read, auto-syncs template flags with the actual
/// permissions table columns (new columns default to false,
/// stale columns are removed).
/// </summary>
public class PermissionTemplateService(
    IPermissionTemplateRepository repository,
    ILogger<PermissionTemplateService> logger
)
{
    /// <summary>
    /// Returns all permission templates, auto-synced with the current DB permission columns.
    /// </summary>
    public async Task<List<PermissionTemplateDto>> GetAllAsync()
    {
        await SyncAsync();
        return await repository.GetAllAsync();
    }

    /// <summary>
    /// Replaces all templates with the supplied list, then auto-syncs with DB columns.
    /// </summary>
    public async Task<List<PermissionTemplateDto>> UpdateAllAsync(
        List<PermissionTemplateDto> templates
    )
    {
        var result = await repository.ReplaceAllAsync(templates);
        await SyncAsync();
        return await repository.GetAllAsync();
    }

    /// <summary>
    /// Ensures every template has exactly the permission keys that exist
    /// in the permissions table. Safe to call frequently.
    /// </summary>
    private async Task SyncAsync()
    {
        try
        {
            var dbColumns = await repository.GetPermissionColumnsAsync();
            await repository.SyncFlagsWithColumnsAsync(dbColumns);
        }
        catch (Exception ex)
        {
            logger.LogWarning(ex, "Failed to sync permission template flags with DB columns.");
        }
    }
}
