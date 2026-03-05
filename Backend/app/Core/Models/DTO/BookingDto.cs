using System.ComponentModel.DataAnnotations;
using Backend.app.Core.Models.Enums;

namespace Backend.app.Core.Models.DTO;

public record CreateBookingDto(
    long UserId,
    long RoomId,
    DateTime StartTime,
    DateTime EndTime,
    [property: MaxLength(500)] string? Notes,
    BookingStatus Status,
    bool IsLesson = false,
    long[]? ClassIds = null
);

public record CancelBookingDto(long Id);
