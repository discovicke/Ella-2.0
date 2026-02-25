using Backend.app.Core.Interfaces;
using Backend.app.Core.Models.DTO;
using Backend.app.Core.Models.Entities;

namespace Backend.app.Core.Services;

public class CampusService(ICampusRepository repo, ILogger<CampusService> logger)
{
    public async Task<IEnumerable<CampusResponseDto>> GetAllAsync()
    {
        logger.LogInformation("Fetching all campuses");
        var entities = await repo.GetAllAsync();
        return entities.Select(e => new CampusResponseDto(
            e.Id,
            e.Street,
            e.Zip,
            e.City,
            e.Country,
            e.Contact
        ));
    }

    public async Task<CampusResponseDto> GetByIdAsync(long id)
    {
        logger.LogDebug("Fetching campus with ID {CampusId}", id);
        var entity =
            await repo.GetByIdAsync(id)
            ?? throw new KeyNotFoundException($"Campus with ID {id} not found.");
        return new CampusResponseDto(
            entity.Id,
            entity.Street,
            entity.Zip,
            entity.City,
            entity.Country,
            entity.Contact
        );
    }

    public async Task<CampusResponseDto> CreateAsync(CreateCampusDto dto)
    {
        logger.LogInformation("Creating campus in {City}", dto.City);
        var entity = new Campus
        {
            Street = dto.Street,
            Zip = dto.Zip,
            City = dto.City,
            Country = dto.Country,
            Contact = dto.Contact,
        };
        var id = await repo.CreateAsync(entity);
        logger.LogInformation("Campus created with ID {CampusId}", id);
        return new CampusResponseDto(id, dto.Street, dto.Zip, dto.City, dto.Country, dto.Contact);
    }

    public async Task UpdateAsync(long id, UpdateCampusDto dto)
    {
        logger.LogInformation("Updating campus with ID {CampusId}", id);
        _ =
            await repo.GetByIdAsync(id)
            ?? throw new KeyNotFoundException($"Campus with ID {id} not found.");

        var entity = new Campus
        {
            Id = id,
            Street = dto.Street,
            Zip = dto.Zip,
            City = dto.City,
            Country = dto.Country,
            Contact = dto.Contact,
        };
        await repo.UpdateAsync(id, entity);
        logger.LogInformation("Campus with ID {CampusId} updated", id);
    }

    public async Task DeleteAsync(long id)
    {
        logger.LogInformation("Deleting campus with ID {CampusId}", id);
        _ =
            await repo.GetByIdAsync(id)
            ?? throw new KeyNotFoundException($"Campus with ID {id} not found.");

        await repo.DeleteAsync(id);
        logger.LogInformation("Campus with ID {CampusId} deleted", id);
    }
}
