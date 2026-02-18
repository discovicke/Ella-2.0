using Backend.app.Core.Models.Entities;

namespace Backend.app.Core.Models.DTO;

public record LoginDto
{
    public required string Email { get; set; }
    public required string Password { get; set; }
}

public record RegisterDto
{
    public required string Email { get; set; }
    public required string Password { get; set; }
    public string? DisplayName { get; set; }
}

public record AuthResponseDto
{
    public required string Message { get; set; }
    public required string Token { get; set; }
    public required AuthedUserResponseDto User { get; set; }
}

public record AuthedUserResponseDto
{
    public long Id { get; set; }
    public required string Email { get; set; }
    public string? DisplayName { get; set; }
    public Permission? Permissions { get; set; }
    public bool IsBanned { get; set; }
}

public record TokenValidationResultDto
{
    public User? User { get; init; }
    public Permission? Permissions { get; init; }
    public bool IsBanned { get; init; }
    public bool IsValid => User != null && !IsBanned;
}

public record LoginResultDto
{
    public AuthResponseDto? Response { get; init; }
    public bool IsBanned { get; init; }
    public bool Success => Response != null;
}

// Data Transfer Objects for User
// Reference: src/modules/users/user.dto.js
