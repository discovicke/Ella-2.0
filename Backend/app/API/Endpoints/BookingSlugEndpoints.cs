using Backend.app.Core.Models.DTO;
using Backend.app.Core.Services;
using Backend.app.Infrastructure.Auth;

namespace Backend.app.API.Endpoints;

public static class BookingSlugEndpoints
{
    public static IEndpointRouteBuilder MapBookingSlugEndpoints(this IEndpointRouteBuilder app)
    {
        var adminGroup = app.MapGroup("/admin/booking-slugs").WithTags("Admin Booking Slugs").RequireAuth();
        var publicGroup = app.MapGroup("/public/booking-slugs").WithTags("Public Booking Slugs");

        // Admin: List all slugs
        adminGroup.MapGet("/", async (BookingSlugService service) =>
        {
            var slugs = await service.GetAllSlugsAsync();
            return Results.Ok(slugs);
        })
        .Produces<IEnumerable<BookingSlugResponseDto>>(StatusCodes.Status200OK);

        // Admin: Create a slug for a user
        adminGroup.MapPost("/", async (CreateBookingSlugDto request, BookingSlugService service) =>
        {
            var result = await service.CreateSlugAsync(request);
            return result != null ? Results.Ok(result) : Results.BadRequest("Failed to create slug");
        })
        .Produces<BookingSlugResponseDto>(StatusCodes.Status200OK)
        .Produces(StatusCodes.Status400BadRequest);

        // Admin: Delete a slug
        adminGroup.MapDelete("/{id:long}", async (long id, BookingSlugService service) =>
        {
            var success = await service.DeleteSlugAsync(id);
            return success ? Results.Ok() : Results.NotFound();
        })
        .Produces(StatusCodes.Status200OK)
        .Produces(StatusCodes.Status404NotFound);

        // Public: Get info about a slug
        publicGroup.MapGet("/{slug}", async (string slug, BookingSlugService service) =>
        {
            var info = await service.GetSlugInfoAsync(slug);
            return info != null ? Results.Ok(info) : Results.NotFound("Invalid or inactive slug");
        })
        .Produces<BookingSlugQuickInfoDto>(StatusCodes.Status200OK)
        .Produces(StatusCodes.Status404NotFound);

        // Public: Book using a slug
        publicGroup.MapPost("/{slug}/book", async (string slug, CreatePublicBookingDto request, BookingSlugService service) =>
        {
            var result = await service.BookWithSlugAsync(slug, request);
            return result != null ? Results.Ok(result) : Results.BadRequest("Booking failed or invalid slug");
        })
        .Produces<AuthResponseDto>(StatusCodes.Status200OK)
        .Produces(StatusCodes.Status400BadRequest);

        return app;
    }
}