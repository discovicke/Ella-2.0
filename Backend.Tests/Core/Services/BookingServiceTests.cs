using Backend.app.Core.Interfaces;
using Backend.app.Core.Models.DTO;
using Backend.app.Core.Models.Entities;
using Backend.app.Core.Models.Enums;
using Backend.app.Core.Services;
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
    private readonly BookingService _sut; // System Under Test

    public BookingServiceTests()
    {
        _sut = new BookingService(_repo, _readModelRepo, _userRepo, _roomRepo);
    }

    [Fact]
    public async Task CreateBookingAsync_ShouldReturnBooking_WhenInputIsValidAndNoOverlaps()
    {
        // Arrange
        var startTime = DateTime.Now.AddHours(1);
        var endTime = DateTime.Now.AddHours(2);
        var dto = new CreateBookingDto(1, 1, startTime, endTime, "Test Booking", BookingStatus.Active);

        _userRepo.GetUserByIdAsync(dto.UserId).Returns(new User { Id = dto.UserId, Email = "test@test.com", PasswordHash = "hash" });
        _roomRepo.GetRoomByIdAsync(dto.RoomId).Returns(new Room { Id = dto.RoomId, Name = "Test Room" });
        _repo.GetOverlappingBookingsAsync(dto.RoomId, dto.StartTime, dto.EndTime)
            .Returns(Enumerable.Empty<Booking>());
        _repo.CreateBookingAsync(Arg.Any<Booking>()).Returns(100);

        // Act
        var result = await _sut.CreateBookingAsync(dto);

        // Assert
        result.Should().NotBeNull();
        result!.Id.Should().Be(100);
        result.UserId.Should().Be(dto.UserId);
        result.RoomId.Should().Be(dto.RoomId);
        
        await _repo.Received(1).CreateBookingAsync(Arg.Is<Booking>(b => 
            b.UserId == dto.UserId && 
            b.RoomId == dto.RoomId &&
            b.StartTime == dto.StartTime &&
            b.EndTime == dto.EndTime));
    }

    [Fact]
    public async Task CreateBookingAsync_ShouldReturnNull_WhenBookingOverlaps()
    {
        // Arrange
        var startTime = DateTime.Now.AddHours(1);
        var endTime = DateTime.Now.AddHours(2);
        var dto = new CreateBookingDto(1, 1, startTime, endTime, null, BookingStatus.Active);

        _userRepo.GetUserByIdAsync(dto.UserId).Returns(new User { Id = dto.UserId, Email = "test@test.com", PasswordHash = "hash" });
        _roomRepo.GetRoomByIdAsync(dto.RoomId).Returns(new Room { Id = dto.RoomId, Name = "Test Room" });
        
        // Mocking an overlap
        _repo.GetOverlappingBookingsAsync(dto.RoomId, dto.StartTime, dto.EndTime)
            .Returns(new List<Booking> { new Booking { Id = 99 } });

        // Act
        var result = await _sut.CreateBookingAsync(dto);

        // Assert
        result.Should().BeNull();
        await _repo.DidNotReceive().CreateBookingAsync(Arg.Any<Booking>());
    }
}
