using Backend.app.Core.Models.Enums;
using Backend.app.Core.Services;
using Backend.app.Infrastructure.Auth;

namespace Backend.app.API.Endpoints;

public static class RegistrationEndpoints
{
    public static RouteGroupBuilder MapRegistrationEndpoints(this IEndpointRouteBuilder app)
    {
        var group = app.MapGroup("/bookings").WithTags("Registrations").RequireAuth();

        // ─── RSVP / register ────────────────────────────────
        // POST /api/bookings/{id}/register  — accept invite or self-register
        group
            .MapPost(
                "/{id}/register",
                async (long id, HttpContext context, RegistrationService service) =>
                {
                    if (context.Items["UserId"] is not long userId)
                        return Results.Unauthorized();

                    try
                    {
                        var success = await service.AcceptInvitationAsync(userId, id);
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
            .WithSummary("Register / RSVP for a booking")
            .WithDescription(
                "Accepts an invitation or self-registers the authenticated user for a booking.\n\n🔒 **Authentication Required**"
            )
            .Produces(StatusCodes.Status201Created)
            .Produces(StatusCodes.Status401Unauthorized)
            .Produces(StatusCodes.Status404NotFound)
            .Produces(StatusCodes.Status400BadRequest);

        // DELETE /api/bookings/{id}/register  — unregister / decline
        group
            .MapDelete(
                "/{id}/register",
                async (long id, HttpContext context, RegistrationService service) =>
                {
                    if (context.Items["UserId"] is not long userId)
                        return Results.Unauthorized();

                    try
                    {
                        await service.UnregisterAsync(userId, id);
                        return Results.NoContent();
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
            .WithName("UnregisterFromBooking")
            .WithSummary("Unregister / decline invitation")
            .WithDescription(
                "Removes the authenticated user's registration from a booking.\n\n🔒 **Authentication Required**"
            )
            .Produces(StatusCodes.Status204NoContent)
            .Produces(StatusCodes.Status401Unauthorized)
            .Produces(StatusCodes.Status404NotFound)
            .Produces(StatusCodes.Status400BadRequest);

        // POST /api/bookings/{id}/decline  — decline an invitation (keeps row as declined)
        group
            .MapPost(
                "/{id}/decline",
                async (long id, HttpContext context, RegistrationService service) =>
                {
                    if (context.Items["UserId"] is not long userId)
                        return Results.Unauthorized();

                    try
                    {
                        var success = await service.DeclineInvitationAsync(userId, id);
                        return success
                            ? Results.Ok(new { message = "Invitation declined" })
                            : Results.BadRequest(new { message = "Could not decline" });
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
            .WithName("DeclineInvitation")
            .WithSummary("Decline an invitation")
            .WithDescription(
                "Sets the invitation status to 'declined'. The invitation remains visible but the user is not counted as attending. Can be re-accepted later.\n\n🔒 **Authentication Required**"
            )
            .Produces(StatusCodes.Status200OK)
            .Produces(StatusCodes.Status401Unauthorized)
            .Produces(StatusCodes.Status404NotFound)
            .Produces(StatusCodes.Status400BadRequest);

        // DELETE /api/bookings/{id}/invitations/{targetUserId}  — owner removes an invitation
        group
            .MapDelete(
                "/{id}/invitations/{targetUserId}",
                async (
                    long id,
                    long targetUserId,
                    HttpContext context,
                    RegistrationService service
                ) =>
                {
                    if (context.Items["UserId"] is not long userId)
                        return Results.Unauthorized();

                    try
                    {
                        await service.RemoveInvitationAsync(userId, id, targetUserId);
                        return Results.NoContent();
                    }
                    catch (KeyNotFoundException ex)
                    {
                        return Results.NotFound(new { message = ex.Message });
                    }
                    catch (UnauthorizedAccessException)
                    {
                        return Results.Forbid();
                    }
                }
            )
            .WithName("RemoveInvitation")
            .WithSummary("Remove an invitation (owner only)")
            .WithDescription(
                "Permanently removes an invitation for a specific user. Only the booking owner can perform this action.\n\n🔒 **Authentication Required** — **Owner Only**"
            )
            .Produces(StatusCodes.Status204NoContent)
            .Produces(StatusCodes.Status401Unauthorized)
            .Produces(StatusCodes.Status403Forbidden)
            .Produces(StatusCodes.Status404NotFound);

        // ─── Current-user lists ─────────────────────────────
        // GET /api/bookings/my-registration-bookings?statuses=registered,invited&timeFilter=upcoming
        group
            .MapGet(
                "/my-registration-bookings",
                async (
                    HttpContext context,
                    RegistrationService service,
                    string? statuses,
                    string? timeFilter,
                    int? page,
                    int? pageSize
                ) =>
                {
                    if (context.Items["UserId"] is not long userId)
                        return Results.Unauthorized();

                    var parsed = new List<RegistrationStatus>();
                    if (!string.IsNullOrWhiteSpace(statuses))
                    {
                        foreach (
                            var s in statuses.Split(
                                ',',
                                StringSplitOptions.RemoveEmptyEntries
                                    | StringSplitOptions.TrimEntries
                            )
                        )
                        {
                            if (
                                Enum.TryParse<RegistrationStatus>(
                                    s,
                                    ignoreCase: true,
                                    out var status
                                )
                            )
                                parsed.Add(status);
                            else
                                return Results.BadRequest(
                                    new
                                    {
                                        message = $"Invalid status: '{s}'. Valid values: invited, registered, declined.",
                                    }
                                );
                        }
                    }

                    // Default to all statuses when none specified
                    if (parsed.Count == 0)
                        parsed.AddRange(
                            [
                                RegistrationStatus.Invited,
                                RegistrationStatus.Registered,
                                RegistrationStatus.Declined,
                            ]
                        );

                    // Validate timeFilter
                    if (timeFilter is not null && timeFilter is not "upcoming" and not "history")
                        return Results.BadRequest(
                            new { message = "Invalid timeFilter. Valid values: upcoming, history." }
                        );

                    // Pagination defaults: page=1, pageSize=20, clamp pageSize to 1-100
                    var pg = page ?? 1;
                    var ps = Math.Clamp(pageSize ?? 20, 1, 100);
                    if (pg < 1)
                        pg = 1;

                    var (bookings, totalCount) =
                        await service.GetUserRegistrationBookingsPagedAsync(
                            userId,
                            parsed,
                            pg,
                            ps,
                            timeFilter
                        );
                    return Results.Ok(
                        new
                        {
                            items = bookings,
                            totalCount,
                            page = pg,
                            pageSize = ps,
                        }
                    );
                }
            )
            .WithName("GetMyRegistrationBookings")
            .WithSummary("Get bookings by user's registration status")
            .WithDescription(
                "Retrieves bookings where the authenticated user has a registration with the specified status(es).\n\n"
                    + "**Query parameters:**\n"
                    + "- `statuses` — comma-separated list: `invited`, `registered`, `declined` (default: all)\n"
                    + "- `timeFilter` — `upcoming` (end_time >= now) or `history` (end_time < now) (default: all)\n\n"
                    + "🔒 **Authentication Required**"
            )
            .Produces(StatusCodes.Status200OK)
            .Produces(StatusCodes.Status401Unauthorized)
            .Produces(StatusCodes.Status400BadRequest);

        // ─── Booking-level queries ──────────────────────────
        // GET /api/bookings/{id}/registrations
        group
            .MapGet(
                "/{id}/registrations",
                async (long id, RegistrationService service) =>
                {
                    var participants = await service.GetBookingParticipantsAsync(id);
                    return Results.Ok(
                        participants.Select(p => new
                        {
                            userId = p.UserId,
                            displayName = p.DisplayName,
                            email = p.Email,
                        })
                    );
                }
            )
            .WithName("GetBookingRegistrations")
            .WithSummary("Get confirmed participants for a booking")
            .WithDescription(
                "Retrieves all users who have confirmed attendance for a specific booking.\n\n🔒 **Authentication Required**"
            )
            .Produces(StatusCodes.Status200OK)
            .Produces(StatusCodes.Status401Unauthorized);

        // GET /api/bookings/{id}/invitations
        group
            .MapGet(
                "/{id}/invitations",
                async (long id, RegistrationService service) =>
                {
                    var invited = await service.GetBookingInvitedUsersAsync(id);
                    return Results.Ok(
                        invited.Select(p => new
                        {
                            userId = p.UserId,
                            displayName = p.DisplayName,
                            email = p.Email,
                        })
                    );
                }
            )
            .WithName("GetBookingInvitations")
            .WithSummary("Get invited (pending) users for a booking")
            .WithDescription(
                "Retrieves all users who have been invited to a booking but haven't RSVP'd yet.\n\n🔒 **Authentication Required**"
            )
            .Produces(StatusCodes.Status200OK)
            .Produces(StatusCodes.Status401Unauthorized);

        // ─── Invite action ──────────────────────────────────
        // POST /api/bookings/{id}/invite
        group
            .MapPost(
                "/{id}/invite",
                async (
                    long id,
                    InviteRequest request,
                    HttpContext context,
                    RegistrationService service
                ) =>
                {
                    if (context.Items["UserId"] is not long userId)
                        return Results.Unauthorized();

                    if (request.UserIds is null || !request.UserIds.Any())
                        return Results.BadRequest(new { message = "userIds is required." });

                    try
                    {
                        var count = await service.InviteUsersAsync(id, request.UserIds);
                        return Results.Ok(new { invited = count });
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
            .WithName("InviteUsersToBooking")
            .WithSummary("Invite users to a booking")
            .WithDescription(
                "Sends invitations to the specified users for a booking. Skips already invited/registered users.\n\n🔒 **Authentication Required**"
            )
            .Produces(StatusCodes.Status200OK)
            .Produces(StatusCodes.Status401Unauthorized)
            .Produces(StatusCodes.Status404NotFound)
            .Produces(StatusCodes.Status400BadRequest);

        return group;
    }

    private record InviteRequest(IEnumerable<long> UserIds);
}
