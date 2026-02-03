using Backend.app.Core.Enums;

namespace Backend.app.Core.Entities;

public class Booking
{
    // Booking entity matching database schema
    // TODO: Define properties matching Infrastructure/Data/schema.sql bookings table
    // ⚠️ Compare with src/modules/bookings/booking.repo.js for schema differences
    
    public int Id { get; private set; }
    public int UserId { get; private set; }
    public int RoomId { get; private set; }
    public DateTime StartTime { get; private set; }
    public DateTime EndTime { get; private set; }
    public BookingStatus Status { get; private set; }
    public string? Notes { get; private set; }
    public DateTime CreatedAt { get; private set; }
    public DateTime? UpdatedAt { get; private set; }
}
