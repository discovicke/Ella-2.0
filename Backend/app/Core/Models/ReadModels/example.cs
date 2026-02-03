namespace Backend.app.Core.ReadModels;

/// <summary>
/// A flat record matching the result of joining the Bookings, Rooms, and Users tables.
/// </summary>
public record BookingDetailsReadModel(
    int BookingId,
    DateTime StartTime,
    DateTime EndTime,
    int Status,
    string? Notes,
    // Joined from Rooms table
    int RoomId,
    string RoomName,
    // Joined from Users table
    int HostId,
    string HostName
);
