namespace Backend.app.Core.Models.Entities;

public class BookableResource
{
    public long Id { get; set; }
    public long CategoryId { get; set; }
    public long CampusId { get; set; }
    public required string Name { get; set; }
    public string? Description { get; set; }
    public bool IsActive { get; set; } = true;
}