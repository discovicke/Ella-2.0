using Backend.app.Core.Interfaces;
using Backend.app.Core.Models.DTO;
using Backend.app.Core.Models.Entities;
using Backend.app.Core.Services;
using Backend.app.Infrastructure.Parser;
using Microsoft.Extensions.Logging;
using NSubstitute;
using Xunit;

namespace Backend.Tests.Core.Services;

public class UserImportServiceTests
{
    private readonly UserService _userService = Substitute.For<UserService>(
        Substitute.For<IUserRepository>(),
        Substitute.For<IPermissionRepository>(),
        Substitute.For<IPasswordHasher>(),
        Substitute.For<ILogger<UserService>>()
    );
    private readonly ClassService _classService = Substitute.For<ClassService>(
        Substitute.For<IClassRepository>(), 
        Substitute.For<ILogger<ClassService>>()
    );
    private readonly CampusService _campusService = Substitute.For<CampusService>(
        Substitute.For<ICampusRepository>(), 
        Substitute.For<ILogger<CampusService>>()
    );
    private readonly PermissionTemplateService _permissionService = Substitute.For<PermissionTemplateService>(
        Substitute.For<IPermissionTemplateRepository>(),
        Substitute.For<IPermissionRepository>(),
        Substitute.For<ILogger<PermissionTemplateService>>()
    );
    private readonly IUserRepository _userRepo = Substitute.For<IUserRepository>();
    private readonly IClassRepository _classRepo = Substitute.For<IClassRepository>();
    private readonly IParser<StudentImportDto> _parser = new ExcelContactsCsvParser();
    private readonly ILogger<UserImportService> _logger = Substitute.For<ILogger<UserImportService>>();
    
    private readonly UserImportService _sut;

    public UserImportServiceTests()
    {
        _sut = new UserImportService(
            _userService,
            _classService,
            _campusService,
            _permissionService,
            _userRepo,
            _classRepo,
            _parser,
            _logger
        );
    }

    [Fact]
    public async Task ImportCsvAsync_ShouldCreateUsersAndLinkToClass()
    {
        // Arrange
        var csvContent = "header;header;header;John;Doe;header;header;header;header;john.doe@example.com;header;header;header;Hudiksvall";
        var className = "net25";
        
        var studentId = 10L;
        var classId = 1L;

        _classRepo.GetByNameAsync(className).Returns(new SchoolClass { Id = classId, ClassName = className });
        _campusService.GetAllAsync().Returns(new List<CampusResponseDto>());
        
        _userService.CreateUserAsync(Arg.Any<CreateUserDto>()).Returns(new UserResponseDto(
            studentId, "john.doe@example.com", "John Doe", Backend.app.Core.Models.Enums.BannedStatus.NotBanned, null, 1
        ));

        // Act
        var result = await _sut.ImportCsvAsync(csvContent, className);

        // Assert
        Assert.Equal(1, result.Created);
        await _userRepo.Received(1).SetClassesForUserAsync(studentId, Arg.Is<long[]>(ids => ids.Contains(classId)));
    }

    [Fact]
    public void GenerateDisplayName_ShouldHandleNulls()
    {
        // Arrange
        var student = new StudentImportDto { FirstName = "John", LastName = null, Email = "test@test.com", City = "Gävle", ClassName = "net25" };

        // Act
        var displayName = UserImportService.GenerateDisplayName(student);

        // Assert
        Assert.Equal("John", displayName);
    }

    [Fact]
    public void GeneratePlaceholderPassword_ShouldBeWithinLimit()
    {
        // Arrange
        var student = new StudentImportDto { FirstName = "AVeryLongFirstNameThatShouldNotBreakAnything", LastName = "Doe", Email = "test@test.com", City = "Gävle", ClassName = "net25" };

        // Act
        var password = UserImportService.GeneratePlaceholderPassword(student);

        // Assert
        Assert.True(password.Length <= 128);
        Assert.StartsWith("placeholder-", password);
    }
}