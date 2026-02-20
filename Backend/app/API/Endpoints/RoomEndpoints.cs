using Backend.app.Core.Models.DTO;
using Backend.app.Core.Models.Enums;
using Backend.app.Core.Models.ReadModels;
using Backend.app.Core.Services;
using Backend.app.Infrastructure.Auth;
using Microsoft.AspNetCore.Mvc;

namespace Backend.app.API.Endpoints;

public static class RoomEndpoints
{
    public static RouteGroupBuilder MapRoomEndpoints(this IEndpointRouteBuilder app)
    {
        var group = app.MapGroup("/rooms").WithTags("Rooms").RequireAuth();

        // GET /api/rooms
        group
            .MapGet(
                "/",
                async (
                    [FromQuery] RoomType? type,
                    [FromQuery] long? campusId,
                    RoomService service
                ) =>
                {
                    var rooms = await service.GetRoomsAsync(type, campusId);
                    return Results.Ok(rooms);
                }
            )
            .WithName("GetRooms")
            .WithSummary("Get all rooms")
            .WithDescription(
                "Retrieves all rooms. Optionally filter by type or campus.\n\n🔒 **Authentication Required**"
            )
            // UPDATED: Now produces RoomDetailModel (includes Assets list)
            .Produces<IEnumerable<RoomDetailModel>>(StatusCodes.Status200OK)
            .Produces(StatusCodes.Status401Unauthorized);

        // GET /api/rooms/{id}
        group
            .MapGet(
                "/{id}",
                async (long id, RoomService service) =>
                {
                    // Layer 2: Endpoint validation
                    if (id <= 0)
                        return Results.BadRequest("ID must be a positive integer.");

                    var room = await service.GetRoomByIdAsync(id);
                    return Results.Ok(room);
                }
            )
            .WithName("GetRoomById")
            .WithSummary("Get room by ID")
            .WithDescription(
                "Retrieves a specific room by its unique identifier.\n\n🔒 **Authentication Required**"
            )
            // UPDATED: Now produces RoomDetailModel (includes Assets list)
            .Produces<RoomDetailModel>(StatusCodes.Status200OK)
            .Produces<string>(StatusCodes.Status400BadRequest)
            .Produces<string>(StatusCodes.Status404NotFound)
            .Produces(StatusCodes.Status401Unauthorized);

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
            .RequirePermission("ManageRooms")
            .WithName("CreateRoom")
            .WithSummary("Create a new room")
            .WithDescription(
                "Creates a new room. You can optionally provide a list of 'assetIds' to link existing assets (e.g., Projector) to the room immediately.\n\n🔒 **Authentication Required**\n🔑 **Role Required:** Admin"
            )
            .Accepts<CreateRoomDto>("application/json")
            .Produces<RoomResponseDto>(StatusCodes.Status201Created)
            .Produces<string>(StatusCodes.Status400BadRequest)
            .Produces(StatusCodes.Status401Unauthorized)
            .Produces(StatusCodes.Status403Forbidden);

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

                    await service.UpdateRoomAsync(id, dto);
                    return Results.NoContent();
                }
            )
            .RequirePermission("ManageRooms")
            .WithName("UpdateRoom")
            .WithSummary("Update an existing room")
            .WithDescription(
                "Updates a room's details. Providing 'assetIds' will REPLACE the room's entire asset inventory with the new list.\n\n🔒 **Authentication Required**\n🔑 **Role Required:** Admin"
            )
            .Accepts<UpdateRoomDto>("application/json")
            .Produces(StatusCodes.Status204NoContent)
            .Produces<string>(StatusCodes.Status400BadRequest)
            .Produces<string>(StatusCodes.Status404NotFound)
            .Produces(StatusCodes.Status401Unauthorized)
            .Produces(StatusCodes.Status403Forbidden);

        // DELETE /api/rooms/{id}
        group
            .MapDelete(
                "/{id}",
                async (long id, RoomService service) =>
                {
                    // Layer 2: Endpoint validation
                    if (id <= 0)
                        return Results.BadRequest("ID must be a positive integer.");

                    await service.DeleteRoomAsync(id);
                    return Results.NoContent();
                }
            )
            .RequirePermission("ManageRooms")
            .WithName("DeleteRoom")
            .WithSummary("Delete a room")
            .WithDescription(
                "Permanently deletes a room by its unique identifier.\n\n🔒 **Authentication Required**\n🔑 **Role Required:** Admin"
            )
            .Produces(StatusCodes.Status204NoContent)
            .Produces<string>(StatusCodes.Status400BadRequest)
            .Produces<string>(StatusCodes.Status404NotFound)
            .Produces(StatusCodes.Status401Unauthorized)
            .Produces(StatusCodes.Status403Forbidden);

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
