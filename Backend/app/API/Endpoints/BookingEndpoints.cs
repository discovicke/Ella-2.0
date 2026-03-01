using Backend.app.Core.Models;
using Backend.app.Core.Models.DTO;
using Backend.app.Core.Models.Entities;
using Backend.app.Core.Models.Enums;
using Backend.app.Core.Models.ReadModels;
using Backend.app.Core.Services;
using Backend.app.Infrastructure.Auth;
using Microsoft.AspNetCore.Mvc;

namespace Backend.app.API.Endpoints;

public static class BookingEndpoints
{
    public static RouteGroupBuilder MapBookingEndpoints(this IEndpointRouteBuilder app)
    {
        var group = app.MapGroup("/bookings").WithTags("Bookings").RequireAuth();

        // GET /api/bookings
        group
            .MapGet(
                "/",
                async (
                    [FromQuery] int? page,
                    [FromQuery] int? pageSize,
                    [FromQuery] string? search,
                    [FromQuery] long? userId,
                    [FromQuery] long? roomId,
                    [FromQuery] DateTime? startDate,
                    [FromQuery] DateTime? endDate,
                    [FromQuery] BookingStatus? status,
                    [FromQuery] string? groupBy,
                    BookingService service
                ) =>
                {
                    // When groupBy is provided, use group-aware pagination
                    if (!string.IsNullOrWhiteSpace(groupBy))
                    {
                        var validGroups = new HashSet<string>
                        {
                            "room",
                            "user",
                            "campus",
                            "day",
                            "week",
                            "month",
                        };
                        if (!validGroups.Contains(groupBy))
                        {
                            return Results.BadRequest(
                                new
                                {
                                    message = $"Invalid groupBy value '{groupBy}'. Must be one of: {string.Join(", ", validGroups)}",
                                }
                            );
                        }

                        var grouped = await service.GetGroupedFilteredBookingsPagedAsync(
                            groupBy,
                            page is > 0 ? page.Value : 1,
                            pageSize is > 0 ? pageSize.Value : 10,
                            search,
                            userId,
                            roomId,
                            startDate,
                            endDate,
                            status
                        );
                        return Results.Ok(grouped);
                    }

                    var result = await service.GetFilteredBookingsPagedAsync(
                        page is > 0 ? page.Value : 1,
                        pageSize is > 0 ? pageSize.Value : 25,
                        search,
                        userId,
                        roomId,
                        startDate,
                        endDate,
                        status
                    );
                    return Results.Ok(result);
                }
            )
            .RequirePermission("ManageBookings")
            .WithName("GetAllBookings")
            .WithSummary("Get all bookings (paginated, optionally grouped)")
            .WithDescription(
                "Retrieves a paginated list of bookings, optionally filtered by user, room, date range, status, or search.\nWhen groupBy is provided, paginates by groups (e.g., 10 rooms per page) and returns all bookings for those groups.\n\n🔒 **Authentication Required**\n🔑 **Requires manageBookings permission**"
            )
            .Produces<PagedResult<BookingDetailedReadModel>>(StatusCodes.Status200OK)
            .Produces<GroupedPagedResult<BookingDetailedReadModel>>(StatusCodes.Status200OK)
            .Produces(StatusCodes.Status401Unauthorized)
            .Produces(StatusCodes.Status403Forbidden);

        // POST /api/bookings
        group
            .MapPost(
                "/",
                async (CreateBookingDto dto, HttpContext context, BookingService service) =>
                {
                    // Layer 2 Validation: Logic Check
                    if (dto.StartTime >= dto.EndTime)
                    {
                        return Results.BadRequest(
                            new { message = "Start time must be before end time." }
                        );
                    }

                    // SECURITY: Force UserId from authenticated context
                    if (context.Items["UserId"] is not long authenticatedUserId)
                    {
                        return Results.Unauthorized();
                    }

                    // Create a modified DTO with the trusted User ID
                    var safeDto = dto with
                    {
                        UserId = authenticatedUserId,
                    };

                    var createdBooking = await service.CreateBookingAsync(safeDto);

                    if (createdBooking is null)
                    {
                        return Results.Conflict(
                            new { message = "The room is already booked for this time period." }
                        );
                    }

                    return Results.Created($"/api/bookings/{createdBooking.Id}", createdBooking);
                }
            )
            .RequirePermission("BookRoom")
            .WithName("CreateBooking")
            .WithSummary("Create a new booking")
            .WithDescription(
                "Creates a new booking for the authenticated user.\n\n🔒 **Authentication Required**\n🔑 **Requires bookRoom permission**"
            )
            .Accepts<CreateBookingDto>("application/json")
            .Produces<BookingDetailedReadModel>(StatusCodes.Status201Created)
            .Produces(StatusCodes.Status400BadRequest)
            .Produces(StatusCodes.Status404NotFound)
            .Produces(StatusCodes.Status409Conflict)
            .Produces(StatusCodes.Status401Unauthorized);

        // PUT /api/bookings/{id}
        group
            .MapPut(
                "/{id}",
                async (
                    long id,
                    BookingStatus newStatus,
                    HttpContext context,
                    BookingService service
                ) =>
                {
                    if (
                        context.Items["UserId"] is not long userId
                        || context.Items["Permissions"] is not UserPermissions permissions
                    )
                    {
                        return Results.Unauthorized();
                    }

                    var booking = await service.GetBookingByIdAsync(id);
                    if (booking is null)
                    {
                        return Results.NotFound();
                    }

                    // Authorization: Must be owner OR have ManageBookings permission
                    bool isOwner = booking.UserId == userId;
                    bool canManage = permissions.ManageBookings;

                    if (!isOwner && !canManage)
                    {
                        return Results.Forbid();
                    }

                    // Business Logic: Regular users can only cancel their bookings
                    if (!canManage && newStatus != BookingStatus.Cancelled)
                    {
                        return Results.BadRequest(
                            new { message = "You can only cancel your own bookings." }
                        );
                    }

                    var updatedBooking = await service.UpdateBookingStatusAsync(id, newStatus);
                    return Results.Ok(updatedBooking);
                }
            )
            .WithName("UpdateBookingStatus")
            .WithSummary("Update booking status by ID")
            .WithDescription(
                "Updates the status of a specific booking. Users can cancel their own bookings; managers can update any booking.\n\n🔒 **Authentication Required**"
            )
            .Produces(StatusCodes.Status200OK)
            .Produces(StatusCodes.Status404NotFound)
            .Produces(StatusCodes.Status401Unauthorized)
            .Produces(StatusCodes.Status403Forbidden);

        // GET /api/bookings/my-owned
        group
            .MapGet(
                "/my-owned",
                async (
                    [FromQuery] int? page,
                    [FromQuery] int? pageSize,
                    [FromQuery] string? timeFilter,
                    [FromQuery] bool? includeCancelled,
                    HttpContext context,
                    BookingService service
                ) =>
                {
                    if (context.Items["UserId"] is not long userId)
                        return Results.Unauthorized();

                    var result = await service.GetUserOwnedBookingsPagedAsync(
                        userId,
                        page is > 0 ? page.Value : 1,
                        pageSize is > 0 ? pageSize.Value : 20,
                        timeFilter,
                        includeCancelled ?? true
                    );
                    return Results.Ok(result);
                }
            )
            .WithName("GetMyOwnedBookings")
            .WithSummary("Get owned bookings (paginated)")
            .WithDescription(
                "Retrieves paginated bookings created by the authenticated user. Use timeFilter=upcoming or timeFilter=history to filter.\n\n🔒 **Authentication Required**"
            )
            .Produces<PagedResult<BookingDetailedReadModel>>(StatusCodes.Status200OK)
            .Produces(StatusCodes.Status401Unauthorized);

        return group;
    }
}
