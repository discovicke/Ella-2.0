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
    public required string Role { get; set; }
    public string? UserClass { get; set; }
    public bool IsBanned { get; set; }
}

// Data Transfer Objects for User
// Reference: src/modules/users/user.dto.js
