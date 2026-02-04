using Backend.app.Core.DTO;
using Backend.app.Core.Entities;
using Backend.app.Core.Services;
using Backend.app.Infrastructure.Auth;

namespace Backend.app.API.Endpoints;

/// <summary>
/// Authentication endpoints for login, logout, register, and current user.
/// All business logic is delegated to AuthService - endpoints are thin.
/// </summary>
public static class AuthEndpoints
{
    public static IEndpointRouteBuilder MapAuthEndpoints(this IEndpointRouteBuilder app)
    {
        var group = app.MapGroup("/auth").WithTags("Auth");

        // POST /auth/register - Create a new user account
        group
            .MapPost("/register", async (RegisterDto request, AuthService authService) =>
            {
                var result = await authService.RegisterAsync(request);

                if (result is null)
                    return Results.BadRequest(new { error = "Registration failed", message = "Email may already exist" });

                // Set auth cookie for browser clients
                return Results.Ok(new
                {
                    message = "Registration successful",
                    token = result.Token,
                    user = result.User
                });
            })
            .WithName("RegisterUser")
            .WithDescription("Registers a new user account.")
            .Produces(200)
            .Produces(400);

        // POST /auth/login - Authenticate user and get JWT token
        group
            .MapPost("/login", async (LoginDto request, AuthService authService, HttpContext httpContext) =>
            {
                var result = await authService.LoginAsync(request);

                if (result is null)
                    return Results.Unauthorized();

                // Set auth cookie for browser clients (7 days expiry)
                httpContext.Response.Cookies.Append("auth_token", result.Token, new CookieOptions
                {
                    HttpOnly = true,
                    SameSite = SameSiteMode.Lax,
                    Secure = false, // Set to true in production with HTTPS
                    MaxAge = TimeSpan.FromDays(7),
                    Path = "/"
                });

                return Results.Ok(new
                {
                    message = "Login successful",
                    token = result.Token,
                    user = result.User
                });
            })
            .WithName("LoginUser")
            .WithDescription("Authenticates a user and returns a JWT token.")
            .Produces(200)
            .Produces(401);

        // POST /auth/logout - Invalidate current user's tokens
        group
            .MapPost("/logout", async (HttpContext httpContext, AuthService authService) =>
            {
                // Always clear the cookie, regardless of auth state
                httpContext.Response.Cookies.Delete("auth_token", new CookieOptions { Path = "/" });

                // If user is authenticated, invalidate all their tokens
                var userId = httpContext.Items["UserId"] as int?;
                if (userId.HasValue)
                {
                    await authService.InvalidateAllTokensAsync(userId.Value);
                }

                return Results.Ok(new { message = "Logout successful" });
            })
            .WithName("LogoutUser")
            .WithDescription("Logs out the current user and invalidates their tokens.");

        // GET /auth/me - Get current authenticated user
        group
            .MapGet("/me", (HttpContext httpContext) =>
            {
                var user = httpContext.Items["User"] as User;

                if (user is null)
                    return Results.Unauthorized();

                return Results.Ok(new
                {
                    user = new
                    {
                        id = user.Id,
                        email = user.Email,
                        displayName = user.DisplayName,
                        role = user.Role.ToString().ToLowerInvariant(),
                        userClass = user.UserClass,
                        isBanned = user.IsBanned == Core.Enums.BannedStatus.Banned
                    }
                });
            })
            .RequireAuth()
            .WithName("GetCurrentUser")
            .WithDescription("Returns the currently authenticated user.")
            .Produces(200)
            .Produces(401);

        return app;
    }
}
