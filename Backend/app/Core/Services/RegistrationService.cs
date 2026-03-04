using Backend.app.Core.Interfaces;
using Backend.app.Core.Models.Enums;
using Backend.app.Core.Models.ReadModels;

namespace Backend.app.Core.Services;

public class RegistrationService(
    IRegistrationRepository repo,
    IBookingReadModelRepository bookingReadModelRepo,
    ILogger<RegistrationService> logger
)
{
    // ─── Invite flow ────────────────────────────────────────

    /// <summary>
    /// Bulk-invite users to a booking. Only the booking owner should call this.
    /// Skips users who already have a row (invited or registered).
    /// </summary>
    public async Task<int> InviteUsersAsync(long bookingId, IEnumerable<long> userIds)
    {
        var booking =
            await bookingReadModelRepo.GetDetailedBookingByIdAsync(bookingId)
            ?? throw new KeyNotFoundException("Booking not found.");
        if (booking.Status == BookingStatus.Cancelled)
            throw new InvalidOperationException("Cannot invite to a cancelled booking.");
        if (booking.EndTime < DateTime.UtcNow)
            throw new InvalidOperationException("Cannot invite to an expired booking.");

        return await repo.BulkInviteAsync(bookingId, userIds);
    }

    /// <summary>
    /// Accept an invitation (RSVP). Changes status from Invited/Declined → Registered.
    /// If no row exists, creates one as Registered directly (self-register).
    /// </summary>
    public async Task<bool> AcceptInvitationAsync(long userId, long bookingId)
    {
        var booking =
            await bookingReadModelRepo.GetDetailedBookingByIdAsync(bookingId)
            ?? throw new KeyNotFoundException("Booking not found.");
        if (booking.Status == BookingStatus.Cancelled)
            throw new InvalidOperationException("Cannot register for a cancelled booking.");
        if (booking.EndTime < DateTime.UtcNow)
            throw new InvalidOperationException("Cannot register for an expired booking.");

        var currentStatus = await repo.GetStatusAsync(userId, bookingId);

        if (currentStatus == RegistrationStatus.Registered)
            return true; // already confirmed

        if (
            currentStatus == RegistrationStatus.Invited
            || currentStatus == RegistrationStatus.Declined
        )
            return await repo.UpdateStatusAsync(userId, bookingId, RegistrationStatus.Registered);

        // No row yet — direct registration (e.g. from a public link)
        if (
            booking.RoomCapacity.HasValue
            && booking.RegistrationCount >= booking.RoomCapacity.Value
        )
            logger.LogWarning("Booking {BookingId} is over capacity.", bookingId);

        return await repo.AddAsync(userId, bookingId, RegistrationStatus.Registered);
    }

    /// <summary>
    /// Decline an invitation or unregister from a booking.
    /// Sets status to Declined from any current status (Invited or Registered).
    /// The row stays visible so the user can re-accept later.
    /// </summary>
    public async Task<bool> DeclineInvitationAsync(long userId, long bookingId)
    {
        var booking =
            await bookingReadModelRepo.GetDetailedBookingByIdAsync(bookingId)
            ?? throw new KeyNotFoundException("Booking not found.");
        if (booking.EndTime < DateTime.UtcNow)
            throw new InvalidOperationException("Cannot decline an expired booking.");

        var currentStatus = await repo.GetStatusAsync(userId, bookingId);
        if (currentStatus is null)
            throw new KeyNotFoundException("No registration found for this booking.");

        if (currentStatus == RegistrationStatus.Declined)
            return true; // already declined

        return await repo.UpdateStatusAsync(userId, bookingId, RegistrationStatus.Declined);
    }

    /// <summary>
    /// Remove an invitation entirely. Only the booking owner should call this.
    /// </summary>
    public async Task<bool> RemoveInvitationAsync(
        long ownerUserId,
        long bookingId,
        long targetUserId
    )
    {
        var booking =
            await bookingReadModelRepo.GetDetailedBookingByIdAsync(bookingId)
            ?? throw new KeyNotFoundException("Booking not found.");

        if (booking.UserId != ownerUserId)
            throw new UnauthorizedAccessException("Only the booking owner can remove invitations.");

        return await repo.RemoveAsync(targetUserId, bookingId);
    }

    // ─── Read helpers ───────────────────────────────────────

    /// <summary>
    /// Get all bookings where the user has a registration with any of the given statuses.
    /// Optional timeFilter: "upcoming" or "history" for server-side time filtering.
    /// </summary>
    public async Task<IEnumerable<BookingDetailedReadModel>> GetUserRegistrationBookingsAsync(
        long userId,
        IEnumerable<RegistrationStatus> statuses,
        string? timeFilter = null
    )
    {
        return await bookingReadModelRepo.GetDetailedBookingsByUserRegistrationAsync(
            userId,
            statuses,
            timeFilter
        );
    }

    /// <summary>
    /// Paginated version — returns a page of registration bookings + total count.
    /// </summary>
    public async Task<(
        IEnumerable<BookingDetailedReadModel> Bookings,
        int TotalCount
    )> GetUserRegistrationBookingsPagedAsync(
        long userId,
        IEnumerable<RegistrationStatus> statuses,
        int page,
        int pageSize,
        string? timeFilter = null
    )
    {
        return await bookingReadModelRepo.GetDetailedBookingsByUserRegistrationPagedAsync(
            userId,
            statuses,
            page,
            pageSize,
            timeFilter
        );
    }

    /// <summary>Get confirmed participants for a booking.</summary>
    public async Task<
        IEnumerable<(long UserId, string DisplayName, string Email)>
    > GetBookingParticipantsAsync(long bookingId)
    {
        return await repo.GetRegisteredUsersAsync(bookingId);
    }

    /// <summary>Get invited (pending) users for a booking.</summary>
    public async Task<
        IEnumerable<(long UserId, string DisplayName, string Email)>
    > GetBookingInvitedUsersAsync(long bookingId)
    {
        return await repo.GetInvitedUsersAsync(bookingId);
    }

    /// <summary>Get the current user's status for a specific booking, or null.</summary>
    public async Task<RegistrationStatus?> GetStatusAsync(long userId, long bookingId)
    {
        return await repo.GetStatusAsync(userId, bookingId);
    }
}
