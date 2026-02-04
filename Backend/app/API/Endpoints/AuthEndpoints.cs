using Backend.app.Core.DTO;
using Backend.app.Core.Services;

namespace Backend.app.API.Endpoints;

public static class AuthEndpoints
{
    public static IEndpointRouteBuilder MapAuthEndpoints(this IEndpointRouteBuilder app)
    {
        // Creates a common prefix for all endpoints in this group (/auth)
        var group = app.MapGroup("/auth").WithTags("Auth"); // Helps group them in Swagger/OpenAPI

        // POST /auth/register
        group
            .MapPost(
                "/register",
                async (RegisterDto request, AuthService authService) =>
                {
                    var result = await authService.RegisterAsync(request);
                    return Results.Ok(result);
                }
            )
            .WithName("RegisterUser")
            .WithDescription("Registers a new user.");
        // TODO: Migrate authentication endpoints (login, logout, register)
        // Reference: src/modules/auth/auth.routes.js + auth.controller.js

        return app;
    }
}
