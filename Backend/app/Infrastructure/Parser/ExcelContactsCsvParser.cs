using Backend.app.Core.Interfaces;
using Backend.app.Core.Models.DTO;

namespace Backend.app.Infrastructure.Parser;

public class ExcelContactsCsvParser : IParser<StudentImportDto>
{
    private const int ColFirstName = 3;
    private const int ColLastName = 4;
    private const int ColEmail = 9;
    private const int ColCity = 13;
    private const int MinRequiredColumns = 14;

    public Task<List<StudentImportDto>> Parse(string content, string className)
    {
        var result = new List<StudentImportDto>();
        var lines = content.Split(new[] { "\r\n", "\r", "\n" }, StringSplitOptions.RemoveEmptyEntries);

        foreach (var line in lines)
        {
            var cols = line.Split(';');

            if (cols.Length < MinRequiredColumns || string.IsNullOrWhiteSpace(cols[ColFirstName]))
                continue;

            result.Add(new StudentImportDto
            {
                FirstName = cols[ColFirstName].Trim(),
                LastName  = cols[ColLastName].Trim(),
                Email     = cols[ColEmail].Trim(),
                CampusName = cols.Length > 25 ? cols[ColCity].Trim() : null,
                ClassName = className,
            });
        }

        return Task.FromResult(result);
    }
}