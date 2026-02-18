using Backend.app.Core.Models.Entities;

namespace Backend.app.Core.Interfaces;

public interface IUserRepository
{
    // CRUD
    Task<IEnumerable<User>> GetAllUsersAsync();
    Task<User?> GetUserByIdAsync(long id);
    Task<User?> GetUserByEmailAsync(string email);
    Task<User?> GetUserByDisplayNameAsync(string displayName);
    Task<bool> CreateUserAsync(User user);
    Task<bool> UpdateUserAsync(long id, User user);
    Task<bool> DeleteUserAsync(long id);
}
