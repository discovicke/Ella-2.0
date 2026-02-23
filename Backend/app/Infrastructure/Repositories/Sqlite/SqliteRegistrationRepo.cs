using Backend.app.Core.Interfaces;
using Dapper;
using Microsoft.Data.Sqlite;

namespace Backend.app.Infrastructure.Repositories.Sqlite;

public class SqliteRegistrationRepo(IDbConnectionFactory connectionFactory, ILogger<SqliteRegistrationRepo> logger) : IRegistrationRepository
{
    public async Task<bool> AddRegistrationAsync(long userId, long bookingId)
    {
        try
        {
            await using var conn = connectionFactory.CreateConnection();
            await conn.OpenAsync();
            var sql = "INSERT INTO registrations (user_id, booking_id) VALUES (@UserId, @BookingId);";
            var rows = await conn.ExecuteAsync(sql, new { UserId = userId, BookingId = bookingId });
            return rows > 0;
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "Database error while adding registration for user {UserId} to booking {BookingId}", userId, bookingId);
            return false;
        }
    }

    public async Task<bool> RemoveRegistrationAsync(long userId, long bookingId)
    {
        try
        {
            await using var conn = connectionFactory.CreateConnection();
            await conn.OpenAsync();
            var sql = "DELETE FROM registrations WHERE user_id = @UserId AND booking_id = @BookingId;";
            var rows = await conn.ExecuteAsync(sql, new { UserId = userId, BookingId = bookingId });
            return rows > 0;
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "Database error while removing registration for user {UserId} from booking {BookingId}", userId, bookingId);
            throw;
        }
    }

    public async Task<bool> IsUserRegisteredAsync(long userId, long bookingId)
    {
        try
        {
            await using var conn = connectionFactory.CreateConnection();
            await conn.OpenAsync();
            var sql = "SELECT COUNT(1) FROM registrations WHERE user_id = @UserId AND booking_id = @BookingId;";
            var count = await conn.ExecuteScalarAsync<int>(sql, new { UserId = userId, BookingId = bookingId });
            return count > 0;
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "Database error while checking registration status for user {UserId} on booking {BookingId}", userId, bookingId);
            throw;
        }
    }
}
