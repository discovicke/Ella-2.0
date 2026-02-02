using System;
using Backend.app.Core.Enums;

namespace Backend.app.Core.Models;

public class Booking
{
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
