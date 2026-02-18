using Backend.app.Core.Interfaces;
using Backend.app.Core.Models.DTO;
using Backend.app.Core.Models.Entities;
using Backend.app.Core.Models.Enums;
using Backend.app.Core.Models.ReadModels;

namespace Backend.app.Core.Services;

public class RoomService(
    IRoomRepository repo,
    IRoomReadModelRepository readModelRepo,
    AssetService assetService,
    ILogger<RoomService> logger
)
{
    // GET: Returns RoomDetailModel (Includes parsed Assets!)
    public async Task<IEnumerable<RoomDetailModel>> GetRoomsAsync(RoomType? type, long? campusId)
    {
        logger.LogInformation(
            "Fetching room details with filters: Type={Type}, CampusId={CampusId}",
            type,
            campusId
        );

        var rooms = await readModelRepo.GetAllRoomDetailsAsync();

        if (type.HasValue)
            rooms = rooms.Where(r => r.Type == type.Value);

        if (campusId.HasValue)
            rooms = rooms.Where(r => r.CampusId == campusId.Value);

        return rooms;
    }

    // GET BY ID: Returns RoomDetailModel
    public async Task<RoomDetailModel> GetRoomByIdAsync(long id)
    {
        logger.LogDebug("Fetching room detail with ID {RoomId}", id);

        var room =
            await readModelRepo.GetRoomDetailByIdAsync(id)
            ?? throw new KeyNotFoundException($"Room with ID {id} does not exist.");

        return room;
    }

    // CREATE: Returns RoomResponseDto with Assets populated
    public async Task<RoomResponseDto> CreateRoomAsync(CreateRoomDto dto)
    {
        logger.LogInformation("Creating new room: {RoomName}", dto.Name);

        if (dto.AssetIds != null && dto.AssetIds.Count != 0)
            await assetService.ValidateAssetIdsAsync(dto.AssetIds);

        var room = new Room
        {
            CampusId = dto.CampusId,
            Name = dto.Name,
            Capacity = dto.Capacity,
            Type = dto.Type,
            Floor = dto.Floor,
            Notes = dto.Notes,
        };

        var newId = await repo.CreateRoomAsync(room);
        logger.LogInformation("Room created with ID {RoomId}", newId);

        try
        {
            if (dto.AssetIds != null && dto.AssetIds.Count != 0)
            {
                logger.LogInformation(
                    "Adding {Count} assets to room {RoomId}",
                    dto.AssetIds.Count,
                    newId
                );
                await repo.AddAssetsToRoomAsync(newId, dto.AssetIds);
            }
        }
        catch (Exception ex)
        {
            logger.LogError(
                ex,
                "Failed to add assets to room {RoomId}. Rolling back creation.",
                newId
            );
            await repo.DeleteRoomAsync(newId);
            throw new InvalidOperationException("Failed to create room with provided assets.", ex);
        }

        var createdRoomDetail =
            await readModelRepo.GetRoomDetailByIdAsync(newId)
            ?? throw new InvalidOperationException("Room was created but could not be retrieved.");

        return MapDetailToResponse(createdRoomDetail);
    }

    // UPDATE: Updates Room and Assets
    public async Task UpdateRoomAsync(long id, UpdateRoomDto dto)
    {
        logger.LogInformation("Updating room with ID {RoomId}", id);

        var existingRoom =
            await repo.GetRoomByIdAsync(id)
            ?? throw new KeyNotFoundException($"Room with ID {id} does not exist.");

        if (dto.AssetIds != null && dto.AssetIds.Any())
            await assetService.ValidateAssetIdsAsync(dto.AssetIds);

        var room = new Room
        {
            Id = id,
            CampusId = dto.CampusId,
            Name = dto.Name,
            Capacity = dto.Capacity,
            Type = dto.Type,
            Floor = dto.Floor,
            Notes = dto.Notes,
        };

        await repo.UpdateRoomAsync(id, room);

        await repo.ClearRoomAssetsAsync(id);
        if (dto.AssetIds != null && dto.AssetIds.Any())
            await repo.AddAssetsToRoomAsync(id, dto.AssetIds);

        logger.LogInformation("Room with ID {RoomId} updated (including assets)", id);
    }

    // DELETE
    public async Task DeleteRoomAsync(long id)
    {
        logger.LogInformation("Deleting room with ID {RoomId}", id);

        var existingRoom =
            await repo.GetRoomByIdAsync(id)
            ?? throw new KeyNotFoundException($"Room with ID {id} does not exist.");

        await repo.DeleteRoomAsync(id);
        logger.LogInformation("Room with ID {RoomId} deleted", id);
    }

    // Mapper: RoomDetailModel -> RoomResponseDto
    private static RoomResponseDto MapDetailToResponse(RoomDetailModel model)
    {
        return new RoomResponseDto(
            model.RoomId,
            model.CampusId,
            model.Name,
            model.Capacity,
            model.Type,
            model.Floor,
            model.Notes,
            model.Assets
        );
    }
}
