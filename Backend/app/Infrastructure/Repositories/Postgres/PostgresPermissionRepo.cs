using Backend.app.Core.Interfaces;
using Backend.app.Core.Models;
using Backend.app.Core.Models.Entities;
using Dapper;

namespace Backend.app.Infrastructure.Repositories.Postgres;

public class PostgresPermissionRepo(
    IDbConnectionFactory connectionFactory,
    ILogger<PostgresPermissionRepo> logger
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
                    continue;
                var granted = row.IsGranted;
                switch (row.Key)
                {
                    case "BookRoom":
                        permissions.BookRoom = granted;
                        break;
                    case "BookResource":
                        permissions.BookResource = granted;
                        break;
                    case "ManageUsers":
                        permissions.ManageUsers = granted;
                        break;
                    case "ManageClasses":
                        permissions.ManageClasses = granted;
                        break;
                    case "ManageRooms":
                        permissions.ManageRooms = granted;
                        break;
                    case "ManageBookings":
                        permissions.ManageBookings = granted;
                        break;
                    case "ManageCampuses":
                        permissions.ManageCampuses = granted;
                        break;
                    case "ManageRoles":
                        permissions.ManageRoles = granted;
                        break;
                    case "ManageResources":
                        permissions.ManageResources = granted;
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
                var granted = row.IsGranted;
                switch (row.Key)
                {
                    case "BookRoom":
                        perms.BookRoom = granted;
                        break;
                    case "BookResource":
                        perms.BookResource = granted;
                        break;
                    case "ManageUsers":
                        perms.ManageUsers = granted;
                        break;
                    case "ManageClasses":
                        perms.ManageClasses = granted;
                        break;
                    case "ManageRooms":
                        perms.ManageRooms = granted;
                        break;
                    case "ManageBookings":
                        perms.ManageBookings = granted;
                        break;
                    case "ManageCampuses":
                        perms.ManageCampuses = granted;
                        break;
                    case "ManageRoles":
                        perms.ManageRoles = granted;
                        break;
                    case "ManageResources":
                        perms.ManageResources = granted;
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
            using var transaction = await conn.BeginTransactionAsync();

            try
            {
                await conn.ExecuteAsync(
                    "DELETE FROM user_permission_overrides WHERE user_id = @userId;",
                    new { userId },
                    transaction
                );

                await conn.ExecuteAsync(
                    "UPDATE users SET permission_template_id = @templateId WHERE id = @userId;",
                    new { userId, templateId },
                    transaction
                );

                await transaction.CommitAsync();
            }
            catch
            {
                await transaction.RollbackAsync();
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
            using var transaction = await conn.BeginTransactionAsync();

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
                    await conn.QueryAsync<(string Key, bool Value)>(
                        templateValuesSql,
                        new { userId },
                        transaction
                    )
                ).ToDictionary(r => r.Key, r => r.Value);

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
                                value,
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
                        """
                        INSERT INTO user_permission_overrides (user_id, permission_key, value)
                        VALUES (@userId, @permissionKey, @value)
                        ON CONFLICT (user_id, permission_key) DO UPDATE SET value = EXCLUDED.value;
                        """,
                        toUpsert,
                        transaction
                    );
                }

                await transaction.CommitAsync();
            }
            catch
            {
                await transaction.RollbackAsync();
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
                var granted = row.IsGranted;
                switch (row.Key)
                {
                    case "BookRoom":
                        permissions.BookRoom = granted;
                        break;
                    case "BookResource":
                        permissions.BookResource = granted;
                        break;
                    case "ManageUsers":
                        permissions.ManageUsers = granted;
                        break;
                    case "ManageClasses":
                        permissions.ManageClasses = granted;
                        break;
                    case "ManageRooms":
                        permissions.ManageRooms = granted;
                        break;
                    case "ManageBookings":
                        permissions.ManageBookings = granted;
                        break;
                    case "ManageCampuses":
                        permissions.ManageCampuses = granted;
                        break;
                    case "ManageRoles":
                        permissions.ManageRoles = granted;
                        break;
                    case "ManageResources":
                        permissions.ManageResources = granted;
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

    // Postgres uses native BOOLEAN — Dapper maps it directly (no int conversion needed)
    private class PermissionRow
    {
        public long? TemplateId { get; set; }
        public string? Key { get; set; }
        public bool IsGranted { get; set; }
    }

    private class BulkPermissionRow
    {
        public long UserId { get; set; }
        public long? TemplateId { get; set; }
        public string? Key { get; set; }
        public bool IsGranted { get; set; }
    }
}
