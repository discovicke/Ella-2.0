namespace Backend.app.Core.Models.DTO;

public record CreateAssetTypeDto(string Description);

public record UpdateAssetTypeDto(string Description);

public record AssetTypeResponseDto(long Id, string Description);
