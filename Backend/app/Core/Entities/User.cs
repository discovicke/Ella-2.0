using System;
using Backend.app.Core.Enums;

namespace Backend.app.Core.Models;

public class User
{
    // User entity matching database schema
    // TODO: Define properties matching Infrastructure/Data/schema.sql users table
    // ⚠️ Compare with src/modules/users/user.repo.js for schema differences

    public int Id { get; set; }
    public required string Email { get; set; }
    public required string PasswordHash { get; set; }
    public string? DisplayName { get; set; }
    public UserRole Role { get; set; } = UserRole.Student;
    public string? UserClass { get; set; }
    public bool IsBanned { get; set; } = false;
}
