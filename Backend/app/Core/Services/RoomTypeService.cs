using Backend.app.Core.Interfaces;
using Backend.app.Core.Models.DTO;
using Backend.app.Core.Models.Entities;

namespace Backend.app.Core.Services;

public class RoomTypeService(IRoomTypeRepository repo, ILogger<RoomTypeService> logger)
{
    public async Task<IEnumerable<RoomTypeResponseDto>> GetAllAsync()
    {
        logger.LogInformation("Fetching all room types");
        var entities = await repo.GetAllAsync();
        return entities.Select(e => new RoomTypeResponseDto(e.Id, e.Name));
    }

    public async Task<RoomTypeResponseDto> GetByIdAsync(long id)
    {
        logger.LogDebug("Fetching room type with ID {RoomTypeId}", id);
        var entity =
            await repo.GetByIdAsync(id)
            ?? throw new KeyNotFoundException($"RoomType with ID {id} not found.");
        return new RoomTypeResponseDto(entity.Id, entity.Name);
    }

    public async Task<RoomTypeResponseDto> CreateAsync(string name)
    {
        logger.LogInformation("Creating room type: {Name}", name);
        var entity = new RoomType { Name = name };
        var id = await repo.CreateAsync(entity);
        logger.LogInformation("Room type created with ID {RoomTypeId}", id);
        return new RoomTypeResponseDto(id, name);
    }

    public async Task UpdateAsync(long id, string name)
    {
        logger.LogInformation("Updating room type with ID {RoomTypeId}", id);
        var existing =
            await repo.GetByIdAsync(id)
            ?? throw new KeyNotFoundException($"RoomType with ID {id} not found.");

        var entity = new RoomType { Id = id, Name = name };
        await repo.UpdateAsync(id, entity);
        logger.LogInformation("Room type with ID {RoomTypeId} updated", id);
    }

    public async Task DeleteAsync(long id)
    {
        logger.LogInformation("Deleting room type with ID {RoomTypeId}", id);
        var existing =
            await repo.GetByIdAsync(id)
            ?? throw new KeyNotFoundException($"RoomType with ID {id} not found.");

        await repo.DeleteAsync(id);
        logger.LogInformation("Room type with ID {RoomTypeId} deleted", id);
    }
}
