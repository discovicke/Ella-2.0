using Backend.app.Core.Models.Entities;

namespace Backend.app.Core.Interfaces;

public interface IPermissionRepository
{
    Task<Permission?> GetByUserIdAsync(long userId);
    Task<bool> CreateAsync(Permission permission);
    Task<bool> UpdateAsync(Permission permission);
    Task<bool> DeleteByUserIdAsync(long userId);
}
