using Backend.app.Core.Models.DTO;
using Backend.app.Core.Services;
using Microsoft.AspNetCore.Mvc;

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
                async (AssetService service) =>
                {
                    var assets = await service.GetAllAsync();
                    return Results.Ok(assets);
                }
            )
            .WithName("GetAssetTypes")
            .WithSummary("Get all asset types")
            .WithDescription("Retrieves a list of all available room asset types (e.g., Whiteboard, Projector).")
            .Produces<IEnumerable<AssetTypeResponseDto>>(StatusCodes.Status200OK);

        // GET /api/assets/{id}
        group
            .MapGet(
                "/{id}",
                async (long id, AssetService service) =>
                {
                    var asset = await service.GetByIdAsync(id);
                    return Results.Ok(asset);
                }
            )
            .WithName("GetAssetTypeById")
            .WithSummary("Get asset type by ID")
            .Produces<AssetTypeResponseDto>(StatusCodes.Status200OK)
            .Produces(StatusCodes.Status404NotFound);

        // POST /api/assets
        group
            .MapPost(
                "/",
                async (CreateAssetTypeDto dto, AssetService service) =>
                {
                    if (string.IsNullOrWhiteSpace(dto.Description))
                    {
                        return Results.BadRequest("Description is required.");
                    }

                    var created = await service.CreateAsync(dto);
                    return Results.Created($"/api/assets/{created.Id}", created);
                }
            )
            .WithName("CreateAssetType")
            .WithSummary("Create a new asset type")
            .Accepts<CreateAssetTypeDto>("application/json")
            .Produces<AssetTypeResponseDto>(StatusCodes.Status201Created)
            .Produces(StatusCodes.Status400BadRequest);

        // PUT /api/assets/{id}
        group
            .MapPut(
                "/{id}",
                async (long id, UpdateAssetTypeDto dto, AssetService service) =>
                {
                    if (string.IsNullOrWhiteSpace(dto.Description))
                    {
                        return Results.BadRequest("Description is required.");
                    }

                    await service.UpdateAsync(id, dto);
                    return Results.NoContent();
                }
            )
            .WithName("UpdateAssetType")
            .WithSummary("Update an asset type")
            .Accepts<UpdateAssetTypeDto>("application/json")
            .Produces(StatusCodes.Status204NoContent)
            .Produces(StatusCodes.Status400BadRequest)
            .Produces(StatusCodes.Status404NotFound);

        // DELETE /api/assets/{id}
        group
            .MapDelete(
                "/{id}",
                async (long id, AssetService service) =>
                {
                    await service.DeleteAsync(id);
                    return Results.NoContent();
                }
            )
            .WithName("DeleteAssetType")
            .WithSummary("Delete an asset type")
            .Produces(StatusCodes.Status204NoContent)
            .Produces(StatusCodes.Status404NotFound);

        return group;
    }
}
