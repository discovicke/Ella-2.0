using System.ComponentModel.DataAnnotations;
using Backend.app.Core.Models.Enums;
using Backend.app.Core.Validation;

namespace Backend.app.Core.Models.DTO;

public record CreateBookingDto(
    long UserId,
    long RoomId,
    DateTime StartTime,
    DateTime EndTime,
    [property: MaxLength(InputLimits.BookingNotes)] string? Notes,
    BookingStatus Status,
    bool IsLesson = false
);

public record CancelBookingDto(long Id);
