using Backend.app.Core.Enums;

namespace Backend.app.Core.DTO;

// Data Transfer Objects for User
// TODO: Define CreateUserDto, UserResponseDto, UpdateUserDto
// Reference: src/modules/users/user.dto.js
public record UserResponseDto(
    long Id,
    string Email,
    string? DisplayName,
    UserRole Role,
    string? UserClass
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
