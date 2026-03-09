using Backend.app.Core.Interfaces;
using Backend.app.Core.Models.Enums;
using Dapper;

namespace Backend.app.Infrastructure.Repositories.Postgres;

public class PostgresRegistrationRepo(
    IDbConnectionFactory connectionFactory,
    ILogger<PostgresRegistrationRepo> logger
) : IRegistrationRepository
{
    public async Task<bool> AddAsync(long userId, long bookingId, RegistrationStatus status)
    {
        try
        {
            await using var conn = connectionFactory.CreateConnection();
            await conn.OpenAsync();
            var sql =
                @"INSERT INTO registrations (user_id, booking_id, status)
                  VALUES (@UserId, @BookingId, @Status::registration_status)
                  ON CONFLICT (user_id, booking_id) DO NOTHING;";
            var rows = await conn.ExecuteAsync(
                sql,
                new { UserId = userId, BookingId = bookingId, Status = status.ToString().ToLower() }
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
                @"UPDATE registrations SET status = @Status::registration_status
                  WHERE user_id = @UserId AND booking_id = @BookingId;";
            var rows = await conn.ExecuteAsync(
                sql,
                new { UserId = userId, BookingId = bookingId, Status = status.ToString().ToLower() }
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
            var result = await conn.QueryFirstOrDefaultAsync<string>(sql, new { UserId = userId, BookingId = bookingId });
            return result switch
            {
                "invited" => RegistrationStatus.Invited,
                "registered" => RegistrationStatus.Registered,
                "declined" => RegistrationStatus.Declined,
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
                  WHERE r.booking_id = @BookingId AND r.status = 'registered'
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
                  WHERE r.booking_id = @BookingId AND r.status = 'invited'
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
                @"INSERT INTO registrations (user_id, booking_id, status)
                  VALUES (@UserId, @BookingId, 'invited')
                  ON CONFLICT (user_id, booking_id) DO NOTHING;";
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
