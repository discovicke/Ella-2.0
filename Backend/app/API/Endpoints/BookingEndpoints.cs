using Backend.app.Core.Models.DTO;
using Backend.app.Core.Models.Entities;
using Backend.app.Core.Models.Enums;
using Backend.app.Core.Models.ReadModels;
using Backend.app.Core.Services;

namespace Backend.app.API.Endpoints;

public static class BookingEndpoints
{
    // TODO: Migrate all booking endpoints
    // Reference: src/modules/bookings/booking.routes.js + booking.controller.js

    public static RouteGroupBuilder MapBookingEndpoints(this IEndpointRouteBuilder app)
    {
        var group = app.MapGroup("/bookings").WithTags("Bookings");

        // GET /api/bookings

        group
            .MapGet(
                "/",
                async (BookingService service) =>
                {
                    var bookings = await service.GetAllBookingsAsync();
                    return Results.Ok(bookings);
                }
            )
            .WithName("GetAllBookings")
            .WithSummary("Get all bookings")
            .WithDescription("Retrieves a detailed list of all bookings in the system.")
            .Produces<IEnumerable<BookingDetailedReadModel>>(StatusCodes.Status200OK);

        // POST /api/bookings

        group
            .MapPost(
                "/",
                async (CreateBookingDto dto, BookingService service) =>
                {
                    // Layer 2 Validation: Logic Check
                    if (dto.StartTime >= dto.EndTime)
                    {
                        return Results.BadRequest(
                            new { message = "Start time must be before end time." }
                        );
                    }

                    try
                    {
                        var createdBooking = await service.CreateBookingAsync(dto);

                        if (createdBooking is null)
                        {
                            return Results.Conflict(
                                new { message = "The room is already booked for this time period." }
                            );
                        }

                        return Results.Created(
                            $"/api/bookings/{createdBooking.Id}",
                            createdBooking
                        );
                    }
                    catch (KeyNotFoundException ex)
                    {
                        return Results.NotFound(new { message = ex.Message });
                    }
                }
            )
            .WithName("CreateBooking")
            .WithSummary("Create a new booking")
            .WithDescription("Creates a new booking if the room is available and user exists.")
            .Accepts<CreateBookingDto>("application/json")
            .Produces<BookingDetailedReadModel>(StatusCodes.Status201Created)
            .Produces(StatusCodes.Status400BadRequest)
            .Produces(StatusCodes.Status404NotFound)
            .Produces(StatusCodes.Status409Conflict);

        // Get /api/bookings/{id}

        group
            .MapPut(
                "/{id}",
                async (long id, BookingStatus newStatus, BookingService service) =>
                {
                    Booking booking = await service.UpdateBookingStatusAsync(id, newStatus);

                    return Results.Ok(booking);
                }
            )
            .WithName("UpdateBookingStatus")
            .WithSummary("Update booking status by ID")
            .WithDescription("Updates the status of a specific booking.")
            .Produces(StatusCodes.Status200OK)
            .Produces(StatusCodes.Status404NotFound);

        // POST /api/bookings/{id}/register
        group
            .MapPost(
                "/{id}/register",
                async (long id, HttpContext context, BookingService service) =>
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
            .WithDescription("Signs up the authenticated user for a specific booking.")
            .Produces(StatusCodes.Status201Created)
            .Produces(StatusCodes.Status401Unauthorized)
            .Produces(StatusCodes.Status404NotFound)
            .Produces(StatusCodes.Status400BadRequest);

        // DELETE /api/bookings/{id}/register
        group
            .MapDelete(
                "/{id}/register",
                async (long id, HttpContext context, BookingService service) =>
                {
                    if (context.Items["UserId"] is not long userId)
                        return Results.Unauthorized();

                    await service.UnregisterParticipantAsync(userId, id);
                    return Results.NoContent();
                }
            )
            .WithName("UnregisterFromBooking")
            .WithSummary("Unregister from a booking")
            .WithDescription("Removes the authenticated user from a specific booking.")
            .Produces(StatusCodes.Status204NoContent)
            .Produces(StatusCodes.Status401Unauthorized);

        // GET /api/bookings/my-registrations
        group
            .MapGet(
                "/my-registrations",
                async (HttpContext context, BookingService service) =>
                {
                    if (context.Items["UserId"] is not long userId)
                        return Results.Unauthorized();

                    var bookings = await service.GetUserRegistrationsAsync(userId);
                    return Results.Ok(bookings);
                }
            )
            .WithName("GetMyRegistrations")
            .WithSummary("Get user registrations")
            .WithDescription("Retrieves all bookings the authenticated user is registered for.")
            .Produces<IEnumerable<BookingDetailedReadModel>>(StatusCodes.Status200OK)
            .Produces(StatusCodes.Status401Unauthorized);

        // GET /api/bookings/my-owned
        group
            .MapGet(
                "/my-owned",
                async (HttpContext context, BookingService service) =>
                {
                    if (context.Items["UserId"] is not long userId)
                        return Results.Unauthorized();

                    var bookings = await service.GetUserOwnedBookingsAsync(userId);
                    return Results.Ok(bookings);
                }
            )
            .WithName("GetMyOwnedBookings")
            .WithSummary("Get owned bookings")
            .WithDescription("Retrieves all bookings created by the authenticated user.")
            .Produces<IEnumerable<BookingDetailedReadModel>>(StatusCodes.Status200OK)
            .Produces(StatusCodes.Status401Unauthorized);

        return group;
    }
}
