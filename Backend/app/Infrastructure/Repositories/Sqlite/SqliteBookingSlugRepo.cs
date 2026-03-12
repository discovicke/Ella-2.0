using Backend.app.Core.Interfaces;
using Backend.app.Core.Models.Entities;
using Dapper;

namespace Backend.app.Infrastructure.Repositories.Sqlite;

public class SqliteBookingSlugRepo(IDbConnectionFactory connectionFactory, ILogger<SqliteBookingSlugRepo> logger) : IBookingSlugRepository
{
    public async Task<BookingSlug?> GetBySlugAsync(string slug)
    {
        try
        {
            using var conn = connectionFactory.CreateConnection();
            return await conn.QuerySingleOrDefaultAsync<BookingSlug>(
                "SELECT * FROM user_booking_slugs WHERE slug = @slug AND is_active = 1;",
                new { slug }
            );
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "Error fetching booking slug {Slug}", slug);
            throw;
        }
    }

    public async Task<IEnumerable<BookingSlug>> GetAllAsync()
    {
        try
        {
            using var conn = connectionFactory.CreateConnection();
            return await conn.QueryAsync<BookingSlug>("SELECT * FROM user_booking_slugs ORDER BY created_at DESC;");
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "Error fetching all booking slugs");
            throw;
        }
    }

    public async Task<BookingSlug?> GetByUserIdAsync(long userId)
    {
        try
        {
            using var conn = connectionFactory.CreateConnection();
            return await conn.QuerySingleOrDefaultAsync<BookingSlug>(
                "SELECT * FROM user_booking_slugs WHERE user_id = @userId;",
                new { userId }
            );
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "Error fetching booking slug for user {UserId}", userId);
            throw;
        }
    }

    public async Task<bool> CreateAsync(BookingSlug bookingSlug)
    {
        try
        {
            using var conn = connectionFactory.CreateConnection();
            var sql = @"
                INSERT INTO user_booking_slugs (user_id, slug, is_active)
                VALUES (@UserId, @Slug, @IsActive);";
            var rows = await conn.ExecuteAsync(sql, bookingSlug);
            return rows == 1;
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "Error creating booking slug for user {UserId}", bookingSlug.UserId);
            throw;
        }
    }

    public async Task<bool> DeleteAsync(long id)
    {
        try
        {
            using var conn = connectionFactory.CreateConnection();
            var rows = await conn.ExecuteAsync("DELETE FROM user_booking_slugs WHERE id = @id;", new { id });
            return rows == 1;
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "Error deleting booking slug {Id}", id);
            throw;
        }
    }

    public async Task<bool> ToggleActiveAsync(long id, bool isActive)
    {
        try
        {
            using var conn = connectionFactory.CreateConnection();
            var rows = await conn.ExecuteAsync(
                "UPDATE user_booking_slugs SET is_active = @isActive WHERE id = @id;",
                new { id, isActive = isActive ? 1 : 0 }
            );
            return rows == 1;
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "Error toggling active state for booking slug {Id}", id);
            throw;
        }
    }
}
