using Backend.app.Core.DTO;
using Backend.app.Core.Entities;       
using Backend.app.Core.Enums;          
using Backend.app.Core.Interfaces;     
using Backend.app.Infrastructure.Auth;

namespace Backend.app.Core.Services;

public class UserService
{
    // Business logic for users
    // TODO: Extract and migrate business rules from user.controller.js


    public async Task<object?> GetByIdAsync(int id)
    {
        throw new NotImplementedException();
    }

    public async Task<object?> CreateUserAsync(CreateUserDto dto)
    {
        throw new NotImplementedException();
    }

    public async Task UpdateUserAsync(int id, UpdateUserDto dto)
    {
        throw new NotImplementedException();
    }

    public async Task DeleteUserAsync(int id)
    {
        throw new NotImplementedException();
    }

    public async Task<object?> GetAllAsync()
    {
        throw new NotImplementedException();
    }
}
