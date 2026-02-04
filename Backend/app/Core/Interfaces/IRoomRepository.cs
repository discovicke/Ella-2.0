using System.Collections.Generic;
using System.Threading.Tasks;
using Backend.app.Core.Entities;
using Backend.app.Core.Enums;

namespace Backend.app.Core.Interfaces;

public interface IRoomRepository
{
    // Repository interface for Room data access
    // Reference: src/modules/rooms/room.repo.js for all methods
    // CRUD stands for Create, Read, Update, and Delete – basic operations used to add, fetch, modify, and remove data.

    Task<IEnumerable<Room>> GetAllRoomsAsync();
    Task<Room?> GetRoomByIdAsync(int id);
    Task<IEnumerable<Room>> GetRoomsByTypeAsync(RoomType type);
    Task<IEnumerable<Room>> GetRoomsByAddressAsync(string address);
    Task<int> CreateRoomAsync(Room room);
    Task<bool> UpdateRoomAsync(int id, Room room);
    Task<bool> DeleteRoomAsync(int id);
}
