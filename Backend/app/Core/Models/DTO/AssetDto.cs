using System.ComponentModel.DataAnnotations;
using Backend.app.Core.Validation;

namespace Backend.app.Core.Models.DTO;

public record CreateAssetTypeDto(
    [property: MaxLength(InputLimits.AssetDescription)] string Description
);

public record UpdateAssetTypeDto(
    [property: MaxLength(InputLimits.AssetDescription)] string Description
);

public record AssetTypeResponseDto(long Id, string Description);
