using Backend.app.Core.Interfaces;
using Dapper;

namespace DefaultNamespace;

public class PostgresRegistrationRepo(IDbConnectionFactory dbConnectionFactory, ILogger<PostgresRegistrationRepo> logger) : IRegistrationRepository
{
    public async Task<bool> AddRegistrationAsync(long userId, long bookingId)
    {
        try
        {
            await using var conn = dbConnectionFactory.CreateConnection();
            await conn.OpenAsync();
            var sql = @"INSERT INTO registrations (user_id, booking_id) VALUES (@UserId, @BookingId);";
            var rows = await conn.ExecuteAsync(sql, new { UserId = userId, BookingId = bookingId });
            return rows > 0;
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "Error adding registration");
            return false;
        }
    }

    public async Task<bool> RemoveRegistrationAsync(long userId, long bookingId)
    {
        try
        {
            await using var conn = dbConnectionFactory.CreateConnection();
            await conn.OpenAsync();
            var sql = @"DELETE FROM registrations WHERE user_id = @UserId AND booking_id = @BookingId;";
            var rows = await conn.ExecuteAsync(sql, new { UserId = userId, BookingId = bookingId });
            return rows > 0;
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "Error removing registration");
            return false;
        }
    }

    public async Task<bool> IsUserRegisteredAsync(long userId, long bookingId)
    {
        try
        {
            await using var conn = dbConnectionFactory.CreateConnection();
            await conn.OpenAsync();
            var sql = @"SELECT COUNT(1) FROM registrations WHERE user_id = @UserId AND booking_id = @BookingId;";
            var count = await conn.ExecuteScalarAsync<int>(sql, new { UserId = userId, BookingId = bookingId });
            return count > 0;
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "Error checking registration status for user {UserId} on booking {BookingId}", userId, bookingId);
            throw;
        }
    }
}