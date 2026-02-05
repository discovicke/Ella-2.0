using System;
using System.Threading.Tasks;
using Backend.app.Core.Entities;

namespace Backend.app.Core.Interfaces;

public interface IBookingRepository
{
    // Repository interface for Booking data access
    // TODO: Define method signatures for CRUD operations
    // Reference: src/modules/bookings/booking.repo.js for all methods
    // CRUD stands for Create, Read, Update, and Delete – basic operations used to add, fetch, modify, and remove data.
    Task<bool> CreateBookingAsync(Booking booking);
    Task<IEnumerable<Booking>> GetAllBookingsAsync();
    Task<Booking?> GetBookingByIdAsync(long bookingId);
    Task<IEnumerable<Booking>> GetBookingsByUserIdAsync(long userId);
    Task<IEnumerable<Booking>> GetBookingsByRoomIdAsync(long roomId);
    Task<IEnumerable<Booking>> GetAllBookingsByDateAsync(DateTime startDate, DateTime endDate);
    Task<IEnumerable<Booking>> GetOverlappingBookingsAsync(
        long roomId,
        DateTime startDate,
        DateTime endDate
    );
    Task<bool> UpdateBookingAsync(long bookingId, Booking booking);
    Task<bool> CancelBookingAsync(long bookingId);
}
