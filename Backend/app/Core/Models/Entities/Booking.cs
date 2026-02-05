using Backend.app.Core.Enums;

namespace Backend.app.Core.Entities;

public class Booking
{
    // Booking entity matching database schema
    // TODO: Define properties matching Infrastructure/Data/schema.sql bookings table
    // ⚠️ Compare with src/modules/bookings/booking.repo.js for schema differences

    public long Id { get; set; }
    public long UserId { get; set; }
    public long RoomId { get; set; }
    public DateTime StartTime { get; set; }
    public DateTime EndTime { get; set; }
    public BookingStatus Status { get; set; }
    public string? Notes { get; set; }
    public DateTime CreatedAt { get; set; }
    public DateTime? UpdatedAt { get; set; }
}
