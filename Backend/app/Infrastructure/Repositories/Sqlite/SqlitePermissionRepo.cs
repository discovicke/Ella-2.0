using Backend.app.Core.Interfaces;
using Backend.app.Core.Models;
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

            // 1. Get the user's template ID (needed for the response object)
            const string templateSql = "SELECT template_id FROM user_permission_templates WHERE user_id = @userId;";
            var templateId = await conn.ExecuteScalarAsync<long?>(templateSql, new { userId });

            // 2. Get effective permissions from the view
            const string permSql = "SELECT permission_key, is_granted FROM v_user_effective_permissions WHERE user_id = @userId;";
            var rows = await conn.QueryAsync<(string Key, int IsGranted)>(permSql, new { userId });

            // If no permissions found, return default (or null if user doesn't exist? 
            // The view does a LEFT JOIN on user_permission_templates, so if user has no template, it might return nothing or nulls.
            // But we need a UserPermissions object.)
            
            var permissions = new UserPermissions
            {
                UserId = userId,
                TemplateId = templateId
            };

            foreach (var row in rows)
            {
                var val = row.IsGranted == 1;
                switch (row.Key)
                {
                    case "BookRoom": permissions.BookRoom = val; break;
                    case "MyBookings": permissions.MyBookings = val; break;
                    case "ManageUsers": permissions.ManageUsers = val; break;
                    case "ManageClasses": permissions.ManageClasses = val; break;
                    case "ManageRooms": permissions.ManageRooms = val; break;
                    case "ManageAssets": permissions.ManageAssets = val; break;
                    case "ManageBookings": permissions.ManageBookings = val; break;
                    case "ManageCampuses": permissions.ManageCampuses = val; break;
                    case "ManageRoles": permissions.ManageRoles = val; break;
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

    public async Task SetUserTemplateAsync(long userId, long templateId)
    {
        try
        {
            await using var conn = connectionFactory.CreateConnection();
            await conn.OpenAsync();
            using var transaction = conn.BeginTransaction();

            try
            {
                // 1. Clear overrides (so they start fresh with the new role)
                await conn.ExecuteAsync(
                    "DELETE FROM user_permission_overrides WHERE user_id = @userId;",
                    new { userId },
                    transaction
                );

                // 2. Set the new template
                await conn.ExecuteAsync(
                    "INSERT OR REPLACE INTO user_permission_templates (user_id, template_id) VALUES (@userId, @templateId);",
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
            logger.LogError(ex, "Error setting template {TemplateId} for user {UserId}", templateId, userId);
            throw;
        }
    }

    public async Task SetUserOverrideAsync(long userId, string permissionKey, bool value)
    {
        try
        {
            await using var conn = connectionFactory.CreateConnection();
            await conn.OpenAsync();

            // 1. Get the base template value
            const string templateValueSql = @"
                SELECT ptf.value 
                FROM user_permission_templates upt
                JOIN permission_template_flags ptf ON upt.template_id = ptf.template_id
                WHERE upt.user_id = @userId AND ptf.permission_key = @permissionKey;";
            
            // Default to 0 (false) if not found (e.g. key missing from template or user has no template)
            var templateValueInt = await conn.ExecuteScalarAsync<int?>(templateValueSql, new { userId, permissionKey });
            var templateValue = templateValueInt.GetValueOrDefault(0) == 1;

            // 2. Compare new value with template value
            if (value == templateValue)
            {
                // Redundant override -> Delete it
                await conn.ExecuteAsync(
                    "DELETE FROM user_permission_overrides WHERE user_id = @userId AND permission_key = @permissionKey;",
                    new { userId, permissionKey }
                );
            }
            else
            {
                // Different -> Upsert override
                // SQLite has UPSERT syntax or INSERT OR REPLACE
                // Since PK is (user_id, permission_key), INSERT OR REPLACE works fine.
                await conn.ExecuteAsync(
                    "INSERT OR REPLACE INTO user_permission_overrides (user_id, permission_key, value) VALUES (@userId, @permissionKey, @value);",
                    new { userId, permissionKey, value = value ? 1 : 0 }
                );
            }
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "Error setting override {Key}={Value} for user {UserId}", permissionKey, value, userId);
            throw;
        }
    }

    public async Task ClearUserOverridesAsync(long userId)
    {
        try
        {
            await using var conn = connectionFactory.CreateConnection();
            await conn.OpenAsync();
            await conn.ExecuteAsync(
                "DELETE FROM user_permission_overrides WHERE user_id = @userId;",
                new { userId }
            );
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "Error clearing overrides for user {UserId}", userId);
            throw;
        }
    }
}
