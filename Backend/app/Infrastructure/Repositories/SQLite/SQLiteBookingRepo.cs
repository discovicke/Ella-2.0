using System;
using Backend.app.Core.Interfaces;
using Backend.app.Core.Models;
using Microsoft.Data.Sqlite;
using Dapper;

namespace Backend.app.Infrastructure.Repositories.SQLite;

public class SQLiteBookingRepo(IDbConnectionFactory connectionFactory) : IBookingRepository


{
    // SQLite repository for Booking
    // TODO: Migrate all SQL queries from booking.repo.js
    // ⚠️ Update queries for new schema if columns/tables changed
    public async Task<bool> CreateBookingAsync(Booking booking)
    {
        using var conn = (SqliteConnection)connectionFactory.CreateConnection();
        await conn.OpenAsync();
        var sql = @"
        INSERT INTO bookings (user_id, room_id, start_time, end_time, status, notes,)
        VALUES (@UserId, @RoomId, @StartTime, @EndTime, @Status, @Notes);
    ";
    var rows = await conn.ExecuteAsync(sql, new 
    {
        booking.UserId,
        booking.RoomId,
        booking.StartTime,
        booking.EndTime,
        status = (int)booking.Status,
        booking.Notes
    });
    
        return rows > 0;
    }
}