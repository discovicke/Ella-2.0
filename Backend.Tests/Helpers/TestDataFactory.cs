using Backend.app.Core.Models.Entities;
using Backend.app.Core.Models.Enums;

namespace Backend.Tests.Helpers;

public static class TestDataFactory
{
    public static User CreateUser(long id = 1, string email = "test@example.com") => new()
    {
        Id = id,
        Email = email,
        PasswordHash = "fake-hash",
        DisplayName = "Test User"
    };

    public static Room CreateRoom(long id = 1, string name = "Test Room") => new()
    {
        Id = id,
        Name = name,
        CampusId = 1,
        RoomTypeId = 1
    };

    public static Booking CreateBooking(long id = 1, long userId = 1, long roomId = 1) => new()
    {
        Id = id,
        UserId = userId,
        RoomId = roomId,
        StartTime = DateTime.Now.AddHours(1),
        EndTime = DateTime.Now.AddHours(2),
        Status = BookingStatus.Active
    };
}
