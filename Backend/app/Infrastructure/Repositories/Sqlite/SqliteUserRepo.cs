using Backend.app.Core.Interfaces;
using Backend.app.Core.Models.Entities;
using Backend.app.Core.Models.Enums;
using System.Text;
using Dapper;

namespace Backend.app.Infrastructure.Repositories.Sqlite;

public class SqliteUserRepo(IDbConnectionFactory connectionFactory, ILogger<SqliteUserRepo> logger)
    : IUserRepository
{
    public async Task<IEnumerable<User>> GetAllUsersAsync()
    {
        try
        {
            await using var conn = connectionFactory.CreateConnection();
            await conn.OpenAsync();
            var sql = "SELECT * FROM users ORDER BY id;";
            return await conn.QueryAsync<User>(sql);
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "Database error while fetching all users");
            throw;
        }
    }

    public async Task<(IEnumerable<User> Users, int TotalCount)> GetUsersPagedAsync(
        int page, int pageSize,
        string? search = null,
        long? templateId = null,
        BannedStatus? bannedStatus = null)
    {
        try
        {
            await using var conn = connectionFactory.CreateConnection();
            await conn.OpenAsync();

            var where = new StringBuilder("WHERE 1=1");
            var parameters = new DynamicParameters();

            if (!string.IsNullOrWhiteSpace(search))
            {
                where.Append(" AND (display_name LIKE @Search OR email LIKE @Search)");
                parameters.Add("Search", $"%{search}%");
            }

            if (templateId.HasValue)
            {
                if (templateId.Value == 0)
                    where.Append(" AND permission_template_id IS NULL");
                else
                {
                    where.Append(" AND permission_template_id = @TemplateId");
                    parameters.Add("TemplateId", templateId.Value);
                }
            }

            if (bannedStatus.HasValue)
            {
                where.Append(" AND is_banned = @IsBanned");
                parameters.Add("IsBanned", (int)bannedStatus.Value);
            }

            var countSql = $"SELECT COUNT(*) FROM users {where};";
            var totalCount = await conn.ExecuteScalarAsync<int>(countSql, parameters);

            var offset = (page - 1) * pageSize;
            parameters.Add("Limit", pageSize);
            parameters.Add("Offset", offset);

            var dataSql = $"SELECT * FROM users {where} ORDER BY id LIMIT @Limit OFFSET @Offset;";
            var users = await conn.QueryAsync<User>(dataSql, parameters);

            return (users, totalCount);
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "Database error while fetching paged users");
            throw;
        }
    }

    public async Task<User?> GetUserByIdAsync(long id)
    {
        try
        {
            await using var conn = connectionFactory.CreateConnection();
            await conn.OpenAsync();
            var sql = "SELECT * FROM users WHERE id = @id;";
            return await conn.QuerySingleOrDefaultAsync<User>(sql, new { id });
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "Database error while fetching user with ID {UserId}", id);
            throw;
        }
    }

    public async Task<User?> GetUserByEmailAsync(string email)
    {
        try
        {
            await using var conn = connectionFactory.CreateConnection();
            await conn.OpenAsync();
            var sql = "SELECT * FROM users WHERE email = @email;";
            return await conn.QuerySingleOrDefaultAsync<User>(sql, new { email });
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "Database error while fetching user with email {Email}", email);
            throw;
        }
    }

    public async Task<bool> CreateUserAsync(User user)
    {
        try
        {
            await using var conn = connectionFactory.CreateConnection();
            await conn.OpenAsync();

            var sql =
                @"
            INSERT INTO users (email, password_hash, display_name, is_banned, permission_template_id)
            VALUES (@Email, @PasswordHash, @DisplayName, @IsBanned, @PermissionTemplateId);";

            var rowsAffected = await conn.ExecuteAsync(
                sql,
                new
                {
                    user.Email,
                    user.PasswordHash,
                    user.DisplayName,
                    user.IsBanned,
                    user.PermissionTemplateId,
                }
            );

            return rowsAffected == 1;
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "Database error while creating user {Email}", user.Email);
            throw;
        }
    }

    public async Task<bool> UpdateUserAsync(long id, User user)
    {
        try
        {
            await using var conn = connectionFactory.CreateConnection();
            await conn.OpenAsync();

            var sql =
                @"
            UPDATE users
            SET email = @Email,
                password_hash = @PasswordHash,
                display_name = @DisplayName,
                is_banned = @IsBanned,
                tokens_valid_after = @TokensValidAfter,
                permission_template_id = @PermissionTemplateId
            WHERE id = @Id;";

            var rowsAffected = await conn.ExecuteAsync(
                sql,
                new
                {
                    user.Email,
                    user.PasswordHash,
                    user.DisplayName,
                    user.IsBanned,
                    user.TokensValidAfter,
                    user.PermissionTemplateId,
                    Id = id,
                }
            );

            return rowsAffected == 1;
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "Database error while updating user with ID {UserId}", id);
            throw;
        }
    }

    public async Task<bool> DeleteUserAsync(long id)
    {
        try
        {
            await using var conn = connectionFactory.CreateConnection();
            await conn.OpenAsync();
            var sql = @"DELETE FROM users WHERE id = @id;";
            var rowsAffected = await conn.ExecuteAsync(sql, new { id });
            return rowsAffected == 1;
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "Database error while deleting user with ID {UserId}", id);
            throw;
        }
    }

    // ── User ↔ Campus ──────────────────────────────────────

    public async Task<IEnumerable<long>> GetCampusIdsForUserAsync(long userId)
    {
        try
        {
            await using var conn = connectionFactory.CreateConnection();
            await conn.OpenAsync();
            return await conn.QueryAsync<long>(
                "SELECT campus_id FROM user_campus WHERE user_id = @userId;",
                new { userId }
            );
        }
        catch (Exception ex)
        {
            logger.LogError(
                ex,
                "Database error while fetching campus IDs for user {UserId}",
                userId
            );
            throw;
        }
    }

    public async Task SetCampusesForUserAsync(long userId, IEnumerable<long> campusIds)
    {
        try
        {
            await using var conn = connectionFactory.CreateConnection();
            await conn.OpenAsync();
            using var tx = await conn.BeginTransactionAsync();

            await conn.ExecuteAsync(
                "DELETE FROM user_campus WHERE user_id = @userId;",
                new { userId },
                tx
            );

            foreach (var campusId in campusIds)
            {
                await conn.ExecuteAsync(
                    "INSERT INTO user_campus (user_id, campus_id) VALUES (@userId, @campusId);",
                    new { userId, campusId },
                    tx
                );
            }

            await tx.CommitAsync();
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "Database error while setting campuses for user {UserId}", userId);
            throw;
        }
    }

    public async Task<Dictionary<long, List<string>>> GetAllUserCampusNamesAsync()
    {
        try
        {
            await using var conn = connectionFactory.CreateConnection();
            await conn.OpenAsync();
            var sql =
                @"SELECT uc.user_id AS UserId, c.city AS Name
                        FROM user_campus uc
                        JOIN campus c ON c.id = uc.campus_id
                        ORDER BY c.city;";
            var rows = await conn.QueryAsync<(long UserId, string Name)>(sql);
            var dict = new Dictionary<long, List<string>>();
            foreach (var row in rows)
            {
                if (!dict.ContainsKey(row.UserId))
                    dict[row.UserId] = new List<string>();
                dict[row.UserId].Add(row.Name);
            }
            return dict;
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "Database error while fetching all user-campus associations");
            throw;
        }
    }

    // ── User ↔ Class ───────────────────────────────────────

    public async Task<IEnumerable<long>> GetClassIdsForUserAsync(long userId)
    {
        try
        {
            await using var conn = connectionFactory.CreateConnection();
            await conn.OpenAsync();
            return await conn.QueryAsync<long>(
                "SELECT class_id FROM user_class WHERE user_id = @userId;",
                new { userId }
            );
        }
        catch (Exception ex)
        {
            logger.LogError(
                ex,
                "Database error while fetching class IDs for user {UserId}",
                userId
            );
            throw;
        }
    }

    public async Task SetClassesForUserAsync(long userId, IEnumerable<long> classIds)
    {
        try
        {
            await using var conn = connectionFactory.CreateConnection();
            await conn.OpenAsync();
            using var tx = await conn.BeginTransactionAsync();

            await conn.ExecuteAsync(
                "DELETE FROM user_class WHERE user_id = @userId;",
                new { userId },
                tx
            );

            foreach (var classId in classIds)
            {
                await conn.ExecuteAsync(
                    "INSERT INTO user_class (user_id, class_id) VALUES (@userId, @classId);",
                    new { userId, classId },
                    tx
                );
            }

            await tx.CommitAsync();
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "Database error while setting classes for user {UserId}", userId);
            throw;
        }
    }

    public async Task<Dictionary<long, List<string>>> GetAllUserClassNamesAsync()
    {
        try
        {
            await using var conn = connectionFactory.CreateConnection();
            await conn.OpenAsync();
            var sql =
                @"SELECT uc.user_id AS UserId, c.class_name AS Name
                        FROM user_class uc
                        JOIN class c ON c.id = uc.class_id
                        ORDER BY c.class_name;";
            var rows = await conn.QueryAsync<(long UserId, string Name)>(sql);
            var dict = new Dictionary<long, List<string>>();
            foreach (var row in rows)
            {
                if (!dict.ContainsKey(row.UserId))
                    dict[row.UserId] = new List<string>();
                dict[row.UserId].Add(row.Name);
            }
            return dict;
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "Database error while fetching all user-class associations");
            throw;
        }
    }
}
