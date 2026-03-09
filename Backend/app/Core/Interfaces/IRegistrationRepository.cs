using Backend.app.Core.Models.Enums;

namespace Backend.app.Core.Interfaces;

public interface IRegistrationRepository
{
    /// <summary>Insert a row with the given status (Invited or Registered).</summary>
    Task<bool> AddAsync(long userId, long bookingId, RegistrationStatus status);

    /// <summary>Update an existing row's status (e.g. Invited → Registered).</summary>
    Task<bool> UpdateStatusAsync(long userId, long bookingId, RegistrationStatus status);

    /// <summary>Remove a registration/invitation row entirely.</summary>
    Task<bool> RemoveAsync(long userId, long bookingId);

    /// <summary>Check whether a row exists for the user+booking (any status).</summary>
    Task<bool> ExistsAsync(long userId, long bookingId);

    /// <summary>Get the status of a specific registration, or null if none.</summary>
    Task<RegistrationStatus?> GetStatusAsync(long userId, long bookingId);

    /// <summary>Get all registered (confirmed) users for a booking.</summary>
    Task<IEnumerable<(long UserId, string DisplayName, string Email)>> GetRegisteredUsersAsync(
        long bookingId
    );

    /// <summary>Get all invited (pending) users for a booking.</summary>
    Task<IEnumerable<(long UserId, string DisplayName, string Email)>> GetInvitedUsersAsync(
        long bookingId
    );

    /// <summary>Bulk-invite multiple users to a booking (inserts with status=Invited, skips existing).</summary>
    Task<int> BulkInviteAsync(long bookingId, IEnumerable<long> userIds);
}
