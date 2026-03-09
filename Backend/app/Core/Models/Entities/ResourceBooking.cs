namespace Backend.app.Core.Models.Entities;

public class ResourceBooking
{
    public long Id { get; set; }
    public long ResourceId { get; set; }
    public long UserId { get; set; }
    public DateTime StartTime { get; set; }
    public DateTime EndTime { get; set; }
    public string? Notes { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}