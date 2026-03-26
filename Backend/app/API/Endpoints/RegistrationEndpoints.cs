using Backend.app.Core.Models.Enums;
using Backend.app.Core.Services;
using Backend.app.Infrastructure.Auth;

namespace Backend.app.API.Endpoints;

/// <summary>
/// Registration endpoints for booking invitations and RSVPs.
/// 
/// Routes are nested under /bookings because registrations are sub-resources of bookings
/// (e.g., /bookings/{id}/register, /bookings/{id}/invitations). This keeps related
/// operations together and maintains RESTful resource hierarchy.
/// </summary>
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
            .WithSummary("Register for a booking")
            .WithDescription(
                "Accepts a pending invitation or self-registers the authenticated user for a booking. "
                    + "If already registered, returns success. If declined, changes status back to registered.\n\n"
                    + "🔒 **Authentication Required**"
            )
            .Produces(StatusCodes.Status201Created)
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
            .WithSummary("Decline or unregister from a booking")
            .WithDescription(
                "Sets the user's registration status to 'declined'. Works from any current status "
                    + "(invited or registered). The row stays visible so the user can re-accept later "
                    + "via POST `/{id}/register`.\n\n"
                    + "🔒 **Authentication Required**"
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
                "Permanently deletes the invitation row for a specific user. Unlike declining, this cannot be undone — "
                    + "the user would need to be re-invited. Only the booking owner can perform this action.\n\n"
                    + "🔒 **Authentication Required** — **Owner Only**"
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
                "Returns all users with status 'registered' for a specific booking (i.e. confirmed attendees).\n\n"
                    + "🔒 **Authentication Required**"
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
            .WithSummary("Get pending invitations for a booking")
            .WithDescription(
                "Returns all users with status 'invited' for a specific booking (i.e. haven't accepted or declined yet).\n\n"
                    + "🔒 **Authentication Required**"
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
                        var count = await service.InviteUsersAsync(userId, id, request.UserIds);
                        return Results.Ok(new { invited = count });
                    }
                    catch (KeyNotFoundException ex)
                    {
                        return Results.NotFound(new { message = ex.Message });
                    }
                    catch (UnauthorizedAccessException)
                    {
                        return Results.Forbid();
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
                "Bulk-invites users by ID. Users who already have a registration row (invited, registered, or declined) are skipped. "
                    + "Returns the count of newly created invitations.\n\n"
                    + "🔒 **Authentication Required**"
            )
            .Produces(StatusCodes.Status200OK)
            .Produces(StatusCodes.Status401Unauthorized)
            .Produces(StatusCodes.Status403Forbidden)
            .Produces(StatusCodes.Status404NotFound)
            .Produces(StatusCodes.Status400BadRequest);

        // ─── Class-based invitations ────────────────────────
        // POST /api/bookings/{id}/invite-class
        group
            .MapPost(
                "/{id}/invite-class",
                async (
                    long id,
                    InviteClassRequest request,
                    HttpContext context,
                    RegistrationService service
                ) =>
                {
                    if (context.Items["UserId"] is not long userId)
                        return Results.Unauthorized();

                    if (request.ClassIds is null || !request.ClassIds.Any())
                        return Results.BadRequest(new { message = "classIds is required." });

                    try
                    {
                        var count = await service.InviteClassAsync(userId, id, request.ClassIds);
                        return Results.Ok(new { invited = count });
                    }
                    catch (KeyNotFoundException ex)
                    {
                        return Results.NotFound(new { message = ex.Message });
                    }
                    catch (UnauthorizedAccessException)
                    {
                        return Results.Forbid();
                    }
                    catch (InvalidOperationException ex)
                    {
                        return Results.BadRequest(new { message = ex.Message });
                    }
                }
            )
            .RequirePermission("BookRoom")
            .WithName("InviteClassToBooking")
            .WithSummary("Invite all members of class(es) to a booking")
            .WithDescription(
                "Resolves all users in the given class(es) and bulk-invites them. "
                    + "Users who already have a registration row are skipped. The booking owner is excluded.\n\n"
                    + "🔒 **Authentication Required**"
            )
            .Produces(StatusCodes.Status200OK)
            .Produces(StatusCodes.Status401Unauthorized)
            .Produces(StatusCodes.Status403Forbidden)
            .Produces(StatusCodes.Status404NotFound)
            .Produces(StatusCodes.Status400BadRequest);

        // POST /api/bookings/{id}/sync-class-invitations
        group
            .MapPost(
                "/{id}/sync-class-invitations",
                async (long id, HttpContext context, RegistrationService service) =>
                {
                    if (context.Items["UserId"] is not long userId)
                        return Results.Unauthorized();

                    try
                    {
                        var count = await service.SyncClassInvitationsAsync(userId, id);
                        return Results.Ok(new { invited = count });
                    }
                    catch (KeyNotFoundException ex)
                    {
                        return Results.NotFound(new { message = ex.Message });
                    }
                    catch (UnauthorizedAccessException)
                    {
                        return Results.Forbid();
                    }
                    catch (InvalidOperationException ex)
                    {
                        return Results.BadRequest(new { message = ex.Message });
                    }
                }
            )
            .RequirePermission("BookRoom")
            .WithName("SyncClassInvitations")
            .WithSummary("Re-sync class invitations for a booking")
            .WithDescription(
                "Re-invites any new members of the booking's linked class(es) who don't yet have a registration row. "
                    + "Useful when class membership has changed after the initial invitation.\n\n"
                    + "🔒 **Authentication Required**"
            )
            .Produces(StatusCodes.Status200OK)
            .Produces(StatusCodes.Status401Unauthorized)
            .Produces(StatusCodes.Status403Forbidden)
            .Produces(StatusCodes.Status404NotFound)
            .Produces(StatusCodes.Status400BadRequest);

        // GET /api/bookings/class-members?classIds=1,2,3
        group
            .MapGet(
                "/class-members",
                async (string classIds, RegistrationService service) =>
                {
                    var parsed = new List<long>();
                    foreach (
                        var s in classIds.Split(
                            ',',
                            StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries
                        )
                    )
                    {
                        if (long.TryParse(s, out var id))
                            parsed.Add(id);
                        else
                            return Results.BadRequest(
                                new { message = $"Invalid class ID: '{s}'." }
                            );
                    }

                    if (parsed.Count == 0)
                        return Results.BadRequest(new { message = "classIds is required." });

                    var members = await service.GetClassMembersAsync(parsed);
                    return Results.Ok(
                        members.Select(m => new
                        {
                            userId = m.UserId,
                            displayName = m.DisplayName,
                            email = m.Email,
                        })
                    );
                }
            )
            .RequirePermission("BookRoom")
            .WithName("GetClassMembers")
            .WithSummary("Preview class members for invitation")
            .WithDescription(
                "Returns all users belonging to the given class(es). Used to preview who will be invited "
                    + "before sending invitations, allowing the teacher to exclude specific users.\n\n"
                    + "🔒 **Authentication Required**"
            )
            .Produces(StatusCodes.Status200OK)
            .Produces(StatusCodes.Status400BadRequest)
            .Produces(StatusCodes.Status401Unauthorized)
            .Produces(StatusCodes.Status403Forbidden);

        return group;
    }

    private record InviteRequest(IEnumerable<long> UserIds);

    private record InviteClassRequest(IEnumerable<long> ClassIds);
}
