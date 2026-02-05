using Backend.app.Core.Enums;
using Backend.app.Core.Interfaces;
using Backend.app.Core.Models.ReadModels;
using Dapper;

namespace Backend.app.Infrastructure.Repositories.Sqlite;

public class SqliteRoomReadModelRepo(
    IDbConnectionFactory connectionFactory,
    ILogger<SqliteRoomReadModelRepo> logger
) : IRoomReadModelRepository
{
    public async Task<IEnumerable<RoomDetailModel>> GetAllRoomDetailsAsync()
    {
        try
        {
            await using var conn = connectionFactory.CreateConnection();
            await conn.OpenAsync();

            const string sql =
                @"
                SELECT 
                    r.id AS RoomId, 
                    r.name, 
                    r.capacity, 
                    r.type, 
                    r.floor, 
                    r.address, 
                    r.notes,
                    -- Combine assets into a single string using '|||' as the separator
                    GROUP_CONCAT(at.description, '|||') AS AssetsString
                FROM rooms r
                LEFT JOIN room_assets ra ON r.id = ra.room_id
                LEFT JOIN asset_types at ON ra.asset_type_id = at.id
                GROUP BY r.id, r.name, r.capacity, r.type, r.floor, r.address, r.notes;";

            // Dapper automatically matches columns to the RoomDetailModel constructor
            return await conn.QueryAsync<RoomDetailModel>(sql);
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "Database error while fetching all room details");
            throw;
        }
    }

    public async Task<RoomDetailModel?> GetRoomDetailByIdAsync(int roomId)
    {
        try
        {
            await using var conn = connectionFactory.CreateConnection();
            await conn.OpenAsync();

            const string sql =
                @"
                SELECT 
                    r.id AS RoomId, 
                    r.name, 
                    r.capacity, 
                    r.type, 
                    r.floor, 
                    r.address, 
                    r.notes,
                    -- Combine assets into a single string using '|||' as the separator
                    GROUP_CONCAT(at.description, '|||') AS AssetsString
                FROM rooms r
                LEFT JOIN room_assets ra ON r.id = ra.room_id
                LEFT JOIN asset_types at ON ra.asset_type_id = at.id
                WHERE r.id = @roomId
                GROUP BY r.id, r.name, r.capacity, r.type, r.floor, r.address, r.notes;";

            return await conn.QuerySingleOrDefaultAsync<RoomDetailModel>(sql, new { roomId });
        }
        catch (Exception ex)
        {
            logger.LogError(
                ex,
                "Database error while fetching room detail with ID {RoomId}",
                roomId
            );
            throw;
        }
    }
}
