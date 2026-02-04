namespace Backend.app.API.Endpoints;

public static class RoomEndpoints
{
    // TODO: Migrate all room endpoints
    // Reference: src/modules/rooms/room.routes.js + room.controller.js

    public static IEndpointRouteBuilder MapRoomEndpoints(this IEndpointRouteBuilder app)
    {
        var group = app.MapGroup("/rooms").WithTags("Rooms");
        return app;
    }
}
