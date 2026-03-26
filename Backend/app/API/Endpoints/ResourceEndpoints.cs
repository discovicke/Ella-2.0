using Backend.app.Core.Models.DTO;
using Backend.app.Core.Services;
using Backend.app.Infrastructure.Auth;

namespace Backend.app.API.Endpoints;

/// <summary>
/// Resource endpoints for managing bookable resources (e.g., equipment, vehicles).
/// Resources are distinct from rooms and have their own booking system.
/// </summary>
public static class ResourceEndpoints
{
    public static IEndpointRouteBuilder MapResourceEndpoints(this IEndpointRouteBuilder app)
    {
        var group = app.MapGroup("/resources").WithTags("Resources").RequireAuth();

        // ─── Categories ───────────────────────────────────────────────────────

        // GET /api/resources/categories
        group
            .MapGet(
                "/categories",
                async (ResourceService service) => Results.Ok(await service.GetAllCategoriesAsync())
            )
            .WithName("GetResourceCategories")
            .WithSummary("Get all resource categories")
            .WithDescription(
                "Retrieves all resource categories (e.g., Vehicles, Equipment).\n\n🔒 **Authentication Required**"
            )
            .Produces<IEnumerable<ResourceCategoryDto>>(StatusCodes.Status200OK)
            .Produces(StatusCodes.Status401Unauthorized);

        // POST /api/resources/categories
        group
            .MapPost(
                "/categories",
                async (CreateResourceCategoryDto dto, ResourceService service) =>
                    Results.Ok(await service.CreateCategoryAsync(dto))
            )
            .RequirePermission("ManageResources")
            .WithName("CreateResourceCategory")
            .WithSummary("Create a new resource category")
            .WithDescription(
                "Creates a new resource category.\n\n🔒 **Authentication Required**\n🔑 **Requires manageResources permission**"
            )
            .Accepts<CreateResourceCategoryDto>("application/json")
            .Produces<ResourceCategoryDto>(StatusCodes.Status200OK)
            .Produces(StatusCodes.Status401Unauthorized)
            .Produces(StatusCodes.Status403Forbidden);

        // ─── Resources ────────────────────────────────────────────────────────

        // GET /api/resources
        group
            .MapGet(
                "/",
                async (ResourceService service) => Results.Ok(await service.GetAllResourcesAsync())
            )
            .WithName("GetResources")
            .WithSummary("Get all resources")
            .WithDescription(
                "Retrieves all bookable resources with their category information.\n\n🔒 **Authentication Required**"
            )
            .Produces<IEnumerable<ResourceResponseDto>>(StatusCodes.Status200OK)
            .Produces(StatusCodes.Status401Unauthorized);

        // POST /api/resources
        group
            .MapPost(
                "/",
                async (CreateResourceDto dto, ResourceService service) =>
                    Results.Ok(await service.CreateResourceAsync(dto))
            )
            .RequirePermission("ManageResources")
            .WithName("CreateResource")
            .WithSummary("Create a new resource")
            .WithDescription(
                "Creates a new bookable resource within a category.\n\n🔒 **Authentication Required**\n🔑 **Requires manageResources permission**"
            )
            .Accepts<CreateResourceDto>("application/json")
            .Produces<ResourceResponseDto>(StatusCodes.Status200OK)
            .Produces(StatusCodes.Status401Unauthorized)
            .Produces(StatusCodes.Status403Forbidden);

        // PUT /api/resources/{id}
        group
            .MapPut(
                "/{id:long}",
                async (long id, CreateResourceDto dto, ResourceService service) =>
                {
                    var result = await service.UpdateResourceAsync(id, dto);
                    return result != null ? Results.Ok(result) : Results.NotFound();
                }
            )
            .RequirePermission("ManageResources")
            .WithName("UpdateResource")
            .WithSummary("Update a resource")
            .WithDescription(
                "Updates an existing resource's details.\n\n🔒 **Authentication Required**\n🔑 **Requires manageResources permission**"
            )
            .Accepts<CreateResourceDto>("application/json")
            .Produces<ResourceResponseDto>(StatusCodes.Status200OK)
            .Produces(StatusCodes.Status404NotFound)
            .Produces(StatusCodes.Status401Unauthorized)
            .Produces(StatusCodes.Status403Forbidden);

        // DELETE /api/resources/{id}
        group
            .MapDelete(
                "/{id:long}",
                async (long id, ResourceService service) =>
                    await service.DeleteResourceAsync(id) ? Results.Ok() : Results.NotFound()
            )
            .RequirePermission("ManageResources")
            .WithName("DeleteResource")
            .WithSummary("Delete a resource")
            .WithDescription(
                "Permanently deletes a resource.\n\n🔒 **Authentication Required**\n🔑 **Requires manageResources permission**"
            )
            .Produces(StatusCodes.Status200OK)
            .Produces(StatusCodes.Status404NotFound)
            .Produces(StatusCodes.Status401Unauthorized)
            .Produces(StatusCodes.Status403Forbidden);

        // ─── Bookings ──────────────────────────────────────────────────────────

        // GET /api/resources/bookings?resourceId=1
        group
            .MapGet(
                "/bookings",
                async (long? resourceId, ResourceService service) =>
                    Results.Ok(await service.GetBookingsAsync(resourceId))
            )
            .WithName("GetResourceBookings")
            .WithSummary("Get resource bookings")
            .WithDescription(
                "Retrieves bookings for resources. Optionally filter by resourceId.\n\n🔒 **Authentication Required**"
            )
            .Produces<IEnumerable<ResourceBookingResponseDto>>(StatusCodes.Status200OK)
            .Produces(StatusCodes.Status401Unauthorized);

        // POST /api/resources/bookings
        group
            .MapPost(
                "/bookings",
                async (
                    CreateResourceBookingDto dto,
                    ResourceService service,
                    HttpContext context
                ) =>
                {
                    var userId = (long)context.Items["UserId"]!;
                    var result = await service.CreateBookingAsync(userId, dto);
                    return result != null
                        ? Results.Ok(result)
                        : Results.Conflict("Resource is already booked for this time.");
                }
            )
            .RequirePermission("BookResource")
            .WithName("CreateResourceBooking")
            .WithSummary("Book a resource")
            .WithDescription(
                "Creates a new booking for a resource.\n\n🔒 **Authentication Required**\n🔑 **Requires bookResource permission**"
            )
            .Accepts<CreateResourceBookingDto>("application/json")
            .Produces<ResourceBookingResponseDto>(StatusCodes.Status200OK)
            .Produces(StatusCodes.Status409Conflict)
            .Produces(StatusCodes.Status401Unauthorized)
            .Produces(StatusCodes.Status403Forbidden);

        // DELETE /api/resources/bookings/{id}
        group
            .MapDelete(
                "/bookings/{id:long}",
                async (long id, ResourceService service) =>
                    await service.DeleteBookingAsync(id) ? Results.Ok() : Results.NotFound()
            )
            .RequirePermission("BookResource")
            .WithName("DeleteResourceBooking")
            .WithSummary("Cancel a resource booking")
            .WithDescription(
                "Cancels (deletes) a resource booking.\n\n🔒 **Authentication Required**\n🔑 **Requires bookResource permission**"
            )
            .Produces(StatusCodes.Status200OK)
            .Produces(StatusCodes.Status404NotFound)
            .Produces(StatusCodes.Status401Unauthorized)
            .Produces(StatusCodes.Status403Forbidden);

        return app;
    }
}