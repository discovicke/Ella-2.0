using Backend.app.Core.Interfaces;
using Backend.app.Core.Models.Entities;
using Backend.app.Core.Models.Enums;
using Dapper;

namespace Backend.app.Infrastructure.Repositories.Postgres;

public class PostgresBookingRepo(
    IDbConnectionFactory connectionFactory,
    ILogger<PostgresBookingRepo> logger
) : IBookingRepository
{
    public async Task<long> CreateBookingAsync(Booking booking)
    {
        try
        {
            await using var conn = connectionFactory.CreateConnection();
            await conn.OpenAsync();

            var sql =
                @"
                INSERT INTO bookings (user_id, room_id, start_time, end_time, status, notes, booker_name)
                VALUES (@UserId, @RoomId, @StartTime, @EndTime, @Status::booking_status, @Notes, @BookerName)
                RETURNING id;
            ";

            var id = await conn.ExecuteScalarAsync<long>(
                sql,
                new
                {
                    booking.UserId,
                    booking.RoomId,
                    StartTime = booking.StartTime.ToUniversalTime(),
                    EndTime = booking.EndTime.ToUniversalTime(),
                    Status = booking.Status.ToString().ToLower(),
                    booking.Notes,
                    booking.BookerName,
                }
            );

            return id;
        }
        catch (Exception ex)
        {
            logger.LogError(
                ex,
                "Database error while creating booking for user {UserId}, room {RoomId}",
                booking.UserId,
                booking.RoomId
            );
            throw;
        }
    }

    public async Task<bool> CancelBookingAsync(long bookingId)
    {
        try
        {
            await using var conn = connectionFactory.CreateConnection();
            await conn.OpenAsync();

            var sql = "UPDATE bookings SET status = @Status::booking_status WHERE id = @BookingId;";
            var rows = await conn.ExecuteAsync(
                sql,
                new { Status = BookingStatus.Cancelled.ToString().ToLower(), BookingId = bookingId }
            );

            return rows > 0;
        }
        catch (Exception ex)
        {
            logger.LogError(
                ex,
                "Database error while cancelling booking with ID {BookingId}",
                bookingId
            );
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
            return await conn.QuerySingleOrDefaultAsync<Booking>(
                sql,
                new { BookingId = bookingId }
            );
        }
        catch (Exception ex)
        {
            logger.LogError(
                ex,
                "Database error while fetching booking with ID {BookingId}",
                bookingId
            );
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

    public async Task<IEnumerable<Booking>> GetOverlappingBookingsAsync(
        long roomId,
        DateTime startDate,
        DateTime endDate
    )
    {
        try
        {
            await using var conn = connectionFactory.CreateConnection();
            await conn.OpenAsync();

            var sql =
                @"
                SELECT * FROM bookings
                WHERE room_id = @RoomId
                AND status != @CancelledStatus::booking_status
                AND (start_time < @EndDate AND end_time > @StartDate);
            ";

            return await conn.QueryAsync<Booking>(
                sql,
                new
                {
                    RoomId = roomId,
                    StartDate = startDate.ToUniversalTime(),
                    EndDate = endDate.ToUniversalTime(),
                    CancelledStatus = BookingStatus.Cancelled.ToString().ToLower(),
                }
            );
        }
        catch (Exception ex)
        {
            logger.LogError(
                ex,
                "Database error while fetching overlapping bookings for room {RoomId}",
                roomId
            );
            throw;
        }
    }

    public async Task<bool> UpdateBookingAsync(long bookingId, Booking booking)
    {
        try
        {
            await using var conn = connectionFactory.CreateConnection();
            await conn.OpenAsync();

            var sql =
                @"
                UPDATE bookings
                SET user_id = @UserId,
                    room_id = @RoomId,
                    start_time = @StartTime,
                    end_time = @EndTime,
                    status = @Status::booking_status,
                    notes = @Notes,
                    booker_name = @BookerName
                WHERE id = @BookingId;
            ";

            var rows = await conn.ExecuteAsync(
                sql,
                new
                {
                    booking.UserId,
                    booking.RoomId,
                    StartTime = booking.StartTime.ToUniversalTime(),
                    EndTime = booking.EndTime.ToUniversalTime(),
                    Status = booking.Status.ToString().ToLower(),
                    booking.Notes,
                    booking.BookerName,
                    BookingId = bookingId,
                }
            );

            return rows > 0;
        }
        catch (Exception ex)
        {
            logger.LogError(
                ex,
                "Database error while updating booking with ID {BookingId}",
                bookingId
            );
            throw;
        }
    }
}
