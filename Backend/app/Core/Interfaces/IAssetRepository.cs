using Backend.app.Core.Models.Entities;

namespace Backend.app.Core.Interfaces;

public interface IAssetRepository
{
    Task<IEnumerable<AssetType>> GetAllAsync();
    Task<AssetType?> GetByIdAsync(long id);
    Task<long> CreateAsync(AssetType assetType);
    Task<bool> UpdateAsync(long id, AssetType assetType);
    Task<bool> DeleteAsync(long id);
    Task<bool> ExistsAsync(long id);
    Task<IEnumerable<long>> GetExistingIdsAsync(IEnumerable<long> idsToCheck);
}
