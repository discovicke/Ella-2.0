using Backend.app.Core.Interfaces;
using Backend.app.Core.Models.DTO;
using Backend.app.Core.Models.Entities;

namespace Backend.app.Core.Services;

public class AssetService(IAssetRepository repo)
{
    public async Task<IEnumerable<AssetTypeResponseDto>> GetAllAsync()
    {
        var entities = await repo.GetAllAsync();
        return entities.Select(e => new AssetTypeResponseDto(e.Id, e.Description));
    }

    public async Task<AssetTypeResponseDto> GetByIdAsync(long id)
    {
        var entity = await repo.GetByIdAsync(id);
        if (entity is null)
        {
            throw new KeyNotFoundException($"AssetType with ID {id} not found.");
        }
        return new AssetTypeResponseDto(entity.Id, entity.Description);
    }

    public async Task<AssetTypeResponseDto> CreateAsync(CreateAssetTypeDto dto)
    {
        var entity = new AssetType { Description = dto.Description };
        var id = await repo.CreateAsync(entity);
        return new AssetTypeResponseDto(id, dto.Description);
    }

    public async Task UpdateAsync(long id, UpdateAssetTypeDto dto)
    {
        var exists = await repo.ExistsAsync(id);
        if (!exists)
        {
            throw new KeyNotFoundException($"AssetType with ID {id} not found.");
        }

        var entity = new AssetType { Id = id, Description = dto.Description };
        await repo.UpdateAsync(id, entity);
    }

    public async Task DeleteAsync(long id)
    {
        var exists = await repo.ExistsAsync(id);
        if (!exists)
        {
            throw new KeyNotFoundException($"AssetType with ID {id} not found.");
        }

        await repo.DeleteAsync(id);
    }

    /// <summary>
    /// Validates that a list of Asset IDs all exist in the database.
    /// </summary>
    /// <param name="ids">The IDs to check</param>
    /// <returns>True if all exist, throws ArgumentException if any are missing</returns>
    public async Task ValidateAssetIdsAsync(IEnumerable<long> ids)
    {
        var idList = ids.Distinct().ToList();
        if (idList.Count == 0) return;

        var existingIds = (await repo.GetExistingIdsAsync(idList)).ToHashSet();

        var missingIds = idList.Where(id => !existingIds.Contains(id)).ToList();

        if (missingIds.Count != 0)
        {
            var missingStr = string.Join(", ", missingIds);
            throw new ArgumentException($"Invalid Asset IDs provided: {missingStr}");
        }
    }
}
