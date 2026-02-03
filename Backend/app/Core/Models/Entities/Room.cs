using Backend.app.Core.Enums;

namespace Backend.app.Core.Entities;

public class Room
{
    // Room entity matching database schema
    // TODO: Define properties matching Infrastructure/Data/schema.sql rooms table
    // ⚠️ Compare with src/modules/rooms/room.repo.js for schema differences
    
    public int Id { get; set; }
    public required string Name { get; set; }
    public int? Capacity { get; set; }
    public RoomType Type { get; set; }
    public string? Floor { get; set; }
    public string? Address { get; set; }
    public string? Notes { get; set; }
}
