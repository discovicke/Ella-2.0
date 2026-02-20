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
                    r.campus_id AS CampusId,
                    r.name AS Name,
                    c.city AS CampusCity,
                    r.capacity, 
                    r.type, 
                    r.floor, 
                    r.notes,
                    GROUP_CONCAT(at.description, '|||') AS AssetsString
                FROM rooms r
                LEFT JOIN campus c ON r.campus_id = c.id
                LEFT JOIN room_assets ra ON r.id = ra.room_id
                LEFT JOIN asset_types at ON ra.asset_type_id = at.id
                GROUP BY r.id, r.campus_id, r.name, c.city, r.capacity, r.type, r.floor, r.notes;";

            return await conn.QueryAsync<RoomDetailModel>(sql);
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "Database error while fetching all room details");
            throw;
        }
    }

    public async Task<RoomDetailModel?> GetRoomDetailByIdAsync(long roomId)
    {
        try
        {
            await using var conn = connectionFactory.CreateConnection();
            await conn.OpenAsync();

            const string sql =
                @"
                SELECT 
                    r.id AS RoomId, 
                    r.campus_id AS CampusId,
                    r.name AS Name,
                    c.city AS CampusCity,
                    r.capacity, 
                    r.type, 
                    r.floor, 
                    r.notes,
                    GROUP_CONCAT(at.description, '|||') AS AssetsString
                FROM rooms r
                LEFT JOIN campus c ON r.campus_id = c.id
                LEFT JOIN room_assets ra ON r.id = ra.room_id
                LEFT JOIN asset_types at ON ra.asset_type_id = at.id
                WHERE r.id = @roomId
                GROUP BY r.id, r.campus_id, r.name, c.city, r.capacity, r.type, r.floor, r.notes;";

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
