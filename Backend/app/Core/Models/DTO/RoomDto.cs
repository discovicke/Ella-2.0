using Backend.app.Core.Models.Enums;

namespace Backend.app.Core.Models.DTO;

public record CreateRoomDto(
    long CampusId,
    string Name,
    int? Capacity,
    RoomType Type,
    string? Floor,
    string? Notes,
    List<long>? AssetIds
);

public record UpdateRoomDto(
    long CampusId,
    string Name,
    int? Capacity,
    RoomType Type,
    string? Floor,
    string? Notes,
    List<long>? AssetIds
);

// Response DTO
public record RoomResponseDto(
    long Id,
    long CampusId,
    string Name,
    string CampusCity,
    int? Capacity,
    RoomType Type,
    string? Floor,
    string? Notes,
    List<string>? Assets
);
