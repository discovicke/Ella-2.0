using Backend.app.Core.Enums;
using Backend.app.Core.Interfaces;
using Backend.app.Core.Models;
using Dapper;
using Microsoft.Data.Sqlite;
using System;

namespace Backend.app.Infrastructure.Repositories.SQLite;

public class SQLiteUserRepo(IDbConnectionFactory connectionFactory) : IUserRepository
{

    // SQLite repository for User
    // TODO: Migrate all SQL queries from user.repo.js
    // ⚠️ Update queries for new schema if columns/tables changed

    public async Task<IEnumerable<User>> GetAllUsersAsync()
    {
        try
        {
            await using var conn = (SqliteConnection)connectionFactory.CreateConnection();
            await conn.OpenAsync();
            var sql = "SELECT * FROM users;";
            var users = await conn.QueryAsync<User>(sql);
            return users;
        }
        catch (Exception ex)
        {
            throw new Exception("Unexpected error while fetching all users.", ex);
        }
    }

    public async Task<User?> GetUserByIdAsync(int id)
    {
        try
        {
            await using var conn = (SqliteConnection)connectionFactory.CreateConnection();
            await conn.OpenAsync();
            var sql = "SELECT * FROM users WHERE id = @id;";
            var user = await conn.QuerySingleOrDefaultAsync<User>(sql, new { id });
            return user;
        }
        catch (Exception ex)
        {
            throw new Exception("Unexpected error while fetching user.", ex);
        }
    }

    public async Task<User?> GetUserByEmailAsync(string email)
    {
        try
        {
            await using var conn = (SqliteConnection)connectionFactory.CreateConnection();
            await conn.OpenAsync();
            var sql = "SELECT * FROM users WHERE email = @email;";
            var user = await conn.QuerySingleOrDefaultAsync<User>(sql, new { email });
            return user;
        }
        catch (Exception ex)
        {
            throw new Exception("Unexpected error while fetching user.", ex);
        }
    }

    public async Task<User?> GetUserByRoleAsync(UserRole role)
    {
        try
        {
            await using var conn = (SqliteConnection)connectionFactory.CreateConnection();
            await conn.OpenAsync();
            var sql = "SELECT * FROM users WHERE role = @role;";
            var user = await conn.QuerySingleOrDefaultAsync<User>(sql, new { role });
            return user;
        }
        catch (Exception ex)
        {
            throw new Exception("Unexpected error while fetching user.", ex);
        }
    }

    public async Task<User?> GetUserByDisplayNameAsync(string displayName)
    {
        try
        {
            await using var conn = (SqliteConnection)connectionFactory.CreateConnection();
            await conn.OpenAsync();
            var sql = "SELECT * FROM users WHERE display_name = @displayName;";
            var user = await conn.QuerySingleOrDefaultAsync<User>(sql, new { displayName });
            return user;
        }
        catch (Exception ex)
        {
            throw new Exception("Unexpected error while fetching user.", ex);
        }
    }
    public async Task<bool> CreateUserAsync(User user)
    {
        try
        {
            await using var conn = (SqliteConnection)connectionFactory.CreateConnection();
            await conn.OpenAsync();

            var sql = @"
            INSERT INTO users (email, password_hash, role, display_name)
            VALUES (@Email, @PasswordHash, @Role, @DisplayName);";

            var rowsAffected = await conn.ExecuteAsync(sql, new
            {
                user.Email,
                user.PasswordHash,
                user.Role,
                user.DisplayName,
            });

            return rowsAffected == 1;
        }
        catch (Exception ex)
        {
            throw new Exception("Unexpected error while creating user.", ex);
        }

    }

    public async Task<bool> UpdateUserAsync(int id, User user)
    {
        try
        {
            await using var conn = (SqliteConnection)connectionFactory.CreateConnection();
            await conn.OpenAsync();

            var sql = @"
            UPDATE users
            SET email = @Email, password_hash = @PasswordHash, role = @Role, display_name = @DisplayName
            WHERE id = @Id;";


            var rowsAffected = await conn.ExecuteAsync(sql, new
            {
                user.Email,
                user.PasswordHash,
                user.Role,
                user.DisplayName,
                Id = id
            });

            return rowsAffected == 1;
        }
        catch (Exception ex)
        {
            throw new Exception("Unexpected error while updating user.", ex);
        }
    }

    public async Task<bool> DeleteUserAsync(int id)
    {
        try
        {
            await using var conn = (SqliteConnection)connectionFactory.CreateConnection();
            await conn.OpenAsync();

            var sql = @"DELETE FROM users WHERE id = @id;";

            var rowsAffected = await conn.ExecuteAsync(sql, new { id });

            return rowsAffected == 1;
        }
        catch (Exception ex)
        {
            throw new Exception("Unexpected error while deleting user.", ex);
        }

    }

    public async Task<IEnumerable<User>> GetUsersByClassAsync(string className)
    {
        try
        {
            await using var conn = (SqliteConnection)connectionFactory.CreateConnection();
            await conn.OpenAsync();
            var sql = "SELECT * FROM users WHERE class = @className;";
            var users = await conn.QueryAsync<User>(sql, new { className });
            return users;
        }
        catch (Exception ex)
        {
            throw new Exception("Unexpected error while fetching users.", ex);
        }
    }

    public async Task<IEnumerable<User>> GetUsersByRoleAsync(UserRole role)
    {
        try
        {
            await using var conn = (SqliteConnection)connectionFactory.CreateConnection();
            await conn.OpenAsync();
            var sql = "SELECT * FROM users WHERE role = @role";
            var users = await conn.QueryAsync<User>(sql, new { role });
            return users;
        }
        catch (Exception ex)
        {
            throw new Exception("Unexpected error while fetching users.", ex);
        }
    }

}
