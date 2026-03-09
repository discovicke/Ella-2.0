namespace Backend.app.Core.Models.Entities;

public class BookingSlug
{
    public long Id { get; set; }
    public long UserId { get; set; }
    public required string Slug { get; set; }
    public bool IsActive { get; set; } = true;
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}