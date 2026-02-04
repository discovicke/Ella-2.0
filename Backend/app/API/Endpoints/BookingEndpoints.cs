using Backend.app.Core.DTO;
using Backend.app.Core.Entities;
using Backend.app.Core.Enums;
using Backend.app.Core.Models.DTO;
using Backend.app.Core.Services;
using Microsoft.AspNetCore.Mvc;

namespace Backend.app.API.Endpoints;

public static class BookingEndpoints
{
    // TODO: Migrate all booking endpoints
    // Reference: src/modules/bookings/booking.routes.js + booking.controller.js
    
    public static RouteGroupBuilder MapBookingEndPoints(this IEndpointRouteBuilder app)
    {
        var group = app.MapGroup("/bookings").WithTags("Bookings");

        // GET /api/bookings

         group.MapGet("/",
          async (BookingService service) =>
          {
              var bookings = await service.GetAllBookingsAsync();
              return Results.Ok(bookings);
          });


        // POST /api/bookings

        group.MapPost("/",
        async (CreateBookingDto dto, BookingService service) =>
        {
            var createdBooking = await service.CreateBookingAsync(dto);
            return Results.NoContent();
        });
        
        // Get /api/bookings/{id}

        group.MapGet("/{id}",
        async (int id, BookingService service) =>
        {

            await service.CancelBookingAsync(new CancelBookingDto(id));
            return Results.NoContent();
        });

    return group;
    }
}
    