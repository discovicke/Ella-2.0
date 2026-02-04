using Backend.app.Core.Entities;
using Backend.app.Core.Enums;

namespace Backend.app.Core.DTO;

    // Data Transfer Objects for Booking
    // TODO: Define CreateBookingDto, BookingResponseDto, UpdateBookingDto
    // Reference: src/modules/bookings/booking.dto.js

public record BookingResponseDto(
    int Id,
    int UserId,
    string UserName,
    int RoomId,
    string? RoomName,
    DateTime StartTime,
    DateTime EndTime,
    BookingStatus Status,
    string? Notes,
    DateTime CreatedAt,
    DateTime UpdatedAt
);
public record CreateBookingDto(
    int UserId,
    int RoomId,
    DateTime StartTime,
    DateTime EndTime,
    string? Notes,
    int status = 0
)
{
    public object Id { get; internal set; }
}