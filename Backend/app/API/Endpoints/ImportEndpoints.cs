using Backend.app.Core.Models.DTO;
using Backend.app.Core.Services;
using Backend.app.Infrastructure.Auth;
using Microsoft.AspNetCore.Mvc;

namespace Backend.app.API.Endpoints;

public static class ImportEndpoints
{
    public static RouteGroupBuilder MapImportEndpoints(this IEndpointRouteBuilder app)
    {
        var group = app.MapGroup("/import").WithTags("Import").RequireAuth();

        group
            .MapPost(
                "/",
                async (
                    [FromForm] IFormFile file,
                    [FromForm] string className,
                    [FromForm] long? templateId,
                    UserImportService service
                ) =>
                {
                    if (file == null || file.Length == 0)
                        return Results.BadRequest("CSV file is required.");
                    
                    const long maxFileSize = 5 * 1024 * 1024; // 5MB
                    if (file.Length > maxFileSize)
                        return Results.BadRequest("File size exceeds the 5MB limit.");

                    if (string.IsNullOrWhiteSpace(className))
                        return Results.BadRequest("className is required.");

                    using var reader = new StreamReader(file.OpenReadStream());
                    var content = await reader.ReadToEndAsync();

                    var result = await service.ImportCsvAsync(content, className, templateId);
                    return Results.Ok(result);
                }
            )
            .RequirePermission("ManageUsers")
            .WithName("ImportUsersFromCsv")
            .WithSummary("Import users from CSV")
            .WithDescription(
                "Parses a CSV file and creates users with generated placeholder passwords, then links them to a class.\n\n🔒 **Authentication Required**\n🔑 **Requires manageUsers permission**"
            )
            .DisableAntiforgery()
            .Accepts<IFormFile>("multipart/form-data")
            .Produces<ImportUsersResponseDto>()
            .Produces(StatusCodes.Status400BadRequest)
            .Produces(StatusCodes.Status401Unauthorized)
            .Produces(StatusCodes.Status403Forbidden);

        return group;
    }
}
