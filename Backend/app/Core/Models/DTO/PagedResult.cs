namespace Backend.app.Core.Models.DTO;

/// <summary>
/// Generic wrapper for paginated API responses.
/// </summary>
public record PagedResult<T>(
    IEnumerable<T> Items,
    int TotalCount,
    int Page,
    int PageSize
);
