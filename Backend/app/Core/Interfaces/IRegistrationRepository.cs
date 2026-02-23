namespace Backend.app.Core.Interfaces;

public interface IRegistrationRepository
{
    Task<bool> AddRegistrationAsync(long userId, long bookingId);
    Task<bool> RemoveRegistrationAsync(long userId, long bookingId);
    Task<bool> IsUserRegisteredAsync(long userId, long bookingId);
}
