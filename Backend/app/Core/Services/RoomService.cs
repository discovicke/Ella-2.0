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
        if (id <= 0)
            return null; // Basic validation
        return await repo.GetRoomByIdAsync(id);
    }

    // Create
    public async Task<Room?> CreateRoomAsync(CreateRoomDto dto)
    {
        // Business Logic: Validate capacity
        if (dto.Capacity.HasValue && dto.Capacity <= 0)
            return null; // Or throw exception

        // Map DTO -> Entity
        var room = new Room
        {
            Name = dto.Name,
            Capacity = dto.Capacity,
            Type = dto.Type,
            Floor = dto.Floor,
            Address = dto.Address,
            Notes = dto.Notes,
        };

        // Call Repo
        var created = await repo.CreateRoomAsync(room);

        // Return the room if successful (Repo should ideally return the new ID, but assuming bool for now)
        return created ? room : null;
    }

    // Update
    public async Task<bool> UpdateRoomAsync(int id, UpdateRoomDto dto)
    {
        if (id <= 0)
            return false;

        // Map DTO -> Entity
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

        return await repo.UpdateRoomAsync(id, room);
    }

    // Delete
    public async Task<bool> DeleteRoomAsync(int id)
    {
        if (id <= 0)
            return false;
        return await repo.DeleteRoomAsync(id);
    }
}
