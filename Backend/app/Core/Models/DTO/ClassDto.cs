using System.ComponentModel.DataAnnotations;

namespace Backend.app.Core.Models.DTO;

public record CreateClassDto([property: MaxLength(100)] string ClassName);

public record UpdateClassDto([property: MaxLength(100)] string ClassName);

public record ClassResponseDto(long Id, string ClassName, List<string>? CampusNames = null);
