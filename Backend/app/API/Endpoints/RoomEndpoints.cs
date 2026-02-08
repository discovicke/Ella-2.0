using Backend.app.Core.Models.DTO;
using Backend.app.Core.Models.Enums;
using Backend.app.Core.Models.ReadModels; // Added this namespace
using Backend.app.Core.Services;
using Microsoft.AspNetCore.Mvc;

namespace Backend.app.API.Endpoints;

public static class RoomEndpoints
{
    public static RouteGroupBuilder MapRoomEndpoints(this IEndpointRouteBuilder app)
    {
        var group = app.MapGroup("/rooms").WithTags("Rooms");

        // GET /api/rooms
        group
            .MapGet(
                "/",
                async (
                    [FromQuery] RoomType? type,
                    [FromQuery] string? address,
                    RoomService service
                ) =>
                {
                    var rooms = await service.GetRoomsAsync(type, address);
                    return Results.Ok(rooms);
                }
            )
            .WithName("GetRooms")
            .WithSummary("Get all rooms")
            .WithDescription("Retrieves all rooms. Optionally filter by type or address.")
            // UPDATED: Now produces RoomDetailModel (includes Assets list)
            .Produces<IEnumerable<RoomDetailModel>>(StatusCodes.Status200OK);

        // GET /api/rooms/{id}
        group
            .MapGet(
                "/{id}",
                async (long id, RoomService service) =>
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
            )
            .WithName("GetRoomById")
            .WithSummary("Get room by ID")
            .WithDescription("Retrieves a specific room by its unique identifier.")
            // UPDATED: Now produces RoomDetailModel (includes Assets list)
            .Produces<RoomDetailModel>(StatusCodes.Status200OK)
            .Produces<string>(StatusCodes.Status400BadRequest)
            .Produces<string>(StatusCodes.Status404NotFound);

        // POST /api/rooms
        group
            .MapPost(
                "/",
                async (CreateRoomDto dto, RoomService service) =>
                {
                    // Layer 2: Endpoint validation
                    var validation = ValidateCreateRoom(dto);
                    if (validation is not null)
                        return validation;

                    // Note: Create returns RoomResponseDto (no assets initially)
                    var createdRoom = await service.CreateRoomAsync(dto);
                    return Results.Created($"/api/rooms/{createdRoom.Id}", createdRoom);
                }
            )
            .WithName("CreateRoom")
            .WithSummary("Create a new room")
            .WithDescription("Creates a new room. You can optionally provide a list of 'assetIds' to link existing assets (e.g., Projector) to the room immediately.")
            .Accepts<CreateRoomDto>("application/json")
            .Produces<RoomResponseDto>(StatusCodes.Status201Created)
            .Produces<string>(StatusCodes.Status400BadRequest);

        // PUT /api/rooms/{id}
        group
            .MapPut(
                "/{id}",
                async (long id, UpdateRoomDto dto, RoomService service) => // Changed int to long
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
            )
            .WithName("UpdateRoom")
            .WithSummary("Update an existing room")
            .WithDescription("Updates a room's details. Providing 'assetIds' will REPLACE the room's entire asset inventory with the new list.")
            .Accepts<UpdateRoomDto>("application/json")
            .Produces(StatusCodes.Status204NoContent)
            .Produces<string>(StatusCodes.Status400BadRequest)
            .Produces<string>(StatusCodes.Status404NotFound);

        // DELETE /api/rooms/{id}
        group
            .MapDelete(
                "/{id}",
                async (long id, RoomService service) =>
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
            )
            .WithName("DeleteRoom")
            .WithSummary("Delete a room")
            .WithDescription("Permanently deletes a room by its unique identifier.")
            .Produces(StatusCodes.Status204NoContent)
            .Produces<string>(StatusCodes.Status400BadRequest)
            .Produces<string>(StatusCodes.Status404NotFound);

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
