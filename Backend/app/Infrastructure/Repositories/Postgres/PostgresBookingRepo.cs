using Backend.app.Core.Interfaces;
using Backend.app.Core.Models.Entities;
using Backend.app.Core.Models.Enums;
using Dapper;

namespace Backend.app.Infrastructure.Repositories.Postgres;

public class PostgresBookingRepo(IDbConnectionFactory connectionFactory, ILogger<PostgresBookingRepo> logger)
    : IBookingRepository
{
    public async Task<long> CreateBookingAsync(Booking booking)
    {
        try
        {
            await using var conn = connectionFactory.CreateConnection();
            await conn.OpenAsync();

            var sql = @"
                INSERT INTO bookings (user_id, room_id, start_time, end_time, notes)
                VALUES (@UserId, @RoomId, @StartTime, @EndTime, @Notes)
                RETURNING id;
            ";

            var id = await conn.ExecuteScalarAsync<long>(sql, new {
                booking.UserId,
                booking.RoomId,
                booking.StartTime,
                booking.EndTime,
                booking.Notes
            });

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
            await using var conn = connectionFactory.CreateConnection();
            await conn.OpenAsync();

            var sql = "UPDATE bookings SET status = @Status WHERE id = @BookingId;";
            var rows = await conn.ExecuteAsync(sql, new {
                Status = (int)BookingStatus.Cancelled,
                BookingId = bookingId
            });

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
            await using var conn = connectionFactory.CreateConnection();
            await conn.OpenAsync();

            var sql = "SELECT * FROM bookings;";
            return await conn.QueryAsync<Booking>(sql);
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "Database error while fetching all bookings");
            throw;
        }
    }

    public async Task<IEnumerable<Booking>> GetAllBookingsByDateAsync(DateTime startDate, DateTime endDate)
    {
        try
        {
            await using var conn = connectionFactory.CreateConnection();
            await conn.OpenAsync();

            var sql = @"
                SELECT * FROM bookings
                WHERE start_time >= @StartDate AND end_time <= @EndDate;
            ";

            return await conn.QueryAsync<Booking>(sql, new {
                StartDate = startDate,
                EndDate = endDate
            });
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
            await using var conn = connectionFactory.CreateConnection();
            await conn.OpenAsync();

            var sql = "SELECT * FROM bookings WHERE id = @BookingId;";
            return await conn.QuerySingleOrDefaultAsync<Booking>(sql, new { BookingId = bookingId });
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
            await using var conn = connectionFactory.CreateConnection();
            await conn.OpenAsync();

            var sql = "SELECT * FROM bookings WHERE room_id = @RoomId;";
            return await conn.QueryAsync<Booking>(sql, new { RoomId = roomId });
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
            await using var conn = connectionFactory.CreateConnection();
            await conn.OpenAsync();

            var sql = "SELECT * FROM bookings WHERE user_id = @UserId;";
            return await conn.QueryAsync<Booking>(sql, new { UserId = userId });
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "Database error while fetching bookings for user {UserId}", userId);
            throw;
        }
    }

    public async Task<IEnumerable<Booking>> GetOverlappingBookingsAsync(long roomId, DateTime startDate, DateTime endDate)
    {
        try
        {
            await using var conn = connectionFactory.CreateConnection();
            await conn.OpenAsync();

            var sql = @"
                SELECT * FROM bookings
                WHERE room_id = @RoomId
                AND status != @CancelledStatus
                AND (start_time < @EndDate AND end_time > @StartDate);
            ";

            return await conn.QueryAsync<Booking>(sql, new {
                RoomId = roomId,
                StartDate = startDate,
                EndDate = endDate,
                CancelledStatus = (int)BookingStatus.Cancelled
            });
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
            await using var conn = connectionFactory.CreateConnection();
            await conn.OpenAsync();

            var sql = @"
                UPDATE bookings
                SET user_id = @UserId,
                    room_id = @RoomId,
                    start_time = @StartTime,
                    end_time = @EndTime,
                    status = @Status,
                    notes = @Notes
                WHERE id = @BookingId;
            ";

            var rows = await conn.ExecuteAsync(sql, new {
                booking.UserId,
                booking.RoomId,
                booking.StartTime,
                booking.EndTime,
                Status = (int)booking.Status,
                booking.Notes,
                BookingId = bookingId
            });

            return rows > 0;
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "Database error while updating booking with ID {BookingId}", bookingId);
            throw;
        }
    }
}
