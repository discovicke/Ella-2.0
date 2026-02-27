using Backend.app.Core.Interfaces;
using Backend.app.Core.Models.DTO;
using Backend.app.Core.Models.Entities;
using Backend.app.Core.Models.Enums;
using Backend.app.Core.Models.ReadModels;

namespace Backend.app.Core.Services;

public class BookingService(
    IBookingRepository repo,
    IBookingReadModelRepository readModelRepo,
    IUserRepository userRepo,
    IRoomRepository roomRepo
)
{
    // Business logic for bookings
    // Follows CQRS pattern: Write operations use repo, Read operations use readModelRepo
    // Include validation logic, availability checks, permission checks

    /// <summary>
    /// Get all bookings with enriched data (user names, room names, registration count)
    /// </summary>
    public async Task<IEnumerable<BookingDetailedReadModel>> GetAllBookingsAsync()
    {
        return await readModelRepo.GetAllDetailedBookingsAsync();
    }

    /// <summary>
    /// Get bookings filtered by various criteria
    /// </summary>
    public async Task<IEnumerable<BookingDetailedReadModel>> GetFilteredBookingsAsync(
        long? userId = null,
        long? roomId = null,
        DateTime? startDate = null,
        DateTime? endDate = null,
        BookingStatus? status = null
    )
    {
        return await readModelRepo.GetDetailedBookingsFilteredAsync(
            userId,
            roomId,
            startDate,
            endDate,
            status
        );
    }

    /// <summary>
    /// Get paginated filtered bookings with search support
    /// </summary>
    public async Task<PagedResult<BookingDetailedReadModel>> GetFilteredBookingsPagedAsync(
        int page,
        int pageSize,
        string? search = null,
        long? userId = null,
        long? roomId = null,
        DateTime? startDate = null,
        DateTime? endDate = null,
        BookingStatus? status = null
    )
    {
        var (bookings, totalCount) = await readModelRepo.GetDetailedBookingsPagedAsync(
            page,
            pageSize,
            search,
            userId,
            roomId,
            startDate,
            endDate,
            status
        );
        return new PagedResult<BookingDetailedReadModel>(bookings, totalCount, page, pageSize);
    }

    /// <summary>
    /// Get paginated bookings a user has created (my-owned), with time filtering.
    /// </summary>
    public async Task<PagedResult<BookingDetailedReadModel>> GetUserOwnedBookingsPagedAsync(
        long userId,
        int page,
        int pageSize,
        string? timeFilter = null,
        bool includeCancelled = true
    )
    {
        var (bookings, totalCount) = await readModelRepo.GetDetailedBookingsByUserIdPagedAsync(
            userId,
            page,
            pageSize,
            timeFilter,
            includeCancelled
        );
        return new PagedResult<BookingDetailedReadModel>(bookings, totalCount, page, pageSize);
    }

    /// <summary>
    /// Get detailed booking by ID with enriched data
    /// </summary>
    public async Task<BookingDetailedReadModel?> GetDetailedBookingByIdAsync(long id)
    {
        return await readModelRepo.GetDetailedBookingByIdAsync(id);
    }

    /// <summary>
    /// Create a new booking
    /// </summary>
    public async Task<Booking?> CreateBookingAsync(CreateBookingDto dto)
    {
        // Validation: Existence
        if (await userRepo.GetUserByIdAsync(dto.UserId) is null)
        {
            throw new KeyNotFoundException($"User with ID {dto.UserId} not found.");
        }

        if (await roomRepo.GetRoomByIdAsync(dto.RoomId) is null)
        {
            throw new KeyNotFoundException($"Room with ID {dto.RoomId} not found.");
        }

        // Check for overlaps
        var overlaps = await repo.GetOverlappingBookingsAsync(
            dto.RoomId,
            dto.StartTime,
            dto.EndTime
        );
        if (overlaps.Any())
        {
            return null; // Conflict
        }

        var booking = new Booking
        {
            UserId = dto.UserId,
            RoomId = dto.RoomId,
            StartTime = dto.StartTime,
            EndTime = dto.EndTime,
            Notes = dto.Notes,
            Status = BookingStatus.Active,
        };

        var id = await repo.CreateBookingAsync(booking);
        booking.Id = id;

        return booking;
    }

    /// <summary>
    /// Cancel a booking by setting its status to Cancelled
    /// </summary>
    public async Task<CancelBookingDto> CancelBookingAsync(CancelBookingDto dto)
    {
        await repo.CancelBookingAsync(dto.Id);
        return dto;
    }

    /// <summary>
    /// Get raw booking entity by ID (for internal use)
    /// </summary>
    public async Task<Booking?> GetBookingByIdAsync(long id)
    {
        return await repo.GetBookingByIdAsync(id);
    }

    /// <summary>
    /// Update booking status (e.g., Cancelled, Completed)
    /// </summary>
    public async Task<Booking> UpdateBookingStatusAsync(long id, BookingStatus newStatus)
    {
        var booking = await repo.GetBookingByIdAsync(id);

        if (booking is null)
        {
            throw new KeyNotFoundException($"Booking with ID {id} not found.");
        }
        booking.Status = newStatus;

        await repo.UpdateBookingAsync(id, booking);

        return booking;
    }

    /// <summary>
    /// Get all bookings a user has created (is the host of).
    /// </summary>
    public async Task<IEnumerable<BookingDetailedReadModel>> GetUserOwnedBookingsAsync(long userId)
    {
        return await readModelRepo.GetDetailedBookingsByUserIdAsync(userId);
    }
}
