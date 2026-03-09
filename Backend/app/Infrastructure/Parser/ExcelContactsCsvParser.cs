using Backend.app.Core.Interfaces;
using Backend.app.Core.Models.DTO;

namespace Backend.app.Infrastructure.Parser;

public class ExcelContactsCsvParser : IParser<StudentImportDto>
{
    public Task<List<StudentImportDto>> Parse(string content, string className)
    {
        var result = new List<StudentImportDto>();
        var lines = content.Replace("\r", "").Split('\n', StringSplitOptions.RemoveEmptyEntries);

        foreach (var line in lines.Skip(1))
        {
            var cols = line.Split(';');

            if (cols.Length < 14 || string.IsNullOrWhiteSpace(cols[3]))
                continue;

            result.Add(
                new StudentImportDto
                {
                    FirstName = cols[3].Trim(),
                    LastName = cols[4].Trim(),
                    Email = cols[9].Trim(),
                    City = cols[13].Trim(),
                    ClassName = className,
                }
            );
        }

        return Task.FromResult(result);
    }
}
