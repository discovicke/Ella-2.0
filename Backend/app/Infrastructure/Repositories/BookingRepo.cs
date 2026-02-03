using Backend.app.Core.Entities;
using Backend.app.Core.Enums;
using Backend.app.Core.Interfaces;
using Dapper;
using Microsoft.Data.Sqlite;

namespace Backend.app.Infrastructure.Repositories;

public class BookingRepo(IDbConnectionFactory connectionFactory) : IBookingRepository
{
    // SQLite repository for Booking
    // TODO: Migrate all SQL queries from booking.repo.js
    // ⚠️ Update queries for new schema if columns/tables changed
    public async Task<bool> CreateBookingAsync(Booking booking)
    {
        using var conn = connectionFactory.CreateConnection();
        await conn.OpenAsync();
        var sql =
            @"
            INSERT INTO bookings (user_id, room_id, start_time, end_time, status, notes)
            VALUES (@UserId, @RoomId, @StartTime, @EndTime, @Status, @Notes);
        ";
        var rows = await conn.ExecuteAsync(
            sql,
            new
            {
                booking.UserId,
                booking.RoomId,
                booking.StartTime,
                booking.EndTime,
                status = (int)booking.Status,
                booking.Notes,
            }
        );

        return rows > 0;
    }

    public async Task<bool> CancelBookingAsync(int bookingId)
    {
        using var conn = (SqliteConnection)connectionFactory.CreateConnection();
        await conn.OpenAsync();

        var sql = "UPDATE bookings SET status = @Status WHERE id = @BookingId;";
        var rows = await conn.ExecuteAsync(
            sql,
            new { Status = (int)BookingStatus.Cancelled, BookingId = bookingId }
        );

        return rows > 0;
    }

    public Task<IEnumerable<Booking>> GetAllBookingsAsync()
    {
        throw new NotImplementedException();
    }

    public Task<IEnumerable<Booking>> GetAllBookingsByDateAsync(
        DateTime startDate,
        DateTime endDate
    )
    {
        throw new NotImplementedException();
    }

    public Task<Booking?> GetBookingByIdAsync(int bookingId)
    {
        throw new NotImplementedException();
    }

    public Task<IEnumerable<Booking>> GetBookingsByRoomIdAsync(int roomId)
    {
        throw new NotImplementedException();
    }

    public Task<IEnumerable<Booking>> GetBookingsByUserIdAsync(int userId)
    {
        throw new NotImplementedException();
    }

    public Task<IEnumerable<Booking>> GetOverlappingBookingsAsync(
        int roomId,
        DateTime startDate,
        DateTime endDate
    )
    {
        throw new NotImplementedException();
    }

    public Task SaveChangesAsync()
    {
        // No-op for Dapper; changes are committed immediately
        return Task.CompletedTask;
    }

    public Task<bool> UpdateBookingAsync(int bookingId, Booking booking)
    {
        throw new NotImplementedException();
    }
}
