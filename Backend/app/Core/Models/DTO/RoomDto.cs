using System.ComponentModel.DataAnnotations;

namespace Backend.app.Core.Models.DTO;

public record CreateRoomDto(
    long CampusId,
    [property: MaxLength(100)] string Name,
    int? Capacity,
    long RoomTypeId,
    [property: MaxLength(20)] string? Floor,
    [property: MaxLength(200)] string? Notes,
    List<long>? AssetIds
);

public record UpdateRoomDto(
    long CampusId,
    [property: MaxLength(100)] string Name,
    int? Capacity,
    long RoomTypeId,
    [property: MaxLength(20)] string? Floor,
    [property: MaxLength(200)] string? Notes,
    List<long>? AssetIds
);

// Response DTO
public record RoomResponseDto(
    long Id,
    long CampusId,
    string Name,
    string CampusCity,
    int? Capacity,
    long RoomTypeId,
    string RoomTypeName,
    string? Floor,
    string? Notes,
    List<string>? Assets
);

public record RoomTypeResponseDto(long Id, string Name);
