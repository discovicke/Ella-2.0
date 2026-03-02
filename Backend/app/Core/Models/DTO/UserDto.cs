using System.ComponentModel.DataAnnotations;
using Backend.app.Core.Models;
using Backend.app.Core.Models.Enums;
using Backend.app.Core.Validation;

namespace Backend.app.Core.Models.DTO;

// Data Transfer Objects for User (v2.0)
// Roles/permissions are now separate — see PermissionDto
public record UserResponseDto(
    long Id,
    string Email,
    string? DisplayName,
    BannedStatus IsBanned,
    UserPermissions? Permissions,
    List<string>? CampusNames = null,
    List<string>? ClassNames = null
);

public record CreateUserDto(
    [property: MaxLength(InputLimits.Email)] string Email,
    [property: MaxLength(InputLimits.DisplayName)] string? DisplayName,
    [property: MaxLength(InputLimits.Password)] string Password
);

public record UpdateUserDto(
    long Id,
    [property: MaxLength(InputLimits.Email)] string Email,
    [property: MaxLength(InputLimits.DisplayName)] string? DisplayName,
    [property: MaxLength(InputLimits.Password)] string? Password,
    BannedStatus IsBanned
);
