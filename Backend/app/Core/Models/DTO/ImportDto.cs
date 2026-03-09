namespace Backend.app.Core.Models.DTO;

public record ImportUsersResponseDto(
    int TotalRows,
    int Created,
    int Skipped,
    long ClassId,
    string ClassName,
    List<string> Errors
);

