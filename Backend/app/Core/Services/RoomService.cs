using Backend.app.Core.Interfaces;
using Backend.app.Core.Models.DTO;
using Backend.app.Core.Models.Entities;
using Backend.app.Core.Models.Enums;
using Backend.app.Core.Models.ReadModels;

namespace Backend.app.Core.Services;

public class RoomService(
    IRoomRepository repo,
    IRoomReadModelRepository readModelRepo,
    ILogger<RoomService> logger
)
{
    // GET: Returns RoomDetailModel (Includes parsed Assets!)
    public async Task<IEnumerable<RoomDetailModel>> GetRoomsAsync(RoomType? type, string? address)
    {
        logger.LogInformation(
            "Fetching room details with filters: Type={Type}, Address={Address}",
            type,
            address
        );

        // 1. Fetch all Read Models (contains AssetsString populated by Dapper)
        var rooms = await readModelRepo.GetAllRoomDetailsAsync();

        // 2. Apply filters in-memory (since ReadRepo doesn't have specific filter methods yet)
        if (type.HasValue)
        {
            rooms = rooms.Where(r => r.Type == type.Value);
        }

        if (!string.IsNullOrWhiteSpace(address))
        {
            // Case-insensitive check
            rooms = rooms.Where(r =>
                r.Address != null && r.Address.Contains(address, StringComparison.OrdinalIgnoreCase)
            );
        }

        return rooms;
    }

    // GET BY ID: Returns RoomDetailModel
    public async Task<RoomDetailModel> GetRoomByIdAsync(long id)
    {
        logger.LogDebug("Fetching room detail with ID {RoomId}", id);

        // Use the Read Repo
        var room = await readModelRepo.GetRoomDetailByIdAsync(id);

        if (room is null)
        {
            logger.LogWarning("Room with ID {RoomId} not found", id);
            throw new KeyNotFoundException($"Room with ID {id} does not exist.");
        }

        return room;
    }

    // CREATE: Returns RoomResponseDto with Assets populated
    public async Task<RoomResponseDto> CreateRoomAsync(CreateRoomDto dto)
    {
        logger.LogInformation("Creating new room: {RoomName}", dto.Name);

        var room = new Room
        {
            Name = dto.Name,
            Capacity = dto.Capacity,
            Type = dto.Type,
            Floor = dto.Floor,
            Address = dto.Address,
            Notes = dto.Notes,
        };

        // 1. Create Room Entity
        var newId = await repo.CreateRoomAsync(room);
        logger.LogInformation("Room created with ID {RoomId}", newId);

        // 2. Add Assets (if any)
        if (dto.AssetIds != null && dto.AssetIds.Any())
        {
            logger.LogInformation("Adding {Count} assets to room {RoomId}", dto.AssetIds.Count, newId);
            await repo.AddAssetsToRoomAsync(newId, dto.AssetIds);
        }

        // 3. Fetch the complete ReadModel to return (ensures response matches GET format)
        var createdRoomDetail = await readModelRepo.GetRoomDetailByIdAsync(newId);

        if (createdRoomDetail is null)
        {
            throw new InvalidOperationException("Room was created but could not be retrieved.");
        }

        return MapDetailToResponse(createdRoomDetail);
    }

    // UPDATE: Updates Room and Assets
    public async Task UpdateRoomAsync(long id, UpdateRoomDto dto)
    {
        logger.LogInformation("Updating room with ID {RoomId}", id);

        var existingRoom = await repo.GetRoomByIdAsync(id);

        if (existingRoom is null)
        {
            logger.LogWarning("Cannot update - room with ID {RoomId} not found", id);
            throw new KeyNotFoundException($"Room with ID {id} does not exist.");
        }

        var room = new Room
        {
            Id = id,
            Name = dto.Name,
            Capacity = dto.Capacity,
            Type = dto.Type,
            Floor = dto.Floor,
            Address = dto.Address,
            Notes = dto.Notes,
        };

        // 1. Update Room Entity
        await repo.UpdateRoomAsync(id, room);

        // 2. Update Assets (Clear existing -> Add new)
        // This is a simple strategy. For very large sets, diffing might be better, 
        // but for room assets (usually < 20), this is efficient enough.
        await repo.ClearRoomAssetsAsync(id);

        if (dto.AssetIds != null && dto.AssetIds.Any())
        {
            await repo.AddAssetsToRoomAsync(id, dto.AssetIds);
        }

        logger.LogInformation("Room with ID {RoomId} updated (including assets)", id);
    }

    // DELETE: Standard Entity delete (Repo handles asset cleanup via transaction)
    public async Task DeleteRoomAsync(long id)
    {
        logger.LogInformation("Deleting room with ID {RoomId}", id);

        var existingRoom = await repo.GetRoomByIdAsync(id);

        if (existingRoom is null)
        {
            logger.LogWarning("Cannot delete - room with ID {RoomId} not found", id);
            throw new KeyNotFoundException($"Room with ID {id} does not exist.");
        }

        await repo.DeleteRoomAsync(id);
        logger.LogInformation("Room with ID {RoomId} deleted", id);
    }

    // Mapper: RoomDetailModel -> RoomResponseDto
    private static RoomResponseDto MapDetailToResponse(RoomDetailModel model)
    {
        return new RoomResponseDto(
            model.RoomId,
            model.Name,
            model.Capacity,
            model.Type,
            model.Floor,
            model.Address,
            model.Notes,
            model.Assets // List<string> (Descriptions)
        );
    }
}
