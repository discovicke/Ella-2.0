using Backend.app.Core.Models.Enums;
using Backend.app.Core.Models.ReadModels;

namespace Backend.app.Core.Interfaces;

/// <summary>
/// Repository interface for querying enriched booking data from views.
/// Follows CQRS pattern - read operations separated from write operations.
/// </summary>
public interface IBookingReadModelRepository
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
    /// Get detailed bookings filtered by multiple criteria
    /// </summary>
    Task<IEnumerable<BookingDetailedReadModel>> GetDetailedBookingsFilteredAsync(
        long? userId = null,
        long? roomId = null,
        DateTime? startDate = null,
        DateTime? endDate = null,
        BookingStatus? status = null
    );

    /// <summary>
    /// Get all bookings where the user has a registration with any of the given statuses.
    /// Replaces the separate Registered/Invited/Declined methods with one parameterised query.
    /// Optional timeFilter: "upcoming" (endTime >= now, ASC) or "history" (endTime &lt; now, DESC), null = all DESC.
    /// </summary>
    Task<IEnumerable<BookingDetailedReadModel>> GetDetailedBookingsByUserRegistrationAsync(
        long userId,
        IEnumerable<RegistrationStatus> statuses,
        string? timeFilter = null
    );

    /// <summary>
    /// Get paginated filtered bookings with total count. Supports search across user/room/campus/notes.
    /// </summary>
    Task<(
        IEnumerable<BookingDetailedReadModel> Bookings,
        int TotalCount
    )> GetDetailedBookingsPagedAsync(
        int page,
        int pageSize,
        string? search = null,
        long? userId = null,
        long? roomId = null,
        DateTime? startDate = null,
        DateTime? endDate = null,
        BookingStatus? status = null
    );

    /// <summary>
    /// Get paginated bookings for a user (my-owned), with time filtering and cancellation toggle.
    /// timeFilter: "upcoming" = endTime >= now sorted ASC, "history" = endTime &lt; now sorted DESC, null = all sorted DESC.
    /// </summary>
    Task<(
        IEnumerable<BookingDetailedReadModel> Bookings,
        int TotalCount
    )> GetDetailedBookingsByUserIdPagedAsync(
        long userId,
        int page,
        int pageSize,
        string? timeFilter = null,
        bool includeCancelled = true
    );

    /// <summary>
    /// Get bookings with group-aware pagination.
    /// Groups by the specified column (room, user, campus, day, week, month)
    /// and returns all bookings for the requested page of groups.
    /// </summary>
    Task<(
        IEnumerable<BookingDetailedReadModel> Bookings,
        int TotalGroups,
        int TotalItemCount
    )> GetDetailedBookingsGroupedPagedAsync(
        string groupBy,
        int page,
        int groupsPerPage,
        string? search = null,
        long? userId = null,
        long? roomId = null,
        DateTime? startDate = null,
        DateTime? endDate = null,
        BookingStatus? status = null
    );
}
