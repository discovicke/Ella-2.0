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

        // 2. Check for overlaps
        var overlaps = (await repo.GetOverlappingBookingsAsync(
            dto.RoomId,
            dto.StartTime,
            dto.EndTime
        )).ToList();

        if (overlaps.Any())
        {
            if (dto.IsLesson)
            {
                // Lesson priority logic: Can only override private bookings
                var lessonConflicts = overlaps.Where(b => b.IsLesson).ToList();
                if (lessonConflicts.Any())
                {
                    throw new InvalidOperationException("Cannot book lesson: Room is already occupied by another lesson.");
                }

                // Automatically cancel the private bookings that were in the way
                foreach (var privateBooking in overlaps)
                {
                    await repo.CancelBookingAsync(privateBooking.Id);
                    // TODO: In a real app, we would notify the users here
                }
            }
            else
            {
                // Private booking logic: Cannot override anything
                throw new InvalidOperationException("Cannot create private booking: Room is already occupied.");
            }
        }

        // 3. Create the booking
        var booking = new Booking
        {
            UserId = dto.UserId,
            RoomId = dto.RoomId,
            StartTime = dto.StartTime,
            EndTime = dto.EndTime,
            Notes = dto.Notes,
            IsLesson = dto.IsLesson,
            BookerName = dto.BookerName,
            Status = dto.Status != default ? dto.Status : BookingStatus.Active,
        };



        var id = await repo.CreateBookingAsync(booking);
        booking.Id = id;

        // Link classes and auto-invite class members if classIds provided
        if (dto.ClassIds is { Length: > 0 })
        {
            await classRepo.SetClassesForBookingAsync(id, dto.ClassIds);
            var userIds = await classRepo.GetUserIdsByClassIdsAsync(dto.ClassIds);
            // Exclude the booking owner from auto-invites
            var inviteIds = userIds.Where(uid => uid != dto.UserId);
            await registrationRepo.BulkInviteAsync(id, inviteIds);
        }

        return booking;
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
}
