using Backend.app.Core.Entities;
using Backend.app.Core.Enums;
using Backend.app.Core.Interfaces;
using Backend.app.Core.Models.DTO;

namespace Backend.app.Core.Services;

public class RoomService(IRoomRepository repo)
{
    // Get with Filters
    public async Task<IEnumerable<RoomResponseDto>> GetRoomsAsync(RoomType? type, string? address)
    {
        IEnumerable<Room> rooms;

        if (type.HasValue)
            rooms = await repo.GetRoomsByTypeAsync(type.Value);
        else if (!string.IsNullOrWhiteSpace(address))
            rooms = await repo.GetRoomsByAddressAsync(address);
        else
            rooms = await repo.GetAllRoomsAsync();

        return rooms.Select(MapToDto);
    }

    // Get by ID
    public async Task<RoomResponseDto> GetRoomByIdAsync(int id)
    {
        // Layer 3: Check existence
        var room = await repo.GetRoomByIdAsync(id);

        if (room is null)
            throw new KeyNotFoundException($"Room with ID {id} does not exist.");

        return MapToDto(room);
    }

    // Create
    public async Task<RoomResponseDto> CreateRoomAsync(CreateRoomDto dto)
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
        return MapToDto(room);
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

    // Mapper: Entity → DTO
    private static RoomResponseDto MapToDto(Room room)
    {
        return new RoomResponseDto(
            room.Id,
            room.Name,
            room.Capacity,
            room.Type,
            room.Floor,
            room.Address,
            room.Notes
        );
    }
}
