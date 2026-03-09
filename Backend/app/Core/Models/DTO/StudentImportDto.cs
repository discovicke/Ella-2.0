namespace Backend.app.Core.Models.DTO;

public class StudentImportDto
{
    public required string FirstName { get; set; }
    public required string LastName { get; set; }
    public required string Email { get; set; }
    public required string City { get; set; }
    public required string ClassName { get; set; }
}