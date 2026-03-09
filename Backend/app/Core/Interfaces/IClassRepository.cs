using Backend.app.Core.Models.Entities;

namespace Backend.app.Core.Interfaces;

public interface IClassRepository
{
    Task<IEnumerable<SchoolClass>> GetAllAsync();
    Task<SchoolClass?> GetByIdAsync(long id);
    Task<SchoolClass?> GetByNameAsync(string className);
    Task<long> CreateAsync(SchoolClass schoolClass);
    Task<bool> UpdateAsync(long id, SchoolClass schoolClass);
    Task<bool> DeleteAsync(long id);

    // Class ↔ Campus associations
    Task<IEnumerable<long>> GetCampusIdsForClassAsync(long classId);
    Task SetCampusesForClassAsync(long classId, IEnumerable<long> campusIds);
    Task<Dictionary<long, List<string>>> GetAllClassCampusNamesAsync();

    // Class ↔ User associations
    Task<IEnumerable<long>> GetUserIdsByClassIdsAsync(IEnumerable<long> classIds);
    Task<IEnumerable<(long UserId, string DisplayName, string Email)>> GetUsersByClassIdsAsync(
        IEnumerable<long> classIds
    );

    // Booking ↔ Class associations
    Task<IEnumerable<long>> GetClassIdsForBookingAsync(long bookingId);
    Task SetClassesForBookingAsync(long bookingId, IEnumerable<long> classIds);
}
