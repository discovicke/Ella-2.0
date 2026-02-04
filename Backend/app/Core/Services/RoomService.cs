using Backend.app.Core.Entities;
using Backend.app.Core.Enums;
using Backend.app.Core.Interfaces;
using Backend.app.Core.Models.DTO;

namespace Backend.app.Core.Services;

public class RoomService(IRoomRepository repo)
{
    // Get with Filters
    public async Task<IEnumerable<Room>> GetRoomsAsync(RoomType? type, string? address)
    {
        if (type.HasValue)
            return await repo.GetRoomsByTypeAsync(type.Value);

        if (!string.IsNullOrWhiteSpace(address))
            return await repo.GetRoomsByAddressAsync(address);

        return await repo.GetAllRoomsAsync();
    }

    // Get by ID
    public async Task<Room?> GetRoomByIdAsync(int id)
    {
        // Layer 3: Check existence
        var room = await repo.GetRoomByIdAsync(id);

        if (room is null)
            throw new KeyNotFoundException($"Room with ID {id} does not exist.");

        return room;
    }

    // Create
    public async Task<Room> CreateRoomAsync(CreateRoomDto dto)
    {
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
        return room;
    }

    // Update
    public async Task UpdateRoomAsync(int id, UpdateRoomDto dto)
    {
        // Layer 3: Check existence
        var existingRoom = await repo.GetRoomByIdAsync(id);

        if (existingRoom is null)
            throw new KeyNotFoundException($"Room with ID {id} does not exist.");

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
    }

    // Delete
    public async Task DeleteRoomAsync(int id)
    {
        // Layer 3: Check existence
        var existingRoom = await repo.GetRoomByIdAsync(id);

        if (existingRoom is null)
            throw new KeyNotFoundException($"Room with ID {id} does not exist.");

        await repo.DeleteRoomAsync(id);
    }
}
