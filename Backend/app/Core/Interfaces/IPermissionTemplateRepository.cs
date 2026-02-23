using Backend.app.Core.Models.DTO;

namespace Backend.app.Core.Interfaces;

public interface IPermissionTemplateRepository
{
    /// <summary>Returns all templates with their flags, ordered by sort_order.</summary>
    Task<List<PermissionTemplateDto>> GetAllAsync();

    /// <summary>Returns a single template by ID, or null if not found.</summary>
    Task<PermissionTemplateDto?> GetByIdAsync(long id);

    /// <summary>
    /// Replaces all templates and flags in a single transaction.
    /// Returns the persisted list.
    /// </summary>
    Task<List<PermissionTemplateDto>> ReplaceAllAsync(List<PermissionTemplateDto> templates);
}
