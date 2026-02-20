using Backend.app.Core.Models.Entities;

namespace Backend.app.Core.Interfaces;

public interface IPermissionRepository
{
    Task<Permission?> GetByUserIdAsync(long userId);
    Task<List<Permission>> GetByTemplateIdAsync(long templateId);
    Task<bool> CreateAsync(Permission permission);
    Task<bool> UpdateAsync(Permission permission);
    Task<int> BatchUpdateByTemplateIdAsync(long templateId, Dictionary<string, bool> flags);
    Task<bool> DeleteByUserIdAsync(long userId);
}
