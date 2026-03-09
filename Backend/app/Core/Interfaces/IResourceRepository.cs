using Backend.app.Core.Models.Entities;

namespace Backend.app.Core.Interfaces;

public interface IResourceRepository
{
    // Categories
    Task<IEnumerable<ResourceCategory>> GetAllCategoriesAsync();
    Task<long> CreateCategoryAsync(ResourceCategory category);
    Task<bool> DeleteCategoryAsync(long id);

    // Resources
    Task<IEnumerable<BookableResource>> GetAllResourcesAsync();
    Task<BookableResource?> GetResourceByIdAsync(long id);
    Task<long> CreateResourceAsync(BookableResource resource);
    Task<bool> UpdateResourceAsync(long id, BookableResource resource);
    Task<bool> DeleteResourceAsync(long id);

    // Bookings
    Task<IEnumerable<ResourceBooking>> GetBookingsAsync(long? resourceId = null, long? userId = null);
    Task<IEnumerable<ResourceBooking>> GetOverlappingBookingsAsync(long resourceId, DateTime start, DateTime end);
    Task<long> CreateBookingAsync(ResourceBooking booking);
    Task<bool> DeleteBookingAsync(long id);
}