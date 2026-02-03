using System;
using Backend.app.Core.Interfaces;
using Backend.app.Core.Models;
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
        using var conn = (SqliteConnection)connectionFactory.CreateConnection();
        await conn.OpenAsync();
        var sql = "SELECT * FROM rooms;";
        var rooms = await conn.QueryAsync<Room>(sql);
        return rooms;
    }

    public Task<Room?> GetRoomByIdAsync(int id)
    {
        throw new NotImplementedException();
    }

    public Task<Room?> GetRoomByRoomNumberAsync(string roomNumber)
    {
        throw new NotImplementedException();
    }

    public Task<IEnumerable<Room>> GetRoomsByTypeAsync(int type)
    {
        throw new NotImplementedException();
    }

    public Task<IEnumerable<Room>> GetRoomsByLocationAsync(string location)
    {
        throw new NotImplementedException();
    }

    public Task<Room> CreateRoomAsync(Room room)
    {
        throw new NotImplementedException();
    }

    public Task<bool> UpdateRoomAsync(int id, Room room)
    {
        throw new NotImplementedException();
    }

    public Task<bool> DeleteRoomAsync(int id)
    {
        throw new NotImplementedException();
    }

    public Task<IEnumerable<object>> GetAssetsByRoomIdAsync(int roomId)
    {
        throw new NotImplementedException();
    }

    public Task<object?> GetAssetByIdAsync(int assetId)
    {
        throw new NotImplementedException();
    }

    public Task<object> CreateRoomAssetAsync(int roomId, int assetTypeId)
    {
        throw new NotImplementedException();
    }

    public Task<bool> UpdateRoomAssetAsync(int assetId, int roomId, int assetTypeId)
    {
        throw new NotImplementedException();
    }

    public Task<bool> DeleteRoomAssetAsync(int assetId)
    {
        throw new NotImplementedException();
    }

    public Task<int> DeleteAllAssetsByRoomIdAsync(int roomId)
    {
        throw new NotImplementedException();
    }

    public Task<object?> GetRoomWithAssetsAsync(int roomId)
    {
        throw new NotImplementedException();
    }

    public Task<IEnumerable<object>> GetAllRoomsWithAssetsAsync()
    {
        throw new NotImplementedException();
    }

    public Task SaveChangesAsync()
    {
        throw new NotImplementedException();
    }
}
