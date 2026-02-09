using Azure.Identity;
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
            Status = dto.Status,
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
    /// Register a user to attend a booking.
    /// Implements a soft capacity check (warns but doesn't block).
    /// </summary>
    public async Task<bool> RegisterParticipantAsync(long userId, long bookingId)
    {
        var booking = await readModelRepo.GetDetailedBookingByIdAsync(bookingId);
        if (booking is null)
            throw new KeyNotFoundException("Booking not found.");

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
            // We proceed anyway as per requirement, but we could log it or return a specific status if needed.
            // For now, we just fulfill the "don't hard stop" rule.
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
        return await readModelRepo.GetDetailedBookingsByRegisteredUserIdAsync(userId);
    }

    /// <summary>
    /// Get all bookings a user has created (is the host of).
    /// </summary>
    public async Task<IEnumerable<BookingDetailedReadModel>> GetUserOwnedBookingsAsync(long userId)
    {
        return await readModelRepo.GetDetailedBookingsByUserIdAsync(userId);
    }
}
