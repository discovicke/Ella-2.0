using Backend.app.Core.Models.Entities;

namespace Backend.app.Core.Interfaces;

public interface IBookingSlugRepository
{
    Task<BookingSlug?> GetBySlugAsync(string slug);
    Task<IEnumerable<BookingSlug>> GetAllAsync();
    Task<BookingSlug?> GetByUserIdAsync(long userId);
    Task<bool> CreateAsync(BookingSlug bookingSlug);
    Task<bool> DeleteAsync(long id);
    Task<bool> ToggleActiveAsync(long id, bool isActive);
}