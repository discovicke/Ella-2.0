namespace Backend.app.Core.Models.DTO;

public class StudentImportDto
{
    public string? FirstName { get; set; }
    public string? LastName { get; set; }
    public string? Email { get; set; }
    public string? City { get; set; }
    public string? ClassName { get; set; }
    public int? TemplateId { get; set; }
}
