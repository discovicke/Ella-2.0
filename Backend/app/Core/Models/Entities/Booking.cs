using Backend.app.Core.Models.Enums;

namespace Backend.app.Core.Models.Entities;

public class Booking
{
    // Booking entity matching database schema
    // ⚠️ Compare with src/modules/bookings/booking.repo.js for schema differences

    public long Id { get; set; }
    public long UserId { get; set; }
    public long RoomId { get; set; }
    public DateTime StartTime { get; set; }
    public DateTime EndTime { get; set; }
    public BookingStatus Status { get; set; }
    public bool IsLesson { get; set; }
    public string? Notes { get; set; }
    public string? BookerName { get; set; } // for booking form submissions without auth
    public Guid? RecurringGroupId { get; set; }
    public DateTime CreatedAt { get; set; }
    public DateTime? UpdatedAt { get; set; }
}
