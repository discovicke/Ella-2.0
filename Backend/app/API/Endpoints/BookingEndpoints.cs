using Backend.app.Core.Models.DTO;
using Backend.app.Core.Models.Enums;
using Backend.app.Core.Services;

namespace Backend.app.API.Endpoints;

public static class BookingEndpoints
{
    // TODO: Migrate all booking endpoints
    // Reference: src/modules/bookings/booking.routes.js + booking.controller.js

    public static RouteGroupBuilder MapBookingEndPoints(this IEndpointRouteBuilder app)
    {
        var group = app.MapGroup("/bookings").WithTags("Bookings");

        // GET /api/bookings

        group.MapGet(
            "/",
            async (BookingService service) =>
            {
                var bookings = await service.GetAllBookingsAsync();
                return Results.Ok(bookings);
            }
        );

        // POST /api/bookings

        group.MapPost(
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

                    return Results.Created($"/api/bookings/{createdBooking.Id}", createdBooking);
                }
                catch (KeyNotFoundException ex)
                {
                    return Results.NotFound(new { message = ex.Message });
                }
            }
        );

        // Get /api/bookings/{id}

        group.MapGet(
            "/{id}",
            async (long id, BookingService service) =>
            {
                var booking = await service.GetBookingByIdAsync(id);

                if (booking is null)
                {
                    return Results.NotFound();
                }

                return Results.Ok(new { isCancelled = booking.Status == BookingStatus.Cancelled });
            }
        );

        return group;
    }
}
