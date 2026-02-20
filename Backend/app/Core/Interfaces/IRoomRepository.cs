using Backend.app.Core.Models.Entities;
using Backend.app.Core.Models.Enums;

namespace Backend.app.Core.Interfaces;

public interface IRoomRepository
{
    Task<IEnumerable<Room>> GetAllRoomsAsync();
    Task<Room?> GetRoomByIdAsync(long id);
    Task<IEnumerable<Room>> GetRoomsByTypeAsync(RoomType type);
    Task<IEnumerable<Room>> GetRoomsByCampusIdAsync(long campusId);
    Task<long> CreateRoomAsync(Room room);
    Task<bool> UpdateRoomAsync(long id, Room room);
    Task<bool> DeleteRoomAsync(long id);
    Task AddAssetsToRoomAsync(long roomId, IEnumerable<long> assetIds);
    Task ClearRoomAssetsAsync(long roomId);
}
