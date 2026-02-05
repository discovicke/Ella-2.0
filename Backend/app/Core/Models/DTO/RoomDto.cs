using Backend.app.Core.Models.Enums;

namespace Backend.app.Core.Models.DTO;

public record CreateRoomDto(
    string Name,
    int? Capacity,
    RoomType Type,
    string? Floor,
    string? Address,
    string? Notes
);

public record UpdateRoomDto(
    string Name,
    int? Capacity,
    RoomType Type,
    string? Floor,
    string? Address,
    string? Notes
);

// Response DTO
public record RoomResponseDto(
    long Id,
    string Name,
    int? Capacity,
    RoomType Type,
    string? Floor,
    string? Address,
    string? Notes
);
