using Backend.app.Core.Models.Enums;

namespace Backend.app.Core.Models.Entities;

public class Room
{
    // Room entity matching database schema
    // ⚠️ Compare with src/modules/rooms/room.repo.js for schema differences

    public long Id { get; set; }
    public required string Name { get; set; }
    public int? Capacity { get; set; }
    public RoomType Type { get; set; }
    public string? Floor { get; set; }
    public string? Address { get; set; }
    public string? Notes { get; set; }
}
