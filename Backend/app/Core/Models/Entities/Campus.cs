namespace Backend.app.Core.Models.Entities;

public class Campus
{
    public long Id { get; set; }
    public required string Street { get; set; }
    public string? Zip { get; set; }
    public required string City { get; set; }
    public required string Country { get; set; }
    public string? Contact { get; set; }
}
