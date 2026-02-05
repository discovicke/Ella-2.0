using Backend.app.Core.DTO;
using Backend.app.Core.Entities;
using Backend.app.Core.Interfaces;
using Backend.app.Core.Models.ReadModels;

namespace Backend.app.Core.Services;

public class BookingService(
    IBookingRepository repo,
    IBookingDetailedRepository readModelRepo)
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
        int? status = null)
    {
        return await readModelRepo.GetDetailedBookingsFilteredAsync(
            userId, roomId, startDate, endDate, status);
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
    public async Task<CreateBookingDto> CreateBookingAsync(CreateBookingDto booking)
    {
        var bokning = new Booking
        {
            UserId = booking.UserId,
            RoomId = booking.RoomId,
            StartTime = booking.StartTime,
            EndTime = booking.EndTime,
            Notes = booking.Notes,
            Status = (Enums.BookingStatus)booking.status,
        };

        await repo.CreateBookingAsync(bokning);

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
}
