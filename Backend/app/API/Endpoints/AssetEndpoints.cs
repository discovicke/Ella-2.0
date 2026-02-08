using Backend.app.Core.Models.Entities;
using Backend.app.Core.Services;

namespace Backend.app.API.Endpoints;

public static class AssetEndpoints
{
    public static RouteGroupBuilder MapAssetEndpoints(this IEndpointRouteBuilder app)
    {
        var group = app.MapGroup("/assets").WithTags("Assets");

        // GET /api/assets
        group
            .MapGet(
                "/",
                async (RoomService service) =>
                {
                    var assets = await service.GetAssetTypesAsync();
                    return Results.Ok(assets);
                }
            )
            .WithName("GetAssetTypes")
            .WithSummary("Get all asset types")
            .WithDescription("Retrieves a list of all available room asset types (e.g., Whiteboard, Projector).")
            .Produces<IEnumerable<AssetType>>(StatusCodes.Status200OK);

        return group;
    }
}
