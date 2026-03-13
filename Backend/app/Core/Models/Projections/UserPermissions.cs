namespace Backend.app.Core.Models;

/// <summary>
/// A flat representation of a user's effective permissions.
/// This is not an entity (not mapped to a single table) but a projection
/// used by the application logic and API responses.
/// </summary>
public class UserPermissions
{
    public long UserId { get; set; }
    public long? PermissionTemplateId { get; set; }

    // Permission Flags
    public bool BookRoom { get; set; }
    public bool BookResource { get; set; }
    public bool ManageUsers { get; set; }
    public bool ManageClasses { get; set; }
    public bool ManageRooms { get; set; }
    public bool ManageBookings { get; set; }
    public bool ManageCampuses { get; set; }
    public bool ManageRoles { get; set; }
    public bool ManageResources { get; set; }

    /// <summary>
    /// Helper to check permission by key name dynamically.
    /// </summary>
    public bool HasPermission(string key)
    {
        return key switch
        {
            "BookRoom" => BookRoom,
            "BookResource" => BookResource,
            "ManageUsers" => ManageUsers,
            "ManageClasses" => ManageClasses,
            "ManageRooms" => ManageRooms,
            "ManageBookings" => ManageBookings,
            "ManageCampuses" => ManageCampuses,
            "ManageRoles" => ManageRoles,
            "ManageResources" => ManageResources,
            _ => false,
        };
    }
}
