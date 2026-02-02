using System;

namespace Backend.app.Core.Interfaces;

public interface IRoomRepository
{
    // Define methods for room repository here
    Task GetRoomsAsync();
    Task GetRoomByIdAsync(int id);
    Task CreateRoomAsync();
    Task UpdateRoomAsync();
    Task DeleteRoomAsync();
    Task SaveChangesAsync();
    
     
}
