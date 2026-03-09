using Backend.app.Core.Interfaces;
using Backend.app.Core.Models;
using Backend.app.Core.Models.Entities;
using Backend.app.Infrastructure.Repositories.Sqlite;
using Microsoft.Extensions.Logging.Abstractions;
using Xunit;

namespace Backend.Tests.Infrastructure.Repositories;

public class PermissionRepositoryTests : DatabaseTestBase
{
    private readonly IPermissionRepository _sut; // System Under Test

    public PermissionRepositoryTests() : base()
    {
        // Use SQLite implementation for integration tests in this environment
        _sut = new SqlitePermissionRepo(ConnectionFactory, NullLogger<SqlitePermissionRepo>.Instance);
    }

    [Fact]
    [Trait("Category", "Integration")]
    public async Task GetEffectivePermissionsAsync_ShouldReturnPermissions_ForExistingUser()
    {
        // Arrange
        // We use user ID 1 which we know exists from the seed
        long userId = 1;

        // Act
        var result = await _sut.GetEffectivePermissionsAsync(userId);

        // Assert
        Assert.NotNull(result);
        Assert.Equal(userId, result.UserId);
    }

    [Fact]
    [Trait("Category", "Integration")]
    public async Task GetEffectivePermissionsAsync_ShouldReturnNull_ForNonExistentUser()
    {
        // Act
        var result = await _sut.GetEffectivePermissionsAsync(999999);

        // Assert
        Assert.Null(result);
    }

    [Fact]
    [Trait("Category", "Integration")]
    public async Task SetUserOverridesBatchAsync_ShouldUpdatePermissions_Correctly()
    {
        // Arrange
        long userId = 1;
        var overrides = new Dictionary<string, bool>
        {
            { "BookRoom", true },
            { "ManageUsers", false }
        };

        // Act
        await _sut.SetUserOverridesBatchAsync(userId, overrides);
        var result = await _sut.GetEffectivePermissionsAsync(userId);

        // Assert
        Assert.NotNull(result);
        Assert.True(result.BookRoom);
        Assert.False(result.ManageUsers);
    }
}
