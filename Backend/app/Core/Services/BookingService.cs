using Backend.app.Core.DTO;
using Backend.app.Core.Entities;
using Backend.app.Core.Interfaces;
using Backend.app.Infrastructure.Repositories;

namespace Backend.app.Core.Services;

public class BookingService(IBookingRepository repo)
{
    // Business logic for bookings
    // TODO: Extract and migrate business rules from booking.controller.js
    // Include validation logic, availability checks, permission checks

    public async Task<IEnumerable<object?>> GetAllBookingsAsync()
    {
        return await repo.GetAllBookingsAsync();
    }

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

    public async Task<CancelBookingDto> CancelBookingAsync(CancelBookingDto dto)
    {
        await repo.CancelBookingAsync(dto.Id);
        return dto;
    }
}
