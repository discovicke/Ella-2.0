using Backend.app.Core.Enums;
using Backend.app.Core.Models.DTO;
using Backend.app.Core.Services;
using Microsoft.AspNetCore.Mvc;

namespace Backend.app.API.Endpoints;

public static class RoomEndpoints
{
    public static RouteGroupBuilder MapRoomEndpoints(this IEndpointRouteBuilder app)
    {
        var group = app.MapGroup("/rooms").WithTags("Rooms");

        // GET /api/rooms
        group.MapGet(
            "/",
            async ([FromQuery] RoomType? type, [FromQuery] string? address, RoomService service) =>
            {
                var rooms = await service.GetRoomsAsync(type, address);
                return Results.Ok(rooms);
            }
        );

        // GET /api/rooms/{id}
        group.MapGet(
            "/{id}",
            async (int id, RoomService service) =>
            {
                // Layer 2: Endpoint validation
                if (id <= 0)
                    return Results.BadRequest("ID must be a positive integer.");

                try
                {
                    var room = await service.GetRoomByIdAsync(id);
                    return Results.Ok(room);
                }
                catch (KeyNotFoundException ex)
                {
                    return Results.NotFound(ex.Message);
                }
            }
        );

        // POST /api/rooms
        group.MapPost(
            "/",
            async (CreateRoomDto dto, RoomService service) =>
            {
                // Layer 2: Endpoint validation
                var validation = ValidateCreateRoom(dto);
                if (validation is not null)
                    return validation;

                var createdRoom = await service.CreateRoomAsync(dto);
                return Results.Created($"/api/rooms/{createdRoom.Id}", createdRoom);
            }
        );

        // PUT /api/rooms/{id}
        group.MapPut(
            "/{id}",
            async (int id, UpdateRoomDto dto, RoomService service) =>
            {
                // Layer 2: Endpoint validation
                if (id <= 0)
                    return Results.BadRequest("ID must be a positive integer.");

                var validation = ValidateUpdateRoom(dto);
                if (validation is not null)
                    return validation;

                try
                {
                    await service.UpdateRoomAsync(id, dto);
                    return Results.NoContent();
                }
                catch (KeyNotFoundException ex)
                {
                    return Results.NotFound(ex.Message);
                }
            }
        );

        // DELETE /api/rooms/{id}
        group.MapDelete(
            "/{id}",
            async (int id, RoomService service) =>
            {
                // Layer 2: Endpoint validation
                if (id <= 0)
                    return Results.BadRequest("ID must be a positive integer.");

                try
                {
                    await service.DeleteRoomAsync(id);
                    return Results.NoContent();
                }
                catch (KeyNotFoundException ex)
                {
                    return Results.NotFound(ex.Message);
                }
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
