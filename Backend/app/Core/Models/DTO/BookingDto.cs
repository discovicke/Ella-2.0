using Backend.app.Core.Models.Enums;

namespace Backend.app.Core.Models.DTO;

public record CreateBookingDto(
    long UserId,
    long RoomId,
    DateTime StartTime,
    DateTime EndTime,
    string? Notes,
    BookingStatus Status,
    bool IsLesson = false
);

public record CancelBookingDto(long Id);
