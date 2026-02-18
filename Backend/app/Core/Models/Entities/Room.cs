using Backend.app.Core.Models.Enums;

namespace Backend.app.Core.Models.Entities;

public class Room
{
    // Room entity matching database schema (v2.0)
    // Address removed; rooms now linked to campus via campus_id FK

    public long Id { get; set; }
    public long CampusId { get; set; }
    public required string Name { get; set; }
    public int? Capacity { get; set; }
    public RoomType Type { get; set; }
    public string? Floor { get; set; }
    public string? Notes { get; set; }
}
