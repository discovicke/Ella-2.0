using System.ComponentModel.DataAnnotations;
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
    bool IsActive,
    UserPermissions? Permissions,
    int PermissionLevel,
    List<string>? CampusNames = null,
    List<string>? ClassNames = null
);

public record CreateUserDto(
    [property: MaxLength(254)] string Email,
    [property: MaxLength(100)] string? DisplayName,
    [property: MaxLength(128)] string Password
);

public record UpdateUserDto(
    long Id,
    [property: MaxLength(254)] string Email,
    [property: MaxLength(100)] string? DisplayName,
    [property: MaxLength(128)] string? Password,
    BannedStatus IsBanned,
    bool IsActive,
    int PermissionLevel
);
