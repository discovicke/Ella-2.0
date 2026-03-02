using System.ComponentModel.DataAnnotations;
using Backend.app.Core.Validation;

namespace Backend.app.Core.Models.DTO;

public record CreateRoomDto(
    long CampusId,
    [property: MaxLength(InputLimits.RoomName)] string Name,
    int? Capacity,
    long RoomTypeId,
    [property: MaxLength(InputLimits.RoomFloor)] string? Floor,
    [property: MaxLength(InputLimits.RoomNotes)] string? Notes,
    List<long>? AssetIds
);

public record UpdateRoomDto(
    long CampusId,
    [property: MaxLength(InputLimits.RoomName)] string Name,
    int? Capacity,
    long RoomTypeId,
    [property: MaxLength(InputLimits.RoomFloor)] string? Floor,
    [property: MaxLength(InputLimits.RoomNotes)] string? Notes,
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
