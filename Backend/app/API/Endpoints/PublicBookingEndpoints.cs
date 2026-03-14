using Backend.app.Core.Models.DTO;
using Backend.app.Core.Models.Entities;
using Backend.app.Core.Models.Enums;
using Backend.app.Core.Models.ReadModels;
using Backend.app.Core.Services;
using Microsoft.AspNetCore.Mvc;

namespace Backend.app.API.Endpoints;

/// <summary>
/// Public endpoints for the external booking form.
/// No authentication required — uses a dedicated system user internally.
/// </summary>
public static class PublicBookingEndpoints
{
    public static RouteGroupBuilder MapPublicBookingEndpoints(this IEndpointRouteBuilder app)
    {
        var group = app.MapGroup("/public").WithTags("Public Booking Form");

        // GET /api/public/rooms — readonly room list for the booking form
        group
            .MapGet(
                "/rooms",
                async (RoomService roomService) =>
                {
                    var rooms = await roomService.GetRoomsAsync(null, null);
                    return Results.Ok(rooms);
                }
            )
            .WithName("PublicGetRooms")
            .WithSummary("Get all rooms (public)")
            .WithDescription(
                "Retrieves all rooms with details for the public booking form. No authentication required."
            )
            .Produces<IEnumerable<RoomDetailModel>>(StatusCodes.Status200OK);

        // GET /api/public/campuses — readonly campus list for the booking form
        group
            .MapGet(
                "/campuses",
                async (CampusService campusService) =>
                {
                    var campuses = await campusService.GetAllAsync();
                    return Results.Ok(campuses);
                }
            )
            .WithName("PublicGetCampuses")
            .WithSummary("Get all campuses (public)")
            .WithDescription(
                "Retrieves all campuses for the public booking form. No authentication required."
            )
            .Produces<IEnumerable<CampusResponseDto>>(StatusCodes.Status200OK);

        // GET /api/public/bookings/status — check if the booking form is enabled
        group
            .MapGet(
                "/bookings/status",
                async (IConfiguration config, UserService userService) =>
                {
                    var systemUser = await GetSystemUserAsync(config, userService);
                    if (systemUser is null)
                    {
                        return Results.Ok(
                            new { enabled = false, reason = "System user not configured." }
                        );
                    }

                    var isEnabled = systemUser.IsBanned == BannedStatus.NotBanned;
                    return Results.Ok(new { enabled = isEnabled });
                }
            )
            .WithName("PublicGetBookingFormStatus")
            .WithSummary("Check if the booking form is enabled")
            .WithDescription(
                "Returns whether the public booking form is currently accepting submissions."
            )
            .Produces(StatusCodes.Status200OK);

        // POST /api/public/bookings — create a pending booking
        group
            .MapPost(
                "/bookings",
                async (
                    CreateBookingDto dto,
                    IConfiguration config,
                    UserService userService,
                    BookingService bookingService
                ) =>
                {
                    // Validate required fields
                    if (dto.StartTime >= dto.EndTime)
                        return Results.BadRequest(
                            new { message = "Start time must be before end time." }
                        );

                    // Look up the system user
                    var systemUser = await GetSystemUserAsync(config, userService);
                    if (systemUser is null)
                    {
                        return Results.Problem(
                            "Booking form system user not found. Contact an administrator.",
                            statusCode: StatusCodes.Status503ServiceUnavailable
                        );
                    }

                    // Check if the booking form is disabled (system user is banned)
                    if (systemUser.IsBanned == BannedStatus.Banned)
                    {
                        return Results.Json(
                            new { message = "The booking form is currently disabled." },
                            statusCode: StatusCodes.Status403Forbidden
                        );
                    }

                    // Create the booking as Pending, owned by the system user
                    var createDto = dto with
                    {
                        UserId = systemUser.Id,
                        Status = BookingStatus.Pending,
                    };

                    try
                    {
                        var result = await bookingService.CreateBookingAsync(createDto);

                        if (!result.Success || result.Booking is null)
                        {
                            return Results.Conflict(
                                new { message = result.ErrorMessage ?? "The room is already booked for this time period." }
                            );
                        }

                        return Results.Created(
                            $"/api/public/bookings/{result.Booking.Id}",
                            new
                            {
                                id = result.Booking.Id,
                                message = "Your booking request has been submitted and is awaiting approval.",
                                status = "Pending",
                            }
                        );
                    }
                    catch (KeyNotFoundException ex)
                    {
                        return Results.BadRequest(new { message = ex.Message });
                    }
                }
            )
            .WithName("PublicCreateBooking")
            .WithSummary("Submit a public booking request")
            .WithDescription(
                "Creates a new booking with Pending status via the public booking form.\n"
                    + "The booking must be approved by an administrator before it becomes active.\n\n"
                    + "⚠️ **Rate limited** — max 5 requests per 15 minutes per IP."
            )
            .Accepts<CreateBookingDto>("application/json")
            .Produces(StatusCodes.Status201Created)
            .Produces(StatusCodes.Status400BadRequest)
            .Produces(StatusCodes.Status403Forbidden)
            .Produces(StatusCodes.Status409Conflict)
            .Produces(StatusCodes.Status429TooManyRequests)
            .Produces(StatusCodes.Status503ServiceUnavailable)
            .RequireRateLimiting("publicBooking");

        return group;
    }

    /// <summary>
    /// Looks up the booking form system user by the configured email address.
    /// </summary>
    private static async Task<User?> GetSystemUserAsync(
        IConfiguration config,
        UserService userService
    )
    {
        var email = config["BookingForm:SystemUserEmail"];
        if (string.IsNullOrEmpty(email))
            return null;

        return await userService.GetUserByEmailAsync(email);
    }
}
