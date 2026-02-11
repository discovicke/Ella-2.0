using Backend.app.Core.Interfaces;
using Backend.app.Core.Models.Entities;
using Backend.app.Core.Models.Enums;
using Dapper;
using Microsoft.Data.Sqlite;

namespace Backend.app.Infrastructure.Repositories.Sqlite;

public class SqliteBookingRepo(IDbConnectionFactory connectionFactory, ILogger<SqliteBookingRepo> logger) : IBookingRepository
{

/// <summary>
/// Creates a new booking and returns the generated ID.
/// </summary>
/// <param name="booking"></param>
/// <returns></returns>
    public async Task<long> CreateBookingAsync(Booking booking)
    {
        try
        {
            await using var conn = connectionFactory.CreateConnection();
            await conn.OpenAsync();
            var sql =
                @"
            INSERT INTO bookings (user_id, room_id, start_time, end_time, notes)
            VALUES (@UserId, @RoomId, @StartTime, @EndTime, @Notes);
            SELECT last_insert_rowid();
        ";
            var id = await conn.ExecuteScalarAsync<long>(
                sql,
                new
                {
                    booking.UserId,
                    booking.RoomId,
                    booking.StartTime,
                    booking.EndTime,
                    booking.Notes,
                }
            );

            return id;
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "Database error while creating booking for user {UserId}, room {RoomId}", booking.UserId, booking.RoomId);
            throw;
        }
    }

    public async Task<bool> CancelBookingAsync(long bookingId)
    {
        try
        {
            await using var conn = (SqliteConnection)connectionFactory.CreateConnection();
            await conn.OpenAsync();

            var sql = "UPDATE bookings SET status = @Status WHERE id = @BookingId;";
            var rows = await conn.ExecuteAsync(
                sql,
                new { Status = (int)BookingStatus.Cancelled, BookingId = bookingId }
            );

            return rows > 0;
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "Database error while cancelling booking with ID {BookingId}", bookingId);
            throw;
        }
    }

    public async Task<IEnumerable<Booking>> GetAllBookingsAsync()
    {
        try
        {
            await using var conn = (SqliteConnection)connectionFactory.CreateConnection();
            await conn.OpenAsync();
            var sql = "SELECT * FROM bookings;";
            var bookings = await conn.QueryAsync<Booking>(sql);

            return bookings;
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "Database error while fetching all bookings");
            throw;
        }
    }

    public async Task<IEnumerable<Booking>> GetAllBookingsByDateAsync(
        DateTime startDate,
        DateTime endDate
    )
    {
        try
        {
            using var conn = connectionFactory.CreateConnection();
            await conn.OpenAsync();
            var sql = @"
            SELECT * FROM bookings
            WHERE start_time >= @StartDate AND end_time <= @EndDate;
        ";

            var bookings = await conn.QueryAsync<Booking>(
                sql,
                new { StartDate = startDate, EndDate = endDate }
            );

            return bookings;
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "Database error while fetching bookings between {StartDate} and {EndDate}", startDate, endDate);
            throw;
        }
    }

    public async Task<Booking?> GetBookingByIdAsync(long bookingId)
    {
        try
        {
            using var conn = connectionFactory.CreateConnection();
            await conn.OpenAsync();
            var sql = "SELECT * FROM bookings WHERE id = @BookingId;";
            var booking = await conn.QuerySingleOrDefaultAsync<Booking>(
                sql,
                new { BookingId = bookingId }
            );
            return booking;
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "Database error while fetching booking with ID {BookingId}", bookingId);
            throw;
        }
    }

    public async Task<IEnumerable<Booking>> GetBookingsByRoomIdAsync(long roomId)
    {
        try
        {
            using var conn = connectionFactory.CreateConnection();
            await conn.OpenAsync();
            var sql = "SELECT * FROM bookings WHERE room_id = @RoomId;";
            var bookings = await conn.QueryAsync<Booking>(
                sql,
                new { RoomId = roomId }
            );
            return bookings;
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "Database error while fetching bookings for room {RoomId}", roomId);
            throw;
        }
    }

    public async Task<IEnumerable<Booking>> GetBookingsByUserIdAsync(long userId)
    {
        try
        {
            using var conn = connectionFactory.CreateConnection();
            await conn.OpenAsync();
            var sql = "SELECT * FROM bookings WHERE user_id = @UserId;";
            var bookings = await conn.QueryAsync<Booking>(
                sql,
                new { UserId = userId }
            );
            return bookings;
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "Database error while fetching bookings for user {UserId}", userId);
            throw;
        }
    }

    public async Task<IEnumerable<Booking>> GetOverlappingBookingsAsync(
        long roomId,
        DateTime startDate,
        DateTime endDate
    )
    {
        try
        {
            using var conn = connectionFactory.CreateConnection();
            await conn.OpenAsync();
            var sql = @"
            SELECT * FROM bookings
            WHERE room_id = @RoomId
            AND (
                (start_time < @EndDate AND end_time > @StartDate)
            );";
            var bookings = await conn.QueryAsync<Booking>(
                sql,
                new { RoomId = roomId, StartDate = startDate, EndDate = endDate }
            );
            return bookings;
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "Database error while fetching overlapping bookings for room {RoomId}", roomId);
            throw;
        }
    }

    public async Task<bool> UpdateBookingAsync(long bookingId, Booking booking)
    {
        try
        {
            using var conn = connectionFactory.CreateConnection();
            await conn.OpenAsync();
            var sql = @"
            UPDATE bookings
            SET user_id =@UserId,
            room_id = @RoomId,
            start_time = @StartTime,
            end_time = @EndTime,
            status = @Status,
            notes = @Notes
            WHERE id = @BookingId;
        ";
            var rows = await conn.ExecuteAsync(
                sql,
                new
                {
                    booking.UserId,
                    booking.RoomId,
                    booking.StartTime,
                    booking.EndTime,
                    Status = (int)booking.Status,
                    booking.Notes,
                    BookingId = bookingId,
                }
            );
            return rows > 0;
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "Database error while updating booking with ID {BookingId}", bookingId);
            throw;
        }
    }

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
