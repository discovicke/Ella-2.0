using Backend.app.Core.Interfaces;
using Backend.app.Core.Models.DTO;
using Backend.app.Core.Models.Entities;

namespace Backend.app.Core.Services;

public class ClassService(IClassRepository repo, ILogger<ClassService> logger)
{
    public async Task<IEnumerable<ClassResponseDto>> GetAllAsync()
    {
        logger.LogInformation("Fetching all classes");
        var entities = await repo.GetAllAsync();
        var allCampusNames = await repo.GetAllClassCampusNamesAsync();

        return entities.Select(e =>
        {
            allCampusNames.TryGetValue(e.Id, out var campuses);
            return new ClassResponseDto(e.Id, e.ClassName, campuses);
        });
    }

    public async Task<ClassResponseDto> GetByIdAsync(long id)
    {
        logger.LogDebug("Fetching class with ID {ClassId}", id);
        var entity =
            await repo.GetByIdAsync(id)
            ?? throw new KeyNotFoundException($"Class with ID {id} not found.");
        return new ClassResponseDto(entity.Id, entity.ClassName);
    }

    public async Task<ClassResponseDto> CreateAsync(CreateClassDto dto)
    {
        logger.LogInformation("Creating class: {ClassName}", dto.ClassName);
        var entity = new SchoolClass { ClassName = dto.ClassName };
        var id = await repo.CreateAsync(entity);
        logger.LogInformation("Class created with ID {ClassId}", id);
        return new ClassResponseDto(id, dto.ClassName);
    }

    public async Task UpdateAsync(long id, UpdateClassDto dto)
    {
        logger.LogInformation("Updating class with ID {ClassId}", id);
        _ =
            await repo.GetByIdAsync(id)
            ?? throw new KeyNotFoundException($"Class with ID {id} not found.");

        var entity = new SchoolClass { Id = id, ClassName = dto.ClassName };
        await repo.UpdateAsync(id, entity);
        logger.LogInformation("Class with ID {ClassId} updated", id);
    }

    public async Task DeleteAsync(long id)
    {
        logger.LogInformation("Deleting class with ID {ClassId}", id);
        _ =
            await repo.GetByIdAsync(id)
            ?? throw new KeyNotFoundException($"Class with ID {id} not found.");

        await repo.DeleteAsync(id);
        logger.LogInformation("Class with ID {ClassId} deleted", id);
    }

    // ── Class ↔ Campus associations ──────────────────

    public async Task<IEnumerable<long>> GetCampusIdsAsync(long classId)
    {
        _ =
            await repo.GetByIdAsync(classId)
            ?? throw new KeyNotFoundException($"Class with ID {classId} not found.");
        return await repo.GetCampusIdsForClassAsync(classId);
    }

    public async Task SetCampusesAsync(long classId, IEnumerable<long> campusIds)
    {
        _ =
            await repo.GetByIdAsync(classId)
            ?? throw new KeyNotFoundException($"Class with ID {classId} not found.");
        await repo.SetCampusesForClassAsync(classId, campusIds);
        logger.LogInformation("Updated campus associations for class {ClassId}", classId);
    }
}
