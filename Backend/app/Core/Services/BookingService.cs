using Backend.app.Core.Interfaces;
using Backend.app.Core.Models.DTO;
using Backend.app.Core.Models.Entities;
using Backend.app.Core.Models.Enums;
using Backend.app.Core.Models.ReadModels;
using System.Text.RegularExpressions;

namespace Backend.app.Core.Services;

public class BookingService(
    IBookingRepository repo,
    IBookingReadModelRepository readModelRepo,
    IUserRepository userRepo,
    IRoomRepository roomRepo,
    IRoomReadModelRepository roomReadModelRepo,
    IClassRepository classRepo,
    IRegistrationRepository registrationRepo
)
{
    // Business logic for bookings
    // Follows CQRS pattern: Write operations use repo, Read operations use readModelRepo
    // Include validation logic, availability checks, permission checks

    /// <summary>
    /// Get all bookings with enriched data (user names, room names, registration count)
    /// </summary>
    public async Task<IEnumerable<BookingDetailedReadModel>> GetAllBookingsAsync()
    {
        return await readModelRepo.GetAllDetailedBookingsAsync();
    }

    /// <summary>
    /// Get bookings filtered by various criteria
    /// </summary>
    public async Task<IEnumerable<BookingDetailedReadModel>> GetFilteredBookingsAsync(
        long? userId = null,
        long? roomId = null,
        DateTime? startDate = null,
        DateTime? endDate = null,
        BookingStatus? status = null
    )
    {
        return await readModelRepo.GetDetailedBookingsFilteredAsync(
            userId,
            roomId,
            startDate,
            endDate,
            status
        );
    }

    /// <summary>
    /// Get paginated filtered bookings with search support
    /// </summary>
    public async Task<PagedResult<BookingDetailedReadModel>> GetFilteredBookingsPagedAsync(
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
        var (bookings, totalCount) = await readModelRepo.GetDetailedBookingsPagedAsync(
            page,
            pageSize,
            search,
            userId,
            roomId,
            startDate,
            endDate,
            status
        );
        return new PagedResult<BookingDetailedReadModel>(bookings, totalCount, page, pageSize);
    }

    public async Task<IEnumerable<RoomAvailabilityResultDto>> GetRoomAvailabilityAsync(
        BookingAvailabilityQueryDto query
    )
    {
        if (query.EndTime <= query.StartTime)
            throw new InvalidOperationException("End time must be after start time.");

        var rooms = (await roomReadModelRepo.GetAllRoomDetailsAsync()).ToList();
        var normalizedQuery = query.Query?.Trim();
        var normalizedCampus = query.Campus?.Trim();
        var assetTerms = (query.Assets ?? string.Empty)
            .Split(',', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries)
            .Select(t => t.ToLowerInvariant())
            .ToArray();

        var candidateRooms = rooms
            .Where(room =>
            {
                var matchesCampus =
                    string.IsNullOrWhiteSpace(normalizedCampus)
                    || string.Equals(room.CampusCity, normalizedCampus, StringComparison.OrdinalIgnoreCase);
                var matchesRoomType = !query.RoomTypeId.HasValue || room.RoomTypeId == query.RoomTypeId.Value;
                var matchesCapacity = !query.MinCapacity.HasValue || (room.Capacity ?? 0) >= query.MinCapacity.Value;
                var matchesQuery =
                    string.IsNullOrWhiteSpace(normalizedQuery)
                    || room.Name.Contains(normalizedQuery, StringComparison.OrdinalIgnoreCase)
                    || room.CampusCity.Contains(normalizedQuery, StringComparison.OrdinalIgnoreCase)
                    || (!string.IsNullOrWhiteSpace(room.Notes)
                        && room.Notes.Contains(normalizedQuery, StringComparison.OrdinalIgnoreCase));
                var roomAssets = room.Assets ?? [];
                var matchesAssets = assetTerms.All(term => roomAssets.Any(asset => AssetMatchesTerm(asset, term)));

                return matchesCampus
                    && matchesRoomType
                    && matchesCapacity
                    && matchesQuery
                    && matchesAssets;
            })
            .ToList();

        if (candidateRooms.Count == 0)
            return [];

        var bookings = (
            await readModelRepo.GetDetailedBookingsFilteredAsync(
                startDate: query.StartTime.Date,
                endDate: query.StartTime.Date.AddDays(1)
            )
        )
            .Where(b => b.Status is not BookingStatus.Cancelled and not BookingStatus.Expired)
            .ToList();

        // Get all users involved in bookings to fetch their permission levels
        var userIdsForConflictingBookings = bookings.Select(b => b.UserId).Distinct();
        var userMap = new Dictionary<long, int>();
        foreach (var uid in userIdsForConflictingBookings)
        {
            var u = await userRepo.GetUserByIdAsync(uid);
            userMap[uid] = u?.PermissionLevel ?? 1;
        }

        return candidateRooms
            .Select(room =>
            {
                var conflicts = bookings
                    .Where(b => b.RoomId == room.RoomId)
                    .Where(b => b.StartTime < query.EndTime && b.EndTime > query.StartTime)
                    .OrderBy(b => b.StartTime)
                    .Select(b => new AvailabilityConflictDto(
                        b.BookingId,
                        b.StartTime,
                        b.EndTime,
                        b.UserName,
                        b.UserEmail,
                        userMap.GetValueOrDefault(b.UserId, 1),
                        b.Status
                    ))
                    .ToList();

                var matchReasons = BuildMatchReasons(room, query, assetTerms);
                var matchScore = CalculateMatchScore(room, query, assetTerms);

                return new RoomAvailabilityResultDto(
                    room.RoomId,
                    room.Name,
                    room.CampusCity,
                    room.Capacity,
                    room.RoomTypeId,
                    room.RoomTypeName,
                    room.Floor,
                    room.Notes,
                    room.Assets,
                    conflicts.Count == 0,
                    matchScore,
                    matchReasons,
                    conflicts.FirstOrDefault(),
                    conflicts
                );
            })
            .OrderByDescending(r => r.IsAvailable)
            .ThenByDescending(r => r.MatchScore)
            .ThenBy(r => r.Capacity ?? int.MaxValue)
            .ThenBy(r => r.RoomName, StringComparer.OrdinalIgnoreCase)
            .ToList();
    }

    /// <summary>
    /// Get group-aware paginated filtered bookings.
    /// Paginates by groups (e.g. 10 rooms per page) and returns all bookings for those groups.
    /// </summary>
    public async Task<
        GroupedPagedResult<BookingDetailedReadModel>
    > GetGroupedFilteredBookingsPagedAsync(
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
        var (bookings, totalGroups, totalItemCount) =
            await readModelRepo.GetDetailedBookingsGroupedPagedAsync(
                groupBy,
                page,
                groupsPerPage,
                search,
                userId,
                roomId,
                startDate,
                endDate,
                status
            );
        return new GroupedPagedResult<BookingDetailedReadModel>(
            bookings,
            totalGroups,
            totalItemCount,
            page,
            groupsPerPage
        );
    }

    /// <summary>
    /// Get paginated bookings a user has created (my-owned), with time filtering.
    /// </summary>
    public async Task<PagedResult<BookingDetailedReadModel>> GetUserOwnedBookingsPagedAsync(
        long userId,
        int page,
        int pageSize,
        string? timeFilter = null,
        bool includeCancelled = true
    )
    {
        var (bookings, totalCount) = await readModelRepo.GetDetailedBookingsByUserIdPagedAsync(
            userId,
            page,
            pageSize,
            timeFilter,
            includeCancelled
        );
        return new PagedResult<BookingDetailedReadModel>(bookings, totalCount, page, pageSize);
    }

    /// <summary>
    /// Get detailed booking by ID with enriched data
    /// </summary>
    public async Task<BookingDetailedReadModel?> GetDetailedBookingByIdAsync(long id)
    {
        return await readModelRepo.GetDetailedBookingByIdAsync(id);
    }

    /// <summary>
    /// Create a new booking. 
    /// Logic: Lessons can override private bookings. Private bookings cannot override anything.
    /// </summary>
    public async Task<BookingCreateResultDto> CreateBookingAsync(CreateBookingDto dto)
    {
        // 1. Validation: Existence
        var user = await userRepo.GetUserByIdAsync(dto.UserId);
        if (user is null)
        {
            throw new KeyNotFoundException($"User with ID {dto.UserId} not found.");
        }

        if (await roomRepo.GetRoomByIdAsync(dto.RoomId) is null)
        {
            throw new KeyNotFoundException($"Room with ID {dto.RoomId} not found.");
        }

        // Calculate all occurrences if it's a recurring booking
        var occurrences = new List<(DateTime Start, DateTime End)>();
        occurrences.Add((dto.StartTime, dto.EndTime));

        if (!string.IsNullOrWhiteSpace(dto.RecurrencePattern) && dto.RecurrenceEnd.HasValue)
        {
            var currentStart = dto.StartTime;
            var currentEnd = dto.EndTime;
            var duration = dto.EndTime - dto.StartTime;

            while (true)
            {
                if (dto.RecurrencePattern.ToLower() == "daily")
                    currentStart = currentStart.AddDays(1);
                else if (dto.RecurrencePattern.ToLower() == "weekly")
                    currentStart = currentStart.AddDays(7);
                else if (dto.RecurrencePattern.ToLower() == "biweekly")
                    currentStart = currentStart.AddDays(14);
                else if (dto.RecurrencePattern.ToLower() == "monthly")
                    currentStart = currentStart.AddMonths(1);
                else
                    break;

                currentEnd = currentStart + duration;

                if (currentStart > dto.RecurrenceEnd.Value)
                    break;

                occurrences.Add((currentStart, currentEnd));
                
                // Safety break to prevent infinite loops (max 100 occurrences)
                if (occurrences.Count >= 100) break;
            }
        }

        var recurringGroupId = occurrences.Count > 1 ? Guid.NewGuid() : (Guid?)null;

        // 2. Check for overlaps for ALL occurrences
        var userLevel = user?.PermissionLevel ?? 1;
        var allOverlaps = new List<Booking>();
        var conflictsToReport = new List<ConflictDetailDto>();
        bool canOverrideAll = true;

        foreach (var occ in occurrences)
        {
            var overlaps = (await repo.GetOverlappingBookingsAsync(
                dto.RoomId,
                occ.Start,
                occ.End
            )).ToList();

            foreach (var existing in overlaps)
            {
                if (allOverlaps.Any(o => o.Id == existing.Id)) continue;
                allOverlaps.Add(existing);

                var existingUser = await userRepo.GetUserByIdAsync(existing.UserId);
                var existingLevel = existingUser?.PermissionLevel ?? 1;

                if (userLevel <= existingLevel)
                {
                    canOverrideAll = false;
                }
                
                conflictsToReport.Add(new ConflictDetailDto(
                    existing.Id,
                    existing.StartTime,
                    existing.EndTime,
                    existingUser?.DisplayName ?? "Okänd användare",
                    existingUser?.Email,
                    existingLevel
                ));
            }
        }

        if (allOverlaps.Any())
        {
            if (!canOverrideAll)
            {
                return new BookingCreateResultDto(
                    Success: false,
                    ErrorMessage: $"Konflikt: Rummet är upptaget av en användare med samma eller högre prioritet (din nivå: {userLevel})."
                );
            }

            if (!dto.OverwriteConflicts)
            {
                return new BookingCreateResultDto(
                    ConflictResponse: new BookingConflictResponseDto(
                        true,
                        "Denna bokning kommer att överskriva befintliga bokningar. Bekräfta överskrivning.",
                        conflictsToReport
                    )
                );
            }

            // If we have permission and OverwriteConflicts is true, cancel all overlaps
            foreach (var conflict in allOverlaps)
            {
                await repo.CancelBookingAsync(conflict.Id);
            }
        }

        // 3. Create all bookings in the series
        Booking? firstBooking = null;
        foreach (var occ in occurrences)
        {
            var booking = new Booking
            {
                UserId = dto.UserId,
                RoomId = dto.RoomId,
                StartTime = occ.Start,
                EndTime = occ.End,
                Notes = dto.Notes,
                IsLesson = dto.IsLesson,
                BookerName = dto.BookerName,
                Status = dto.Status != default ? dto.Status : BookingStatus.Active,
                RecurringGroupId = recurringGroupId
            };

            var id = await repo.CreateBookingAsync(booking);
            booking.Id = id;
            if (firstBooking == null) firstBooking = booking;

            // Link classes and auto-invite
            if (dto.ClassIds is { Length: > 0 })
            {
                await classRepo.SetClassesForBookingAsync(id, dto.ClassIds);
                var userIds = await classRepo.GetUserIdsByClassIdsAsync(dto.ClassIds);
                var inviteIds = userIds.Where(uid => uid != dto.UserId);
                await registrationRepo.BulkInviteAsync(id, inviteIds);
            }
        }

        return new BookingCreateResultDto(Booking: firstBooking!);
    }

    /// <summary>
    /// Cancel a booking by setting its status to Cancelled
    /// </summary>
    public async Task<CancelBookingDto> CancelBookingAsync(CancelBookingDto dto)
    {
        await repo.CancelBookingAsync(dto.Id);
        return dto;
    }

    /// <summary>
    /// Get raw booking entity by ID (for internal use)
    /// </summary>
    public async Task<Booking?> GetBookingByIdAsync(long id)
    {
        return await repo.GetBookingByIdAsync(id);
    }

    /// <summary>
    /// Update booking status (e.g., Cancelled, Completed)
    /// </summary>
    public async Task<Booking> UpdateBookingStatusAsync(long id, BookingStatus newStatus)
    {
        var booking = await repo.GetBookingByIdAsync(id);

        if (booking is null)
        {
            throw new KeyNotFoundException($"Booking with ID {id} not found.");
        }
        booking.Status = newStatus;

        await repo.UpdateBookingAsync(id, booking);

        return booking;
    }

    /// <summary>
    /// Get all bookings a user has created (is the host of).
    /// </summary>
    public async Task<IEnumerable<BookingDetailedReadModel>> GetUserOwnedBookingsAsync(long userId)
    {
        return await readModelRepo.GetDetailedBookingsByUserIdAsync(userId);
    }

    // ==========================================
    //  RECURRING SERIES OPERATIONS
    // ==========================================

    /// <summary>
    /// Get all bookings in a recurring series.
    /// </summary>
    public async Task<IEnumerable<Booking>> GetSeriesAsync(Guid recurringGroupId)
    {
        return await repo.GetBookingsByRecurringGroupIdAsync(recurringGroupId);
    }

    /// <summary>
    /// Cancel booking(s) based on scope: Single, ThisAndFollowing, or All in series.
    /// Google Calendar-style: "Denna bokning", "Denna och kommande", "Alla i serien".
    /// </summary>
    public async Task<int> CancelWithScopeAsync(long bookingId, SeriesScope scope)
    {
        var booking = await repo.GetBookingByIdAsync(bookingId)
            ?? throw new KeyNotFoundException($"Booking with ID {bookingId} not found.");

        return scope switch
        {
            SeriesScope.Single =>
                await repo.CancelBookingAsync(bookingId) ? 1 : 0,

            SeriesScope.ThisAndFollowing when booking.RecurringGroupId.HasValue =>
                await repo.CancelFutureBookingsInSeriesAsync(
                    booking.RecurringGroupId.Value,
                    booking.StartTime),

            SeriesScope.All when booking.RecurringGroupId.HasValue =>
                await repo.CancelBookingsByRecurringGroupIdAsync(
                    booking.RecurringGroupId.Value),

            // Not part of a series → just cancel the single booking
            _ => await repo.CancelBookingAsync(bookingId) ? 1 : 0,
        };
    }

    /// <summary>
    /// Update a single booking's details (time, notes, lesson flag).
    /// Re-validates room availability if the time is changed.
    /// </summary>
    public async Task<Booking> UpdateBookingDetailsAsync(long bookingId, UpdateBookingDto dto)
    {
        var booking = await repo.GetBookingByIdAsync(bookingId)
            ?? throw new KeyNotFoundException($"Booking with ID {bookingId} not found.");

        if (dto.StartTime.HasValue) booking.StartTime = dto.StartTime.Value;
        if (dto.EndTime.HasValue) booking.EndTime = dto.EndTime.Value;
        if (dto.Notes is not null) booking.Notes = dto.Notes;
        if (dto.IsLesson.HasValue) booking.IsLesson = dto.IsLesson.Value;

        if (booking.StartTime >= booking.EndTime)
            throw new InvalidOperationException("Start time must be before end time.");

        // Re-validate availability if time changed
        if (dto.StartTime.HasValue || dto.EndTime.HasValue)
        {
            var overlaps = (await repo.GetOverlappingBookingsAsync(
                booking.RoomId,
                booking.StartTime,
                booking.EndTime
            )).Where(b => b.Id != bookingId).ToList();

            if (overlaps.Any())
                throw new InvalidOperationException("Rummet är redan bokat under den nya tiden.");
        }

        await repo.UpdateBookingAsync(bookingId, booking);
        return booking;
    }

    /// <summary>
    /// Detach a single booking from its recurring series so it can be edited independently.
    /// </summary>
    public async Task<Booking> DetachFromSeriesAsync(long bookingId)
    {
        var booking = await repo.GetBookingByIdAsync(bookingId)
            ?? throw new KeyNotFoundException($"Booking with ID {bookingId} not found.");

        booking.RecurringGroupId = null;
        await repo.UpdateBookingAsync(bookingId, booking);
        return booking;
    }

    private static int CalculateMatchScore(
        RoomDetailModel room,
        BookingAvailabilityQueryDto query,
        string[] assetTerms
    )
    {
        var score = 0;
        if (!string.IsNullOrWhiteSpace(query.Campus) && string.Equals(room.CampusCity, query.Campus, StringComparison.OrdinalIgnoreCase))
            score += 30;
        if (query.RoomTypeId.HasValue && room.RoomTypeId == query.RoomTypeId.Value)
            score += 25;
        if (query.MinCapacity.HasValue && room.Capacity.HasValue)
        {
            score += Math.Max(0, 20 - Math.Abs(room.Capacity.Value - query.MinCapacity.Value));
        }

        if (assetTerms.Length > 0)
        {
            var roomAssets = room.Assets ?? [];
            score += assetTerms.Count(term => roomAssets.Any(asset => AssetMatchesTerm(asset, term))) * 10;
        }

        return score;
    }

    private static List<string> BuildMatchReasons(
        RoomDetailModel room,
        BookingAvailabilityQueryDto query,
        string[] assetTerms
    )
    {
        var reasons = new List<string> { room.CampusCity, room.RoomTypeName };
        if (room.Capacity.HasValue)
            reasons.Add($"{room.Capacity.Value} platser");

        if (!string.IsNullOrWhiteSpace(query.Query) && room.Name.Contains(query.Query, StringComparison.OrdinalIgnoreCase))
            reasons.Add("Matchar sökning");

        return reasons.Distinct(StringComparer.OrdinalIgnoreCase).ToList();
    }

    private static bool AssetMatchesTerm(string asset, string term)
    {
        if (string.IsNullOrWhiteSpace(asset) || string.IsNullOrWhiteSpace(term))
            return false;

        var normalizedAsset = asset.Trim();
        var normalizedTerm = term.Trim();

        if (normalizedAsset.Equals(normalizedTerm, StringComparison.OrdinalIgnoreCase))
            return true;

        return Regex.IsMatch(
            normalizedAsset,
            $@"(^|[^\p{{L}}\p{{Nd}}]){Regex.Escape(normalizedTerm)}($|[^\p{{L}}\p{{Nd}}])",
            RegexOptions.IgnoreCase | RegexOptions.CultureInvariant
        );
    }
}
