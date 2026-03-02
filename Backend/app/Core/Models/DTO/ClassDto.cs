using System.ComponentModel.DataAnnotations;
using Backend.app.Core.Validation;

namespace Backend.app.Core.Models.DTO;

public record CreateClassDto([property: MaxLength(InputLimits.ClassName)] string ClassName);

public record UpdateClassDto([property: MaxLength(InputLimits.ClassName)] string ClassName);

public record ClassResponseDto(long Id, string ClassName, List<string>? CampusNames = null);
