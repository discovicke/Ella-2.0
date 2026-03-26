using Backend.app.Core.Models.Enums;

namespace Backend.app.Core.Models.DTO;

public record OccupancySlotDto(
    long BookingId,
    long RoomId,
    string RoomName,
    DateTime StartTime,
    DateTime EndTime,
    BookingStatus Status,
    string? BookerName
);
