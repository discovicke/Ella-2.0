using Backend.app.Core.Models.DTO;
using Backend.app.Core.Services;
using Backend.app.Infrastructure.Auth;
using Backend.app.Core.Models.Enums;

namespace Backend.app.API.Endpoints;

public static class UserEndpoints
{
    public static RouteGroupBuilder MapUserEndpoints(this IEndpointRouteBuilder app)
    {
        var group = app.MapGroup("/users")
            .WithTags("Users")
            .RequireAuth(); // Lock down entire group to authenticated users

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
            .WithName("GetUsers")
            .WithSummary("Get all users")
            .WithDescription("Retrieves all users in the system.\n\n🔒 **Authentication Required**")
            .Produces<IEnumerable<UserResponseDto>>(StatusCodes.Status200OK);

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
            .WithName("GetUserById")
            .WithSummary("Get user by ID")
            .WithDescription("Retrieves a specific user by their unique identifier.\n\n🔒 **Authentication Required**")
            .Produces<UserResponseDto>(StatusCodes.Status200OK)
            .Produces<string>(StatusCodes.Status400BadRequest)
            .Produces<string>(StatusCodes.Status404NotFound);

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
            .RequireRoles(UserRole.Admin) // Only Admin can create users
            .WithName("CreateUser")
            .WithSummary("Create a new user")
            .WithDescription("Creates a new user with the provided details.\n\n🔒 **Authentication Required**\n🔑 **Role Required:** Admin")
            .Accepts<CreateUserDto>("application/json")
            .Produces<UserResponseDto>(StatusCodes.Status201Created)
            .Produces<string>(StatusCodes.Status400BadRequest)
            .Produces<string>(StatusCodes.Status409Conflict)
            .Produces<string>(StatusCodes.Status500InternalServerError);

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
            .RequireRoles(UserRole.Admin) // Only Admin can update users
            .WithName("UpdateUser")
            .WithSummary("Update an existing user")
            .WithDescription("Updates a user's details by their unique identifier.\n\n🔒 **Authentication Required**\n🔑 **Role Required:** Admin")
            .Accepts<UpdateUserDto>("application/json")
            .Produces(StatusCodes.Status204NoContent)
            .Produces<string>(StatusCodes.Status400BadRequest)
            .Produces<string>(StatusCodes.Status404NotFound)
            .Produces<string>(StatusCodes.Status500InternalServerError);

        // DELETE /api/users/{id}
        group
            .MapDelete(
                "/{id}",
                async (long id, UserService service) =>
                {
                    if (id <= 0)
                        return Results.BadRequest("ID must be a positive integer.");

                    await service.DeleteUserAsync(id);
                    return Results.NoContent();
                }
            )
            .RequireRoles(UserRole.Admin) // Only Admin can delete users
            .WithName("DeleteUser")
            .WithSummary("Delete a user")
            .WithDescription("Permanently deletes a user by their unique identifier.\n\n🔒 **Authentication Required**\n🔑 **Role Required:** Admin")
            .Produces(StatusCodes.Status204NoContent)
            .Produces<string>(StatusCodes.Status400BadRequest)
            .Produces<string>(StatusCodes.Status404NotFound)
            .Produces<string>(StatusCodes.Status500InternalServerError);

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

        if (string.IsNullOrWhiteSpace(dto.Password))
            return Results.BadRequest("Password is required.");

        return null;
    }
}
