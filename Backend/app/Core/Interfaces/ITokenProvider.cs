using System.Security.Claims;

namespace Backend.app.Core.Interfaces;

public interface ITokenProvider
{
    string GenerateAccessToken(long userId, string email, string role);
    ClaimsPrincipal? ValidateToken(string token);
    long? GetUserIdFromClaims(ClaimsPrincipal principal);
    DateTime? GetIssuedAtFromClaims(ClaimsPrincipal principal);
}
