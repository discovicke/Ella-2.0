namespace Backend.app.Core.Models.DTO;

public record CreateCampusDto(
    string Street,
    string? Zip,
    string City,
    string Country,
    string? Contact
);

public record UpdateCampusDto(
    string Street,
    string? Zip,
    string City,
    string Country,
    string? Contact
);

public record CampusResponseDto(
    long Id,
    string Street,
    string? Zip,
    string City,
    string Country,
    string? Contact
);
