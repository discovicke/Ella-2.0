using Backend.app.Core.Interfaces;
using Backend.app.Core.Models;
using Backend.app.Core.Models.DTO;
using Backend.app.Core.Models.Entities;
using Backend.app.Core.Models.Enums;
using Backend.app.Core.Services;
using Backend.Tests.Helpers;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;
using NSubstitute;
using Xunit;

namespace Backend.Tests.Core.Services;

public class AuthServiceTests
{
    private readonly IUserRepository _userRepo = Substitute.For<IUserRepository>();
    private readonly IPermissionRepository _permissionRepo = Substitute.For<IPermissionRepository>();
    private readonly IPasswordHasher _passwordHasher = Substitute.For<IPasswordHasher>();
    private readonly ITokenProvider _tokenProvider = Substitute.For<ITokenProvider>();
    private readonly IEmailService _emailService = Substitute.For<IEmailService>();
    private readonly IConfiguration _configuration = Substitute.For<IConfiguration>();
    private readonly ILogger<AuthService> _logger = Substitute.For<ILogger<AuthService>>();
    private readonly AuthService _sut;

    public AuthServiceTests()
    {
        _sut = new AuthService(
            _userRepo,
            _permissionRepo,
            _passwordHasher,
            _tokenProvider,
            _emailService,
            _configuration,
            _logger
        );
    }

    [Fact]
    public async Task LoginAsync_ShouldReturnSuccessfulResult_WhenCredentialsAreCorrect()
    {
        // Arrange
        var request = new LoginDto { Email = "test@example.com", Password = "password123" };
        var user = TestDataFactory.CreateUser(1, request.Email);
        user.PasswordHash = "hashed_password";
        user.IsActive = true;

        _userRepo.GetUserByEmailAsync(request.Email).Returns(user);
        _passwordHasher.VerifyPassword(request.Password, user.PasswordHash).Returns(true);
        _tokenProvider.GenerateAccessToken(user.Id, user.Email).Returns("fake_jwt_token");
        _permissionRepo.GetEffectivePermissionsAsync(user.Id).Returns(new UserPermissions { UserId = user.Id });

        // Act
        var result = await _sut.LoginAsync(request);

        // Assert
        Assert.NotNull(result.Response);
        Assert.Equal("Login successful", result.Response.Message);
        Assert.Equal("fake_jwt_token", result.Response.Token);
        Assert.Equal(user.Email, result.Response.User.Email);
    }

    [Fact]
    public async Task LoginAsync_ShouldReturnEmptyResult_WhenUserNotFound()
    {
        // Arrange
        var request = new LoginDto { Email = "nonexistent@example.com", Password = "password" };
        _userRepo.GetUserByEmailAsync(request.Email).Returns((User?)null);

        // Act
        var result = await _sut.LoginAsync(request);

        // Assert
        Assert.Null(result.Response);
        Assert.False(result.IsBanned);
    }

    [Fact]
    public async Task LoginAsync_ShouldReturnBannedResult_WhenUserIsBanned()
    {
        // Arrange
        var request = new LoginDto("test@example.com", "password");
        var user = TestDataFactory.CreateUser(1, request.Email);
        user.IsBanned = BannedStatus.Banned;

        _userRepo.GetUserByEmailAsync(request.Email).Returns(user);
        _passwordHasher.VerifyPassword(request.Password, user.PasswordHash).Returns(true);
        _permissionRepo.GetEffectivePermissionsAsync(user.Id).Returns(new UserPermissions { UserId = user.Id });

        // Act
        var result = await _sut.LoginAsync(request);

        // Assert
        Assert.True(result.IsBanned);
        Assert.NotNull(result.Response);
        Assert.Equal("Account suspended", result.Response.Message);
    }

    [Fact]
    public async Task RegisterAsync_ShouldReturnSuccessfulResult_WhenEmailIsUnique()
    {
        // Arrange
        var request = new RegisterDto { Email = "new@example.com", Password = "password", DisplayName = "New User" };
        _userRepo.GetUserByEmailAsync(request.Email).Returns((User?)null);
        _passwordHasher.HashPassword(request.Password).Returns("hashed_pass");
        _userRepo.CreateUserAsync(Arg.Any<User>()).Returns(true);
        
        // Mock the user that is fetched after creation
        var createdUser = TestDataFactory.CreateUser(10, request.Email);
        _userRepo.GetUserByEmailAsync(request.Email).Returns((User?)null, createdUser);

        // Act
        var result = await _sut.RegisterAsync(request);

        // Assert
        Assert.NotNull(result.Response);
        Assert.Equal("Registration successful", result.Response.Message);
        await _userRepo.Received(1).CreateUserAsync(Arg.Is<User>(u => u.Email == request.Email));
    }
}
