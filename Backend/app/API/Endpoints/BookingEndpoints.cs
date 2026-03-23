﻿using Backend.app.Core.Models;

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
            .Produces(StatusCodes.Status400BadRequest)
            .Produces(StatusCodes.Status401Unauthorized)
            .Produces(StatusCodes.Status403Forbidden);

        group
            .MapGet(
                "/availability",
                async (
                    [FromQuery] DateTime startTime,
                    [FromQuery] DateTime endTime,
                    [FromQuery] string? campus,
                    [FromQuery] long? roomTypeId,
                    [FromQuery] int? minCapacity,
                    [FromQuery] string? assets,
                    [FromQuery] string? query,
                    BookingService service
                ) =>
                {
                    if (endTime <= startTime)
                    {
                        return Results.BadRequest(
                            new { message = "End time must be after start time." }
                        );
                    }

                    var result = await service.GetRoomAvailabilityAsync(
                        new BookingAvailabilityQueryDto(
                            startTime,
                            endTime,
                            campus,
                            roomTypeId,
                            minCapacity,
                            assets,
                            query
                        )
                    );

                    return Results.Ok(result);
                }
            )
            .RequirePermission("BookRoom")
            .WithName("GetRoomAvailability")
            .WithSummary("Get room availability for a time slot")
            .WithDescription(
                "Returns available and unavailable rooms for a selected time slot, with conflict summaries and room match metadata.\n\n🔒 **Authentication Required**\n🔑 **Requires bookRoom permission**"
            )
            .Produces<IEnumerable<RoomAvailabilityResultDto>>(StatusCodes.Status200OK)
            .Produces(StatusCodes.Status400BadRequest)
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

                    var result = await service.CreateBookingAsync(safeDto);

                    if (!result.Success)
                    {
                        return Results.BadRequest(new { message = result.ErrorMessage });
                    }

                    if (result.ConflictResponse is not null)
                    {
                        return Results.Conflict(result.ConflictResponse);
                    }

                    if (result.Booking is null)
                    {
                        return Results.Conflict(
                            new { message = "The room is already booked for this time period." }
                        );
                    }

                    return Results.Created($"/api/bookings/{result.Booking.Id}", result.Booking);
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
            .Produces<BookingConflictResponseDto>(StatusCodes.Status409Conflict)
            .Produces(StatusCodes.Status401Unauthorized)
            .Produces(StatusCodes.Status403Forbidden);

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
            .Produces(StatusCodes.Status400BadRequest)
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

        // GET /api/bookings/form-status – admin check if public booking form is enabled
        group
            .MapGet(
                "/form-status",
                async (IConfiguration config, UserService userService) =>
                {
                    var email = config["BookingForm:SystemUserEmail"] ?? "bookingform@system.local";
                    var user = await userService.GetUserByEmailAsync(email);
                    if (user == null)
                        return Results.Ok(new { enabled = false });
                    return Results.Ok(
                        new
                        {
                            enabled = user.IsBanned == BannedStatus.NotBanned,
                            systemUserId = user.Id,
                        }
                    );
                }
            )
            .RequirePermission("ManageBookings")
            .WithName("GetBookingFormStatus")
            .WithSummary("Get booking form status")
            .WithDescription(
                "Returns whether the public booking form is enabled (system user not banned), plus the system user ID.\n\n🔒 **Authentication Required**\n🔑 **Requires manageBookings permission**"
            )
            .Produces(StatusCodes.Status200OK)
            .Produces(StatusCodes.Status401Unauthorized)
            .Produces(StatusCodes.Status403Forbidden);

        // POST /api/bookings/form-toggle – admin toggle public booking form on/off
        group
            .MapPost(
                "/form-toggle",
                async (IConfiguration config, UserService userService) =>
                {
                    var email = config["BookingForm:SystemUserEmail"] ?? "bookingform@system.local";
                    var user = await userService.GetUserByEmailAsync(email);
                    if (user == null)
                        return Results.NotFound("System user for booking form not found.");

                    var newStatus =
                        user.IsBanned == BannedStatus.Banned
                            ? BannedStatus.NotBanned
                            : BannedStatus.Banned;
                    await userService.SetBannedStatusAsync(user.Id, newStatus);
                    var enabled = newStatus == BannedStatus.NotBanned;
                    return Results.Ok(new { enabled });
                }
            )
            .RequirePermission("ManageBookings")
            .WithName("ToggleBookingForm")
            .WithSummary("Toggle public booking form on/off")
            .WithDescription(
                "Toggles the public booking form by banning/unbanning the system user.\n\n🔒 **Authentication Required**\n🔑 **Requires manageBookings permission**"
            )
            .Produces(StatusCodes.Status200OK)
            .Produces<string>(StatusCodes.Status404NotFound)
            .Produces(StatusCodes.Status401Unauthorized)
            .Produces(StatusCodes.Status403Forbidden);

        // ==========================================
        //  RECURRING SERIES ENDPOINTS
        // ==========================================

        // GET /api/bookings/series/{groupId}
        group
            .MapGet(
                "/series/{groupId:guid}",
                async (Guid groupId, BookingService service) =>
                {
                    var bookings = await service.GetSeriesAsync(groupId);
                    return bookings.Any() ? Results.Ok(bookings) : Results.NotFound();
                }
            )
            .WithName("GetBookingSeries")
            .WithSummary("Get all bookings in a recurring series")
            .WithDescription(
                "Returns all individual bookings sharing the same recurring group ID.\n\n🔒 **Authentication Required**"
            )
            .Produces<IEnumerable<Booking>>(StatusCodes.Status200OK)
            .Produces(StatusCodes.Status404NotFound);

        // DELETE /api/bookings/{id}/cancel?scope=single|thisAndFollowing|all
        group
            .MapDelete(
                "/{id}/cancel",
                async (
                    long id,
                    [FromQuery] string? scope,
                    HttpContext context,
                    BookingService service
                ) =>
                {
                    if (
                        context.Items["UserId"] is not long userId
                        || context.Items["Permissions"] is not UserPermissions permissions
                    )
                        return Results.Unauthorized();

                    var booking = await service.GetBookingByIdAsync(id);
                    if (booking is null) return Results.NotFound();

                    if (booking.UserId != userId && !permissions.ManageBookings)
                        return Results.Forbid();

                    var parsedScope = scope?.ToLower() switch
                    {
                        "thisandfollowing" => SeriesScope.ThisAndFollowing,
                        "all" => SeriesScope.All,
                        _ => SeriesScope.Single,
                    };

                    var cancelled = await service.CancelWithScopeAsync(id, parsedScope);
                    return Results.Ok(new { cancelledCount = cancelled });
                }
            )
            .WithName("CancelBookingWithScope")
            .WithSummary("Cancel booking(s) — single, this-and-following, or entire series")
            .WithDescription(
                "Cancels a booking. Use `scope=single` (default), `scope=thisAndFollowing`, or `scope=all`.\n\n🔒 **Authentication Required**"
            )
            .Produces(StatusCodes.Status200OK)
            .Produces(StatusCodes.Status404NotFound)
            .Produces(StatusCodes.Status401Unauthorized)
            .Produces(StatusCodes.Status403Forbidden);

        // PATCH /api/bookings/{id}/details
        group
            .MapPatch(
                "/{id}/details",
                async (
                    long id,
                    UpdateBookingDto dto,
                    HttpContext context,
                    BookingService service
                ) =>
                {
                    if (
                        context.Items["UserId"] is not long userId
                        || context.Items["Permissions"] is not UserPermissions permissions
                    )
                        return Results.Unauthorized();

                    var booking = await service.GetBookingByIdAsync(id);
                    if (booking is null) return Results.NotFound();

                    if (booking.UserId != userId && !permissions.ManageBookings)
                        return Results.Forbid();

                    var updated = await service.UpdateBookingDetailsAsync(id, dto);
                    return Results.Ok(updated);
                }
            )
            .WithName("UpdateBookingDetails")
            .WithSummary("Update a single booking's time/notes/lesson flag")
            .WithDescription(
                "Updates details of one booking. Re-validates room availability if time changed.\n\n🔒 **Authentication Required**"
            )
            .Accepts<UpdateBookingDto>("application/json")
            .Produces<Booking>(StatusCodes.Status200OK)
            .Produces(StatusCodes.Status404NotFound)
            .Produces(StatusCodes.Status401Unauthorized)
            .Produces(StatusCodes.Status403Forbidden);

        // POST /api/bookings/{id}/detach
        group
            .MapPost(
                "/{id}/detach",
                async (
                    long id,
                    HttpContext context,
                    BookingService service
                ) =>
                {
                    if (
                        context.Items["UserId"] is not long userId
                        || context.Items["Permissions"] is not UserPermissions permissions
                    )
                        return Results.Unauthorized();

                    var booking = await service.GetBookingByIdAsync(id);
                    if (booking is null) return Results.NotFound();

                    if (booking.UserId != userId && !permissions.ManageBookings)
                        return Results.Forbid();

                    var detached = await service.DetachFromSeriesAsync(id);
                    return Results.Ok(detached);
                }
            )
            .WithName("DetachBookingFromSeries")
            .WithSummary("Detach a booking from its recurring series")
            .WithDescription(
                "Removes the recurring group ID so the booking can be managed independently.\n\n🔒 **Authentication Required**"
            )
            .Produces<Booking>(StatusCodes.Status200OK)
            .Produces(StatusCodes.Status404NotFound)
            .Produces(StatusCodes.Status401Unauthorized)
            .Produces(StatusCodes.Status403Forbidden);

        return group;
    }
}
