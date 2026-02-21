using Backend.app.Core.Interfaces;
using Backend.app.Core.Models;
using Backend.app.Core.Models.DTO;
using Backend.app.Core.Models.Entities;

namespace Backend.app.Core.Services;

/// <summary>
/// Manages permission templates stored in the database.
/// </summary>
public class PermissionTemplateService(
    IPermissionTemplateRepository repository,
    IPermissionRepository permissionRepository,
    ILogger<PermissionTemplateService> logger
)
{
    /// <summary>
    /// Returns all permission templates.
    /// </summary>
    public async Task<List<PermissionTemplateDto>> GetAllAsync()
    {
        return await repository.GetAllAsync();
    }

    /// <summary>
    /// Replaces all templates with the supplied list.
    /// </summary>
    public async Task<List<PermissionTemplateDto>> UpdateAllAsync(
        List<PermissionTemplateDto> templates
    )
    {
        var result = await repository.ReplaceAllAsync(templates);
        // Propagation is automatic via v_user_effective_permissions view!
        return result;
    }

    /// <summary>
    /// Applies a permission template to a specific user.
    /// Sets the user's template_id and clears manual overrides.
    /// </summary>
    public async Task<UserPermissions?> ApplyTemplateAsync(long userId, long templateId)
    {
        var template =
            await repository.GetByIdAsync(templateId)
            ?? throw new KeyNotFoundException(
                $"Permission template with ID {templateId} not found."
            );

        // Update the user's template (this clears overrides too in repo implementation)
        await permissionRepository.SetUserTemplateAsync(userId, templateId);

        logger.LogInformation(
            "Applied template '{Label}' (ID {TemplateId}) to user {UserId}",
            template.Label,
            templateId,
            userId
        );

        return await permissionRepository.GetEffectivePermissionsAsync(userId);
    }
}
