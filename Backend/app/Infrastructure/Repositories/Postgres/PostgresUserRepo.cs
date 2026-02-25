using Backend.app.Core.Interfaces;
using Backend.app.Core.Models.Entities;
using Backend.app.Core.Models.Enums;
using Dapper;

namespace Backend.app.Infrastructure.Repositories.Postgres;

public class PostgresUserRepo(
    IDbConnectionFactory connectionFactory,
    ILogger<PostgresUserRepo> logger
) : IUserRepository
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

    public async Task<User?> GetUserByDisplayNameAsync(string displayName)
    {
        try
        {
            await using var conn = connectionFactory.CreateConnection();
            await conn.OpenAsync();
            var sql = "SELECT * FROM users WHERE display_name = @displayName;";
            return await conn.QuerySingleOrDefaultAsync<User>(sql, new { displayName });
        }
        catch (Exception ex)
        {
            logger.LogError(
                ex,
                "Database error while fetching user with displayName {DisplayName}",
                displayName
            );
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
                    IsBanned = user.IsBanned == BannedStatus.Banned,
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
                    IsBanned = user.IsBanned == BannedStatus.Banned,
                    TokensValidAfter = user.TokensValidAfter.ToUniversalTime(),
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
}
