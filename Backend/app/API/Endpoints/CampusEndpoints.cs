using Backend.app.Core.Models.DTO;
using Backend.app.Core.Services;
using Backend.app.Infrastructure.Auth;
using Microsoft.AspNetCore.Mvc;

namespace Backend.app.API.Endpoints;

public static class CampusEndpoints
{
    public static RouteGroupBuilder MapCampusEndpoints(this IEndpointRouteBuilder app)
    {
        var group = app.MapGroup("/campuses").WithTags("Campuses").RequireAuth();

        // GET /api/campuses
        group
            .MapGet(
                "/",
                async (CampusService service) =>
                {
                    var campuses = await service.GetAllAsync();
                    return Results.Ok(campuses);
                }
            )
            .WithName("GetCampuses")
            .WithSummary("Get all campuses")
            .WithDescription(
                "Retrieves a list of all campuses.\n\n🔒 **Authentication Required**"
            )
            .Produces<IEnumerable<CampusResponseDto>>(StatusCodes.Status200OK)
            .Produces(StatusCodes.Status401Unauthorized);

        // GET /api/campuses/{id}
        group
            .MapGet(
                "/{id}",
                async (long id, CampusService service) =>
                {
                    var campus = await service.GetByIdAsync(id);
                    return Results.Ok(campus);
                }
            )
            .WithName("GetCampusById")
            .WithSummary("Get campus by ID")
            .WithDescription(
                "Retrieves a specific campus by its unique identifier.\n\n🔒 **Authentication Required**"
            )
            .Produces<CampusResponseDto>(StatusCodes.Status200OK)
            .Produces(StatusCodes.Status404NotFound)
            .Produces(StatusCodes.Status401Unauthorized);

        // POST /api/campuses
        group
            .MapPost(
                "/",
                async (CreateCampusDto dto, CampusService service) =>
                {
                    if (string.IsNullOrWhiteSpace(dto.City) || string.IsNullOrWhiteSpace(dto.Street) || string.IsNullOrWhiteSpace(dto.Country))
                    {
                        return Results.BadRequest("Street, City, and Country are required.");
                    }

                    var created = await service.CreateAsync(dto);
                    return Results.Created($"/api/campuses/{created.Id}", created);
                }
            )
            .RequirePermission("ManageCampuses")
            .WithName("CreateCampus")
            .WithSummary("Create a new campus")
            .WithDescription(
                "Creates a new campus.\n\n🔒 **Authentication Required**\n🔑 **Requires manageCampuses permission**"
            )
            .Accepts<CreateCampusDto>("application/json")
            .Produces<CampusResponseDto>(StatusCodes.Status201Created)
            .Produces(StatusCodes.Status400BadRequest)
            .Produces(StatusCodes.Status401Unauthorized)
            .Produces(StatusCodes.Status403Forbidden);

        // PUT /api/campuses/{id}
        group
            .MapPut(
                "/{id}",
                async (long id, UpdateCampusDto dto, CampusService service) =>
                {
                    if (string.IsNullOrWhiteSpace(dto.City) || string.IsNullOrWhiteSpace(dto.Street) || string.IsNullOrWhiteSpace(dto.Country))
                    {
                        return Results.BadRequest("Street, City, and Country are required.");
                    }

                    await service.UpdateAsync(id, dto);
                    return Results.NoContent();
                }
            )
            .RequirePermission("ManageCampuses")
            .WithName("UpdateCampus")
            .WithSummary("Update a campus")
            .WithDescription(
                "Updates an existing campus.\n\n🔒 **Authentication Required**\n🔑 **Requires manageCampuses permission**"
            )
            .Accepts<UpdateCampusDto>("application/json")
            .Produces(StatusCodes.Status204NoContent)
            .Produces(StatusCodes.Status400BadRequest)
            .Produces(StatusCodes.Status404NotFound)
            .Produces(StatusCodes.Status401Unauthorized)
            .Produces(StatusCodes.Status403Forbidden);

        // DELETE /api/campuses/{id}
        group
            .MapDelete(
                "/{id}",
                async (long id, CampusService service) =>
                {
                    await service.DeleteAsync(id);
                    return Results.NoContent();
                }
            )
            .RequirePermission("ManageCampuses")
            .WithName("DeleteCampus")
            .WithSummary("Delete a campus")
            .WithDescription(
                "Permanently deletes a campus.\n\n🔒 **Authentication Required**\n🔑 **Requires manageCampuses permission**"
            )
            .Produces(StatusCodes.Status204NoContent)
            .Produces(StatusCodes.Status404NotFound)
            .Produces(StatusCodes.Status401Unauthorized)
            .Produces(StatusCodes.Status403Forbidden);

        return group;
    }
}
