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
    [property: MaxLength(100)] string? BookerName = null
);

/// <summary>
/// DTO for public booking form submissions (no auth required).
/// </summary>
public record CreatePublicBookingDto(
    [property: MaxLength(100)] string BookerName,
    long RoomId,
    DateTime StartTime,
    DateTime EndTime,
    [property: MaxLength(500)] string? Notes
);

public record CancelBookingDto(long Id);
