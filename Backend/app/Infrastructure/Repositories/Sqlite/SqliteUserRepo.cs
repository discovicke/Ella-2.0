using Backend.app.Core.Interfaces;
using Backend.app.Core.Models.Entities;
using Backend.app.Core.Models.Enums;
using Dapper;

namespace Backend.app.Infrastructure.Repositories.Sqlite;

public class SqliteUserRepo(IDbConnectionFactory connectionFactory, ILogger<SqliteUserRepo> logger) : IUserRepository
{
    // SQLite repository for User
    // ⚠️ Update queries for new schema if columns/tables changed

    public async Task<IEnumerable<User>> GetAllUsersAsync()
    {
        try
        {
            await using var conn = connectionFactory.CreateConnection();
            await conn.OpenAsync();
            var sql = "SELECT * FROM users;";
            var users = await conn.QueryAsync<User>(sql);
            return users;
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
            var user = await conn.QuerySingleOrDefaultAsync<User>(sql, new { id });
            return user;
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
            var user = await conn.QuerySingleOrDefaultAsync<User>(sql, new { email });
            return user;
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "Database error while fetching user with email {Email}", email);
            throw;
        }
    }

    public async Task<User?> GetUserByRoleAsync(UserRole role)
    {
        try
        {
            await using var conn = connectionFactory.CreateConnection();
            await conn.OpenAsync();
            var sql = "SELECT * FROM users WHERE role = @role;";
            var user = await conn.QuerySingleOrDefaultAsync<User>(sql, new { role });
            return user;
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "Database error while fetching user with role {Role}", role);
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
            var user = await conn.QuerySingleOrDefaultAsync<User>(sql, new { displayName });
            return user;
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "Database error while fetching user with displayName {DisplayName}", displayName);
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
            INSERT INTO users (email, password_hash, role, display_name)
            VALUES (@Email, @PasswordHash, @Role, @DisplayName);";

            var rowsAffected = await conn.ExecuteAsync(
                sql,
                new
                {
                    user.Email,
                    user.PasswordHash,
                    user.Role,
                    user.DisplayName,
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
            SET email = @Email, password_hash = @PasswordHash, role = @Role, display_name = @DisplayName
            WHERE id = @Id;";

            var rowsAffected = await conn.ExecuteAsync(
                sql,
                new
                {
                    user.Email,
                    user.PasswordHash,
                    user.Role,
                    user.DisplayName,
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

    public async Task<IEnumerable<User>> GetUsersByClassAsync(string className)
    {
        try
        {
            await using var conn = connectionFactory.CreateConnection();
            await conn.OpenAsync();
            var sql = "SELECT * FROM users WHERE user_class = @className;";
            var users = await conn.QueryAsync<User>(sql, new { className });
            return users;
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "Database error while fetching users for class {ClassName}", className);
            throw;
        }
    }

    public async Task<IEnumerable<User>> GetUsersByRoleAsync(UserRole role)
    {
        try
        {
            await using var conn = connectionFactory.CreateConnection();
            await conn.OpenAsync();
            var sql = "SELECT * FROM users WHERE role = @role";
            var users = await conn.QueryAsync<User>(sql, new { role });
            return users;
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "Database error while fetching users with role {Role}", role);
            throw;
        }
    }
}
