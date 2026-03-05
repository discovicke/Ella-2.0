using Backend.app.Core.Interfaces;
using Backend.app.Core.Models.Entities;
using Dapper;

namespace Backend.app.Infrastructure.Repositories.Sqlite;

public class SqliteClassRepo(
    IDbConnectionFactory connectionFactory,
    ILogger<SqliteClassRepo> logger
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
            const string sql =
                "INSERT INTO class (class_name) VALUES (@ClassName); SELECT last_insert_rowid();";
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

    // ── Class ↔ User ───────────────────────────────────────

    public async Task<IEnumerable<long>> GetUserIdsByClassIdsAsync(IEnumerable<long> classIds)
    {
        try
        {
            await using var conn = connectionFactory.CreateConnection();
            await conn.OpenAsync();
            var ids = classIds.ToList();
            if (ids.Count == 0) return Enumerable.Empty<long>();
            var paramNames = string.Join(",", ids.Select((_, i) => $"@p{i}"));
            var parameters = new DynamicParameters();
            for (var i = 0; i < ids.Count; i++)
                parameters.Add($"p{i}", ids[i]);
            return await conn.QueryAsync<long>(
                $"SELECT DISTINCT user_id FROM user_class WHERE class_id IN ({paramNames});",
                parameters
            );
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "Database error while fetching user IDs by class IDs");
            throw;
        }
    }

    public async Task<IEnumerable<(long UserId, string DisplayName, string Email)>> GetUsersByClassIdsAsync(
        IEnumerable<long> classIds
    )
    {
        try
        {
            await using var conn = connectionFactory.CreateConnection();
            await conn.OpenAsync();
            var ids = classIds.ToList();
            if (ids.Count == 0)
                return Enumerable.Empty<(long, string, string)>();
            var paramNames = string.Join(",", ids.Select((_, i) => $"@p{i}"));
            var parameters = new DynamicParameters();
            for (var i = 0; i < ids.Count; i++)
                parameters.Add($"p{i}", ids[i]);
            var sql = $"""
                SELECT DISTINCT u.id AS UserId, u.display_name AS DisplayName, u.email AS Email
                FROM user_class uc
                JOIN users u ON uc.user_id = u.id
                WHERE uc.class_id IN ({paramNames})
                ORDER BY u.display_name;
                """;
            return await conn.QueryAsync<(long UserId, string DisplayName, string Email)>(
                sql,
                parameters
            );
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "Database error while fetching users by class IDs");
            throw;
        }
    }

    // ── Booking ↔ Class ─────────────────────────────────────

    public async Task<IEnumerable<long>> GetClassIdsForBookingAsync(long bookingId)
    {
        try
        {
            await using var conn = connectionFactory.CreateConnection();
            await conn.OpenAsync();
            return await conn.QueryAsync<long>(
                "SELECT class_id FROM booking_class WHERE booking_id = @bookingId;",
                new { bookingId }
            );
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "Database error while fetching class IDs for booking {BookingId}", bookingId);
            throw;
        }
    }

    public async Task SetClassesForBookingAsync(long bookingId, IEnumerable<long> classIds)
    {
        try
        {
            await using var conn = connectionFactory.CreateConnection();
            await conn.OpenAsync();
            using var tx = await conn.BeginTransactionAsync();

            await conn.ExecuteAsync(
                "DELETE FROM booking_class WHERE booking_id = @bookingId;",
                new { bookingId },
                tx
            );

            foreach (var classId in classIds)
            {
                await conn.ExecuteAsync(
                    "INSERT INTO booking_class (booking_id, class_id) VALUES (@bookingId, @classId);",
                    new { bookingId, classId },
                    tx
                );
            }

            await tx.CommitAsync();
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "Database error while setting classes for booking {BookingId}", bookingId);
            throw;
        }
    }
}
