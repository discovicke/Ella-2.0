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

        
         group.MapGet("/",
          async (BookingService service) =>
          {
              var bookings = await service.GetAllBookingsAsync();
              return Results.Ok(bookings);
          });

        return group;
    }
    
}