using Backend.app.Core.Interfaces;
using Backend.app.Core.Models.DTO;
using Backend.app.Core.Models.Entities;
using Backend.app.Core.Models.Enums;
using Backend.app.Core.Services;
using Backend.Tests.Helpers;
using NSubstitute;
using Xunit;

namespace Backend.Tests.Core.Services;

public class BookingServiceTests
{
    private readonly IBookingRepository _repo = Substitute.For<IBookingRepository>();
    private readonly IBookingReadModelRepository _readModelRepo = Substitute.For<IBookingReadModelRepository>();
    private readonly IUserRepository _userRepo = Substitute.For<IUserRepository>();
    private readonly IRoomRepository _roomRepo = Substitute.For<IRoomRepository>();
    private readonly IClassRepository _classRepo = Substitute.For<IClassRepository>();
    private readonly IRegistrationRepository _registrationRepo = Substitute.For<IRegistrationRepository>();
    private readonly BookingService _sut;

    public BookingServiceTests()
    {
        _sut = new BookingService(
            _repo,
            _readModelRepo,
            _userRepo,
            _roomRepo,
            _classRepo,
            _registrationRepo
        );
    }

    [Fact]
    public async Task CreateBookingAsync_ShouldReturnBooking_WhenValid()
    {
        // Arrange
        var startTime = DateTime.Now.AddHours(1);
        var endTime = DateTime.Now.AddHours(2);
        var dto = new CreateBookingDto(1, 1, startTime, endTime, "Notes", BookingStatus.Active);

        _userRepo.GetUserByIdAsync(1).Returns(TestDataFactory.CreateUser(1));
        _roomRepo.GetRoomByIdAsync(1).Returns(TestDataFactory.CreateRoom(1));
        _repo.GetOverlappingBookingsAsync(1, startTime, endTime).Returns(Enumerable.Empty<Booking>());
        _repo.CreateBookingAsync(Arg.Any<Booking>()).Returns(100);

        // Act
        var result = await _sut.CreateBookingAsync(dto);

        // Assert
        Assert.NotNull(result);
        Assert.Equal(100, result.Id);
    }

    [Fact]
    public async Task CreateBookingAsync_ShouldOverride_WhenNewUserHasHigherPriority()
    {
        // Arrange
        var startTime = DateTime.Now.AddHours(1);
        var endTime = DateTime.Now.AddHours(2);
        var dto = new CreateBookingDto(1, 1, startTime, endTime, null, BookingStatus.Active);

        var higherUser = TestDataFactory.CreateUser(1);
        higherUser.PermissionLevel = 10; // Admin level

        var lowerUser = TestDataFactory.CreateUser(2);
        lowerUser.PermissionLevel = 1; // Student level

        var existingBooking = TestDataFactory.CreateBooking(99, 2, 1);

        _userRepo.GetUserByIdAsync(1).Returns(higherUser);
        _userRepo.GetUserByIdAsync(2).Returns(lowerUser);
        _roomRepo.GetRoomByIdAsync(1).Returns(TestDataFactory.CreateRoom(1));
        _repo.GetOverlappingBookingsAsync(1, startTime, endTime).Returns(new List<Booking> { existingBooking });
        _repo.CreateBookingAsync(Arg.Any<Booking>()).Returns(101);

        // Act
        var result = await _sut.CreateBookingAsync(dto);

        // Assert
        Assert.NotNull(result);
        await _repo.Received(1).CancelBookingAsync(99); 
        await _repo.Received(1).CreateBookingAsync(Arg.Any<Booking>());
    }

    [Fact]
    public async Task CreateBookingAsync_ShouldThrowConflict_WhenConflictingUserHasSameOrHigherPriority()
    {
        // Arrange
        var startTime = DateTime.Now.AddHours(1);
        var endTime = DateTime.Now.AddHours(2);
        var dto = new CreateBookingDto(1, 1, startTime, endTime, null, BookingStatus.Active);

        var user1 = TestDataFactory.CreateUser(1);
        user1.PermissionLevel = 5;

        var user2 = TestDataFactory.CreateUser(2);
        user2.PermissionLevel = 5;

        var existingBooking = TestDataFactory.CreateBooking(99, 2, 1);

        _userRepo.GetUserByIdAsync(1).Returns(user1);
        _userRepo.GetUserByIdAsync(2).Returns(user2);
        _roomRepo.GetRoomByIdAsync(1).Returns(TestDataFactory.CreateRoom(1));
        _repo.GetOverlappingBookingsAsync(1, startTime, endTime).Returns(new List<Booking> { existingBooking });

        // Act & Assert
        var ex = await Assert.ThrowsAsync<InvalidOperationException>(() => _sut.CreateBookingAsync(dto));
        Assert.Contains("samma eller högre prioritet", ex.Message);
    }

    [Fact]
    public async Task CreateBookingAsync_ShouldThrowKeyNotFound_WhenUserDoesNotExist()
    {
        // Arrange
        var dto = new CreateBookingDto(99, 1, DateTime.Now, DateTime.Now.AddHours(1), null, BookingStatus.Active);
        _userRepo.GetUserByIdAsync(99).Returns((User?)null);

        // Act & Assert
        var ex = await Assert.ThrowsAsync<KeyNotFoundException>(() => _sut.CreateBookingAsync(dto));
        Assert.Equal("User with ID 99 not found.", ex.Message);
    }

    [Fact]
    public async Task UpdateBookingStatusAsync_ShouldUpdateStatus_WhenBookingExists()
    {
        // Arrange
        var booking = TestDataFactory.CreateBooking(1);
        _repo.GetBookingByIdAsync(1).Returns(booking);

        // Act
        var result = await _sut.UpdateBookingStatusAsync(1, BookingStatus.Cancelled);

        // Assert
        Assert.Equal(BookingStatus.Cancelled, result.Status);
        await _repo.Received(1).UpdateBookingAsync(1, Arg.Is<Booking>(b => b.Status == BookingStatus.Cancelled));
    }

    [Fact]
    public async Task CancelBookingAsync_ShouldCallRepoCancel()
    {
        // Arrange
        var dto = new CancelBookingDto(1);

        // Act
        await _sut.CancelBookingAsync(dto);

        // Assert
        await _repo.Received(1).CancelBookingAsync(1);
    }
}