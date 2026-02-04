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
        // Inject RoomService instead of IRoomRepository
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
                var room = await service.GetRoomByIdAsync(id);
                return room is not null ? Results.Ok(room) : Results.NotFound();
            }
        );

        // POST /api/rooms
        group.MapPost(
            "/",
            async (CreateRoomDto dto, RoomService service) =>
            {
                var createdRoom = await service.CreateRoomAsync(dto);

                if (createdRoom is null)
                    return Results.BadRequest("Invalid data or creation failed.");

                // Ideally return CreatedAtRoute using the ID
                return Results.Created($"/api/rooms/{createdRoom.Id}", createdRoom);
            }
        );

        // PUT /api/rooms/{id}
        group.MapPut(
            "/{id}",
            async (int id, UpdateRoomDto dto, RoomService service) =>
            {
                var success = await service.UpdateRoomAsync(id, dto);
                return success ? Results.Ok() : Results.NotFound();
            }
        );

        // DELETE /api/rooms/{id}
        group.MapDelete(
            "/{id}",
            async (int id, RoomService service) =>
            {
                var success = await service.DeleteRoomAsync(id);
                return success ? Results.NoContent() : Results.NotFound();
            }
        );

        return group;
    }
}
