using Backend.app.Core.Interfaces;
using Backend.app.Core.Models.ReadModels;
using Dapper;

namespace Backend.app.Infrastructure.Repositories.Postgres;

public class PostgresRoomReadModelRepo(
    IDbConnectionFactory connectionFactory,
    ILogger<PostgresRoomReadModelRepo> logger) : IRoomReadModelRepository
{
    public async Task<IEnumerable<RoomDetailModel>> GetAllRoomDetailsAsync()
    {
        try
        {
            await using var conn = connectionFactory.CreateConnection();
            await conn.OpenAsync();

            const string sql = "SELECT * FROM v_room_details;";

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

            const string sql = "SELECT * FROM v_room_details WHERE RoomId = @roomId;";

            return await conn.QuerySingleOrDefaultAsync<RoomDetailModel>(sql, new { roomId });
        }
        catch (Exception ex)
        {
            logger.LogError(
                ex,
                "Database error while fetching room detail with ID {RoomId}",
                roomId);
            throw;
        }
    }
}