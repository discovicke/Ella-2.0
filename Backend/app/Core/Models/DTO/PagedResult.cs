namespace Backend.app.Core.Models.DTO;

/// <summary>
/// Generic wrapper for paginated API responses.
/// </summary>
public record PagedResult<T>(IEnumerable<T> Items, int TotalCount, int Page, int PageSize);

/// <summary>
/// Wrapper for group-aware paginated API responses.
/// Page/GroupsPerPage refer to groups, not individual items.
/// </summary>
public record GroupedPagedResult<T>(
    IEnumerable<T> Items,
    int TotalGroups,
    int TotalItemCount,
    int Page,
    int GroupsPerPage
);
