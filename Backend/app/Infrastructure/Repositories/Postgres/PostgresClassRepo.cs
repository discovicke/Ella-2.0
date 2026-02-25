using Backend.app.Core.Interfaces;
using Backend.app.Core.Models.Entities;
using Dapper;

namespace Backend.app.Infrastructure.Repositories.Postgres;

public class PostgresClassRepo(
    IDbConnectionFactory connectionFactory,
    ILogger<PostgresClassRepo> logger
) : IClassRepository
{
    public async Task<IEnumerable<SchoolClass>> GetAllAsync()
    {
        try
        {
            await using var conn = connectionFactory.CreateConnection();
            await conn.OpenAsync();
            return await conn.QueryAsync<SchoolClass>("SELECT * FROM class ORDER BY class_name;");
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "Database error while fetching all classes");
            throw;
        }
    }

    public async Task<SchoolClass?> GetByIdAsync(long id)
    {
        try
        {
            await using var conn = connectionFactory.CreateConnection();
            await conn.OpenAsync();
            return await conn.QuerySingleOrDefaultAsync<SchoolClass>(
                "SELECT * FROM class WHERE id = @id;",
                new { id }
            );
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "Database error while fetching class with ID {Id}", id);
            throw;
        }
    }

    public async Task<long> CreateAsync(SchoolClass schoolClass)
    {
        try
        {
            await using var conn = connectionFactory.CreateConnection();
            await conn.OpenAsync();
            const string sql = """
                INSERT INTO class (class_name)
                VALUES (@ClassName)
                RETURNING id;
                """;
            return await conn.ExecuteScalarAsync<long>(sql, schoolClass);
        }
        catch (Exception ex)
        {
            logger.LogError(
                ex,
                "Database error while creating class {ClassName}",
                schoolClass.ClassName
            );
            throw;
        }
    }

    public async Task<bool> UpdateAsync(long id, SchoolClass schoolClass)
    {
        try
        {
            await using var conn = connectionFactory.CreateConnection();
            await conn.OpenAsync();
            schoolClass.Id = id;
            const string sql = "UPDATE class SET class_name = @ClassName WHERE id = @Id;";
            return await conn.ExecuteAsync(sql, schoolClass) > 0;
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "Database error while updating class with ID {Id}", id);
            throw;
        }
    }

    public async Task<bool> DeleteAsync(long id)
    {
        try
        {
            await using var conn = connectionFactory.CreateConnection();
            await conn.OpenAsync();
            return await conn.ExecuteAsync("DELETE FROM class WHERE id = @id;", new { id }) > 0;
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "Database error while deleting class with ID {Id}", id);
            throw;
        }
    }

    // ── Class ↔ Campus ───────────────────────────────────────

    public async Task<IEnumerable<long>> GetCampusIdsForClassAsync(long classId)
    {
        try
        {
            await using var conn = connectionFactory.CreateConnection();
            await conn.OpenAsync();
            return await conn.QueryAsync<long>(
                "SELECT campus_id FROM class_campus WHERE class_id = @classId;",
                new { classId }
            );
        }
        catch (Exception ex)
        {
            logger.LogError(
                ex,
                "Database error while fetching campus IDs for class {ClassId}",
                classId
            );
            throw;
        }
    }

    public async Task SetCampusesForClassAsync(long classId, IEnumerable<long> campusIds)
    {
        try
        {
            await using var conn = connectionFactory.CreateConnection();
            await conn.OpenAsync();
            using var tx = await conn.BeginTransactionAsync();

            await conn.ExecuteAsync(
                "DELETE FROM class_campus WHERE class_id = @classId;",
                new { classId },
                tx
            );

            foreach (var campusId in campusIds)
            {
                await conn.ExecuteAsync(
                    "INSERT INTO class_campus (class_id, campus_id) VALUES (@classId, @campusId);",
                    new { classId, campusId },
                    tx
                );
            }

            await tx.CommitAsync();
        }
        catch (Exception ex)
        {
            logger.LogError(
                ex,
                "Database error while setting campuses for class {ClassId}",
                classId
            );
            throw;
        }
    }

    public async Task<Dictionary<long, List<string>>> GetAllClassCampusNamesAsync()
    {
        try
        {
            await using var conn = connectionFactory.CreateConnection();
            await conn.OpenAsync();
            var sql =
                @"SELECT cc.class_id AS ClassId, c.city AS Name
                        FROM class_campus cc
                        JOIN campus c ON c.id = cc.campus_id
                        ORDER BY c.city;";
            var rows = await conn.QueryAsync<(long ClassId, string Name)>(sql);
            var dict = new Dictionary<long, List<string>>();
            foreach (var row in rows)
            {
                if (!dict.ContainsKey(row.ClassId))
                    dict[row.ClassId] = new List<string>();
                dict[row.ClassId].Add(row.Name);
            }
            return dict;
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "Database error while fetching all class-campus associations");
            throw;
        }
    }
}
