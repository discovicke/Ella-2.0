namespace Backend.app.Core.Models.DTO;

public record UpdatePermissionDto(
    long? TemplateId,
    bool BookRoom,
    bool ManageUsers,
    bool ManageClasses,
    bool ManageRooms,
    bool ManageBookings,
    bool ManageCampuses,
    bool ManageRoles
);
