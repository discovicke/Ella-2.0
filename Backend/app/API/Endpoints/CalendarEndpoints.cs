using Backend.app.Core.Models.DTO;
using Backend.app.Core.Services;
using Backend.app.Infrastructure.Auth;
using Microsoft.AspNetCore.Mvc;

namespace Backend.app.API.Endpoints;

public static class CalendarEndpoints
{
    public static RouteGroupBuilder MapCalendarEndpoints(this IEndpointRouteBuilder app)
    {
        var group = app.MapGroup("/calendar").WithTags("Calendar").RequireAuth();

        group
            .MapGet(
                "/occupancy",
                async (
                    [FromQuery] DateTime startDate,
                    [FromQuery] DateTime endDate,
                    [FromQuery] long? roomId,
                    BookingService service
                ) =>
                {
                    if (endDate <= startDate)
                    {
                        return Results.BadRequest(
                            new { message = "End date must be after start date." }
                        );
                    }

                    var occupancy = await service.GetOccupancyAsync(startDate, endDate, roomId);
                    return Results.Ok(occupancy);
                }
            )
            .RequirePermission("BookRoom")
            .WithName("GetCalendarOccupancy")
            .WithSummary("Get room occupancy for calendar display")
            .WithDescription(
                "Returns occupied time slots for rooms within a date range. Only returns Active bookings - cancelled and expired are excluded.\n\n🔒 **Authentication Required**\n🔑 **Requires bookRoom permission**"
            )
            .Produces<IEnumerable<OccupancySlotDto>>(StatusCodes.Status200OK)
            .Produces(StatusCodes.Status400BadRequest)
            .Produces(StatusCodes.Status401Unauthorized)
            .Produces(StatusCodes.Status403Forbidden);

        return group;
    }
}
