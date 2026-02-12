using Backend.app.Core.Services;
using Backend.app.Infrastructure.Auth;
using Microsoft.AspNetCore.Mvc;

namespace Backend.app.API.Endpoints;

public static class RegistrationEndpoints
{
    public static RouteGroupBuilder MapRegistrationEndpoints(this IEndpointRouteBuilder app)
    {
        var group = app.MapGroup("/bookings")
            .WithTags("Registrations")
            .RequireAuth();

        // POST /api/bookings/{id}/register
        group.MapPost(
            "/{id}/register",
            async (long id, HttpContext context, RegistrationService service) =>
            {
                if (context.Items["UserId"] is not long userId)
                    return Results.Unauthorized();

                try
                {
                    var success = await service.RegisterParticipantAsync(userId, id);
                    return success
                        ? Results.Created(
                            $"/api/bookings/{id}/register",
                            new { message = "Registered successfully" }
                        )
                        : Results.BadRequest(new { message = "Registration failed" });
                }
                catch (KeyNotFoundException ex)
                {
                    return Results.NotFound(new { message = ex.Message });
                }
                catch (InvalidOperationException ex)
                {
                    return Results.BadRequest(new { message = ex.Message });
                }
            }
        )
        .WithName("RegisterForBooking")
        .WithSummary("Register for a booking")
        .WithDescription("Signs up the authenticated user for a specific booking.\n\n🔒 **Authentication Required**")
        .Produces(StatusCodes.Status201Created)
        .Produces(StatusCodes.Status401Unauthorized)
        .Produces(StatusCodes.Status404NotFound)
        .Produces(StatusCodes.Status400BadRequest);

        // DELETE /api/bookings/{id}/register
        group.MapDelete(
            "/{id}/register",
            async (long id, HttpContext context, RegistrationService service) =>
            {
                if (context.Items["UserId"] is not long userId)
                    return Results.Unauthorized();

                await service.UnregisterParticipantAsync(userId, id);
                return Results.NoContent();
            }
        )
        .WithName("UnregisterFromBooking")
        .WithSummary("Unregister from a booking")
        .WithDescription("Removes the authenticated user from a specific booking.\n\n🔒 **Authentication Required**")
        .Produces(StatusCodes.Status204NoContent)
        .Produces(StatusCodes.Status401Unauthorized);

        // GET /api/bookings/my-registrations
        group.MapGet(
            "/my-registrations",
            async (HttpContext context, RegistrationService service) =>
            {
                if (context.Items["UserId"] is not long userId)
                    return Results.Unauthorized();

                var bookings = await service.GetUserRegistrationsAsync(userId);
                return Results.Ok(bookings);
            }
        )
        .WithName("GetMyRegistrations")
        .WithSummary("Get user registrations")
        .WithDescription("Retrieves all bookings the authenticated user is registered for.\n\n🔒 **Authentication Required**")
        .Produces(StatusCodes.Status200OK)
        .Produces(StatusCodes.Status401Unauthorized);

        return group;
    }
}
