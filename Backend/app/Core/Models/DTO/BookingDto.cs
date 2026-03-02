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
    [property: MaxLength(InputLimits.BookerName)] string? BookerName = null
);

/// <summary>
/// DTO for public booking form submissions (no auth required).
/// </summary>
public record CreatePublicBookingDto(
    [property: MaxLength(InputLimits.BookerName)] string BookerName,
    long RoomId,
    DateTime StartTime,
    DateTime EndTime,
    [property: MaxLength(InputLimits.BookingNotes)] string? Notes
);

public record CancelBookingDto(long Id);
