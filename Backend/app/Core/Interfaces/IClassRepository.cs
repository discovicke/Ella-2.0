using Backend.app.Core.Models.Entities;

namespace Backend.app.Core.Interfaces;

public interface IClassRepository
{
    Task<IEnumerable<SchoolClass>> GetAllAsync();
    Task<SchoolClass?> GetByIdAsync(long id);
    Task<long> CreateAsync(SchoolClass schoolClass);
    Task<bool> UpdateAsync(long id, SchoolClass schoolClass);
    Task<bool> DeleteAsync(long id);

    // Class ↔ Campus associations
    Task<IEnumerable<long>> GetCampusIdsForClassAsync(long classId);
    Task SetCampusesForClassAsync(long classId, IEnumerable<long> campusIds);
    Task<Dictionary<long, List<string>>> GetAllClassCampusNamesAsync();
}
