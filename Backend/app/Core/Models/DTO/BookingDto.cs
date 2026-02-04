using Backend.app.Core.Entities;

namespace Backend.app.Core.DTO;

    // Data Transfer Objects for Booking
    // TODO: Define CreateBookingDto, BookingResponseDto, UpdateBookingDto
    // Reference: src/modules/bookings/booking.dto.js

public record BookingResponseDto(
    int Id,
    string Name,
    int? Capacity,
    Booking Type,
    string? Floor,
    string? Address,
    string? Notes
);
