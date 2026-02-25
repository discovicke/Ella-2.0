using Backend.app.Core.Models.Entities;

namespace Backend.app.Core.Interfaces;

public interface IRoomRepository
{
    Task<Room?> GetRoomByIdAsync(long id);
    Task<long> CreateRoomAsync(Room room);
    Task<bool> UpdateRoomAsync(long id, Room room);
    Task<bool> DeleteRoomAsync(long id, bool cascade = false);
    Task AddAssetsToRoomAsync(long roomId, IEnumerable<long> assetIds);
    Task ClearRoomAssetsAsync(long roomId);
}
