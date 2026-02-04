using Backend.app.Core.Enums;

namespace Backend.app.Core.Models.ReadModels;

public record RoomDetailModel(
    int RoomId,
    string Name,
    int? Capacity,
    RoomType Type,
    string? Floor,
    string? Address,
    string? Notes,
    List<string> Assets
);
