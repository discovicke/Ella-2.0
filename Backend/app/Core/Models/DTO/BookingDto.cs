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
    long[]? ClassIds = null,
    string? BookerName = null,
    string? RecurrencePattern = null, // "daily", "weekly", "biweekly"
    DateTime? RecurrenceEnd = null
);

/// <summary>
/// DTO for updating an existing booking's details.
/// </summary>
public record UpdateBookingDto(
    DateTime? StartTime = null,
    DateTime? EndTime = null,
    [property: MaxLength(500)] string? Notes = null,
    bool? IsLesson = null
);

/// <summary>
/// Scope for series operations: single booking, this and following, or all in series.
/// </summary>
public enum SeriesScope
{
    Single,
    ThisAndFollowing,
    All
}

public record CreatePublicBookingDto(
    long RoomId,
    DateTime StartTime,
    DateTime EndTime,
    string BookerName,
    string? Notes
);

public record CancelBookingDto(long Id);
