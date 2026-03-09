using Backend.app.Core.Interfaces;
using Backend.app.Core.Models.DTO;
using Backend.app.Core.Models.Entities;

namespace Backend.app.Core.Services;

public class ResourceService(
    IResourceRepository resourceRepo,
    ICampusRepository campusRepo,
    IUserRepository userRepo,
    ILogger<ResourceService> logger
)
{
    // Categories
    public async Task<IEnumerable<ResourceCategoryDto>> GetAllCategoriesAsync()
    {
        var cats = await resourceRepo.GetAllCategoriesAsync();
        return cats.Select(c => new ResourceCategoryDto(c.Id, c.Name));
    }

    public async Task<ResourceCategoryDto> CreateCategoryAsync(CreateResourceCategoryDto dto)
    {
        var id = await resourceRepo.CreateCategoryAsync(new ResourceCategory { Name = dto.Name });
        return new ResourceCategoryDto(id, dto.Name);
    }

    // Resources
    public async Task<IEnumerable<ResourceResponseDto>> GetAllResourcesAsync()
    {
        var resources = await resourceRepo.GetAllResourcesAsync();
        var cats = (await resourceRepo.GetAllCategoriesAsync()).ToDictionary(c => c.Id, c => c.Name);
        var campuses = (await campusRepo.GetAllAsync()).ToDictionary(c => c.Id, c => c.City);

        return resources.Select(r => new ResourceResponseDto(
            r.Id,
            r.CategoryId,
            cats.GetValueOrDefault(r.CategoryId, "Unknown"),
            r.CampusId,
            campuses.GetValueOrDefault(r.CampusId, "Unknown"),
            r.Name,
            r.Description,
            r.IsActive
        ));
    }

    public async Task<ResourceResponseDto?> CreateResourceAsync(CreateResourceDto dto)
    {
        var resource = new BookableResource
        {
            CategoryId = dto.CategoryId,
            CampusId = dto.CampusId,
            Name = dto.Name,
            Description = dto.Description,
            IsActive = true
        };
        var id = await resourceRepo.CreateResourceAsync(resource);
        return (await GetAllResourcesAsync()).FirstOrDefault(r => r.Id == id);
    }

    public async Task<bool> DeleteResourceAsync(long id) => await resourceRepo.DeleteResourceAsync(id);

    // Bookings
    public async Task<IEnumerable<ResourceBookingResponseDto>> GetBookingsAsync(long? resourceId = null, long? userId = null)
    {
        var bookings = await resourceRepo.GetBookingsAsync(resourceId, userId);
        var resources = (await resourceRepo.GetAllResourcesAsync()).ToDictionary(r => r.Id, r => r.Name);
        var users = (await userRepo.GetAllUsersAsync()).ToDictionary(u => u.Id, u => u.DisplayName ?? u.Email);

        return bookings.Select(b => new ResourceBookingResponseDto(
            b.Id,
            b.ResourceId,
            resources.GetValueOrDefault(b.ResourceId, "Unknown Resource"),
            b.UserId,
            users.GetValueOrDefault(b.UserId, "Unknown User"),
            b.StartTime,
            b.EndTime,
            b.Notes
        ));
    }

    public async Task<ResourceBookingResponseDto?> CreateBookingAsync(long userId, CreateResourceBookingDto dto)
    {
        // 1. Check availability
        var overlaps = await resourceRepo.GetOverlappingBookingsAsync(dto.ResourceId, dto.StartTime, dto.EndTime);
        if (overlaps.Any())
        {
            logger.LogWarning("Resource {ResourceId} is already booked during this time", dto.ResourceId);
            return null;
        }

        // 2. Create
        var booking = new ResourceBooking
        {
            ResourceId = dto.ResourceId,
            UserId = userId,
            StartTime = dto.StartTime,
            EndTime = dto.EndTime,
            Notes = dto.Notes
        };

        var id = await resourceRepo.CreateBookingAsync(booking);
        return (await GetBookingsAsync(userId: userId)).FirstOrDefault(b => b.Id == id);
    }

    public async Task<bool> DeleteBookingAsync(long id) => await resourceRepo.DeleteBookingAsync(id);
}