using System.Collections.Generic;
using System.Threading.Tasks;
using Backend.app.Core.Models;

namespace Backend.app.Core.Interfaces;

public interface IRoomRepository
{
    // Repository interface for Room data access
    // TODO: Define method signatures for CRUD operations
    // Reference: src/modules/rooms/room.repo.js for all methods
    // CRUD stands for Create, Read, Update, and Delete – basic operations used to add, fetch, modify, and remove data.
    
    Task<IEnumerable<Room>> GetAllRoomsAsync();
    Task<Room?> GetRoomByIdAsync(int id);
    Task<Room?> GetRoomByRoomNumberAsync(string roomNumber);
    Task<IEnumerable<Room>> GetRoomsByTypeAsync(int type);
    Task<IEnumerable<Room>> GetRoomsByLocationAsync(string location);
    Task<Room> CreateRoomAsync(Room room);
    Task<bool> UpdateRoomAsync(int id, Room room);
    Task<bool> DeleteRoomAsync(int id);

    // --- Room assets related operations ---
    Task<IEnumerable<object>> GetAssetsByRoomIdAsync(int roomId);
    Task<object?> GetAssetByIdAsync(int assetId);
    Task<object> CreateRoomAssetAsync(int roomId, int assetTypeId);
    Task<bool> UpdateRoomAssetAsync(int assetId, int roomId, int assetTypeId);
    Task<bool> DeleteRoomAssetAsync(int assetId);
    Task<int> DeleteAllAssetsByRoomIdAsync(int roomId);
    Task<object?> GetRoomWithAssetsAsync(int roomId);
    Task<IEnumerable<object>> GetAllRoomsWithAssetsAsync();
    Task SaveChangesAsync();
}
