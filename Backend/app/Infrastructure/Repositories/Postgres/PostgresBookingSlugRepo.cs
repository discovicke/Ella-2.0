using Backend.app.Core.Interfaces;
using Backend.app.Core.Models.Entities;
using Dapper;

namespace Backend.app.Infrastructure.Repositories.Postgres;

public class PostgresBookingSlugRepo(IDbConnectionFactory connectionFactory, ILogger<PostgresBookingSlugRepo> logger) : IBookingSlugRepository
{
    public async Task<BookingSlug?> GetBySlugAsync(string slug)
    {
        try
        {
            await using var conn = connectionFactory.CreateConnection();
            await conn.OpenAsync();
            return await conn.QuerySingleOrDefaultAsync<BookingSlug>(
                "SELECT * FROM user_booking_slugs WHERE slug = @slug AND is_active = true;",
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
            await using var conn = connectionFactory.CreateConnection();
            await conn.OpenAsync();
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
            await using var conn = connectionFactory.CreateConnection();
            await conn.OpenAsync();
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
            await using var conn = connectionFactory.CreateConnection();
            await conn.OpenAsync();
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
            await using var conn = connectionFactory.CreateConnection();
            await conn.OpenAsync();
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
            await using var conn = connectionFactory.CreateConnection();
            await conn.OpenAsync();
            var rows = await conn.ExecuteAsync(
                "UPDATE user_booking_slugs SET is_active = @isActive WHERE id = @id;",
                new { id, isActive }
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