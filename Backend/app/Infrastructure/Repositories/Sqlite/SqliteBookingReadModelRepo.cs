using Backend.app.Core.Interfaces;
using Backend.app.Core.Models.ReadModels;
using Dapper;
using System.Text;

namespace Backend.app.Infrastructure.Repositories.Sqlite;

/// <summary>
/// SQLite repository for querying enriched booking data from views.
/// Follows CQRS pattern - read operations separated from write operations.
/// </summary>
public class SqliteBookingReadModelRepo(
    IDbConnectionFactory connectionFactory,
    ILogger<SqliteBookingReadModelRepo> logger) : IBookingReadModelRepository
{
    public async Task<IEnumerable<BookingDetailedReadModel>> GetAllDetailedBookingsAsync()
    {
        try
        {
            await using var conn = connectionFactory.CreateConnection();
            await conn.OpenAsync();

            var sql = "SELECT * FROM v_bookings_detailed ORDER BY start_time DESC;";
            var bookings = await conn.QueryAsync<BookingDetailedReadModel>(sql);

            return bookings;
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "Database error while fetching all detailed bookings from view");
            throw;
        }
    }

    public async Task<BookingDetailedReadModel?> GetDetailedBookingByIdAsync(long bookingId)
    {
        try
        {
            await using var conn = connectionFactory.CreateConnection();
            await conn.OpenAsync();

            var sql = "SELECT * FROM v_bookings_detailed WHERE booking_id = @BookingId;";
            var booking = await conn.QuerySingleOrDefaultAsync<BookingDetailedReadModel>(
                sql,
                new { BookingId = bookingId });

            return booking;
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "Database error while fetching detailed booking with ID {BookingId}", bookingId);
            throw;
        }
    }

    public async Task<IEnumerable<BookingDetailedReadModel>> GetDetailedBookingsByUserIdAsync(long userId)
    {
        try
        {
            await using var conn = connectionFactory.CreateConnection();
            await conn.OpenAsync();

            var sql = @"
                SELECT * FROM v_bookings_detailed 
                WHERE user_id = @UserId 
                ORDER BY start_time DESC;";

            var bookings = await conn.QueryAsync<BookingDetailedReadModel>(
                sql,
                new { UserId = userId });

            return bookings;
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "Database error while fetching detailed bookings for user {UserId}", userId);
            throw;
        }
    }

    public async Task<IEnumerable<BookingDetailedReadModel>> GetDetailedBookingsByRoomIdAsync(long roomId)
    {
        try
        {
            await using var conn = connectionFactory.CreateConnection();
            await conn.OpenAsync();

            var sql = @"
                SELECT * FROM v_bookings_detailed 
                WHERE room_id = @RoomId 
                ORDER BY start_time DESC;";

            var bookings = await conn.QueryAsync<BookingDetailedReadModel>(
                sql,
                new { RoomId = roomId });

            return bookings;
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "Database error while fetching detailed bookings for room {RoomId}", roomId);
            throw;
        }
    }

    public async Task<IEnumerable<BookingDetailedReadModel>> GetDetailedBookingsByDateRangeAsync(
        DateTime startDate,
        DateTime endDate)
    {
        try
        {
            await using var conn = connectionFactory.CreateConnection();
            await conn.OpenAsync();

            var sql = @"
                SELECT * FROM v_bookings_detailed 
                WHERE start_time >= @StartDate AND end_time <= @EndDate 
                ORDER BY start_time ASC;";

            var bookings = await conn.QueryAsync<BookingDetailedReadModel>(
                sql,
                new { StartDate = startDate, EndDate = endDate });

            return bookings;
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "Database error while fetching detailed bookings between {StartDate} and {EndDate}",
                startDate, endDate);
            throw;
        }
    }

    public async Task<IEnumerable<BookingDetailedReadModel>> GetDetailedBookingsFilteredAsync(
        long? userId = null,
        long? roomId = null,
        DateTime? startDate = null,
        DateTime? endDate = null,
        int? status = null)
    {
        try
        {
            await using var conn = connectionFactory.CreateConnection();
            await conn.OpenAsync();

            var sqlBuilder = new StringBuilder("SELECT * FROM v_bookings_detailed WHERE 1=1");
            var parameters = new DynamicParameters();

            if (userId.HasValue)
            {
                sqlBuilder.Append(" AND user_id = @UserId");
                parameters.Add("UserId", userId.Value);
            }

            if (roomId.HasValue)
            {
                sqlBuilder.Append(" AND room_id = @RoomId");
                parameters.Add("RoomId", roomId.Value);
            }

            if (startDate.HasValue)
            {
                sqlBuilder.Append(" AND start_time >= @StartDate");
                parameters.Add("StartDate", startDate.Value);
            }

            if (endDate.HasValue)
            {
                sqlBuilder.Append(" AND end_time <= @EndDate");
                parameters.Add("EndDate", endDate.Value);
            }

            if (status.HasValue)
            {
                sqlBuilder.Append(" AND status = @Status");
                parameters.Add("Status", status.Value);
            }

            sqlBuilder.Append(" ORDER BY start_time DESC;");

            var bookings = (await conn.QueryAsync<BookingDetailedReadModel>(
                sqlBuilder.ToString(),
                parameters)).ToList();

            logger.LogInformation(
                "Fetched {Count} detailed bookings with filters: UserId={UserId}, RoomId={RoomId}, StartDate={StartDate}, EndDate={EndDate}, Status={Status}",
                bookings.Count, userId, roomId, startDate, endDate, status);

            return bookings;
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "Database error while fetching filtered detailed bookings");
            throw;
        }
    }

    public async Task<IEnumerable<BookingDetailedReadModel>> GetDetailedBookingsByRegisteredUserIdAsync(long userId)
    {
        try
        {
            await using var conn = connectionFactory.CreateConnection();
            await conn.OpenAsync();

            var sql = @"
                SELECT v.* 
                FROM v_bookings_detailed v
                INNER JOIN registrations r ON v.booking_id = r.booking_id
                WHERE r.user_id = @UserId
                ORDER BY v.start_time DESC;";

            var bookings = await conn.QueryAsync<BookingDetailedReadModel>(
                sql,
                new { UserId = userId });

            return bookings;
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "Database error while fetching bookings registered for user {UserId}", userId);
            throw;
        }
    }
}
