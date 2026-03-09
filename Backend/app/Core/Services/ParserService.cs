using System.Security.Cryptography;
using Backend.app.Core.Models.DTO;
using Backend.app.Infrastructure.Parser;

namespace Backend.app.Core.Services;

public class ParserService
{
    public static Task<List<StudentImportDto>> ParseExcelContactsCsv(string content, string className)
    {
        return ExcelContactsCsvParser.Parse(content, className);
    }

    public static string GenerateDisplayName(StudentImportDto student)
    {
        ArgumentNullException.ThrowIfNull(student);

        var firstName = student.FirstName.Trim();
        var lastName = student.LastName.Trim();

        return string.Join(" ", new[] { firstName, lastName }.Where(s => !string.IsNullOrWhiteSpace(s)));
    }

    public static string GeneratePlaceholderPassword(StudentImportDto student)
    {
        ArgumentNullException.ThrowIfNull(student);

        var firstName = string.IsNullOrWhiteSpace(student.FirstName)
            ? "student"
            : student.FirstName.Trim().ToLowerInvariant();

        var token = Convert.ToHexString(RandomNumberGenerator.GetBytes(6)).ToLowerInvariant();
        var password = $"placeholder-{firstName}-{token}";

        return password.Length <= 128 ? password : password[..128];
    }
}