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
                    at.description AS AssetDescription
                FROM rooms r
                LEFT JOIN room_assets ra ON r.id = ra.room_id
                LEFT JOIN asset_types at ON ra.asset_type_id = at.id;";

            var rawData = await conn.QueryAsync<RoomDetailRow>(sql);

            var result = rawData
                .GroupBy(r => r.RoomId)
                .Select(g =>
                {
                    var first = g.First();
                    return new RoomDetailModel(
                        first.RoomId,
                        first.Name,
                        first.Capacity,
                        first.Type,
                        first.Floor,
                        first.Address,
                        first.Notes,
                        g.Where(x => x.AssetDescription != null)
                            .Select(x => x.AssetDescription!)
                            .ToList()
                    );
                });

            return result;
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
                    at.description AS AssetDescription
                FROM rooms r
                LEFT JOIN room_assets ra ON r.id = ra.room_id
                LEFT JOIN asset_types at ON ra.asset_type_id = at.id
                WHERE r.id = @roomId;";

            var rawData = await conn.QueryAsync<RoomDetailRow>(sql, new { roomId });

            if (!rawData.Any())
                return null;

            var first = rawData.First();
            var assets = rawData
                .Where(x => x.AssetDescription != null)
                .Select(x => x.AssetDescription!)
                .ToList();

            return new RoomDetailModel(
                first.RoomId,
                first.Name,
                first.Capacity,
                first.Type,
                first.Floor,
                first.Address,
                first.Notes,
                assets
            );
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

    // Helper class for Dapper mapping
    private class RoomDetailRow
    {
        public int RoomId { get; set; }
        public string Name { get; set; } = string.Empty;
        public int? Capacity { get; set; }
        public RoomType Type { get; set; }
        public string? Floor { get; set; }
        public string? Address { get; set; }
        public string? Notes { get; set; }
        public string? AssetDescription { get; set; }
    }
}
