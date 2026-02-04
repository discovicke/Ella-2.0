using Backend.app.Core.Entities;
using Backend.app.Core.Enums;
using Backend.app.Core.Interfaces;
using Backend.app.Infrastructure.Auth;
using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Routing;

namespace Backend.app.API.Endpoints;

public static class UserEndpoints
{
    // TODO: Migrate all user endpoints
    // Reference: src/modules/users/user.routes.js + user.controller.js
    //Inser endpoints here:

    // Kopplar ihop våra endpoints med appen
    public static void MapUserEndpoints(this IEndpointRouteBuilder app)
    {
        var group = app.MapGroup("/api/users");

        // GET /api/users
        group.MapGet("/", async (IUserRepository userRepo) =>
        {
            var users = await userRepo.GetAllUsersAsync();

            var sanitized = users.Select(u => new User
            {
                Id = u.Id,
                Email = u.Email,
                DisplayName = u.DisplayName,
                UserClass = u.UserClass,
                Role = u.Role,
                PasswordHash = null
            });

            return Results.Ok(sanitized);
        });

        // GET /api/users/{id}
        group.MapGet("/{id:int}", async (int id, IUserRepository userRepo) =>
        {
            var user = await userRepo.GetUserByIdAsync(id);
            if (user is null)
                return Results.NotFound(new { error = "User not found" });

            var sanitized = new User
            {
                Id = user.Id,
                Email = user.Email,
                DisplayName = user.DisplayName,
                UserClass = user.UserClass,
                Role = user.Role,
                PasswordHash = null
            };

            return Results.Ok(sanitized);
        });

        // POST /api/users
        _ = group.MapPost("/", static async (User input, IUserRepository userRepo) =>
        {
            if (string.IsNullOrWhiteSpace(input.Email) || string.IsNullOrWhiteSpace(input.PasswordHash))
                return Results.BadRequest(new { error = "Email and password are required." });

            var existing = await userRepo.GetUserByEmailAsync(input.Email);
            if (existing is not null)
                return Results.Conflict(new { error = "User with this email already exists." });

            string hashed = PasswordHasher.HashPassword(input.PasswordHash);

            var user = new User
            {
                Email = input.Email,
                DisplayName = input.DisplayName,
                UserClass = input.UserClass,
                Role = input.Role,
                PasswordHash = hashed
            };

            var success = await userRepo.CreateUserAsync(user);
            if (!success) return Results.Problem("Ett fel uppstod vid skapande av användare", statusCode: 500);

            var created = await userRepo.GetUserByEmailAsync(user.Email);
            if (created is null) return Results.Problem("Kunde inte hämta skapad användare", statusCode: 500);

            var sanitized = new User
            {
                Id = created.Id,
                Email = created.Email,
                DisplayName = created.DisplayName,
                UserClass = created.UserClass,
                Role = created.Role,
                PasswordHash = null
            };

            return Results.Created($"/api/users/{created.Id}", new { message = "User created successfully", user = sanitized });
        });

        // PUT /api/users/{id}
        group.MapPut("/{id:int}", async (int id, User input, IUserRepository userRepo) =>
        {
            var existing = await userRepo.GetUserByIdAsync(id);
            if (existing is null)
                return Results.NotFound(new { error = "Användare hittades inte" });

            var updated = new User
            {
                Id = existing.Id,
                Email = string.IsNullOrWhiteSpace(input.Email) ? existing.Email : input.Email,
                DisplayName = string.IsNullOrWhiteSpace(input.DisplayName) ? existing.DisplayName : input.DisplayName,
                UserClass = string.IsNullOrWhiteSpace(input.UserClass) ? existing.UserClass : input.UserClass,
                Role = input.Role != 0 ? input.Role : existing.Role,
                PasswordHash = string.IsNullOrWhiteSpace(input.PasswordHash)
                    ? existing.PasswordHash
                    : PasswordHasher.HashPassword(input.PasswordHash)
            };

            var success = await userRepo.UpdateUserAsync(id, updated);
            if (!success) return Results.Problem("Ett fel uppstod vid uppdatering", statusCode: 500);

            var refreshed = await userRepo.GetUserByIdAsync(id);
            if (refreshed is null) return Results.Problem("Kunde inte hämta uppdaterad användare", statusCode: 500);

            var sanitized = new User
            {
                Id = refreshed.Id,
                Email = refreshed.Email,
                DisplayName = refreshed.DisplayName,
                UserClass = refreshed.UserClass,
                Role = refreshed.Role,
                PasswordHash = null
            };

            return Results.Ok(sanitized);
        });

        // DELETE /api/users/{id}
        group.MapDelete("/{id:int}", async (int id, IUserRepository userRepo) =>
        {
            var existing = await userRepo.GetUserByIdAsync(id);
            if (existing is null)
                return Results.NotFound(new { error = "Användare hittades inte" });

            var success = await userRepo.DeleteUserAsync(id);
            if (!success)
                return Results.Problem("Kunde inte radera användaren", statusCode: 500);

            return Results.NoContent();
        });
    }


}