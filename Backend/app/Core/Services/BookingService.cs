using Backend.app.Core.Interfaces;
using Backend.app.Infrastructure.Repositories;

namespace Backend.app.Core.Services;

public class BookingService(IBookingRepository repo)
{
    // Business logic for bookings
    // TODO: Extract and migrate business rules from booking.controller.js
    // Include validation logic, availability checks, permission checks
    
    internal async Task<object?> GetAllBookingsAsync()
    {

        return await repo.GetAllBookingsAsync();
    }
}