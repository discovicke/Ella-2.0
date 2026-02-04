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
    Task<Booking?> GetBookingByIdAsync(int bookingId);
    Task<IEnumerable<Booking>> GetBookingsByUserIdAsync(int userId);
    Task<IEnumerable<Booking>> GetBookingsByRoomIdAsync(int roomId);
    Task<IEnumerable<Booking>> GetAllBookingsByDateAsync(DateTime startDate, DateTime endDate);
    Task<IEnumerable<Booking>> GetOverlappingBookingsAsync(
        int roomId,
        DateTime startDate,
        DateTime endDate
    );
    Task<bool> UpdateBookingAsync(int bookingId, Booking booking);
    Task<bool> CancelBookingAsync(int bookingId);
}
