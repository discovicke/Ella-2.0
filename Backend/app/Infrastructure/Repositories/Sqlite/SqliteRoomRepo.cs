using System;
using Backend.app.Core.Entities;
using Backend.app.Core.Enums;
using Backend.app.Core.Interfaces;
using Dapper;
using Microsoft.Data.Sqlite;

namespace Backend.app.Infrastructure.Repositories.Sqlite;

public class SqliteRoomRepo(IDbConnectionFactory connectionFactory, ILogger<SqliteRoomRepo> logger) : IRoomRepository
{
    // SQLite repository for Room
    // ⚠️ Update queries for new schema if columns/tables changed

    public async Task<IEnumerable<Room>> GetAllRoomsAsync()
    {
        try
        {
            await using var conn = connectionFactory.CreateConnection();
            await conn.OpenAsync();
            const string sql = "SELECT * FROM rooms;";
            var rooms = await conn.QueryAsync<Room>(sql);
            return rooms;
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "Database error while fetching all rooms");
            throw;
        }
    }

    public async Task<Room?> GetRoomByIdAsync(int id)
    {
        try
        {
            await using var conn = connectionFactory.CreateConnection();
            await conn.OpenAsync();

            const string sql = "SELECT * FROM rooms WHERE id = @id;";

            return await conn.QuerySingleOrDefaultAsync<Room>(sql, new { id });
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "Database error while fetching room with ID {RoomId}", id);
            throw;
        }
    }

    public async Task<IEnumerable<Room>> GetRoomsByTypeAsync(RoomType type)
    {
        try
        {
            await using var conn = connectionFactory.CreateConnection();
            await conn.OpenAsync();

            const string sql = "SELECT * FROM rooms WHERE type = @type;";

            return await conn.QueryAsync<Room>(sql, new { type });
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "Database error while fetching rooms with type {RoomType}", type);
            throw;
        }
    }

    public async Task<IEnumerable<Room>> GetRoomsByAddressAsync(string address)
    {
        try
        {
            await using var conn = connectionFactory.CreateConnection();
            await conn.OpenAsync();

            const string sql = "SELECT * FROM rooms WHERE address = @address;";

            return await conn.QueryAsync<Room>(sql, new { address });
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "Database error while fetching rooms with address {Address}", address);
            throw;
        }
    }

    public async Task<int> CreateRoomAsync(Room room)
    {
        try
        {
            await using var conn = connectionFactory.CreateConnection();
            await conn.OpenAsync();

            const string sql =
                @"
            INSERT INTO rooms (name, capacity, type, floor, address, notes) 
            VALUES (@Name, @Capacity, @Type, @Floor, @Address, @Notes);
            SELECT last_insert_rowid();";

            return await conn.ExecuteScalarAsync<int>(sql, room);
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "Database error while creating room {RoomName}", room.Name);
            throw;
        }
    }

    public async Task<bool> UpdateRoomAsync(int id, Room room)
    {
        try
        {
            await using var conn = connectionFactory.CreateConnection();
            await conn.OpenAsync();

            const string sql =
                "UPDATE rooms SET name = @Name, capacity = @Capacity, type = @Type, floor = @Floor, address = @Address, notes = @Notes WHERE id = @Id;";
            return await conn.ExecuteAsync(sql, room) > 0;
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "Database error while updating room with ID {RoomId}", id);
            throw;
        }
    }

    public async Task<bool> DeleteRoomAsync(int id)
    {
        try
        {
            await using var conn = connectionFactory.CreateConnection();
            await conn.OpenAsync();

            const string sql = "DELETE FROM rooms WHERE id = @id;";
            return await conn.ExecuteAsync(sql, new { id }) > 0;
        }
        catch (Exception exception)
        {
            logger.LogError(exception, "Database error while deleting room with ID {RoomId}", id);
            throw;
        }
    }
}
