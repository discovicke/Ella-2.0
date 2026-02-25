namespace Backend.app.Core.Models.DTO;

public record CreateClassDto(string ClassName);

public record UpdateClassDto(string ClassName);

public record ClassResponseDto(long Id, string ClassName, List<string>? CampusNames = null);
