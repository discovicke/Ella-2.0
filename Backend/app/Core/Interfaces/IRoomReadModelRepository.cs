using Backend.app.Core.Models.ReadModels;

namespace Backend.app.Core.Interfaces;

public interface IRoomReadModelRepository
{
    Task<IEnumerable<RoomDetailModel>> GetAllRoomDetailsAsync();
    Task<RoomDetailModel?> GetRoomDetailByIdAsync(int roomId);
}
