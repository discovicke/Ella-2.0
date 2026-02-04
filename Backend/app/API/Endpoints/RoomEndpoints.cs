using Backend.app.Core.Entities;
using Backend.app.Core.Enums;
using Backend.app.Core.Interfaces;
using Backend.app.Core.Models.DTO;
using Microsoft.AspNetCore.Mvc;

namespace Backend.app.API.Endpoints;

public static class RoomEndpoints
{
    public static RouteGroupBuilder MapRoomEndpoints(this IEndpointRouteBuilder app)
    {
        var group = app.MapGroup("/rooms").WithTags("Rooms");

        // 1. GET /api/rooms
        group.MapGet(
            "/",
            async ([FromQuery] RoomType? type, [FromQuery] string? address, IRoomRepository repo) =>
            {
                if (type.HasValue)
                {
                    return Results.Ok(await repo.GetRoomsByTypeAsync(type.Value));
                }

                if (!string.IsNullOrEmpty(address))
                {
                    return Results.Ok(await repo.GetRoomsByAddressAsync(address));
                }

                return Results.Ok(await repo.GetAllRoomsAsync());
            }
        );

        // 2. GET /api/rooms/{id}
        group.MapGet(
            "/{id}",
            async (int id, IRoomRepository repo) =>
            {
                // Layer 2: Endpoint Validation
                if (id <= 0)
                    return Results.BadRequest("ID must be a positive integer.");

                var room = await repo.GetRoomByIdAsync(id);
                return room is not null ? Results.Ok(room) : Results.NotFound();
            }
        );

        // 3. POST /api/rooms
        group.MapPost(
            "/",
            async (CreateRoomDto dto, IRoomRepository repo) =>
            {
                // Layer 2: Endpoint Validation
                var validation = ValidateCreateRoom(dto);
                if (validation is not null)
                    return validation;

                var room = new Room
                {
                    Name = dto.Name,
                    Capacity = dto.Capacity,
                    Type = dto.Type,
                    Floor = dto.Floor,
                    Address = dto.Address,
                    Notes = dto.Notes,
                };

                var created = await repo.CreateRoomAsync(room);
                return created
                    ? Results.Created($"/api/rooms/{room.Id}", room)
                    : Results.BadRequest("Could not create room.");
            }
        );

        // 4. PUT /api/rooms/{id}
        group.MapPut(
            "/{id}",
            async (int id, UpdateRoomDto dto, IRoomRepository repo) =>
            {
                // Layer 2: Endpoint Validation
                if (id <= 0)
                    return Results.BadRequest("ID must be a positive integer.");

                var validation = ValidateUpdateRoom(dto);
                if (validation is not null)
                    return validation;

                var room = new Room
                {
                    Id = id,
                    Name = dto.Name,
                    Capacity = dto.Capacity,
                    Type = dto.Type,
                    Floor = dto.Floor,
                    Address = dto.Address,
                    Notes = dto.Notes,
                };

                var updated = await repo.UpdateRoomAsync(id, room);
                return updated ? Results.Ok(room) : Results.NotFound();
            }
        );

        // 5. DELETE /api/rooms/{id}
        group.MapDelete(
            "/{id}",
            async (int id, IRoomRepository repo) =>
            {
                // Layer 2: Endpoint Validation
                if (id <= 0)
                    return Results.BadRequest("ID must be a positive integer.");

                var deleted = await repo.DeleteRoomAsync(id);
                return deleted ? Results.NoContent() : Results.NotFound();
            }
        );

        return group;
    }

    // Layer 2 validation helpers
    private static IResult? ValidateCreateRoom(CreateRoomDto dto)
    {
        if (string.IsNullOrWhiteSpace(dto.Name))
            return Results.BadRequest("Room name is required.");

        if (dto.Capacity.HasValue && dto.Capacity <= 0)
            return Results.BadRequest("Capacity must be a positive number.");

        return null;
    }

    private static IResult? ValidateUpdateRoom(UpdateRoomDto dto)
    {
        if (string.IsNullOrWhiteSpace(dto.Name))
            return Results.BadRequest("Room name is required.");

        if (dto.Capacity.HasValue && dto.Capacity <= 0)
            return Results.BadRequest("Capacity must be a positive number.");

        return null;
    }
}
