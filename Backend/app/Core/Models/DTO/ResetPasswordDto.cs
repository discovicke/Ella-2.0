namespace Backend.app.Core.Models.DTO;

public record ForgotPasswordDto(string Email);

public record ResetPasswordDto(
    string Email,
    string Token,
    string NewPassword
);