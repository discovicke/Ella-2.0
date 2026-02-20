using Backend.app.Core.Models.Entities;

namespace Backend.app.Infrastructure.Auth;

/// <summary>
/// Authorization middleware/filter that checks if user has required permissions.
/// Must be used AFTER AuthenticationMiddleware.
/// </summary>
public static class AuthorizationMiddleware
{
    /// <summary>
    /// Creates an endpoint filter that requires the user to be authenticated.
    /// Returns 401 Unauthorized if no user is attached to the request.
    /// </summary>
    public static async ValueTask<object?> RequireAuthentication(
        EndpointFilterInvocationContext invocationContext,
        EndpointFilterDelegate next
    )
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
    /// Creates an endpoint filter that requires the user to have a specific permission flag.
    /// Returns 401 if not authenticated, 403 if authenticated but lacking the permission.
    ///
    /// Usage: .RequirePermission("ManageUsers") to allow only users with ManageUsers=true.
    /// </summary>
    public static Func<
        EndpointFilterInvocationContext,
        EndpointFilterDelegate,
        ValueTask<object?>
    > RequirePermission(string permissionName)
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

            var permissions = httpContext.Items["Permissions"] as Permission;

            if (permissions is null || !HasPermission(permissions, permissionName))
            {
                var logger = httpContext.RequestServices.GetRequiredService<ILogger<Program>>();
                logger.LogWarning(
                    "Authorization failed: user {UserId} lacks permission {Permission}",
                    user.Id,
                    permissionName
                );

                return Results.Json(
                    new
                    {
                        error = "Forbidden",
                        message = "You do not have permission to perform this action",
                    },
                    statusCode: 403
                );
            }

            return await next(invocationContext);
        };
    }

    private static bool HasPermission(Permission p, string permissionName) =>
        permissionName switch
        {
            "BookRoom" => p.BookRoom,
            "MyBookings" => p.MyBookings,
            "ManageUsers" => p.ManageUsers,
            "ManageClasses" => p.ManageClasses,
            "ManageRooms" => p.ManageRooms,
            "ManageAssets" => p.ManageAssets,
            "ManageBookings" => p.ManageBookings,
            "ManageCampuses" => p.ManageCampuses,
            "ManageRoles" => p.ManageRoles,
            _ => false,
        };
}

/// <summary>
/// Extension methods for applying authorization to endpoint groups/routes.
/// </summary>
public static class AuthorizationExtensions
{
    public static RouteGroupBuilder RequireAuth(this RouteGroupBuilder group)
    {
        return group.AddEndpointFilter(AuthorizationMiddleware.RequireAuthentication);
    }

    public static RouteGroupBuilder RequirePermission(
        this RouteGroupBuilder group,
        string permissionName
    )
    {
        return group.AddEndpointFilter(AuthorizationMiddleware.RequirePermission(permissionName));
    }

    public static RouteHandlerBuilder RequireAuth(this RouteHandlerBuilder builder)
    {
        return builder.AddEndpointFilter(AuthorizationMiddleware.RequireAuthentication);
    }

    public static RouteHandlerBuilder RequirePermission(
        this RouteHandlerBuilder builder,
        string permissionName
    )
    {
        return builder.AddEndpointFilter(AuthorizationMiddleware.RequirePermission(permissionName));
    }
}
