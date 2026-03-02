using System.ComponentModel.DataAnnotations;

namespace Backend.app.Core.Models.DTO;

public record CreateCampusDto(
    [property: MaxLength(150)] string Street,
    [property: MaxLength(20)] string? Zip,
    [property: MaxLength(100)] string City,
    [property: MaxLength(100)] string Country,
    [property: MaxLength(150)] string? Contact
);

public record UpdateCampusDto(
    [property: MaxLength(150)] string Street,
    [property: MaxLength(20)] string? Zip,
    [property: MaxLength(100)] string City,
    [property: MaxLength(100)] string Country,
    [property: MaxLength(150)] string? Contact
);

public record CampusResponseDto(
    long Id,
    string Street,
    string? Zip,
    string City,
    string Country,
    string? Contact
);
