using Backend.app.Core.Models.DTO;
using Backend.app.Core.Services;
using Backend.app.Infrastructure.Auth;
using Microsoft.AspNetCore.Mvc;

namespace Backend.app.API.Endpoints;

public static class ClassEndpoints
{
    public static RouteGroupBuilder MapClassEndpoints(this IEndpointRouteBuilder app)
    {
        var group = app.MapGroup("/classes").WithTags("Classes").RequireAuth();

        // GET /api/classes
        group
            .MapGet(
                "/",
                async (ClassService service) =>
                {
                    var classes = await service.GetAllAsync();
                    return Results.Ok(classes);
                }
            )
            .WithName("GetClasses")
            .WithSummary("Get all classes")
            .WithDescription("Retrieves a list of all classes.\n\n🔒 **Authentication Required**")
            .Produces<IEnumerable<ClassResponseDto>>(StatusCodes.Status200OK)
            .Produces(StatusCodes.Status401Unauthorized);

        // GET /api/classes/{id}
        group
            .MapGet(
                "/{id}",
                async (long id, ClassService service) =>
                {
                    var cls = await service.GetByIdAsync(id);
                    return Results.Ok(cls);
                }
            )
            .WithName("GetClassById")
            .WithSummary("Get class by ID")
            .WithDescription(
                "Retrieves a specific class by its unique identifier.\n\n🔒 **Authentication Required**"
            )
            .Produces<ClassResponseDto>(StatusCodes.Status200OK)
            .Produces(StatusCodes.Status404NotFound)
            .Produces(StatusCodes.Status401Unauthorized);

        // POST /api/classes
        group
            .MapPost(
                "/",
                async (CreateClassDto dto, ClassService service) =>
                {
                    if (string.IsNullOrWhiteSpace(dto.ClassName))
                    {
                        return Results.BadRequest("ClassName is required.");
                    }

                    var created = await service.CreateAsync(dto);
                    return Results.Created($"/api/classes/{created.Id}", created);
                }
            )
            .RequirePermission("ManageClasses")
            .WithName("CreateClass")
            .WithSummary("Create a new class")
            .WithDescription(
                "Creates a new class.\n\n🔒 **Authentication Required**\n🔑 **Requires manageClasses permission**"
            )
            .Accepts<CreateClassDto>("application/json")
            .Produces<ClassResponseDto>(StatusCodes.Status201Created)
            .Produces(StatusCodes.Status400BadRequest)
            .Produces(StatusCodes.Status401Unauthorized)
            .Produces(StatusCodes.Status403Forbidden);

        // PUT /api/classes/{id}
        group
            .MapPut(
                "/{id}",
                async (long id, UpdateClassDto dto, ClassService service) =>
                {
                    if (string.IsNullOrWhiteSpace(dto.ClassName))
                    {
                        return Results.BadRequest("ClassName is required.");
                    }

                    await service.UpdateAsync(id, dto);
                    return Results.NoContent();
                }
            )
            .RequirePermission("ManageClasses")
            .WithName("UpdateClass")
            .WithSummary("Update a class")
            .WithDescription(
                "Updates an existing class.\n\n🔒 **Authentication Required**\n🔑 **Requires manageClasses permission**"
            )
            .Accepts<UpdateClassDto>("application/json")
            .Produces(StatusCodes.Status204NoContent)
            .Produces(StatusCodes.Status400BadRequest)
            .Produces(StatusCodes.Status404NotFound)
            .Produces(StatusCodes.Status401Unauthorized)
            .Produces(StatusCodes.Status403Forbidden);

        // DELETE /api/classes/{id}
        group
            .MapDelete(
                "/{id}",
                async (long id, ClassService service) =>
                {
                    await service.DeleteAsync(id);
                    return Results.NoContent();
                }
            )
            .RequirePermission("ManageClasses")
            .WithName("DeleteClass")
            .WithSummary("Delete a class")
            .WithDescription(
                "Permanently deletes a class.\n\n🔒 **Authentication Required**\n🔑 **Requires manageClasses permission**"
            )
            .Produces(StatusCodes.Status204NoContent)
            .Produces(StatusCodes.Status404NotFound)
            .Produces(StatusCodes.Status401Unauthorized)
            .Produces(StatusCodes.Status403Forbidden);

        // GET /api/classes/{id}/campuses
        group
            .MapGet(
                "/{id}/campuses",
                async (long id, ClassService service) =>
                {
                    var campusIds = await service.GetCampusIdsAsync(id);
                    return Results.Ok(campusIds);
                }
            )
            .WithName("GetClassCampuses")
            .WithSummary("Get campus IDs for a class")
            .Produces<IEnumerable<long>>(StatusCodes.Status200OK)
            .Produces(StatusCodes.Status404NotFound);

        // PUT /api/classes/{id}/campuses
        group
            .MapPut(
                "/{id}/campuses",
                async (long id, [FromBody] long[] campusIds, ClassService service) =>
                {
                    await service.SetCampusesAsync(id, campusIds);
                    return Results.NoContent();
                }
            )
            .RequirePermission("ManageClasses")
            .WithName("SetClassCampuses")
            .WithSummary("Set campus associations for a class")
            .Produces(StatusCodes.Status204NoContent)
            .Produces(StatusCodes.Status404NotFound)
            .Produces(StatusCodes.Status403Forbidden);

        return group;
    }
}
