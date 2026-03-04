using System.Text;
using Backend.app.Core.Interfaces;
using Backend.app.Core.Models.Enums;
using Backend.app.Core.Models.ReadModels;
using Dapper;

namespace Backend.app.Infrastructure.Repositories.Postgres;

/// <summary>
/// PostgreSQL repository for querying enriched booking data from views.
/// Follows CQRS pattern - read operations separated from write operations.
/// </summary>
public class PostgresBookingReadModelRepo(
    IDbConnectionFactory connectionFactory,
    ILogger<PostgresBookingReadModelRepo> logger
) : IBookingReadModelRepository
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
                new { BookingId = bookingId }
            );

            return booking;
        }
        catch (Exception ex)
        {
            logger.LogError(
                ex,
                "Database error while fetching detailed booking with ID {BookingId}",
                bookingId
            );
            throw;
        }
    }

    public async Task<IEnumerable<BookingDetailedReadModel>> GetDetailedBookingsByUserIdAsync(
        long userId
    )
    {
        try
        {
            await using var conn = connectionFactory.CreateConnection();
            await conn.OpenAsync();

            var sql =
                @"
                SELECT * FROM v_bookings_detailed 
                WHERE user_id = @UserId 
                ORDER BY start_time DESC;";

            var bookings = await conn.QueryAsync<BookingDetailedReadModel>(
                sql,
                new { UserId = userId }
            );

            return bookings;
        }
        catch (Exception ex)
        {
            logger.LogError(
                ex,
                "Database error while fetching detailed bookings for user {UserId}",
                userId
            );
            throw;
        }
    }

    public async Task<IEnumerable<BookingDetailedReadModel>> GetDetailedBookingsFilteredAsync(
        long? userId = null,
        long? roomId = null,
        DateTime? startDate = null,
        DateTime? endDate = null,
        BookingStatus? status = null
    )
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
                parameters.Add("StartDate", startDate.Value.ToUniversalTime());
            }

            if (endDate.HasValue)
            {
                sqlBuilder.Append(" AND end_time <= @EndDate");
                parameters.Add("EndDate", endDate.Value.ToUniversalTime());
            }

            if (status.HasValue)
            {
                sqlBuilder.Append(" AND status = @Status::booking_status");
                parameters.Add("Status", status.Value.ToString().ToLower());
            }

            sqlBuilder.Append(" ORDER BY start_time DESC;");

            var bookings = (
                await conn.QueryAsync<BookingDetailedReadModel>(sqlBuilder.ToString(), parameters)
            ).ToList();

            logger.LogInformation(
                "Fetched {Count} detailed bookings with filters: UserId={UserId}, RoomId={RoomId}, StartDate={StartDate}, EndDate={EndDate}, Status={Status}",
                bookings.Count,
                userId,
                roomId,
                startDate,
                endDate,
                status
            );

            return bookings;
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "Database error while fetching filtered detailed bookings");
            throw;
        }
    }

    public async Task<
        IEnumerable<BookingDetailedReadModel>
    > GetDetailedBookingsByUserRegistrationAsync(
        long userId,
        IEnumerable<RegistrationStatus> statuses,
        string? timeFilter = null)
    {
        try
        {
            await using var conn = connectionFactory.CreateConnection();
            await conn.OpenAsync();

            // Map enum values to Postgres enum strings
            var pgStatuses = statuses.Select(s => s switch
            {
                RegistrationStatus.Invited => "invited",
                RegistrationStatus.Registered => "registered",
                RegistrationStatus.Declined => "declined",
                _ => throw new ArgumentOutOfRangeException(nameof(s), s, null)
            }).ToArray();

            var timeClause = timeFilter switch
            {
                "upcoming" => "AND v.end_time >= NOW()",
                "history" => "AND v.end_time < NOW()",
                _ => ""
            };

            var orderDir = timeFilter == "upcoming" ? "ASC" : "DESC";

            var sql = $@"
                SELECT v.*, r.status::text AS user_registration_status
                FROM v_bookings_detailed v
                INNER JOIN registrations r ON v.booking_id = r.booking_id
                WHERE r.user_id = @UserId
                  AND r.status = ANY(@Statuses::registration_status[])
                  {timeClause}
                ORDER BY v.start_time {orderDir};";

            return await conn.QueryAsync<BookingDetailedReadModel>(
                sql,
                new { UserId = userId, Statuses = pgStatuses }
            );
        }
        catch (Exception ex)
        {
            logger.LogError(
                ex,
                "Database error while fetching registration bookings for user {UserId}",
                userId
            );
            throw;
        }
    }

    public async Task<(
        IEnumerable<BookingDetailedReadModel> Bookings,
        int TotalCount
    )> GetDetailedBookingsByUserRegistrationPagedAsync(
        long userId,
        IEnumerable<RegistrationStatus> statuses,
        int page,
        int pageSize,
        string? timeFilter = null)
    {
        try
        {
            await using var conn = connectionFactory.CreateConnection();
            await conn.OpenAsync();

            var pgStatuses = statuses.Select(s => s switch
            {
                RegistrationStatus.Invited => "invited",
                RegistrationStatus.Registered => "registered",
                RegistrationStatus.Declined => "declined",
                _ => throw new ArgumentOutOfRangeException(nameof(s), s, null)
            }).ToArray();

            var timeClause = timeFilter switch
            {
                "upcoming" => "AND v.end_time >= NOW()",
                "history" => "AND v.end_time < NOW()",
                _ => ""
            };

            var orderDir = timeFilter == "upcoming" ? "ASC" : "DESC";
            var offset = (page - 1) * pageSize;

            var countSql = $@"
                SELECT COUNT(*)
                FROM v_bookings_detailed v
                INNER JOIN registrations r ON v.booking_id = r.booking_id
                WHERE r.user_id = @UserId
                  AND r.status = ANY(@Statuses::registration_status[])
                  {timeClause};";

            var dataSql = $@"
                SELECT v.*, r.status::text AS user_registration_status
                FROM v_bookings_detailed v
                INNER JOIN registrations r ON v.booking_id = r.booking_id
                WHERE r.user_id = @UserId
                  AND r.status = ANY(@Statuses::registration_status[])
                  {timeClause}
                ORDER BY v.start_time {orderDir}
                LIMIT @PageSize OFFSET @Offset;";

            var parameters = new { UserId = userId, Statuses = pgStatuses, PageSize = pageSize, Offset = offset };

            var totalCount = await conn.ExecuteScalarAsync<int>(countSql, parameters);
            var bookings = await conn.QueryAsync<BookingDetailedReadModel>(dataSql, parameters);

            return (bookings, totalCount);
        }
        catch (Exception ex)
        {
            logger.LogError(
                ex,
                "Database error while fetching paged registration bookings for user {UserId}",
                userId
            );
            throw;
        }
    }

    public async Task<(
        IEnumerable<BookingDetailedReadModel> Bookings,
        int TotalCount
    )> GetDetailedBookingsPagedAsync(
        int page,
        int pageSize,
        string? search = null,
        long? userId = null,
        long? roomId = null,
        DateTime? startDate = null,
        DateTime? endDate = null,
        BookingStatus? status = null
    )
    {
        try
        {
            await using var conn = connectionFactory.CreateConnection();
            await conn.OpenAsync();

            var where = new StringBuilder("WHERE 1=1");
            var parameters = new DynamicParameters();

            if (!string.IsNullOrWhiteSpace(search))
            {
                where.Append(
                    " AND (user_name ILIKE @Search OR user_email ILIKE @Search OR room_name ILIKE @Search OR campus_city ILIKE @Search OR notes ILIKE @Search)"
                );
                parameters.Add("Search", $"%{search}%");
            }

            if (userId.HasValue)
            {
                where.Append(" AND user_id = @UserId");
                parameters.Add("UserId", userId.Value);
            }

            if (roomId.HasValue)
            {
                where.Append(" AND room_id = @RoomId");
                parameters.Add("RoomId", roomId.Value);
            }

            if (startDate.HasValue)
            {
                where.Append(" AND start_time >= @StartDate");
                parameters.Add("StartDate", startDate.Value.ToUniversalTime());
            }

            if (endDate.HasValue)
            {
                where.Append(" AND start_time < @EndDate");
                parameters.Add("EndDate", endDate.Value.ToUniversalTime());
            }

            if (status.HasValue)
            {
                where.Append(" AND status = @Status::booking_status");
                parameters.Add("Status", status.Value.ToString().ToLower());
            }

            var countSql = $"SELECT COUNT(*) FROM v_bookings_detailed {where};";
            var totalCount = await conn.ExecuteScalarAsync<int>(countSql, parameters);

            var offset = (page - 1) * pageSize;
            parameters.Add("Limit", pageSize);
            parameters.Add("Offset", offset);

            var dataSql =
                $"SELECT * FROM v_bookings_detailed {where} ORDER BY start_time DESC LIMIT @Limit OFFSET @Offset;";
            var bookings = await conn.QueryAsync<BookingDetailedReadModel>(dataSql, parameters);

            return (bookings, totalCount);
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "Database error while fetching paged detailed bookings");
            throw;
        }
    }

    public async Task<(
        IEnumerable<BookingDetailedReadModel> Bookings,
        int TotalCount
    )> GetDetailedBookingsByUserIdPagedAsync(
        long userId,
        int page,
        int pageSize,
        string? timeFilter = null,
        bool includeCancelled = true
    )
    {
        try
        {
            await using var conn = connectionFactory.CreateConnection();
            await conn.OpenAsync();

            var where = new StringBuilder("WHERE user_id = @UserId");
            var parameters = new DynamicParameters();
            parameters.Add("UserId", userId);

            var now = DateTime.UtcNow;
            var orderDir = "DESC";

            if (timeFilter == "upcoming")
            {
                where.Append(" AND end_time >= @Now");
                parameters.Add("Now", now);
                orderDir = "ASC";
            }
            else if (timeFilter == "history")
            {
                where.Append(" AND end_time < @Now");
                parameters.Add("Now", now);
                orderDir = "DESC";
            }

            if (!includeCancelled)
            {
                where.Append(" AND status != @CancelledStatus::booking_status");
                parameters.Add("CancelledStatus", BookingStatus.Cancelled.ToString().ToLower());
            }

            var countSql = $"SELECT COUNT(*) FROM v_bookings_detailed {where};";
            var totalCount = await conn.ExecuteScalarAsync<int>(countSql, parameters);

            var offset = (page - 1) * pageSize;
            parameters.Add("Limit", pageSize);
            parameters.Add("Offset", offset);

            var dataSql =
                $"SELECT * FROM v_bookings_detailed {where} ORDER BY start_time {orderDir} LIMIT @Limit OFFSET @Offset;";
            var bookings = await conn.QueryAsync<BookingDetailedReadModel>(dataSql, parameters);

            return (bookings, totalCount);
        }
        catch (Exception ex)
        {
            logger.LogError(
                ex,
                "Database error while fetching paged bookings for user {UserId}",
                userId
            );
            throw;
        }
    }

    public async Task<(
        IEnumerable<BookingDetailedReadModel> Bookings,
        int TotalGroups,
        int TotalItemCount
    )> GetDetailedBookingsGroupedPagedAsync(
        string groupBy,
        int page,
        int groupsPerPage,
        string? search = null,
        long? userId = null,
        long? roomId = null,
        DateTime? startDate = null,
        DateTime? endDate = null,
        BookingStatus? status = null
    )
    {
        try
        {
            await using var conn = connectionFactory.CreateConnection();
            await conn.OpenAsync();

            // Build shared WHERE clause
            var where = new StringBuilder("WHERE 1=1");
            var parameters = new DynamicParameters();

            if (!string.IsNullOrWhiteSpace(search))
            {
                where.Append(
                    " AND (user_name ILIKE @Search OR user_email ILIKE @Search OR room_name ILIKE @Search OR campus_city ILIKE @Search OR notes ILIKE @Search)"
                );
                parameters.Add("Search", $"%{search}%");
            }

            if (userId.HasValue)
            {
                where.Append(" AND user_id = @UserId");
                parameters.Add("UserId", userId.Value);
            }

            if (roomId.HasValue)
            {
                where.Append(" AND room_id = @RoomId");
                parameters.Add("RoomId", roomId.Value);
            }

            if (startDate.HasValue)
            {
                where.Append(" AND start_time >= @StartDate");
                parameters.Add("StartDate", startDate.Value.ToUniversalTime());
            }

            if (endDate.HasValue)
            {
                where.Append(" AND start_time < @EndDate");
                parameters.Add("EndDate", endDate.Value.ToUniversalTime());
            }

            if (status.HasValue)
            {
                where.Append(" AND status = @Status::booking_status");
                parameters.Add("Status", status.Value.ToString().ToLower());
            }

            // Map groupBy to SQL expressions (PostgreSQL syntax)
            var (groupExpr, sortExpr) = groupBy switch
            {
                "room" => ("room_id", "MIN(room_name)"),
                "user" => ("user_id", "MIN(user_name)"),
                "campus" => ("campus_city", "MIN(campus_city)"),
                "day" => ("start_time::date", "start_time::date"),
                "week" => (
                    "to_char(start_time, 'IYYY-\"W\"IW')",
                    "to_char(start_time, 'IYYY-\"W\"IW')"
                ),
                "month" => ("to_char(start_time, 'YYYY-MM')", "to_char(start_time, 'YYYY-MM')"),
                _ => throw new ArgumentException($"Unsupported groupBy value: {groupBy}"),
            };

            // Determine sort direction: newest months first, everything else ascending
            var sortDirection = groupBy == "month" ? "DESC" : "ASC";
            var fullSort = $"{sortExpr} {sortDirection}";

            // Count total groups
            var countSql = $"SELECT COUNT(DISTINCT {groupExpr}) FROM v_bookings_detailed {where};";
            var totalGroups = await conn.ExecuteScalarAsync<int>(countSql, parameters);

            // Count total items
            var itemCountSql = $"SELECT COUNT(*) FROM v_bookings_detailed {where};";
            var totalItemCount = await conn.ExecuteScalarAsync<int>(itemCountSql, parameters);

            if (totalGroups == 0)
            {
                return (Enumerable.Empty<BookingDetailedReadModel>(), 0, 0);
            }

            // Get paginated group keys
            var offset = (page - 1) * groupsPerPage;
            parameters.Add("GLimit", groupsPerPage);
            parameters.Add("GOffset", offset);

            var keysSql =
                $"SELECT {groupExpr}::text AS gk FROM v_bookings_detailed {where} GROUP BY {groupExpr} ORDER BY {fullSort} LIMIT @GLimit OFFSET @GOffset;";
            var groupKeys = (await conn.QueryAsync<string>(keysSql, parameters)).ToList();

            if (groupKeys.Count == 0)
            {
                return (Enumerable.Empty<BookingDetailedReadModel>(), totalGroups, totalItemCount);
            }

            // Fetch all bookings belonging to the selected groups
            parameters.Add("GroupKeys", groupKeys);
            var dataSql =
                $"SELECT * FROM v_bookings_detailed {where} AND {groupExpr}::text = ANY(@GroupKeys) ORDER BY start_time;";
            var bookings = await conn.QueryAsync<BookingDetailedReadModel>(dataSql, parameters);

            return (bookings, totalGroups, totalItemCount);
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "Database error while fetching grouped paged detailed bookings");
            throw;
        }
    }
}
