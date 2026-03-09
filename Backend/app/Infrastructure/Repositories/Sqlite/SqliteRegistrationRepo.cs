using Backend.app.Core.Interfaces;
using Backend.app.Core.Models.Enums;
using Dapper;

namespace Backend.app.Infrastructure.Repositories.Sqlite;

public class SqliteRegistrationRepo(
    IDbConnectionFactory connectionFactory,
    ILogger<SqliteRegistrationRepo> logger
) : IRegistrationRepository
{
    public async Task<bool> AddAsync(long userId, long bookingId, RegistrationStatus status)
    {
        try
        {
            await using var conn = connectionFactory.CreateConnection();
            await conn.OpenAsync();
            var sql =
                @"INSERT OR IGNORE INTO registrations (user_id, booking_id, status)
                  VALUES (@UserId, @BookingId, @Status);";
            var rows = await conn.ExecuteAsync(
                sql,
                new { UserId = userId, BookingId = bookingId, Status = (int)status }
            );
            return rows > 0;
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "Error adding registration for user {UserId} to booking {BookingId}", userId, bookingId);
            throw;
        }
    }

    public async Task<bool> UpdateStatusAsync(long userId, long bookingId, RegistrationStatus status)
    {
        try
        {
            await using var conn = connectionFactory.CreateConnection();
            await conn.OpenAsync();
            var sql =
                @"UPDATE registrations SET status = @Status
                  WHERE user_id = @UserId AND booking_id = @BookingId;";
            var rows = await conn.ExecuteAsync(
                sql,
                new { UserId = userId, BookingId = bookingId, Status = (int)status }
            );
            return rows > 0;
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "Error updating registration status for user {UserId} on booking {BookingId}", userId, bookingId);
            throw;
        }
    }

    public async Task<bool> RemoveAsync(long userId, long bookingId)
    {
        try
        {
            await using var conn = connectionFactory.CreateConnection();
            await conn.OpenAsync();
            var sql = @"DELETE FROM registrations WHERE user_id = @UserId AND booking_id = @BookingId;";
            var rows = await conn.ExecuteAsync(sql, new { UserId = userId, BookingId = bookingId });
            return rows > 0;
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "Error removing registration for user {UserId} from booking {BookingId}", userId, bookingId);
            throw;
        }
    }

    public async Task<bool> ExistsAsync(long userId, long bookingId)
    {
        try
        {
            await using var conn = connectionFactory.CreateConnection();
            await conn.OpenAsync();
            var sql = @"SELECT COUNT(1) FROM registrations WHERE user_id = @UserId AND booking_id = @BookingId;";
            var count = await conn.ExecuteScalarAsync<int>(sql, new { UserId = userId, BookingId = bookingId });
            return count > 0;
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "Error checking existence for user {UserId} on booking {BookingId}", userId, bookingId);
            throw;
        }
    }

    public async Task<RegistrationStatus?> GetStatusAsync(long userId, long bookingId)
    {
        try
        {
            await using var conn = connectionFactory.CreateConnection();
            await conn.OpenAsync();
            var sql = @"SELECT status FROM registrations WHERE user_id = @UserId AND booking_id = @BookingId;";
            var result = await conn.QueryFirstOrDefaultAsync<int?>(sql, new { UserId = userId, BookingId = bookingId });
            return result switch
            {
                0 => RegistrationStatus.Invited,
                1 => RegistrationStatus.Registered,
                2 => RegistrationStatus.Declined,
                _ => null,
            };
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "Error getting status for user {UserId} on booking {BookingId}", userId, bookingId);
            throw;
        }
    }

    public async Task<IEnumerable<(long UserId, string DisplayName, string Email)>> GetRegisteredUsersAsync(long bookingId)
    {
        try
        {
            await using var conn = connectionFactory.CreateConnection();
            await conn.OpenAsync();
            var sql =
                @"SELECT u.id AS UserId, u.display_name AS DisplayName, u.email AS Email
                  FROM registrations r
                  INNER JOIN users u ON r.user_id = u.id
                  WHERE r.booking_id = @BookingId AND r.status = 1
                  ORDER BY u.display_name;";
            return await conn.QueryAsync<(long UserId, string DisplayName, string Email)>(sql, new { BookingId = bookingId });
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "Error fetching registered users for booking {BookingId}", bookingId);
            throw;
        }
    }

    public async Task<IEnumerable<(long UserId, string DisplayName, string Email)>> GetInvitedUsersAsync(long bookingId)
    {
        try
        {
            await using var conn = connectionFactory.CreateConnection();
            await conn.OpenAsync();
            var sql =
                @"SELECT u.id AS UserId, u.display_name AS DisplayName, u.email AS Email
                  FROM registrations r
                  INNER JOIN users u ON r.user_id = u.id
                  WHERE r.booking_id = @BookingId AND r.status = 0
                  ORDER BY u.display_name;";
            return await conn.QueryAsync<(long UserId, string DisplayName, string Email)>(sql, new { BookingId = bookingId });
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "Error fetching invited users for booking {BookingId}", bookingId);
            throw;
        }
    }

    public async Task<int> BulkInviteAsync(long bookingId, IEnumerable<long> userIds)
    {
        try
        {
            await using var conn = connectionFactory.CreateConnection();
            await conn.OpenAsync();
            var sql =
                @"INSERT OR IGNORE INTO registrations (user_id, booking_id, status)
                  VALUES (@UserId, @BookingId, 0);";
            var total = 0;
            foreach (var userId in userIds)
            {
                total += await conn.ExecuteAsync(sql, new { UserId = userId, BookingId = bookingId });
            }
            return total;
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "Error bulk-inviting users to booking {BookingId}", bookingId);
            throw;
        }
    }
}
