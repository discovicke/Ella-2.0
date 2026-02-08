using Backend.app.Core.Models.Entities;
using Backend.app.Core.Models.Enums;

namespace Backend.app.Core.Interfaces;

public interface IRoomRepository
{
    // Repository interface for Room data access
    // Reference: src/modules/rooms/room.repo.js for all methods
    // CRUD stands for Create, Read, Update, and Delete – basic operations used to add, fetch, modify, and remove data.

    Task<IEnumerable<Room>> GetAllRoomsAsync();
    Task<Room?> GetRoomByIdAsync(long id);
    Task<IEnumerable<Room>> GetRoomsByTypeAsync(RoomType type);
    Task<IEnumerable<Room>> GetRoomsByAddressAsync(string address);
    Task<long> CreateRoomAsync(Room room);
    Task<bool> UpdateRoomAsync(long id, Room room);
    Task<bool> DeleteRoomAsync(long id);
    Task AddAssetsToRoomAsync(long roomId, IEnumerable<long> assetIds);
    Task ClearRoomAssetsAsync(long roomId);
    Task<IEnumerable<AssetType>> GetAllAssetTypesAsync();
}
