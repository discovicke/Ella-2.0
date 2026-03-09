using Backend.app.Core.Models.DTO;
using Backend.app.Core.Services;
using Backend.app.Infrastructure.Auth;

namespace Backend.app.API.Endpoints;

public static class ResourceEndpoints
{
    public static IEndpointRouteBuilder MapResourceEndpoints(this IEndpointRouteBuilder app)
    {
        var group = app.MapGroup("/resources").WithTags("Resources").RequireAuth();

        // --- Categories ---
        group.MapGet("/categories", async (ResourceService service) => 
            Results.Ok(await service.GetAllCategoriesAsync()))
            .Produces<IEnumerable<ResourceCategoryDto>>(StatusCodes.Status200OK);

        group.MapPost("/categories", async (CreateResourceCategoryDto dto, ResourceService service) => 
            Results.Ok(await service.CreateCategoryAsync(dto)))
            .RequirePermission("manageResources")
            .Produces<ResourceCategoryDto>(StatusCodes.Status200OK);

        // --- Resources ---
        group.MapGet("/", async (ResourceService service) => 
            Results.Ok(await service.GetAllResourcesAsync()))
            .Produces<IEnumerable<ResourceResponseDto>>(StatusCodes.Status200OK);

        group.MapPost("/", async (CreateResourceDto dto, ResourceService service) => 
            Results.Ok(await service.CreateResourceAsync(dto)))
            .RequirePermission("manageResources")
            .Produces<ResourceResponseDto>(StatusCodes.Status200OK);

        group.MapDelete("/{id:long}", async (long id, ResourceService service) => 
            await service.DeleteResourceAsync(id) ? Results.Ok() : Results.NotFound())
            .RequirePermission("manageResources")
            .Produces(StatusCodes.Status200OK)
            .Produces(StatusCodes.Status404NotFound);

        // --- Bookings ---
        group.MapGet("/bookings", async (long? resourceId, ResourceService service) => 
            Results.Ok(await service.GetBookingsAsync(resourceId)))
            .Produces<IEnumerable<ResourceBookingResponseDto>>(StatusCodes.Status200OK);

        group.MapPost("/bookings", async (CreateResourceBookingDto dto, ResourceService service, HttpContext context) => {
            var userId = (long)context.Items["UserId"]!;
            var result = await service.CreateBookingAsync(userId, dto);
            return result != null ? Results.Ok(result) : Results.Conflict("Resource is already booked for this time.");
        })
        .Produces<ResourceBookingResponseDto>(StatusCodes.Status200OK)
        .Produces(StatusCodes.Status409Conflict);

        group.MapDelete("/bookings/{id:long}", async (long id, ResourceService service) => 
            await service.DeleteBookingAsync(id) ? Results.Ok() : Results.NotFound())
            .Produces(StatusCodes.Status200OK)
            .Produces(StatusCodes.Status404NotFound);

        return app;
    }
}