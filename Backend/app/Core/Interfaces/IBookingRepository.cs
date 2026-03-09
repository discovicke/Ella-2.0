﻿using Backend.app.Core.Models.Entities;

namespace Backend.app.Core.Interfaces;

public interface IBookingRepository
{
    // Repository interface for Booking data access
    // CRUD stands for Create, Read, Update, and Delete – basic operations used to add, fetch, modify, and remove data.
    Task<long> CreateBookingAsync(Booking booking);
    Task<Booking?> GetBookingByIdAsync(long bookingId);
    Task<IEnumerable<Booking>> GetBookingsByRoomIdAsync(long roomId);
    Task<IEnumerable<Booking>> GetOverlappingBookingsAsync(
        long roomId,
        DateTime startDate,
        DateTime endDate
    );
    Task<bool> UpdateBookingAsync(long bookingId, Booking booking);
    Task<bool> CancelBookingAsync(long bookingId);

    // Series operations (recurring bookings)
    Task<IEnumerable<Booking>> GetBookingsByRecurringGroupIdAsync(Guid groupId);
    Task<int> CancelBookingsByRecurringGroupIdAsync(Guid groupId);
    Task<int> CancelFutureBookingsInSeriesAsync(Guid groupId, DateTime fromDate);
}
