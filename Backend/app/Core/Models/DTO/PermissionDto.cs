namespace Backend.app.Core.Models.DTO;

public record UpdatePermissionDto(
    long? TemplateId,
    bool BookRoom,
    bool MyBookings,
    bool ManageUsers,
    bool ManageClasses,
    bool ManageRooms,
    bool ManageAssets,
    bool ManageBookings,
    bool ManageCampuses,
    bool ManageRoles
);
