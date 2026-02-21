using Backend.app.Core.Models;
using Backend.app.Core.Models.Enums;

namespace Backend.app.Core.Models.DTO;

// Data Transfer Objects for User (v2.0)
// Roles/permissions are now separate — see PermissionDto
public record UserResponseDto(
    long Id,
    string Email,
    string? DisplayName,
    BannedStatus IsBanned,
    UserPermissions? Permissions
);

public record CreateUserDto(string Email, string? DisplayName, string Password);

public record UpdateUserDto(
    long Id,
    string Email,
    string? DisplayName,
    string? Password,
    BannedStatus IsBanned
);

public record DeleteUserDto(long Id);
