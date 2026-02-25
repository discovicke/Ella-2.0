using Backend.app.Core.Models.Entities;

namespace Backend.app.Core.Interfaces;

public interface ICampusRepository
{
    Task<IEnumerable<Campus>> GetAllAsync();
    Task<Campus?> GetByIdAsync(long id);
    Task<long> CreateAsync(Campus campus);
    Task<bool> UpdateAsync(long id, Campus campus);
    Task<bool> DeleteAsync(long id);
}
