using System.ComponentModel.DataAnnotations;

namespace Backend.app.Core.Models.DTO;

public record CreateAssetTypeDto(
    [property: MaxLength(100)] string Description
);

public record UpdateAssetTypeDto(
    [property: MaxLength(100)] string Description
);

public record AssetTypeResponseDto(long Id, string Description);
