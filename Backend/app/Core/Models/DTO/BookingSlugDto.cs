namespace Backend.app.Core.Models.DTO;

public record CreateBookingSlugDto(long UserId);

public record BookingSlugResponseDto(
    long Id,
    long UserId,
    string UserDisplayName,
    string Slug,
    bool IsActive,
    DateTime CreatedAt,
    string BookingUrl
);

public record BookingSlugQuickInfoDto(
    string UserDisplayName,
    long UserId
);