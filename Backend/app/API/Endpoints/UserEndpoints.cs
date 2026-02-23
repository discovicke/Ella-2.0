using System.Security.Claims;
using System.IdentityModel.Tokens.Jwt;
using Backend.app.Core.Models;
using Backend.app.Core.Models.DTO;
using Backend.app.Core.Models.Entities;
using Backend.app.Core.Models.Enums;
using Backend.app.Core.Services;
using Backend.app.Infrastructure.Auth;

namespace Backend.app.API.Endpoints;

public static class UserEndpoints
{
    public static RouteGroupBuilder MapUserEndpoints(this IEndpointRouteBuilder app)
    {
        var group = app.MapGroup("/users").WithTags("Users").RequireAuth(); // Lock down entire group to authenticated users

        // GET /api/users
        group
            .MapGet(
                "/",
                async (UserService service) =>
                {
                    var users = await service.GetAllAsync();
                    return Results.Ok(users);
                }
            )
            .RequirePermission("ManageUsers")
            .WithName("GetUsers")
            .WithSummary("Get all users")
            .WithDescription(
                "Retrieves all users in the system.\n\n🔒 **Authentication Required**\n🔑 **Requires manageUsers permission**"
            )
            .Produces<IEnumerable<UserResponseDto>>(StatusCodes.Status200OK)
            .Produces(StatusCodes.Status401Unauthorized)
            .Produces(StatusCodes.Status403Forbidden);

        // GET /api/users/{id}
        group
            .MapGet(
                "/{id}",
                async (long id, UserService service) =>
                {
                    if (id <= 0)
                        return Results.BadRequest("ID must be a positive integer.");

                    var user = await service.GetByIdAsync(id);
                    return Results.Ok(user);
                }
            )
            .RequirePermission("ManageUsers")
            .WithName("GetUserById")
            .WithSummary("Get user by ID")
            .WithDescription(
                "Retrieves a specific user by their unique identifier.\n\n🔒 **Authentication Required**\n🔑 **Requires manageUsers permission**"
            )
            .Produces<UserResponseDto>(StatusCodes.Status200OK)
            .Produces<string>(StatusCodes.Status400BadRequest)
            .Produces<string>(StatusCodes.Status404NotFound)
            .Produces(StatusCodes.Status401Unauthorized)
            .Produces(StatusCodes.Status403Forbidden);

        // POST /api/users
        group
            .MapPost(
                "/",
                async (CreateUserDto dto, UserService service) =>
                {
                    var validation = ValidateCreateUser(dto);
                    if (validation is not null)
                        return validation;

                    var createdUser = await service.CreateUserAsync(dto);
                    return Results.Created($"/api/users/{createdUser.Id}", createdUser);
                }
            )
            .RequirePermission("ManageUsers")
            .WithName("CreateUser")
            .WithSummary("Create a new user")
            .WithDescription(
                "Creates a new user with the provided details.\n\n🔒 **Authentication Required**\n🔑 **Requires manageUsers permission**"
            )
            .Accepts<CreateUserDto>("application/json")
            .Produces<UserResponseDto>(StatusCodes.Status201Created)
            .Produces<string>(StatusCodes.Status400BadRequest)
            .Produces<string>(StatusCodes.Status409Conflict)
            .Produces(StatusCodes.Status401Unauthorized)
            .Produces(StatusCodes.Status403Forbidden);

        // PUT /api/users/{id}
        group
            .MapPut(
                "/{id}",
                async (long id, UpdateUserDto dto, UserService service) =>
                {
                    if (id <= 0)
                        return Results.BadRequest("ID must be a positive integer.");

                    if (id != dto.Id)
                        return Results.BadRequest("ID in path and body must match.");

                    var validation = ValidateUpdateUser(dto);
                    if (validation is not null)
                        return validation;

                    await service.UpdateUserAsync(id, dto);
                    return Results.NoContent();
                }
            )
            .RequirePermission("ManageUsers")
            .WithName("UpdateUser")
            .WithSummary("Update an existing user")
            .WithDescription(
                "Updates a user's details by their unique identifier.\n\n🔒 **Authentication Required**\n🔑 **Requires manageUsers permission**"
            )
            .Accepts<UpdateUserDto>("application/json")
            .Produces(StatusCodes.Status204NoContent)
            .Produces<string>(StatusCodes.Status400BadRequest)
            .Produces<string>(StatusCodes.Status404NotFound)
            .Produces(StatusCodes.Status401Unauthorized)
            .Produces(StatusCodes.Status403Forbidden);

        // POST /api/users/{id}/ban-status
        group
            .MapPost(
                "/{id}/ban-status",
                async (long id, BannedStatus status, UserService service, ClaimsPrincipal user) =>
                {
                    if (id <= 0)
                        return Results.BadRequest("ID must be a positive integer.");

                    var currentUserId = user.FindFirst(System.IdentityModel.Tokens.Jwt.JwtRegisteredClaimNames.Sub)?.Value;
                    if (currentUserId == id.ToString())
                        return Results.BadRequest("You cannot change your own ban status.");

                    await service.SetBannedStatusAsync(id, status);
                    return Results.NoContent();
                }
            )
            .RequirePermission("ManageUsers")
            .WithName("SetUserBanStatus")
            .WithSummary("Set user ban status")
            .WithDescription(
                "Bans or unbans a user. If banned, all active tokens are revoked.\n\n🔒 **Authentication Required**\n🔑 **Requires manageUsers permission**"
            )
            .Produces(StatusCodes.Status204NoContent)
            .Produces<string>(StatusCodes.Status400BadRequest)
            .Produces<string>(StatusCodes.Status404NotFound)
            .Produces(StatusCodes.Status401Unauthorized)
            .Produces(StatusCodes.Status403Forbidden);

        // POST /api/users/{id}/revoke-tokens
        group
            .MapPost(
                "/{id}/revoke-tokens",
                async (long id, UserService service) =>
                {
                    if (id <= 0)
                        return Results.BadRequest("ID must be a positive integer.");

                    await service.RevokeTokensAsync(id);
                    return Results.NoContent();
                }
            )
            .RequirePermission("ManageUsers")
            .WithName("RevokeTokens")
            .WithSummary("Force logout a user")
            .WithDescription(
                "Invalidates all existing tokens for a specific user.\n\n🔒 **Authentication Required**\n🔑 **Requires manageUsers permission**"
            )
            .Produces(StatusCodes.Status204NoContent)
            .Produces<string>(StatusCodes.Status400BadRequest)
            .Produces<string>(StatusCodes.Status404NotFound)
            .Produces(StatusCodes.Status401Unauthorized)
            .Produces(StatusCodes.Status403Forbidden);

        // PUT /api/users/{id}/permissions — update a user's permission flags directly
        group
            .MapPut(
                "/{id}/permissions",
                async (long id, UpdatePermissionDto dto, UserService service, ClaimsPrincipal user) =>
                {
                    if (id <= 0)
                        return Results.BadRequest("ID must be a positive integer.");

                    var currentUserId = user.FindFirst(System.IdentityModel.Tokens.Jwt.JwtRegisteredClaimNames.Sub)?.Value;
                    if (currentUserId == id.ToString())
                        return Results.BadRequest("You cannot update your own permissions.");

                    var updated = await service.UpdatePermissionsAsync(id, dto);
                    return Results.Ok(updated);
                }
            )
            .RequirePermission("ManageUsers")
            .WithName("UpdateUserPermissions")
            .WithSummary("Update a user's permissions")
            .WithDescription(
                "Directly updates permission flags for a specific user. "
                    + "Sets template_id to the value in the DTO (null for custom overrides).\n\n"
                    + "🔒 **Authentication Required**\n🔑 **Requires manageUsers permission**"
            )
            .Accepts<UpdatePermissionDto>("application/json")
            .Produces<UserPermissions>(StatusCodes.Status200OK)
            .Produces<string>(StatusCodes.Status400BadRequest)
            .Produces<string>(StatusCodes.Status404NotFound)
            .Produces(StatusCodes.Status401Unauthorized)
            .Produces(StatusCodes.Status403Forbidden);

        // POST /api/users/{id}/apply-template/{templateId} — apply a template to a user
        group
            .MapPost(
                "/{id}/apply-template/{templateId}",
                async (long id, long templateId, PermissionTemplateService templateService, ClaimsPrincipal user) =>
                {
                    if (id <= 0)
                        return Results.BadRequest("User ID must be a positive integer.");
                    if (templateId <= 0)
                        return Results.BadRequest("Template ID must be a positive integer.");

                    var currentUserId = user.FindFirst(System.IdentityModel.Tokens.Jwt.JwtRegisteredClaimNames.Sub)?.Value;
                    if (currentUserId == id.ToString())
                        return Results.BadRequest("You cannot apply a template to yourself.");

                    var updated = await templateService.ApplyTemplateAsync(id, templateId);
                    return Results.Ok(updated);
                }
            )
            .RequirePermission("ManageUsers")
            .WithName("ApplyTemplateToUser")
            .WithSummary("Apply a permission template to a user")
            .WithDescription(
                "Copies all permission flags from the specified template into the user's permissions row "
                    + "and stores the template_id for future propagation.\n\n"
                    + "🔒 **Authentication Required**\n🔑 **Requires manageUsers permission**"
            )
            .Produces<UserPermissions>(StatusCodes.Status200OK)
            .Produces<string>(StatusCodes.Status400BadRequest)
            .Produces<string>(StatusCodes.Status404NotFound)
            .Produces(StatusCodes.Status401Unauthorized)
            .Produces(StatusCodes.Status403Forbidden);

        // DELETE /api/users/{id}
        group
            .MapDelete(
                "/{id}",
                async (long id, UserService service, ClaimsPrincipal user) =>
                {
                    if (id <= 0)
                        return Results.BadRequest("ID must be a positive integer.");

                    var currentUserId = user.FindFirst(System.IdentityModel.Tokens.Jwt.JwtRegisteredClaimNames.Sub)?.Value;
                    if (currentUserId == id.ToString())
                        return Results.BadRequest("You cannot delete your own account.");

                    await service.DeleteUserAsync(id);
                    return Results.NoContent();
                }
            )
            .RequirePermission("ManageUsers")
            .WithName("DeleteUser")
            .WithSummary("Delete a user")
            .WithDescription(
                "Permanently deletes a user by their unique identifier.\n\n🔒 **Authentication Required**\n🔑 **Requires manageUsers permission**"
            )
            .Produces(StatusCodes.Status204NoContent)
            .Produces<string>(StatusCodes.Status400BadRequest)
            .Produces<string>(StatusCodes.Status404NotFound)
            .Produces(StatusCodes.Status401Unauthorized)
            .Produces(StatusCodes.Status403Forbidden);

        return group;
    }

    // Layer 2 validation helpers
    private static IResult? ValidateCreateUser(CreateUserDto dto)
    {
        if (string.IsNullOrWhiteSpace(dto.Email))
            return Results.BadRequest("Email is required.");

        if (string.IsNullOrWhiteSpace(dto.Password))
            return Results.BadRequest("Password is required.");

        return null;
    }

    private static IResult? ValidateUpdateUser(UpdateUserDto dto)
    {
        if (string.IsNullOrWhiteSpace(dto.Email))
            return Results.BadRequest("Email is required.");

        return null;
    }
}
