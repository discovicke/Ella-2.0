namespace Backend.app.Core.DTO;

public record RegisterDto(string Username, string Password, string Email);

public record LoginDto(string Username, string Password);


// Data Transfer Objects for User
// TODO: Define CreateUserDto, UserResponseDto, UpdateUserDto
// Reference: src/modules/users/user.dto.js
