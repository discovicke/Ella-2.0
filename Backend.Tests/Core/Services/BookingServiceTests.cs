using Backend.app.Core.Interfaces;
using Backend.app.Core.Models.DTO;
using Backend.app.Core.Models.Entities;
using Backend.app.Core.Models.Enums;
using Backend.app.Core.Services;
using Backend.Tests.Helpers;
using FluentAssertions;
using NSubstitute;
using Xunit;

namespace Backend.Tests.Core.Services;

public class BookingServiceTests
{
    private readonly IBookingRepository _repo = Substitute.For<IBookingRepository>();
    private readonly IBookingReadModelRepository _readModelRepo = Substitute.For<IBookingReadModelRepository>();
    private readonly IUserRepository _userRepo = Substitute.For<IUserRepository>();
    private readonly IRoomRepository _roomRepo = Substitute.For<IRoomRepository>();
    private readonly BookingService _sut;

    public BookingServiceTests()
    {
        _sut = new BookingService(_repo, _readModelRepo, _userRepo, _roomRepo);
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
        result.Should().NotBeNull();
        result!.Id.Should().Be(100);
    }

    [Fact]
    public async Task CreateBookingAsync_ShouldSetIsLesson_WhenRequested()
    {
        // Arrange
        var startTime = DateTime.Now.AddHours(1);
        var endTime = DateTime.Now.AddHours(2);
        var dto = new CreateBookingDto(1, 1, startTime, endTime, null, BookingStatus.Active, IsLesson: true);

        _userRepo.GetUserByIdAsync(1).Returns(TestDataFactory.CreateUser(1));
        _roomRepo.GetRoomByIdAsync(1).Returns(TestDataFactory.CreateRoom(1));
        _repo.GetOverlappingBookingsAsync(1, startTime, endTime).Returns(Enumerable.Empty<Booking>());

        // Act
        var result = await _sut.CreateBookingAsync(dto);

        // Assert
        result.Should().NotBeNull();
        result!.IsLesson.Should().BeTrue();
        await _repo.Received(1).CreateBookingAsync(Arg.Is<Booking>(b => b.IsLesson == true));
    }

    [Fact]
    public async Task CreateBookingAsync_ShouldThrowKeyNotFound_WhenUserDoesNotExist()
    {
        // Arrange
        var dto = new CreateBookingDto(99, 1, DateTime.Now, DateTime.Now.AddHours(1), null, BookingStatus.Active);
        _userRepo.GetUserByIdAsync(99).Returns((User?)null);

        // Act & Assert
        var act = () => _sut.CreateBookingAsync(dto);
        await act.Should().ThrowAsync<KeyNotFoundException>().WithMessage("User with ID 99 not found.");
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
        result.Status.Should().Be(BookingStatus.Cancelled);
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
