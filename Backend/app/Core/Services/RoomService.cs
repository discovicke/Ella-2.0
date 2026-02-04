using Backend.app.Core.Entities;
using Backend.app.Core.Enums;
using Backend.app.Core.Interfaces;
using Backend.app.Core.Models.DTO;

namespace Backend.app.Core.Services;

public class RoomService(IRoomRepository repo, ILogger<RoomService> logger)
{
    // Get with Filters
    public async Task<IEnumerable<Room>> GetRoomsAsync(RoomType? type, string? address)
    {
        logger.LogInformation("Fetching rooms with filters: Type={Type}, Address={Address}", type, address);
        
        if (type.HasValue)
            return await repo.GetRoomsByTypeAsync(type.Value);

        if (!string.IsNullOrWhiteSpace(address))
            return await repo.GetRoomsByAddressAsync(address);

        return await repo.GetAllRoomsAsync();
    }

    // Get by ID
    public async Task<Room?> GetRoomByIdAsync(int id)
    {
        logger.LogDebug("Fetching room with ID {RoomId}", id);
        
        // Layer 3: Check existence
        var room = await repo.GetRoomByIdAsync(id);

        if (room is null)
        {
            logger.LogWarning("Room with ID {RoomId} not found", id);
            throw new KeyNotFoundException($"Room with ID {id} does not exist.");
        }

        return room;
    }

    // Create
    public async Task<Room> CreateRoomAsync(CreateRoomDto dto)
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

        var newId = await repo.CreateRoomAsync(room);

        room.Id = newId;
        logger.LogInformation("Room created with ID {RoomId}", newId);
        return room;
    }

    // Update
    public async Task UpdateRoomAsync(int id, UpdateRoomDto dto)
    {
        logger.LogInformation("Updating room with ID {RoomId}", id);
        
        // Layer 3: Check existence
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

        await repo.UpdateRoomAsync(id, room);
        logger.LogInformation("Room with ID {RoomId} updated", id);
    }

    // Delete
    public async Task DeleteRoomAsync(int id)
    {
        logger.LogInformation("Deleting room with ID {RoomId}", id);
        
        // Layer 3: Check existence
        var existingRoom = await repo.GetRoomByIdAsync(id);

        if (existingRoom is null)
        {
            logger.LogWarning("Cannot delete - room with ID {RoomId} not found", id);
            throw new KeyNotFoundException($"Room with ID {id} does not exist.");
        }

        await repo.DeleteRoomAsync(id);
        logger.LogInformation("Room with ID {RoomId} deleted", id);
    }
}
