using Backend.app.Core.Models.DTO;
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

        // --- Room Management ---

        // GET /api/rooms?roomTypeId=1&campusId=2
        group
            .MapGet(
                "/",
                async (
                    [FromQuery] long? roomTypeId,
                    [FromQuery] long? campusId,
                    RoomService service
                ) =>
                {
                    var rooms = await service.GetRoomsAsync(roomTypeId, campusId);
                    return Results.Ok(rooms);
                }
            )
            .WithName("GetRooms")
            .WithSummary("Get all rooms")
            .WithDescription(
                "Retrieves all rooms. Optionally filter by room type or campus.\n\n🔒 **Authentication Required**"
            )
            .Produces<IEnumerable<RoomDetailModel>>(StatusCodes.Status200OK)
            .Produces(StatusCodes.Status401Unauthorized);

        // GET /api/rooms/{id}
        group
            .MapGet(
                "/{id}",
                async (long id, RoomService service) =>
                {
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
                    var validation = ValidateCreateRoom(dto);
                    if (validation is not null)
                        return validation;

                    var createdRoom = await service.CreateRoomAsync(dto);
                    return Results.Created($"/api/rooms/{createdRoom.Id}", createdRoom);
                }
            )
            .RequirePermission("ManageRooms")
            .WithName("CreateRoom")
            .WithSummary("Create a new room")
            .WithDescription(
                "Creates a new room. You can optionally provide a list of 'assetIds' to link existing assets.\n\n🔒 **Authentication Required**\n🔑 **Requires manageRooms permission**"
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
                async (long id, UpdateRoomDto dto, RoomService service) =>
                {
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
                "Updates a room's details. Providing 'assetIds' will REPLACE the room's entire asset inventory.\n\n🔒 **Authentication Required**\n🔑 **Requires manageRooms permission**"
            )
            .Accepts<UpdateRoomDto>("application/json")
            .Produces(StatusCodes.Status204NoContent)
            .Produces<string>(StatusCodes.Status400BadRequest)
            .Produces<string>(StatusCodes.Status404NotFound)
            .Produces(StatusCodes.Status401Unauthorized)
            .Produces(StatusCodes.Status403Forbidden);

        // DELETE /api/rooms/{id}?force=true
        group
            .MapDelete(
                "/{id}",
                async (long id, bool? force, RoomService service) =>
                {
                    if (id <= 0)
                        return Results.BadRequest("ID must be a positive integer.");

                    try
                    {
                        await service.DeleteRoomAsync(id, force == true);
                        return Results.NoContent();
                    }
                    catch (InvalidOperationException ex)
                    {
                        // ex.Message contains the booking count
                        return Results.Conflict(new { bookingCount = int.Parse(ex.Message) });
                    }
                }
            )
            .RequirePermission("ManageRooms")
            .WithName("DeleteRoom")
            .WithSummary("Delete a room")
            .WithDescription(
                "Permanently deletes a room and optionally its bookings.\n\n"
                    + "Pass `?force=true` to cascade-delete all bookings.\n\n"
                    + "🔒 **Authentication Required**\n🔑 **Requires manageRooms permission**"
            )
            .Produces(StatusCodes.Status204NoContent)
            .Produces<string>(StatusCodes.Status400BadRequest)
            .Produces<string>(StatusCodes.Status404NotFound)
            .Produces<string>(StatusCodes.Status409Conflict)
            .Produces(StatusCodes.Status401Unauthorized)
            .Produces(StatusCodes.Status403Forbidden);

        // --- Room Type Management ---

        // GET /api/rooms/types
        group
            .MapGet(
                "/types",
                async (RoomTypeService service) =>
                {
                    var types = await service.GetAllAsync();
                    return Results.Ok(types);
                }
            )
            .WithName("GetRoomTypes")
            .WithSummary("Get all room types")
            .Produces<IEnumerable<RoomTypeResponseDto>>(StatusCodes.Status200OK)
            .Produces(StatusCodes.Status401Unauthorized);

        // GET /api/rooms/types/{id}
        group
            .MapGet(
                "/types/{id}",
                async (long id, RoomTypeService service) =>
                {
                    var type = await service.GetByIdAsync(id);
                    return Results.Ok(type);
                }
            )
            .WithName("GetRoomTypeById")
            .WithSummary("Get room type by ID")
            .Produces<RoomTypeResponseDto>(StatusCodes.Status200OK)
            .Produces(StatusCodes.Status404NotFound)
            .Produces(StatusCodes.Status401Unauthorized);

        // POST /api/rooms/types
        group
            .MapPost(
                "/types",
                async ([FromBody] string name, RoomTypeService service) =>
                {
                    if (string.IsNullOrWhiteSpace(name))
                        return Results.BadRequest("Name is required.");

                    var created = await service.CreateAsync(name);
                    return Results.Created($"/api/rooms/types/{created.Id}", created);
                }
            )
            .RequirePermission("ManageRooms")
            .WithName("CreateRoomType")
            .WithSummary("Create a new room type")
            .Produces<RoomTypeResponseDto>(StatusCodes.Status201Created)
            .Produces(StatusCodes.Status400BadRequest)
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
        if (dto.RoomTypeId <= 0)
            return Results.BadRequest("Room type is required.");

        return null;
    }

    private static IResult? ValidateUpdateRoom(UpdateRoomDto dto)
    {
        if (string.IsNullOrWhiteSpace(dto.Name))
            return Results.BadRequest("Room name is required.");
        if (dto.Capacity.HasValue && dto.Capacity <= 0)
            return Results.BadRequest("Capacity must be a positive number.");
        if (dto.RoomTypeId <= 0)
            return Results.BadRequest("Room type is required.");

        return null;
    }
}
