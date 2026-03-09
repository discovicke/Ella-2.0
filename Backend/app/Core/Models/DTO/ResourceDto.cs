namespace Backend.app.Core.Models.DTO;

public record ResourceCategoryDto(long Id, string Name);
public record CreateResourceCategoryDto(string Name);

public record ResourceResponseDto(
    long Id,
    long CategoryId,
    string CategoryName,
    long CampusId,
    string CampusCity,
    string Name,
    string? Description,
    bool IsActive
);

public record CreateResourceDto(
    long CategoryId,
    long CampusId,
    string Name,
    string? Description
);

public record ResourceBookingResponseDto(
    long Id,
    long ResourceId,
    string ResourceName,
    long UserId,
    string UserName,
    DateTime StartTime,
    DateTime EndTime,
    string? Notes
);

public record CreateResourceBookingDto(
    long ResourceId,
    DateTime StartTime,
    DateTime EndTime,
    string? Notes
);