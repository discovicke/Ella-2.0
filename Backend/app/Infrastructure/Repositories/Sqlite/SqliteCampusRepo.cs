using Backend.app.Core.Interfaces;
using Backend.app.Core.Models.Entities;
using Dapper;

namespace Backend.app.Infrastructure.Repositories.Sqlite;

public class SqliteCampusRepo(
    IDbConnectionFactory connectionFactory,
    ILogger<SqliteCampusRepo> logger
) : ICampusRepository
{
    public async Task<IEnumerable<Campus>> GetAllAsync()
    {
        try
        {
            await using var conn = connectionFactory.CreateConnection();
            await conn.OpenAsync();
            return await conn.QueryAsync<Campus>("SELECT * FROM campus ORDER BY city, street;");
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "Database error while fetching all campuses");
            throw;
        }
    }

    public async Task<Campus?> GetByIdAsync(long id)
    {
        try
        {
            await using var conn = connectionFactory.CreateConnection();
            await conn.OpenAsync();
            return await conn.QuerySingleOrDefaultAsync<Campus>(
                "SELECT * FROM campus WHERE id = @id;",
                new { id }
            );
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "Database error while fetching campus with ID {Id}", id);
            throw;
        }
    }

    public async Task<long> CreateAsync(Campus campus)
    {
        try
        {
            await using var conn = connectionFactory.CreateConnection();
            await conn.OpenAsync();
            const string sql = """
                INSERT INTO campus (street, zip, city, country, contact)
                VALUES (@Street, @Zip, @City, @Country, @Contact);
                SELECT last_insert_rowid();
                """;
            return await conn.ExecuteScalarAsync<long>(sql, campus);
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "Database error while creating campus {City}", campus.City);
            throw;
        }
    }

    public async Task<bool> UpdateAsync(long id, Campus campus)
    {
        try
        {
            await using var conn = connectionFactory.CreateConnection();
            await conn.OpenAsync();
            campus.Id = id;
            const string sql = """
                UPDATE campus
                SET street = @Street, zip = @Zip, city = @City, country = @Country, contact = @Contact
                WHERE id = @Id;
                """;
            return await conn.ExecuteAsync(sql, campus) > 0;
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "Database error while updating campus with ID {Id}", id);
            throw;
        }
    }

    public async Task<bool> DeleteAsync(long id)
    {
        try
        {
            await using var conn = connectionFactory.CreateConnection();
            await conn.OpenAsync();
            return await conn.ExecuteAsync("DELETE FROM campus WHERE id = @id;", new { id }) > 0;
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "Database error while deleting campus with ID {Id}", id);
            throw;
        }
    }
}
