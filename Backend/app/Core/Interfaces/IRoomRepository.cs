using Backend.app.Core.Models.Entities;

namespace Backend.app.Core.Interfaces;

public interface IRoomRepository
{
    Task<IEnumerable<Room>> GetAllRoomsAsync();
    Task<Room?> GetRoomByIdAsync(long id);
    Task<IEnumerable<Room>> GetRoomsByTypeIdAsync(long roomTypeId);
    Task<IEnumerable<Room>> GetRoomsByCampusIdAsync(long campusId);
    Task<long> CreateRoomAsync(Room room);
    Task<bool> UpdateRoomAsync(long id, Room room);
    Task<bool> DeleteRoomAsync(long id);
    Task AddAssetsToRoomAsync(long roomId, IEnumerable<long> assetIds);
    Task ClearRoomAssetsAsync(long roomId);
}
