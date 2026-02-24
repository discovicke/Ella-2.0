using Backend.app.Core.Interfaces;
using Backend.app.Core.Models.Entities;
using Dapper;

namespace Backend.app.Infrastructure.Repositories.Postgres;

public class PostgresRoomRepo(IDbConnectionFactory connectionFactory, ILogger<PostgresRoomRepo> logger)
    : IRoomRepository
{
    public async Task<IEnumerable<Room>> GetAllRoomsAsync()
    {
        try
        {
            await using var conn = connectionFactory.CreateConnection();
            await conn.OpenAsync();
            const string sql = "SELECT * FROM rooms;";
            return await conn.QueryAsync<Room>(sql);
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "Database error while fetching all rooms");
            throw;
        }
    }

    public async Task<Room?> GetRoomByIdAsync(long id)
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

    public async Task<IEnumerable<Room>> GetRoomsByTypeIdAsync(long roomTypeId)
    {
        try
        {
            await using var conn = connectionFactory.CreateConnection();
            await conn.OpenAsync();
            const string sql = "SELECT * FROM rooms WHERE room_type_id = @roomTypeId;";
            return await conn.QueryAsync<Room>(sql, new { roomTypeId });
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "Database error while fetching rooms with type ID {RoomTypeId}", roomTypeId);
            throw;
        }
    }

    public async Task<IEnumerable<Room>> GetRoomsByCampusIdAsync(long campusId)
    {
        try
        {
            await using var conn = connectionFactory.CreateConnection();
            await conn.OpenAsync();
            const string sql = "SELECT * FROM rooms WHERE campus_id = @campusId;";
            return await conn.QueryAsync<Room>(sql, new { campusId });
        }
        catch (Exception ex)
        {
            logger.LogError(
                ex,
                "Database error while fetching rooms for campus {CampusId}",
                campusId
            );
            throw;
        }
    }

    public async Task<long> CreateRoomAsync(Room room)
    {
        try
        {
            await using var conn = connectionFactory.CreateConnection();
            await conn.OpenAsync();

            const string sql =
                @"
            INSERT INTO rooms (campus_id, name, capacity, room_type_id, floor, notes) 
            VALUES (@CampusId, @Name, @Capacity, @RoomTypeId, @Floor, @Notes)
            RETURNING id;";

            return await conn.ExecuteScalarAsync<long>(sql, room);
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "Database error while creating room {RoomName}", room.Name);
            throw;
        }
    }

    public async Task<bool> UpdateRoomAsync(long id, Room room)
    {
        try
        {
            await using var conn = connectionFactory.CreateConnection();
            await conn.OpenAsync();
            const string sql = """
                UPDATE rooms SET campus_id = @CampusId, name = @Name,
                capacity = @Capacity, room_type_id = @RoomTypeId,
                floor = @Floor, notes = @Notes
                WHERE id = @Id;
                """;
            room.Id = id; 
            return await conn.ExecuteAsync(sql, room) > 0;
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "Database error while updating room with ID {RoomId}", id);
            throw;
        }
    }

    public async Task<bool> DeleteRoomAsync(long id)
    {
        try
        {
            await using var conn = connectionFactory.CreateConnection();
            await conn.OpenAsync();

            using var transaction = conn.BeginTransaction();

            try
            {
                const string deleteAssetsSql = "DELETE FROM room_assets WHERE room_id = @id;";
                await conn.ExecuteAsync(deleteAssetsSql, new { id }, transaction);

                const string sql = "DELETE FROM rooms WHERE id = @id;";
                var rowsAffected = await conn.ExecuteAsync(sql, new { id }, transaction);

                transaction.Commit();
                return rowsAffected > 0;
            }
            catch
            {
                transaction.Rollback();
                throw;
            }
        }
        catch (Exception exception)
        {
            logger.LogError(exception, "Database error while deleting room with ID {RoomId}", id);
            throw;
        }
    }

    public async Task AddAssetsToRoomAsync(long roomId, IEnumerable<long> assetIds)
    {
        try
        {
            await using var conn = connectionFactory.CreateConnection();
            await conn.OpenAsync();

            const string sql =
                "INSERT INTO room_assets (room_id, asset_type_id) VALUES (@RoomId, @AssetId);";
            await conn.ExecuteAsync(
                sql,
                assetIds.Select(assetId => new { RoomId = roomId, AssetId = assetId })
            );
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "Database error while adding assets to room {RoomId}", roomId);
            throw;
        }
    }

    public async Task ClearRoomAssetsAsync(long roomId)
    {
        try
        {
            await using var conn = connectionFactory.CreateConnection();
            await conn.OpenAsync();

            const string sql = "DELETE FROM room_assets WHERE room_id = @RoomId;";
            await conn.ExecuteAsync(sql, new { RoomId = roomId });
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "Database error while clearing assets for room {RoomId}", roomId);
            throw;
        }
    }
}
