using Backend.app.Core.Interfaces;
using Backend.app.Core.Models.DTO;

namespace Backend.app.Core.Services;

public class UserImportService(
    UserService userService,
    ClassService classService,
    IUserRepository userRepository,
    ILogger<UserImportService> logger
)
{
    public async Task<ImportUsersResponseDto> ImportCsvAsync(string csvContent, string className)
    {
        if (string.IsNullOrWhiteSpace(csvContent))
            throw new ArgumentException("CSV content is required.", nameof(csvContent));
        if (string.IsNullOrWhiteSpace(className))
            throw new ArgumentException("Class name is required.", nameof(className));

        var normalizedClassName = className.Trim();
        var students = await ParserService.ParseExcelContactsCsv(csvContent, normalizedClassName);
        var classId = await ResolveClassIdAsync(normalizedClassName);

        var created = 0;
        var skipped = 0;
        var errors = new List<string>();

        foreach (var student in students)
        {
            var email = student.Email.Trim();
            if (string.IsNullOrWhiteSpace(email))
            {
                skipped++;
                errors.Add("Skipped row because email was missing.");
                continue;
            }

            var dto = new CreateUserDto(
                email,
                ParserService.GenerateDisplayName(student),
                ParserService.GeneratePlaceholderPassword(student)
            );

            try
            {
                var createdUser = await userService.CreateUserAsync(dto);
                await userRepository.SetClassesForUserAsync(createdUser.Id, new[] { classId });
                created++;
            }
            catch (InvalidOperationException ex)
            {
                skipped++;
                errors.Add($"Skipped {email}: {ex.Message}");
            }
            catch (Exception ex)
            {
                skipped++;
                errors.Add($"Failed {email}: {ex.Message}");
                logger.LogWarning(ex, "Import failed for {Email}", email);
            }
        }

        return new ImportUsersResponseDto(
            students.Count,
            created,
            skipped,
            classId,
            normalizedClassName,
            errors
        );
    }

    private async Task<long> ResolveClassIdAsync(string className)
    {
        var existingClass = (await classService.GetAllAsync()).FirstOrDefault(c =>
            string.Equals(c.ClassName, className, StringComparison.OrdinalIgnoreCase)
        );

        if (existingClass is not null)
            return existingClass.Id;

        var createdClass = await classService.CreateAsync(new CreateClassDto(className));
        return createdClass.Id;
    }
}
