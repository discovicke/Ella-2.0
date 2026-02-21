using Backend.app.Core.Models;
using Backend.app.Core.Models.DTO;
using Backend.app.Core.Models.Entities;
using Backend.app.Core.Models.Enums;
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

        // POST /auth/register
        group
            .MapPost(
                "/register",
                async (
                    RegisterDto request,
                    AuthService authService,
                    HttpContext httpContext,
                    IHostEnvironment env,
                    IConfiguration configuration
                ) =>
                {
                    var result = await authService.RegisterAsync(request);

                    if (!result.Success || result.Response is null)
                        return Results.BadRequest(
                            new
                            {
                                error = "Registration failed",
                                message = "Email may already exist",
                            }
                        );

                    var expirationMinutes = int.Parse(
                        configuration["JwtSettings:AccessTokenExpirationMinutes"] ?? "60"
                    );

                    httpContext.Response.Cookies.Append(
                        "auth_token",
                        result.Response.Token,
                        new CookieOptions
                        {
                            HttpOnly = true,
                            SameSite = SameSiteMode.Lax,
                            Secure = !env.IsDevelopment(),
                            MaxAge = TimeSpan.FromMinutes(expirationMinutes),
                            Path = "/",
                        }
                    );

                    if (!env.IsDevelopment())
                    {
                        result.Response.Token = "";
                    }

                    return Results.Created(
                        $"/api/users/{result.Response.User.Id}",
                        result.Response
                    );
                }
            )
            .WithName("RegisterUser")
            .WithSummary("Register a new user")
            .WithDescription("Creates a new user account and returns an authentication token.")
            .Accepts<RegisterDto>("application/json")
            .Produces<AuthResponseDto>(StatusCodes.Status201Created)
            .Produces(StatusCodes.Status400BadRequest);

        // POST /auth/login
        group
            .MapPost(
                "/login",
                async (
                    LoginDto request,
                    AuthService authService,
                    HttpContext httpContext,
                    IHostEnvironment env,
                    IConfiguration configuration
                ) =>
                {
                    var result = await authService.LoginAsync(request);

                    if (result.IsBanned)
                    {
                        return Results.Json(
                            new
                            {
                                error = "Banned",
                                message = "Your account has been suspended.",
                                code = "USER_BANNED",
                                user = result.Response?.User,
                            },
                            statusCode: StatusCodes.Status403Forbidden
                        );
                    }

                    if (!result.Success || result.Response is null)
                        return Results.Unauthorized();

                    var expirationMinutes = int.Parse(
                        configuration["JwtSettings:AccessTokenExpirationMinutes"] ?? "60"
                    );

                    httpContext.Response.Cookies.Append(
                        "auth_token",
                        result.Response.Token,
                        new CookieOptions
                        {
                            HttpOnly = true,
                            SameSite = SameSiteMode.Lax,
                            Secure = !env.IsDevelopment(),
                            MaxAge = TimeSpan.FromMinutes(expirationMinutes),
                            Path = "/",
                        }
                    );

                    if (!env.IsDevelopment())
                    {
                        result.Response.Token = "";
                    }

                    return Results.Ok(result.Response);
                }
            )
            .WithName("LoginUser")
            .WithSummary("Login user")
            .WithDescription(
                "Authenticates a user with email and password, returning a JWT token and user info on success."
            )
            .Accepts<LoginDto>("application/json")
            .Produces<AuthResponseDto>(StatusCodes.Status200OK)
            .Produces(StatusCodes.Status401Unauthorized);

        // POST /auth/logout
        group
            .MapPost(
                "/logout",
                async (HttpContext httpContext, AuthService authService) =>
                {
                    httpContext.Response.Cookies.Delete(
                        "auth_token",
                        new CookieOptions { Path = "/" }
                    );

                    var userId = httpContext.Items["UserId"] as long?;
                    if (userId.HasValue)
                    {
                        await authService.InvalidateAllTokensAsync(userId.Value);
                    }

                    return Results.Ok(new { message = "Logout successful" });
                }
            )
            .WithName("LogoutUser")
            .WithSummary("Logout user")
            .WithDescription(
                "Logs out the current user, clears the auth cookie, and invalidates their tokens."
            )
            .Produces(StatusCodes.Status200OK);

        // GET /auth/me
        group
            .MapGet(
                "/me",
                (HttpContext httpContext) =>
                {
                    var user = httpContext.Items["User"] as User;
                    var permissions = httpContext.Items["Permissions"] as UserPermissions;

                    if (user is null)
                        return Results.Unauthorized();

                    return Results.Ok(
                        new
                        {
                            user = new
                            {
                                id = user.Id,
                                email = user.Email,
                                displayName = user.DisplayName,
                                permissions,
                                isBanned = user.IsBanned == BannedStatus.Banned,
                            },
                        }
                    );
                }
            )
            .RequireAuth()
            .WithName("GetCurrentUser")
            .WithSummary("Get current user")
            .WithDescription("Retrieves the details of the currently authenticated user.")
            .Produces(StatusCodes.Status200OK)
            .Produces(StatusCodes.Status401Unauthorized);

        return app;
    }
}
