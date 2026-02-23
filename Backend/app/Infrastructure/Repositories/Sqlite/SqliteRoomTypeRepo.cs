using Backend.app.Core.Interfaces;
using Backend.app.Core.Models.Entities;
using Dapper;

namespace Backend.app.Infrastructure.Repositories.Sqlite;

public class SqliteRoomTypeRepo(IDbConnectionFactory connectionFactory, ILogger<SqliteRoomTypeRepo> logger)
    : IRoomTypeRepository
{
    public async Task<IEnumerable<RoomType>> GetAllAsync()
    {
        try
        {
            await using var conn = connectionFactory.CreateConnection();
            await conn.OpenAsync();
            return await conn.QueryAsync<RoomType>("SELECT * FROM room_types ORDER BY name;");
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "Database error while fetching all room types");
            throw;
        }
    }

    public async Task<RoomType?> GetByIdAsync(long id)
    {
        try
        {
            await using var conn = connectionFactory.CreateConnection();
            await conn.OpenAsync();
            return await conn.QuerySingleOrDefaultAsync<RoomType>("SELECT * FROM room_types WHERE id = @id;", new { id });
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "Database error while fetching room type with ID {Id}", id);
            throw;
        }
    }

    public async Task<long> CreateAsync(RoomType roomType)
    {
        try
        {
            await using var conn = connectionFactory.CreateConnection();
            await conn.OpenAsync();
            const string sql = "INSERT INTO room_types (name) VALUES (@Name); SELECT last_insert_rowid();";
            return await conn.ExecuteScalarAsync<long>(sql, roomType);
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "Database error while creating room type {Name}", roomType.Name);
            throw;
        }
    }

    public async Task<bool> UpdateAsync(long id, RoomType roomType)
    {
        try
        {
            await using var conn = connectionFactory.CreateConnection();
            await conn.OpenAsync();
            roomType.Id = id;
            return await conn.ExecuteAsync("UPDATE room_types SET name = @Name WHERE id = @Id;", roomType) > 0;
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "Database error while updating room type with ID {Id}", id);
            throw;
        }
    }

    public async Task<bool> DeleteAsync(long id)
    {
        try
        {
            await using var conn = connectionFactory.CreateConnection();
            await conn.OpenAsync();
            return await conn.ExecuteAsync("DELETE FROM room_types WHERE id = @id;", new { id }) > 0;
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "Database error while deleting room type with ID {Id}", id);
            throw;
        }
    }
}
