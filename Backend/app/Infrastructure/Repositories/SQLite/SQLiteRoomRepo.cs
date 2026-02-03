using System;
using Backend.app.Core.Entities;
using Backend.app.Core.Interfaces;
using Dapper;
using Microsoft.Data.Sqlite;

namespace Backend.app.Infrastructure.Repositories.SQLite;

public class SQLiteRoomRepo(IDbConnectionFactory connectionFactory) : IRoomRepository
{
    // SQLite repository for Room
    // TODO: Migrate all SQL queries from room.repo.js
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
            throw new Exception("Unexpected error while fetching all rooms.", ex);
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
            throw new Exception($"Unexpected error while fetching room with id {id}.", ex);
        }
    }

    public async Task<IEnumerable<Room>> GetRoomsByTypeAsync(int type)
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
            throw new Exception($"Unexpected error while fetching rooms with type {type}.", ex);
        }
    }

    public async Task<IEnumerable<Room>> GetRoomsByLocationAsync(string location)
    {
        try
        {
            await using var conn = connectionFactory.CreateConnection();
            await conn.OpenAsync();

            const string sql = "SELECT * FROM rooms WHERE type = @location;";

            return await conn.QueryAsync<Room>(sql, new { location });
        }
        catch (Exception ex)
        {
            throw new Exception($"Unexpected error while fetching rooms with type {location}.", ex);
        }
    }

    public async Task<bool> CreateRoomAsync(Room room)
    {
        try
        {
            await using var conn = connectionFactory.CreateConnection();
            await conn.OpenAsync();

            const string sql =
                "INSERT INTO rooms (name, capacity, type, floor, address, notes) VALUES (@name, @capacity, @type, @floor, @address, @notes);";
            return await conn.ExecuteAsync(sql, room) > 0;
        }
        catch (Exception ex)
        {
            throw new Exception($"Unexpected error while creating room {room.Name}.", ex);
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
            throw new Exception($"Unexpected error while updating room {room.Name}.", ex);
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
            throw new Exception($"Unexpected error while deleting room with id {id}.", exception);
        }
    }
}
