using Backend.app.Core.Models.Enums;

namespace Backend.app.Core.Models.ReadModels;

/// <summary>
/// Read model for detailed booking information with enriched data from joins.
/// Maps to the v_bookings_detailed view in the database.
/// </summary>
public record BookingDetailedReadModel
{
    public long BookingId { get; init; }
    public long UserId { get; init; }
    public string? UserName { get; init; }
    public string? UserEmail { get; init; }
    public long RoomId { get; init; }
    public string? RoomName { get; init; }
    public int? RoomCapacity { get; init; }
    public string? RoomType { get; init; }
    public string? RoomFloor { get; init; }
    public string? CampusCity { get; init; }
    public DateTime StartTime { get; init; }
    public DateTime EndTime { get; init; }
    public BookingStatus Status { get; init; }
    public string? Notes { get; init; }
    public string? BookerName { get; init; }
    public DateTime CreatedAt { get; init; }
    public DateTime? UpdatedAt { get; init; }
    public int RegistrationCount { get; init; }
    public string? RoomAssets { get; init; }
}
