using Backend.app.Core.Models.Entities;
using Backend.app.Core.Models.Enums;

namespace Backend.app.Core.Models.DTO;

// Data Transfer Objects for Booking
// Reference: src/modules/bookings/booking.dto.js

public record BookingResponseDto(
    long Id,
    long UserId,
    string UserName,
    long RoomId,
    string? RoomName,
    DateTime StartTime,
    DateTime EndTime,
    BookingStatus Status,
    string? Notes,
    DateTime CreatedAt,
    DateTime UpdatedAt
);

public record CreateBookingDto(
    long UserId,
    long RoomId,
    DateTime StartTime,
    DateTime EndTime,
    string? Notes,
    BookingStatus? Status
);

public record CancelBookingDto(long Id);
