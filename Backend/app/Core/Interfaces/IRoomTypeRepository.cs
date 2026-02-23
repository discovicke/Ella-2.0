using Backend.app.Core.Models.Entities;

namespace Backend.app.Core.Interfaces;

public interface IRoomTypeRepository
{
    Task<IEnumerable<RoomType>> GetAllAsync();
    Task<RoomType?> GetByIdAsync(long id);
    Task<long> CreateAsync(RoomType roomType);
    Task<bool> UpdateAsync(long id, RoomType roomType);
    Task<bool> DeleteAsync(long id);
}
