using Backend.app.Core.Models.Entities;
using Backend.app.Core.Models.Enums;

namespace Backend.app.Core.Interfaces;

public interface IUserRepository
{
    // CRUD
    Task<IEnumerable<User>> GetAllUsersAsync();

    /// <summary>
    /// Get a paginated, filtered list of users with total count.
    /// templateId: null=no filter, 0=custom (no template), >0=specific template.
    /// </summary>
    Task<(IEnumerable<User> Users, int TotalCount)> GetUsersPagedAsync(
        int page,
        int pageSize,
        string? search = null,
        long? templateId = null,
        BannedStatus? bannedStatus = null
    );
    Task<User?> GetUserByIdAsync(long id);
    Task<User?> GetUserByEmailAsync(string email);
    Task<bool> CreateUserAsync(User user);
    Task<bool> UpdateUserAsync(long id, User user);
    Task<bool> DeleteUserAsync(long id);

    // User ↔ Campus associations
    Task<IEnumerable<long>> GetCampusIdsForUserAsync(long userId);
    Task SetCampusesForUserAsync(long userId, IEnumerable<long> campusIds);
    Task<Dictionary<long, List<string>>> GetAllUserCampusNamesAsync();

    // User ↔ Class associations
    Task<IEnumerable<long>> GetClassIdsForUserAsync(long userId);
    Task SetClassesForUserAsync(long userId, IEnumerable<long> classIds);
    Task<Dictionary<long, List<string>>> GetAllUserClassNamesAsync();
}
