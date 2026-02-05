using Backend.app.Core.Services;

namespace Backend.app.Infrastructure.Auth;

/// <summary>
/// Authentication middleware that validates JWT tokens from requests.
/// Attaches the authenticated user to HttpContext.Items for downstream use.
/// 
/// Equivalent to the JS authenticate middleware that:
/// 1. Extracts token from cookie or Authorization header
/// 2. Validates the token via AuthService
/// 3. Attaches user to request context
/// </summary>
public class AuthenticationMiddleware(RequestDelegate next, ILogger<AuthenticationMiddleware> logger)
{
    public async Task InvokeAsync(HttpContext context, AuthService authService)
    {
        // Try to get token from cookie first, then Authorization header
        var token = GetTokenFromRequest(context);

        if (!string.IsNullOrEmpty(token))
        {
            var user = await authService.ValidateTokenAndGetUserAsync(token);

            if (user is not null)
            {
                // Attach user to context for downstream middleware/endpoints
                context.Items["User"] = user;
                context.Items["UserId"] = user.Id;
                context.Items["UserRole"] = user.Role.ToString().ToLowerInvariant();

                logger.LogDebug("User {UserId} authenticated via JWT", user.Id);
            }
            else
            {
                logger.LogDebug("Token validation failed - user not authenticated");
            }
        }

        await next(context);
    }

    /// <summary>
    /// Extracts JWT token from request.
    /// Priority: 1. Cookie (auth_token), 2. Authorization header (Bearer token)
    /// </summary>
    private static string? GetTokenFromRequest(HttpContext context)
    {
        // Try cookie first (for browser clients)
        if (context.Request.Cookies.TryGetValue("auth_token", out var cookieToken))
        {
            return cookieToken;
        }

        // Try Authorization header (for API clients)
        var authHeader = context.Request.Headers.Authorization.FirstOrDefault();
        if (!string.IsNullOrEmpty(authHeader) && authHeader.StartsWith("Bearer ", StringComparison.OrdinalIgnoreCase))
        {
            return authHeader["Bearer ".Length..].Trim();
        }

        return null;
    }
}

/// <summary>
/// Extension methods for registering the authentication middleware.
/// </summary>
public static class AuthenticationMiddlewareExtensions
{
    public static IApplicationBuilder UseJwtAuthentication(this IApplicationBuilder app)
    {
        return app.UseMiddleware<AuthenticationMiddleware>();
    }
}