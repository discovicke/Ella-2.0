namespace Backend.app.Core.DTO;

public record LoginDto
{
    public required string Email { get; set; }
    public required string Password { get; set; }
}

public record LoginResultDto
{
    public required string Token { get; set; }
    public required AuthedUserResponseDto User { get; set; }
}

public record RegisterDto
{
    public required string Email { get; set; }
    public required string Password { get; set; }
    public string? DisplayName { get; set; }
}

public record RegisterResultDto
{
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
// TODO: Define CreateUserDto, UserResponseDto, UpdateUserDto
// Reference: src/modules/users/user.dto.js
