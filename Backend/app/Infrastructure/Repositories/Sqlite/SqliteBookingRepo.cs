﻿using Backend.app.Core.Interfaces;
using Backend.app.Core.Models.Entities;
using Backend.app.Core.Models.Enums;
using Dapper;
using Microsoft.Data.Sqlite;

namespace Backend.app.Infrastructure.Repositories.Sqlite;

public class SqliteBookingRepo(
    IDbConnectionFactory connectionFactory,
    ILogger<SqliteBookingRepo> logger
) : IBookingRepository
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
            INSERT INTO bookings (user_id, room_id, start_time, end_time, status, notes, booker_name, recurring_group_id)
            VALUES (@UserId, @RoomId, @StartTime, @EndTime, @Status, @Notes, @BookerName, @RecurringGroupId);
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
                    Status = (int)booking.Status,
                    booking.Notes,
                    booking.BookerName,
                    RecurringGroupId = booking.RecurringGroupId?.ToString(),
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

            var sql = "UPDATE bookings SET status = @Status WHERE id = @BookingId;";
            var rows = await conn.ExecuteAsync(
                sql,
                new { Status = (int)BookingStatus.Cancelled, BookingId = bookingId }
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
            using var conn = connectionFactory.CreateConnection();
            await conn.OpenAsync();
            var sql = "SELECT * FROM bookings WHERE room_id = @RoomId;";
            var bookings = await conn.QueryAsync<Booking>(sql, new { RoomId = roomId });
            return bookings;
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
            using var conn = connectionFactory.CreateConnection();
            await conn.OpenAsync();
            var sql =
                @"
            SELECT * FROM bookings
            WHERE room_id = @RoomId
            AND status != @CancelledStatus
            AND (
                (start_time < @EndDate AND end_time > @StartDate)
            );";
            var bookings = await conn.QueryAsync<Booking>(
                sql,
                new
                {
                    RoomId = roomId,
                    StartDate = startDate,
                    EndDate = endDate,
                    CancelledStatus = (int)BookingStatus.Cancelled,
                }
            );
            return bookings;
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
            using var conn = connectionFactory.CreateConnection();
            await conn.OpenAsync();
            var sql =
                @"
            UPDATE bookings
            SET user_id = @UserId,
            room_id = @RoomId,
            start_time = @StartTime,
            end_time = @EndTime,
            status = @Status,
            notes = @Notes,
            booker_name = @BookerName,
            recurring_group_id = @RecurringGroupId
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
                    booking.BookerName,
                    RecurringGroupId = booking.RecurringGroupId?.ToString(),
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

    public async Task<IEnumerable<Booking>> GetBookingsByRecurringGroupIdAsync(Guid groupId)
    {
        try
        {
            await using var conn = connectionFactory.CreateConnection();
            await conn.OpenAsync();
            return await conn.QueryAsync<Booking>(
                "SELECT * FROM bookings WHERE recurring_group_id = @GroupId ORDER BY start_time;",
                new { GroupId = groupId.ToString() }
            );
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "Error fetching bookings for recurring group {GroupId}", groupId);
            throw;
        }
    }

    public async Task<int> CancelBookingsByRecurringGroupIdAsync(Guid groupId)
    {
        try
        {
            await using var conn = connectionFactory.CreateConnection();
            await conn.OpenAsync();
            return await conn.ExecuteAsync(
                "UPDATE bookings SET status = @Status WHERE recurring_group_id = @GroupId AND status != @Status;",
                new { GroupId = groupId.ToString(), Status = (int)BookingStatus.Cancelled }
            );
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "Error cancelling bookings for recurring group {GroupId}", groupId);
            throw;
        }
    }

    public async Task<int> CancelFutureBookingsInSeriesAsync(Guid groupId, DateTime fromDate)
    {
        try
        {
            await using var conn = connectionFactory.CreateConnection();
            await conn.OpenAsync();
            return await conn.ExecuteAsync(
                "UPDATE bookings SET status = @Status WHERE recurring_group_id = @GroupId AND start_time >= @FromDate AND status != @Status;",
                new { GroupId = groupId.ToString(), FromDate = fromDate, Status = (int)BookingStatus.Cancelled }
            );
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "Error cancelling future bookings for recurring group {GroupId} from {FromDate}", groupId, fromDate);
            throw;
        }
    }
}
