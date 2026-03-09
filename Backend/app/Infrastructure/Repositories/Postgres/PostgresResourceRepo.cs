using Backend.app.Core.Interfaces;
using Backend.app.Core.Models.Entities;
using Dapper;

namespace Backend.app.Infrastructure.Repositories.Postgres;

public class PostgresResourceRepo(IDbConnectionFactory connectionFactory) : IResourceRepository
{
    // Categories
    public async Task<IEnumerable<ResourceCategory>> GetAllCategoriesAsync()
    {
        await using var conn = connectionFactory.CreateConnection();
        return await conn.QueryAsync<ResourceCategory>("SELECT * FROM resource_categories ORDER BY name;");
    }

    public async Task<long> CreateCategoryAsync(ResourceCategory category)
    {
        await using var conn = connectionFactory.CreateConnection();
        return await conn.ExecuteScalarAsync<long>(
            "INSERT INTO resource_categories (name) VALUES (@Name) RETURNING id;", category);
    }

    public async Task<bool> DeleteCategoryAsync(long id)
    {
        await using var conn = connectionFactory.CreateConnection();
        var rows = await conn.ExecuteAsync("DELETE FROM resource_categories WHERE id = @id;", new { id });
        return rows == 1;
    }

    // Resources
    public async Task<IEnumerable<BookableResource>> GetAllResourcesAsync()
    {
        await using var conn = connectionFactory.CreateConnection();
        return await conn.QueryAsync<BookableResource>("SELECT * FROM bookable_resources ORDER BY name;");
    }

    public async Task<BookableResource?> GetResourceByIdAsync(long id)
    {
        await using var conn = connectionFactory.CreateConnection();
        return await conn.QuerySingleOrDefaultAsync<BookableResource>(
            "SELECT * FROM bookable_resources WHERE id = @id;", new { id });
    }

    public async Task<long> CreateResourceAsync(BookableResource resource)
    {
        await using var conn = connectionFactory.CreateConnection();
        return await conn.ExecuteScalarAsync<long>(@"
            INSERT INTO bookable_resources (category_id, campus_id, name, description, is_active)
            VALUES (@CategoryId, @CampusId, @Name, @Description, @IsActive)
            RETURNING id;", resource);
    }

    public async Task<bool> UpdateResourceAsync(long id, BookableResource resource)
    {
        await using var conn = connectionFactory.CreateConnection();
        var rows = await conn.ExecuteAsync(@"
            UPDATE bookable_resources
            SET category_id = @CategoryId, campus_id = @CampusId, name = @Name, 
                description = @Description, is_active = @IsActive
            WHERE id = @id;", new { resource.CategoryId, resource.CampusId, resource.Name, resource.Description, resource.IsActive, id });
        return rows == 1;
    }

    public async Task<bool> DeleteResourceAsync(long id)
    {
        await using var conn = connectionFactory.CreateConnection();
        var rows = await conn.ExecuteAsync("DELETE FROM bookable_resources WHERE id = @id;", new { id });
        return rows == 1;
    }

    // Bookings
    public async Task<IEnumerable<ResourceBooking>> GetBookingsAsync(long? resourceId = null, long? userId = null)
    {
        await using var conn = connectionFactory.CreateConnection();
        var sql = "SELECT * FROM resource_bookings WHERE 1=1";
        if (resourceId.HasValue) sql += " AND resource_id = @resourceId";
        if (userId.HasValue) sql += " AND user_id = @userId";
        sql += " ORDER BY start_time DESC;";
        return await conn.QueryAsync<ResourceBooking>(sql, new { resourceId, userId });
    }

    public async Task<IEnumerable<ResourceBooking>> GetOverlappingBookingsAsync(long resourceId, DateTime start, DateTime end)
    {
        await using var conn = connectionFactory.CreateConnection();
        var sql = @"
            SELECT * FROM resource_bookings
            WHERE resource_id = @resourceId
              AND (start_time, end_time) OVERLAPS (@start, @end);";
        return await conn.QueryAsync<ResourceBooking>(sql, new { resourceId, start, end });
    }

    public async Task<long> CreateBookingAsync(ResourceBooking booking)
    {
        await using var conn = connectionFactory.CreateConnection();
        return await conn.ExecuteScalarAsync<long>(@"
            INSERT INTO resource_bookings (resource_id, user_id, start_time, end_time, notes)
            VALUES (@ResourceId, @UserId, @StartTime, @EndTime, @Notes)
            RETURNING id;", booking);
    }

    public async Task<bool> DeleteBookingAsync(long id)
    {
        await using var conn = connectionFactory.CreateConnection();
        var rows = await conn.ExecuteAsync("DELETE FROM resource_bookings WHERE id = @id;", new { id });
        return rows == 1;
    }
}