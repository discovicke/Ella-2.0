using Backend.app.Core.Models.DTO;
using Backend.app.Core.Services;
using Backend.app.Infrastructure.Auth;

namespace Backend.app.API.Endpoints;

public static class PermissionTemplateEndpoints
{
    public static RouteGroupBuilder MapPermissionTemplateEndpoints(this IEndpointRouteBuilder app)
    {
        var group = app.MapGroup("/permission-templates").WithTags("Permission Templates");

        // GET /api/permission-templates  — public (no auth required), used by login/header
        group
            .MapGet(
                "/",
                async (PermissionTemplateService service) =>
                {
                    var templates = await service.GetAllAsync();
                    return Results.Ok(templates);
                }
            )
            .WithName("GetPermissionTemplates")
            .WithSummary("Get all permission templates")
            .WithDescription(
                "Returns the named permission templates (Student, Educator, Admin, etc.) "
                    + "auto-synced with the current database permission columns. "
                    + "No authentication required — the frontend needs this before/during login."
            )
            .Produces<List<PermissionTemplateDto>>(StatusCodes.Status200OK);

        // PUT /api/permission-templates  — admin only
        group
            .MapPut(
                "/",
                async (
                    List<PermissionTemplateDto> templates,
                    PermissionTemplateService service,
                    HttpContext ctx
                ) =>
                {
                    var propagate =
                        ctx.Request.Query.ContainsKey("propagate")
                        && string.Equals(
                            ctx.Request.Query["propagate"],
                            "true",
                            StringComparison.OrdinalIgnoreCase
                        );
                    var result = await service.UpdateAllAsync(templates, propagate);
                    return Results.Ok(result);
                }
            )
            .RequireAuth()
            .RequirePermission("ManageRoles")
            .WithName("UpdatePermissionTemplates")
            .WithSummary("Replace all permission templates")
            .WithDescription(
                "Replaces the full set of named permission templates. "
                    + "The server will auto-sync with the DB columns before persisting.\n\n"
                    + "Add `?propagate=true` to also update all users whose `template_id` matches a changed template.\n\n"
                    + "🔒 **Requires manageRoles permission**"
            )
            .Produces<List<PermissionTemplateDto>>(StatusCodes.Status200OK)
            .Produces(StatusCodes.Status401Unauthorized)
            .Produces(StatusCodes.Status403Forbidden);

        return group;
    }
}
