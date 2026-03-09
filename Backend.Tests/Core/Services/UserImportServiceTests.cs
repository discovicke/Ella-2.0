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
    // Mocks for dependencies
    private readonly IUserRepository _userRepo = Substitute.For<IUserRepository>();
    private readonly IPermissionRepository _permissionRepo = Substitute.For<IPermissionRepository>();
    private readonly IPasswordHasher _passwordHasher = Substitute.For<IPasswordHasher>();
    private readonly ITokenProvider _tokenProvider = Substitute.For<ITokenProvider>();
    private readonly IClassRepository _classRepo = Substitute.For<IClassRepository>();
    private readonly ICampusRepository _campusRepo = Substitute.For<ICampusRepository>();
    private readonly IPermissionTemplateRepository _templateRepo = Substitute.For<IPermissionTemplateRepository>();
    private readonly IParser<StudentImportDto> _parser = new ExcelContactsCsvParser();
    private readonly ILogger<UserImportService> _importLogger = Substitute.For<ILogger<UserImportService>>();
    private readonly ILogger<UserService> _userLogger = Substitute.For<ILogger<UserService>>();
    private readonly ILogger<ClassService> _classLogger = Substitute.For<ILogger<ClassService>>();
    private readonly ILogger<CampusService> _campusLogger = Substitute.For<ILogger<CampusService>>();
    private readonly ILogger<PermissionTemplateService> _templateLogger = Substitute.For<ILogger<PermissionTemplateService>>();

    // Real services with mocked dependencies
    private readonly UserService _userService;
    private readonly ClassService _classService;
    private readonly CampusService _campusService;
    private readonly PermissionTemplateService _permissionService;
    private readonly UserImportService _sut;

    public UserImportServiceTests()
    {
        _userService = new UserService(_userRepo, _permissionRepo, _templateRepo, _passwordHasher, _userLogger);
        _classService = new ClassService(_classRepo, _classLogger);
        _campusService = new CampusService(_campusRepo, _campusLogger);
        _permissionService = new PermissionTemplateService(_templateRepo, _permissionRepo, _templateLogger);

        _sut = new UserImportService(
            _userService,
            _classService,
            _campusService,
            _permissionService,
            _userRepo,
            _classRepo,
            _parser,
            _importLogger
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
        _campusRepo.GetAllAsync().Returns(new List<Campus>());
        
        // Mock password hashing
        _passwordHasher.HashPassword(Arg.Any<string>()).Returns("hashed_password");
        
        // Mock DB creation — first call returns null (dupe check), second returns created user
        _userRepo.GetUserByEmailAsync("john.doe@example.com").Returns(
            (User?)null,
            new User { 
                Id = studentId, 
                Email = "john.doe@example.com", 
                PasswordHash = "hashed_password",
                DisplayName = "John Doe"
            }
        );
        _userRepo.CreateUserAsync(Arg.Any<User>()).Returns(true);
        
        // Mock permission template lookup (CreateUserAsync assigns default "User" template)
        _templateRepo.GetAllAsync().Returns(new List<PermissionTemplateDto>());

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