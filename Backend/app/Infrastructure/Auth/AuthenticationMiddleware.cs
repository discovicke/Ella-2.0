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
public class AuthenticationMiddleware(
    RequestDelegate next,
    ILogger<AuthenticationMiddleware> logger
)
{
    public async Task InvokeAsync(HttpContext context, AuthService authService)
    {
        // Try to get token from cookie first, then Authorization header
        var token = GetTokenFromRequest(context);

        if (!string.IsNullOrEmpty(token))
        {
            var result = await authService.ValidateTokenAndGetUserAsync(token);

            if (result.IsBanned)
            {
                logger.LogWarning("Banned user {UserId} attempted access", result.User?.Id);

                context.Response.StatusCode = StatusCodes.Status403Forbidden;
                context.Response.ContentType = "application/json";
                await context.Response.WriteAsJsonAsync(
                    new
                    {
                        error = "Banned",
                        message = "Your account has been suspended.",
                        code = "USER_BANNED",
                        isBanned = true,
                    }
                );
                return; // Stop the pipeline
            }

            if (result.IsValid && result.User is not null)
            {
                context.Items["User"] = result.User;
                context.Items["UserId"] = result.User.Id;
                context.Items["Permissions"] = result.Permissions;

                logger.LogDebug("User {UserId} authenticated via JWT", result.User.Id);
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
        if (
            !string.IsNullOrEmpty(authHeader)
            && authHeader.StartsWith("Bearer ", StringComparison.OrdinalIgnoreCase)
        )
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
