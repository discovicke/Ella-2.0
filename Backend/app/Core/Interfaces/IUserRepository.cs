using System;

namespace Backend.app.Core.Interfaces;

public interface IUserRepository
{
    // Repository interface for User data access
    // TODO: Define method signatures for CRUD operations
    // Reference: src/modules/users/user.repo.js for all methods
    // CRUD stands for Create, Read, Update, and Delete – basic operations used to add, fetch, modify, and remove data.
    
    Task GetUsersAsync();
    Task GetUserByIdAsync(int id);
    Task GetUsersByClassAsync(string classname);
    Task GetUsersByRoleAsync(int role);
    Task CreateUserAsync();
    Task UpdateUserAsync();
    Task DeleteUserAsync();
}
