using Backend.app.Core.Interfaces;
using Backend.app.Core.Models.DTO;
using Backend.app.Core.Models.Entities;
using Backend.app.Core.Models.Enums;
using Backend.app.Core.Models.ReadModels;

namespace Backend.app.Core.Services;

public class BookingService(
    IBookingRepository repo,
    IBookingReadModelRepository readModelRepo,
    IUserRepository userRepo,
    IRoomRepository roomRepo,
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
    public async Task<Booking> CreateBookingAsync(CreateBookingDto dto)
    {
        // 1. Validation: Existence
        if (await userRepo.GetUserByIdAsync(dto.UserId) is null)
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
                
                // Safety break to prevent infinite loops (max 1 year or 100 occurrences)
                if (occurrences.Count >= 100) break;
            }
        }

        var recurringGroupId = occurrences.Count > 1 ? Guid.NewGuid() : (Guid?)null;
        var createdBookings = new List<Booking>();

        // 2. Check for overlaps for ALL occurrences
        foreach (var occ in occurrences)
        {
            var overlaps = (await repo.GetOverlappingBookingsAsync(
                dto.RoomId,
                occ.Start,
                occ.End
            )).ToList();

            if (overlaps.Any())
            {
                var user = await userRepo.GetUserByIdAsync(dto.UserId);
                var userLevel = user?.PermissionLevel ?? 1;

                bool canOverrideAll = true;
                var conflictingUsers = new List<(long BookingId, int Level)>();

                foreach (var existing in overlaps)
                {
                    var existingUser = await userRepo.GetUserByIdAsync(existing.UserId);
                    var existingLevel = existingUser?.PermissionLevel ?? 1;
                    
                    if (userLevel <= existingLevel)
                    {
                        canOverrideAll = false;
                        break;
                    }
                    conflictingUsers.Add((existing.Id, existingLevel));
                }

                if (canOverrideAll)
                {
                    foreach (var conflict in conflictingUsers)
                    {
                        await repo.CancelBookingAsync(conflict.BookingId);
                    }
                }
                else
                {
                    throw new InvalidOperationException($"Konflikt vid {occ.Start:yyyy-MM-dd HH:mm}: Rummet är upptaget av en användare med samma eller högre prioritet.");
                }
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

        return firstBooking!;
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
}
