using Backend.app.Core.Interfaces;
using Backend.app.Core.Models.Entities;
using Dapper;

namespace Backend.app.Infrastructure.Repositories.Sqlite;

public class SqlitePermissionRepo(
    IDbConnectionFactory connectionFactory,
    ILogger<SqlitePermissionRepo> logger
) : IPermissionRepository
{
    public async Task<Permission?> GetByUserIdAsync(long userId)
    {
        try
        {
            await using var conn = connectionFactory.CreateConnection();
            await conn.OpenAsync();
            const string sql = "SELECT * FROM permissions WHERE user_id = @userId;";
            return await conn.QuerySingleOrDefaultAsync<Permission>(sql, new { userId });
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "Error fetching permissions for user {UserId}", userId);
            throw;
        }
    }

    public async Task<List<Permission>> GetByTemplateIdAsync(long templateId)
    {
        try
        {
            await using var conn = connectionFactory.CreateConnection();
            await conn.OpenAsync();
            const string sql = "SELECT * FROM permissions WHERE template_id = @templateId;";
            return (await conn.QueryAsync<Permission>(sql, new { templateId })).ToList();
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "Error fetching permissions for template {TemplateId}", templateId);
            throw;
        }
    }

    public async Task<bool> CreateAsync(Permission permission)
    {
        try
        {
            await using var conn = connectionFactory.CreateConnection();
            await conn.OpenAsync();
            const string sql =
                @"
                INSERT INTO permissions (user_id, template_id, book_room, my_bookings, manage_users, manage_classes, manage_rooms, manage_assets, manage_bookings, manage_campuses, manage_roles)
                VALUES (@UserId, @TemplateId, @BookRoom, @MyBookings, @ManageUsers, @ManageClasses, @ManageRooms, @ManageAssets, @ManageBookings, @ManageCampuses, @ManageRoles);";
            return await conn.ExecuteAsync(sql, permission) > 0;
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "Error creating permissions for user {UserId}", permission.UserId);
            throw;
        }
    }

    public async Task<bool> UpdateAsync(Permission permission)
    {
        try
        {
            await using var conn = connectionFactory.CreateConnection();
            await conn.OpenAsync();
            const string sql =
                @"
                UPDATE permissions 
                SET template_id = @TemplateId, book_room = @BookRoom, my_bookings = @MyBookings, manage_users = @ManageUsers,
                    manage_classes = @ManageClasses, manage_rooms = @ManageRooms, manage_assets = @ManageAssets,
                    manage_bookings = @ManageBookings, manage_campuses = @ManageCampuses, manage_roles = @ManageRoles
                WHERE user_id = @UserId;";
            return await conn.ExecuteAsync(sql, permission) > 0;
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "Error updating permissions for user {UserId}", permission.UserId);
            throw;
        }
    }

    public async Task<int> BatchUpdateByTemplateIdAsync(
        long templateId,
        Dictionary<string, bool> flags
    )
    {
        try
        {
            await using var conn = connectionFactory.CreateConnection();
            await conn.OpenAsync();

            // Build SET clauses from the flag dictionary
            var setClauses = new List<string>();
            var parameters = new DynamicParameters();
            parameters.Add("TemplateId", templateId);

            foreach (var (key, value) in flags)
            {
                setClauses.Add($"{key} = @flag_{key}");
                parameters.Add($"flag_{key}", value);
            }

            if (setClauses.Count == 0)
                return 0;

            var sql =
                $"UPDATE permissions SET {string.Join(", ", setClauses)} WHERE template_id = @TemplateId;";
            return await conn.ExecuteAsync(sql, parameters);
        }
        catch (Exception ex)
        {
            logger.LogError(
                ex,
                "Error batch-updating permissions for template {TemplateId}",
                templateId
            );
            throw;
        }
    }

    public async Task<bool> DeleteByUserIdAsync(long userId)
    {
        try
        {
            await using var conn = connectionFactory.CreateConnection();
            await conn.OpenAsync();
            const string sql = "DELETE FROM permissions WHERE user_id = @userId;";
            return await conn.ExecuteAsync(sql, new { userId }) > 0;
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "Error deleting permissions for user {UserId}", userId);
            throw;
        }
    }
}
