using Backend.app.Core.Interfaces;
using Backend.app.Core.Models;
using Backend.app.Core.Models.Entities;
using Dapper;

namespace Backend.app.Infrastructure.Repositories.Sqlite;

public class SqlitePermissionRepo(
    IDbConnectionFactory connectionFactory,
    ILogger<SqlitePermissionRepo> logger
) : IPermissionRepository
{
    public async Task<UserPermissions?> GetEffectivePermissionsAsync(long userId)
    {
        try
        {
            await using var conn = connectionFactory.CreateConnection();
            await conn.OpenAsync();

            // Single query: join user row with effective permissions view.
            // If the user doesn't exist, zero rows are returned → we return null.
            // The user's template ID comes along for free from the users table.
            const string sql = """
                SELECT u.permission_template_id AS TemplateId,
                       vp.permission_key        AS Key,
                       vp.is_granted            AS IsGranted
                FROM users u
                LEFT JOIN v_user_effective_permissions vp
                       ON u.id = vp.user_id
                WHERE u.id = @userId;
                """;

            var rows = (await conn.QueryAsync<PermissionRow>(sql, new { userId })).AsList();

            // No rows → user does not exist
            if (rows.Count == 0)
                return null;

            var permissions = new UserPermissions
            {
                UserId = userId,
                PermissionTemplateId = rows[0].TemplateId,
            };

            foreach (var row in rows)
            {
                if (row.Key is null)
                    continue; // user exists but has no permissions at all
                var val = row.IsGranted == 1;
                switch (row.Key)
                {
                    case "BookRoom":
                        permissions.BookRoom = val;
                        break;
                    case "MyBookings":
                        permissions.MyBookings = val;
                        break;
                    case "ManageUsers":
                        permissions.ManageUsers = val;
                        break;
                    case "ManageClasses":
                        permissions.ManageClasses = val;
                        break;
                    case "ManageRooms":
                        permissions.ManageRooms = val;
                        break;
                    case "ManageAssets":
                        permissions.ManageAssets = val;
                        break;
                    case "ManageBookings":
                        permissions.ManageBookings = val;
                        break;
                    case "ManageCampuses":
                        permissions.ManageCampuses = val;
                        break;
                    case "ManageRoles":
                        permissions.ManageRoles = val;
                        break;
                }
            }

            return permissions;
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "Error fetching effective permissions for user {UserId}", userId);
            throw;
        }
    }

    public async Task<Dictionary<long, UserPermissions>> GetAllEffectivePermissionsAsync()
    {
        try
        {
            await using var conn = connectionFactory.CreateConnection();
            await conn.OpenAsync();

            // Single query: all users joined with the effective permissions view.
            const string sql = """
                SELECT u.id                        AS UserId,
                       u.permission_template_id    AS TemplateId,
                       vp.permission_key           AS Key,
                       vp.is_granted               AS IsGranted
                FROM users u
                LEFT JOIN v_user_effective_permissions vp
                       ON u.id = vp.user_id
                ORDER BY u.id;
                """;

            var rows = await conn.QueryAsync<BulkPermissionRow>(sql);

            var result = new Dictionary<long, UserPermissions>();

            foreach (var row in rows)
            {
                if (!result.TryGetValue(row.UserId, out var perms))
                {
                    perms = new UserPermissions
                    {
                        UserId = row.UserId,
                        PermissionTemplateId = row.TemplateId,
                    };
                    result[row.UserId] = perms;
                }

                if (row.Key is null)
                    continue;
                var val = row.IsGranted == 1;
                switch (row.Key)
                {
                    case "BookRoom":
                        perms.BookRoom = val;
                        break;
                    case "MyBookings":
                        perms.MyBookings = val;
                        break;
                    case "ManageUsers":
                        perms.ManageUsers = val;
                        break;
                    case "ManageClasses":
                        perms.ManageClasses = val;
                        break;
                    case "ManageRooms":
                        perms.ManageRooms = val;
                        break;
                    case "ManageAssets":
                        perms.ManageAssets = val;
                        break;
                    case "ManageBookings":
                        perms.ManageBookings = val;
                        break;
                    case "ManageCampuses":
                        perms.ManageCampuses = val;
                        break;
                    case "ManageRoles":
                        perms.ManageRoles = val;
                        break;
                }
            }

            return result;
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "Error fetching all effective permissions");
            throw;
        }
    }

    public async Task SetUserTemplateAsync(long userId, long? templateId)
    {
        try
        {
            await using var conn = connectionFactory.CreateConnection();
            await conn.OpenAsync();
            using var transaction = conn.BeginTransaction();

            try
            {
                // 1. Clear overrides (so they start fresh with the new role/no role)
                await conn.ExecuteAsync(
                    "DELETE FROM user_permission_overrides WHERE user_id = @userId;",
                    new { userId },
                    transaction
                );

                // 2. Update the user's template
                await conn.ExecuteAsync(
                    "UPDATE users SET permission_template_id = @templateId WHERE id = @userId;",
                    new { userId, templateId },
                    transaction
                );

                transaction.Commit();
            }
            catch
            {
                transaction.Rollback();
                throw;
            }
        }
        catch (Exception ex)
        {
            logger.LogError(
                ex,
                "Error setting template {TemplateId} for user {UserId}",
                templateId,
                userId
            );
            throw;
        }
    }

    public async Task SetUserOverridesBatchAsync(long userId, Dictionary<string, bool> overrides)
    {
        try
        {
            await using var conn = connectionFactory.CreateConnection();
            await conn.OpenAsync();
            using var transaction = conn.BeginTransaction();

            try
            {
                // 1. Fetch all template values in one query
                const string templateValuesSql = """
                    SELECT ptf.permission_key AS Key, ptf.value AS Value
                    FROM users u
                    JOIN permission_template_flags ptf ON u.permission_template_id = ptf.template_id
                    WHERE u.id = @userId;
                    """;
                var templateFlags = (
                    await conn.QueryAsync<(string Key, int Value)>(
                        templateValuesSql,
                        new { userId },
                        transaction
                    )
                ).ToDictionary(r => r.Key, r => r.Value == 1);

                // 2. Batch: delete redundant overrides, upsert differing ones
                var toDelete = new List<object>();
                var toUpsert = new List<object>();

                foreach (var (key, value) in overrides)
                {
                    var templateValue = templateFlags.GetValueOrDefault(key, false);
                    if (value == templateValue)
                    {
                        toDelete.Add(new { userId, permissionKey = key });
                    }
                    else
                    {
                        toUpsert.Add(
                            new
                            {
                                userId,
                                permissionKey = key,
                                value = value ? 1 : 0,
                            }
                        );
                    }
                }

                if (toDelete.Count > 0)
                {
                    await conn.ExecuteAsync(
                        "DELETE FROM user_permission_overrides WHERE user_id = @userId AND permission_key = @permissionKey;",
                        toDelete,
                        transaction
                    );
                }

                if (toUpsert.Count > 0)
                {
                    await conn.ExecuteAsync(
                        "INSERT OR REPLACE INTO user_permission_overrides (user_id, permission_key, value) VALUES (@userId, @permissionKey, @value);",
                        toUpsert,
                        transaction
                    );
                }

                transaction.Commit();
            }
            catch
            {
                transaction.Rollback();
                throw;
            }
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "Error batch-setting overrides for user {UserId}", userId);
            throw;
        }
    }

    public async Task<(User? User, UserPermissions? Permissions)> GetUserWithPermissionsAsync(
        long userId
    )
    {
        try
        {
            await using var conn = connectionFactory.CreateConnection();
            await conn.OpenAsync();

            // Single query: fetch the full user row + effective permissions in one round-trip.
            // Uses QueryMultipleAsync with two result sets to keep Dapper mapping clean.
            const string sql = """
                SELECT * FROM users WHERE id = @userId;

                SELECT u.permission_template_id AS TemplateId,
                       vp.permission_key        AS Key,
                       vp.is_granted            AS IsGranted
                FROM users u
                LEFT JOIN v_user_effective_permissions vp
                       ON u.id = vp.user_id
                WHERE u.id = @userId;
                """;

            using var multi = await conn.QueryMultipleAsync(sql, new { userId });

            var user = await multi.ReadSingleOrDefaultAsync<User>();
            if (user is null)
                return (null, null);

            var rows = (await multi.ReadAsync<PermissionRow>()).AsList();

            var permissions = new UserPermissions
            {
                UserId = userId,
                PermissionTemplateId = rows.Count > 0 ? rows[0].TemplateId : null,
            };

            foreach (var row in rows)
            {
                if (row.Key is null)
                    continue;
                var val = row.IsGranted == 1;
                switch (row.Key)
                {
                    case "BookRoom":
                        permissions.BookRoom = val;
                        break;
                    case "MyBookings":
                        permissions.MyBookings = val;
                        break;
                    case "ManageUsers":
                        permissions.ManageUsers = val;
                        break;
                    case "ManageClasses":
                        permissions.ManageClasses = val;
                        break;
                    case "ManageRooms":
                        permissions.ManageRooms = val;
                        break;
                    case "ManageAssets":
                        permissions.ManageAssets = val;
                        break;
                    case "ManageBookings":
                        permissions.ManageBookings = val;
                        break;
                    case "ManageCampuses":
                        permissions.ManageCampuses = val;
                        break;
                    case "ManageRoles":
                        permissions.ManageRoles = val;
                        break;
                }
            }

            return (user, permissions);
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "Error fetching user with permissions for user {UserId}", userId);
            throw;
        }
    }

    /// <summary>
    /// Internal DTO for Dapper mapping of the collapsed permission query.
    /// </summary>
    private class PermissionRow
    {
        public long? TemplateId { get; set; }
        public string? Key { get; set; }
        public int IsGranted { get; set; }
    }

    /// <summary>
    /// Internal DTO for Dapper mapping of the bulk permissions query.
    /// </summary>
    private class BulkPermissionRow
    {
        public long UserId { get; set; }
        public long? TemplateId { get; set; }
        public string? Key { get; set; }
        public int IsGranted { get; set; }
    }
}
