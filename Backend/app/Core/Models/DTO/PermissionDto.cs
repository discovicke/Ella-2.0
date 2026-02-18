namespace Backend.app.Core.Models.DTO;

public record PermissionResponseDto(
    long UserId,
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

public record UpdatePermissionDto(
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
