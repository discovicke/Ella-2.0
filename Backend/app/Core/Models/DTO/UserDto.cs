using Backend.app.Core.Enums;

namespace Backend.app.Core.DTO;



    // Data Transfer Objects for User
    // TODO: Define CreateUserDto, UserResponseDto, UpdateUserDto
    // Reference: src/modules/users/user.dto.js
public record UserResponseDto(
    int id,
    string email ,
    string? DisplayName ,
    UserRole Role ,
    string? UserClass
);

public record CreateUserDto(
    int Id,
    string Email,
    string? DisplayName,
    UserRole Role,
    string Password,
    string? UserClass
);

public record UpdateUserDto(
    int Id,
    string Email,
    string? DisplayName,
    UserRole Role,
    string Password,
    string? UserClass,
    BannedStatus IsBanned
);

public record DeleteUserDto(
    int Id
);