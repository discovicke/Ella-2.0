using System;

using Backend.app.Core.Models;
using Backend.app.Core.Enums;
namespace Backend.app.Core.Interfaces;

public interface IUserRepository
{
    // Repository interface for User data access
    // TODO: Define method signatures for CRUD operations
    // Reference: src/modules/users/user.repo.js for all methods
    // CRUD stands for Create, Read, Update, and Delete – basic operations used to add, fetch, modify, and remove data.
    
    Task<IEnumerable<User>> GetAllUsersAsync(); //
    Task<User?> GetUserByIdAsync(int id); //
    Task<User?> GetUserByEmailAsync(string email); //
    Task<User?> GetUserByRoleAsync(UserRole role); //
    Task<User?> GetUserByDisplayNameAsync(string displayName); //
    Task<bool> CreateUserAsync(User user); //
    Task<bool> UpdateUserAsync(int id, User user); //
    Task<bool> DeleteUserAsync(int id); //

    // New query methods
    Task<IEnumerable<User>> GetUsersByClassAsync(string classname); //
    Task<IEnumerable<User>> GetUsersByRoleAsync(UserRole role);
    

    
}
