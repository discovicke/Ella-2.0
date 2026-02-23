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
    /// <summary>
    /// Register a user to attend a booking.
    /// Implements a soft capacity check (warns but doesn't block).
    /// </summary>
    public async Task<bool> RegisterParticipantAsync(long userId, long bookingId)
    {
        var booking =
            await bookingReadModelRepo.GetDetailedBookingByIdAsync(bookingId)
            ?? throw new KeyNotFoundException("Booking not found.");
        if (booking.Status == BookingStatus.Cancelled)
            throw new InvalidOperationException("Cannot register for a cancelled booking.");

        if (await repo.IsUserRegisteredAsync(userId, bookingId))
            return true; // Already registered

        // Soft Capacity Check
        if (
            booking.RoomCapacity.HasValue
            && booking.RegistrationCount >= booking.RoomCapacity.Value
        )
        {
            // Log a warning but allow registration to proceed
            // (In a real app, consider notifying the user about overbooking)
            logger.LogWarning("Booking {BookingId} is over capacity.", bookingId);
        }

        return await repo.AddRegistrationAsync(userId, bookingId);
    }

    /// <summary>
    /// Unregister a user from a booking.
    /// </summary>
    public async Task<bool> UnregisterParticipantAsync(long userId, long bookingId)
    {
        return await repo.RemoveRegistrationAsync(userId, bookingId);
    }

    /// <summary>
    /// Get all bookings a user is registered for.
    /// </summary>
    public async Task<IEnumerable<BookingDetailedReadModel>> GetUserRegistrationsAsync(long userId)
    {
        return await bookingReadModelRepo.GetDetailedBookingsByRegisteredUserIdAsync(userId);
    }
}
