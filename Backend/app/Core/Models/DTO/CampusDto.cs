using System.ComponentModel.DataAnnotations;
using Backend.app.Core.Validation;

namespace Backend.app.Core.Models.DTO;

public record CreateCampusDto(
    [property: MaxLength(InputLimits.CampusStreet)] string Street,
    [property: MaxLength(InputLimits.CampusZip)] string? Zip,
    [property: MaxLength(InputLimits.CampusCity)] string City,
    [property: MaxLength(InputLimits.CampusCountry)] string Country,
    [property: MaxLength(InputLimits.CampusContact)] string? Contact
);

public record UpdateCampusDto(
    [property: MaxLength(InputLimits.CampusStreet)] string Street,
    [property: MaxLength(InputLimits.CampusZip)] string? Zip,
    [property: MaxLength(InputLimits.CampusCity)] string City,
    [property: MaxLength(InputLimits.CampusCountry)] string Country,
    [property: MaxLength(InputLimits.CampusContact)] string? Contact
);

public record CampusResponseDto(
    long Id,
    string Street,
    string? Zip,
    string City,
    string Country,
    string? Contact
);
