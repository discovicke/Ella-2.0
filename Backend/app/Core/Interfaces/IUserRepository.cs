using System;

namespace Backend.app.Core.Interfaces;

public interface IUserRepository
{
    // Define methods for user repository here
    Task GetUsersAsync();
    Task GetUserByIdAsync(int id);
    Task GetUsersByClassAsync(string classname);
    Task GetUsersByRoleAsync(int role);
    Task CreateUserAsync();
    Task UpdateUserAsync();
    Task DeleteUserAsync();
}
