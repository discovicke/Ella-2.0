using Backend.app.Core.Models.DTO;
using Backend.app.Core.Services;
using Backend.app.Infrastructure.Auth;
using Backend.app.Core.Models.Enums;
using Microsoft.AspNetCore.Mvc;

namespace Backend.app.API.Endpoints;

public static class AssetEndpoints
{
    public static RouteGroupBuilder MapAssetEndpoints(this IEndpointRouteBuilder app)
    {
        var group = app.MapGroup("/assets")
            .WithTags("Assets")
            .RequireAuth();

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
            .WithDescription("Retrieves a list of all available room asset types (e.g., Whiteboard, Projector).\n\n🔒 **Authentication Required**")
            .Produces<IEnumerable<AssetTypeResponseDto>>(StatusCodes.Status200OK)
            .Produces(StatusCodes.Status401Unauthorized);

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
            .WithDescription("Retrieves a specific asset type by its unique identifier.\n\n🔒 **Authentication Required**") // Added description
            .Produces<AssetTypeResponseDto>(StatusCodes.Status200OK)
            .Produces(StatusCodes.Status404NotFound)
            .Produces(StatusCodes.Status401Unauthorized);

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
            .RequireRoles(UserRole.Admin)
            .WithName("CreateAssetType")
            .WithSummary("Create a new asset type")
            .WithDescription("Creates a new asset type.\n\n🔒 **Authentication Required**\n🔑 **Role Required:** Admin") // Added description
            .Accepts<CreateAssetTypeDto>("application/json")
            .Produces<AssetTypeResponseDto>(StatusCodes.Status201Created)
            .Produces(StatusCodes.Status400BadRequest)
            .Produces(StatusCodes.Status401Unauthorized)
            .Produces(StatusCodes.Status403Forbidden);

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
            .RequireRoles(UserRole.Admin)
            .WithName("UpdateAssetType")
            .WithSummary("Update an asset type")
            .WithDescription("Updates an existing asset type.\n\n🔒 **Authentication Required**\n🔑 **Role Required:** Admin") // Added description
            .Accepts<UpdateAssetTypeDto>("application/json")
            .Produces(StatusCodes.Status204NoContent)
            .Produces(StatusCodes.Status400BadRequest)
            .Produces(StatusCodes.Status404NotFound)
            .Produces(StatusCodes.Status401Unauthorized)
            .Produces(StatusCodes.Status403Forbidden);

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
            .RequireRoles(UserRole.Admin)
            .WithName("DeleteAssetType")
            .WithSummary("Delete an asset type")
            .WithDescription("Permanently deletes an asset type.\n\n🔒 **Authentication Required**\n🔑 **Role Required:** Admin") // Added description
            .Produces(StatusCodes.Status204NoContent)
            .Produces(StatusCodes.Status404NotFound)
            .Produces(StatusCodes.Status401Unauthorized)
            .Produces(StatusCodes.Status403Forbidden);

        return group;
    }
}
