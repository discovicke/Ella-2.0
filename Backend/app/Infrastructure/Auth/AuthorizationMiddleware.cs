using Backend.app.Core.Models.Entities;
using Backend.app.Core.Models.Enums;

namespace Backend.app.Infrastructure.Auth;

/// <summary>
/// Authorization middleware/filter that checks if user has required role.
/// Must be used AFTER AuthenticationMiddleware.
/// 
/// Equivalent to the JS authorize middleware that:
/// 1. Checks if user is authenticated (req.user exists)
/// 2. Checks if user's role is in the allowed roles list
/// 3. Returns 401/403 if not authorized
/// </summary>
public static class AuthorizationMiddleware
{
    /// <summary>
    /// Creates an endpoint filter that requires the user to be authenticated.
    /// Returns 401 Unauthorized if no user is attached to the request.
    /// </summary>
    public static async ValueTask<object?> RequireAuthentication(EndpointFilterInvocationContext invocationContext, EndpointFilterDelegate next)
    {
        var httpContext = invocationContext.HttpContext;
        var user = httpContext.Items["User"] as User;

        if (user is null)
        {
            return Results.Json(
                new { error = "Unauthorized", message = "Authentication required" },
                statusCode: 401
            );
        }

        return await next(invocationContext);
    }

    /// <summary>
    /// Creates an endpoint filter that requires the user to have one of the specified roles.
    /// Returns 401 if not authenticated, 403 if authenticated but wrong role.
    /// 
    /// Usage: .RequireRoles(UserRole.Admin, UserRole.Educator) to allow only admins and educators.
    /// </summary>
    public static Func<EndpointFilterInvocationContext, EndpointFilterDelegate, ValueTask<object?>> RequireRoles(params UserRole[] allowedRoles)
    {
        return async (invocationContext, next) =>
        {
            var httpContext = invocationContext.HttpContext;
            var user = httpContext.Items["User"] as User;

            if (user is null)
            {
                return Results.Json(
                    new { error = "Unauthorized", message = "Authentication required" },
                    statusCode: 401
                );
            }

            if (!allowedRoles.Contains(user.Role))
            {
                var logger = httpContext.RequestServices.GetRequiredService<ILogger<Program>>();
                logger.LogWarning(
                    "Authorization failed: user {UserId} with role {Role} attempted to access resource requiring {AllowedRoles}",
                    user.Id,
                    user.Role,
                    string.Join(", ", allowedRoles)
                );

                return Results.Json(
                    new { error = "Forbidden", message = "You do not have permission to perform this action" },
                    statusCode: 403
                );
            }

            return await next(invocationContext);
        };
    }
}

/// <summary>
/// Extension methods for applying authorization to endpoint groups/routes.
/// </summary>
public static class AuthorizationExtensions
{
    /// <summary>
    /// Requires authentication for all endpoints in this group.
    /// </summary>
    public static RouteGroupBuilder RequireAuth(this RouteGroupBuilder group)
    {
        return group.AddEndpointFilter(AuthorizationMiddleware.RequireAuthentication);
    }

    /// <summary>
    /// Requires the user to have one of the specified roles.
    /// </summary>
    public static RouteGroupBuilder RequireRoles(this RouteGroupBuilder group, params UserRole[] roles)
    {
        return group.AddEndpointFilter(AuthorizationMiddleware.RequireRoles(roles));
    }

    /// <summary>
    /// Requires authentication for this specific endpoint.
    /// </summary>
    public static RouteHandlerBuilder RequireAuth(this RouteHandlerBuilder builder)
    {
        return builder.AddEndpointFilter(AuthorizationMiddleware.RequireAuthentication);
    }

    /// <summary>
    /// Requires the user to have one of the specified roles for this endpoint.
    /// </summary>
    public static RouteHandlerBuilder RequireRoles(this RouteHandlerBuilder builder, params UserRole[] roles)
    {
        return builder.AddEndpointFilter(AuthorizationMiddleware.RequireRoles(roles));
    }
}