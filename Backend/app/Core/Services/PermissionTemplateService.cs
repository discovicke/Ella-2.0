using Backend.app.Core.Interfaces;
using Backend.app.Core.Models.DTO;
using Backend.app.Core.Models.Entities;

namespace Backend.app.Core.Services;

/// <summary>
/// Manages permission templates stored in the database.
/// On every read, auto-syncs template flags with the actual
/// permissions table columns (new columns default to false,
/// stale columns are removed).
/// </summary>
public class PermissionTemplateService(
    IPermissionTemplateRepository repository,
    IPermissionRepository permissionRepository,
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
    /// If propagate is true, updates every user whose template_id matches a changed template.
    /// </summary>
    public async Task<List<PermissionTemplateDto>> UpdateAllAsync(
        List<PermissionTemplateDto> templates,
        bool propagate = false
    )
    {
        // Snapshot old templates before replacement (for propagation comparison)
        List<PermissionTemplateDto>? oldTemplates = null;
        if (propagate)
        {
            oldTemplates = await repository.GetAllAsync();
        }

        var result = await repository.ReplaceAllAsync(templates);
        await SyncAsync();

        if (propagate && oldTemplates is not null)
        {
            await PropagateChangesAsync(oldTemplates);
        }

        return await repository.GetAllAsync();
    }

    /// <summary>
    /// Applies a permission template to a specific user.
    /// Copies all template flags into the user's permissions row and stores the template_id.
    /// </summary>
    public async Task<Permission> ApplyTemplateAsync(long userId, long templateId)
    {
        var template =
            await repository.GetByIdAsync(templateId)
            ?? throw new KeyNotFoundException(
                $"Permission template with ID {templateId} not found."
            );

        var existing = await permissionRepository.GetByUserIdAsync(userId);
        if (existing is null)
            throw new KeyNotFoundException($"No permissions row found for user {userId}.");

        // Map template flags to the Permission entity
        var updated = MapTemplateToPermission(existing.UserId, templateId, template.Permissions);
        await permissionRepository.UpdateAsync(updated);

        logger.LogInformation(
            "Applied template '{Label}' (ID {TemplateId}) to user {UserId}",
            template.Label,
            templateId,
            userId
        );

        return updated;
    }

    /// <summary>
    /// Propagates template changes to all users assigned to each changed template.
    /// </summary>
    private async Task PropagateChangesAsync(List<PermissionTemplateDto> oldTemplates)
    {
        var currentTemplates = await repository.GetAllAsync();
        var oldByLabel = oldTemplates.Where(t => t.Id.HasValue).ToDictionary(t => t.Id!.Value);

        foreach (var current in currentTemplates)
        {
            if (!current.Id.HasValue)
                continue;

            // Check if this template existed before and has changed
            if (!oldByLabel.TryGetValue(current.Id.Value, out var old))
                continue;

            // Compare permission dictionaries
            if (PermissionsEqual(old.Permissions, current.Permissions))
                continue;

            // Template flags changed — batch-update all users assigned to this template
            var affected = await permissionRepository.BatchUpdateByTemplateIdAsync(
                current.Id.Value,
                current.Permissions
            );

            if (affected > 0)
            {
                logger.LogInformation(
                    "Propagated template '{Label}' (ID {TemplateId}) changes to {Count} users",
                    current.Label,
                    current.Id.Value,
                    affected
                );
            }
        }
    }

    private static bool PermissionsEqual(Dictionary<string, bool> a, Dictionary<string, bool> b)
    {
        if (a.Count != b.Count)
            return false;
        foreach (var (key, value) in a)
        {
            if (!b.TryGetValue(key, out var bValue) || value != bValue)
                return false;
        }
        return true;
    }

    /// <summary>
    /// Maps a template's flag dictionary onto a Permission entity.
    /// </summary>
    private static Permission MapTemplateToPermission(
        long userId,
        long templateId,
        Dictionary<string, bool> flags
    )
    {
        return new Permission
        {
            UserId = userId,
            TemplateId = templateId,
            BookRoom = flags.GetValueOrDefault("book_room"),
            MyBookings = flags.GetValueOrDefault("my_bookings"),
            ManageUsers = flags.GetValueOrDefault("manage_users"),
            ManageClasses = flags.GetValueOrDefault("manage_classes"),
            ManageRooms = flags.GetValueOrDefault("manage_rooms"),
            ManageAssets = flags.GetValueOrDefault("manage_assets"),
            ManageBookings = flags.GetValueOrDefault("manage_bookings"),
            ManageCampuses = flags.GetValueOrDefault("manage_campuses"),
            ManageRoles = flags.GetValueOrDefault("manage_roles"),
        };
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
