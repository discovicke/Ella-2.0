using Backend.app.Core.Models.ReadModels;

namespace Backend.app.Core.Interfaces;

/// <summary>
/// Repository interface for querying enriched booking data from views.
/// Follows CQRS pattern - read operations separated from write operations.
/// </summary>
public interface IBookingDetailedRepository
{
    /// <summary>
    /// Get all bookings with enriched data (user names, room names, registration count)
    /// </summary>
    Task<IEnumerable<BookingDetailedReadModel>> GetAllDetailedBookingsAsync();

    /// <summary>
    /// Get detailed booking by ID
    /// </summary>
    Task<BookingDetailedReadModel?> GetDetailedBookingByIdAsync(long bookingId);

    /// <summary>
    /// Get all detailed bookings for a specific user
    /// </summary>
    Task<IEnumerable<BookingDetailedReadModel>> GetDetailedBookingsByUserIdAsync(long userId);

    /// <summary>
    /// Get all detailed bookings for a specific room
    /// </summary>
    Task<IEnumerable<BookingDetailedReadModel>> GetDetailedBookingsByRoomIdAsync(long roomId);

    /// <summary>
    /// Get detailed bookings within a time range
    /// </summary>
    Task<IEnumerable<BookingDetailedReadModel>> GetDetailedBookingsByDateRangeAsync(
        DateTime startDate, 
        DateTime endDate);

    /// <summary>
    /// Get detailed bookings filtered by multiple criteria
    /// </summary>
    Task<IEnumerable<BookingDetailedReadModel>> GetDetailedBookingsFilteredAsync(
        long? userId = null,
        long? roomId = null,
        DateTime? startDate = null,
        DateTime? endDate = null,
        int? status = null);
}
