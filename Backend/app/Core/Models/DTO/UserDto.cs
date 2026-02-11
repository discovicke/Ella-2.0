using Backend.app.Core.Models.Enums;

namespace Backend.app.Core.Models.DTO;

// Data Transfer Objects for User
// Reference: src/modules/users/user.dto.js
public record UserResponseDto(
    long Id,
    string Email,
    string? DisplayName,
    UserRole Role,
    string? UserClass,
    BannedStatus IsBanned
);

public record CreateUserDto(
    string Email,
    string? DisplayName,
    UserRole Role,
    string Password,
    string? UserClass
);

public record UpdateUserDto(
    long Id,
    string Email,
    string? DisplayName,
    UserRole Role,
    string Password,
    string? UserClass,
    BannedStatus IsBanned
);

public record DeleteUserDto(long Id);
