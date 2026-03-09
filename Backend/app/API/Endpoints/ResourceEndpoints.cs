using Backend.app.Core.Models.DTO;
using Backend.app.Core.Services;
using Backend.app.Infrastructure.Auth;

namespace Backend.app.API.Endpoints;

public static class ResourceEndpoints
{
    public static IEndpointRouteBuilder MapResourceEndpoints(this IEndpointRouteBuilder app)
    {
        var group = app.MapGroup("/resources").WithTags("Resources").RequireAuth();

        // Check for manageResources permission
        // Since teachers/admins should see this, we'll check for the permission key
        
        // --- Categories ---
        group.MapGet("/categories", async (ResourceService service) => 
            Results.Ok(await service.GetAllCategoriesAsync()));

        group.MapPost("/categories", async (CreateResourceCategoryDto dto, ResourceService service) => 
            Results.Ok(await service.CreateCategoryAsync(dto)))
            .RequirePermission("manageResources");

        // --- Resources ---
        group.MapGet("/", async (ResourceService service) => 
            Results.Ok(await service.GetAllResourcesAsync()));

        group.MapPost("/", async (CreateResourceDto dto, ResourceService service) => 
            Results.Ok(await service.CreateResourceAsync(dto)))
            .RequirePermission("manageResources");

        group.MapDelete("/{id:long}", async (long id, ResourceService service) => 
            await service.DeleteResourceAsync(id) ? Results.Ok() : Results.NotFound())
            .RequirePermission("manageResources");

        // --- Bookings ---
        group.MapGet("/bookings", async (long? resourceId, ResourceService service, HttpContext context) => {
            var userId = (long)context.Items["UserId"]!;
            // Admins/Teachers with manageResources can see all bookings, others maybe just their own?
            // Actually, requirements say only Teachers/Admins see this section at all.
            return Results.Ok(await service.GetBookingsAsync(resourceId));
        });

        group.MapPost("/bookings", async (CreateResourceBookingDto dto, ResourceService service, HttpContext context) => {
            var userId = (long)context.Items["UserId"]!;
            var result = await service.CreateBookingAsync(userId, dto);
            return result != null ? Results.Ok(result) : Results.Conflict("Resource is already booked for this time.");
        });

        group.MapDelete("/bookings/{id:long}", async (long id, ResourceService service) => 
            await service.DeleteBookingAsync(id) ? Results.Ok() : Results.NotFound());

        return app;
    }
}