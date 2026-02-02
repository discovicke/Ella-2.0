using System;

namespace Backend.app.Core.Interfaces;

public interface IRoomRepository
{
    // Repository interface for Room data access
    // TODO: Define method signatures for CRUD operations
    // Reference: src/modules/rooms/room.repo.js for all methods
    // CRUD stands for Create, Read, Update, and Delete – basic operations used to add, fetch, modify, and remove data.
    
    Task GetRoomsAsync();
    Task GetRoomByIdAsync(int id);
    Task CreateRoomAsync();
    Task UpdateRoomAsync();
    Task DeleteRoomAsync();
    Task SaveChangesAsync();
    
     
}
