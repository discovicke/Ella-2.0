using System.Security.Cryptography;
using Backend.app.Core.Interfaces;
using Backend.app.Core.Models.DTO;
using Backend.app.Core.Models.Entities;
using Backend.app.Infrastructure.Parser;

namespace Backend.app.Core.Services;

public class UserImportService(
    UserService userService,
    ClassService classService,
    CampusService campusService,
    PermissionTemplateService permissionTemplateService,
    IUserRepository userRepository,
    IClassRepository classRepository,
    IParser<StudentImportDto> parser,
    ILogger<UserImportService> logger
)
{
    public async Task<ImportUsersResponseDto> ImportCsvAsync(
        string csvContent,
        string className,
        long? templateId = null
    )
    {
        if (string.IsNullOrWhiteSpace(csvContent))
            throw new ArgumentException("CSV content is required.", nameof(csvContent));
        if (string.IsNullOrWhiteSpace(className))
            throw new ArgumentException("Class name is required.", nameof(className));

        var normalizedClassName = className.Trim();
        var students = await parser.Parse(csvContent, normalizedClassName);
        var classId = await ResolveClassIdAsync(normalizedClassName);

        var campuses = await campusService.GetAllAsync();

        // Build a city → campus ID lookup for auto-matching Studieort
        var allCampuses = await campusService.GetAllAsync();
        var campusLookup = allCampuses
            .GroupBy(c => c.City, StringComparer.OrdinalIgnoreCase)
            .ToDictionary(g => g.Key, g => g.First().Id, StringComparer.OrdinalIgnoreCase);

        // Stamp the chosen template onto each student
        if (templateId.HasValue)
        {
            foreach (var s in students)
                s.TemplateId ??= (int)templateId.Value;
        }

        var created = 0;
        var updated = 0;
        var skipped = 0;
        var errors = new List<string>();

        foreach (var student in students)
        {
            var email = (student.Email ?? "").Trim();
            if (string.IsNullOrWhiteSpace(email))
            {
                skipped++;
                errors.Add("Skipped row because email was missing.");
                continue;
            }

            var dto = new CreateUserDto(
                email,
                GenerateDisplayName(student),
                GeneratePlaceholderPassword(student)
            );

            try
            {
                var createdUser = await userService.CreateUserAsync(dto);

                await userRepository.SetClassesForUserAsync(createdUser.Id, new[] { classId });
                
                if (!string.IsNullOrWhiteSpace(student.CampusName))
                {
                    var matchedCampus = campuses.FirstOrDefault(c =>
                        string.Equals(
                            c.City,
                            student.CampusName.Trim(),
                            StringComparison.OrdinalIgnoreCase
                        )
                    );

                    if (matchedCampus != null)
                    {
                        await userRepository.SetCampusesForUserAsync(
                            createdUser.Id,
                            new[] { matchedCampus.Id }
                        );
                    }
                }

                if (student.TemplateId.HasValue)
                    await permissionTemplateService.ApplyTemplateAsync(
                        createdUser.Id,
                        student.TemplateId.Value
                    );

                if (!string.IsNullOrWhiteSpace(student.CampusName))
                {
                    if (campusLookup.TryGetValue(student.CampusName, out var campusId))
                        await userRepository.SetCampusesForUserAsync(
                            createdUser.Id,
                            new[] { campusId }
                        );
                    else
                        errors.Add($"{email}: unknown campus \"{student.CampusName}\"");
                }
                created++;
            }
            catch (InvalidOperationException)
            {
                // User already exists — update campus/class associations
                try
                {
                    var existing = await userRepository.GetUserByEmailAsync(email);
                    if (existing is not null)
                    {
                        await userRepository.SetClassesForUserAsync(existing.Id, new[] { classId });
                        if (!string.IsNullOrWhiteSpace(student.CampusName))
                        {
                            if (
                                campusLookup.TryGetValue(
                                    student.CampusName,
                                    out var existingCampusId
                                )
                            )
                                await userRepository.SetCampusesForUserAsync(
                                    existing.Id,
                                    new[] { existingCampusId }
                                );
                            else
                                errors.Add($"{email}: unknown campus \"{student.CampusName}\"");
                        }
                        updated++;
                    }
                    else
                    {
                        skipped++;
                        errors.Add($"Skipped {email}: user not found after conflict.");
                    }
                }
                catch (Exception ex)
                {
                    skipped++;
                    errors.Add($"Failed updating {email}: {ex.Message}");
                    logger.LogWarning(ex, "Re-import update failed for {Email}", email);
                }
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
            updated,
            skipped,
            classId,
            normalizedClassName,
            errors
        );
    }

    private async Task<long> ResolveClassIdAsync(string className)
    {
        var existingClass = await classRepository.GetByNameAsync(className);

        if (existingClass is not null)
            return existingClass.Id;

        var createdClass = await classService.CreateAsync(new CreateClassDto(className));
        return createdClass.Id;
    }

    public static string GenerateDisplayName(StudentImportDto student)
    {
        var firstName = (student.FirstName ?? "").Trim();
        var lastName = (student.LastName ?? "").Trim();
        return string.Join(
            " ",
            new[] { firstName, lastName }.Where(s => !string.IsNullOrWhiteSpace(s))
        );
    }

    public static string GeneratePlaceholderPassword(StudentImportDto student)
    {
        var firstName = string.IsNullOrWhiteSpace(student.FirstName)
            ? "student"
            : student.FirstName.Trim().ToLowerInvariant();

        var token = Convert.ToHexString(RandomNumberGenerator.GetBytes(6)).ToLowerInvariant();
        var password = $"placeholder-{firstName}-{token}";
        return password.Length <= 128 ? password : password[..128];
    }
}
