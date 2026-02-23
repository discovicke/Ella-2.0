namespace Backend.app.Core.Models.Entities;

/// <summary>
/// Maps to the 'class' table.
/// </summary>
public class Class
{
    public long Id { get; set; }
    public required string ClassName { get; set; }
}
