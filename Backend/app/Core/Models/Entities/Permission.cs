namespace Backend.app.Core.Models.Entities;

/// <summary>
/// Maps to the 'permissions' table.
/// Each user has one row of permission flags.
/// </summary>
public class Permission
{
    public long UserId { get; set; }
    public long? TemplateId { get; set; }
    public bool BookRoom { get; set; }
    public bool MyBookings { get; set; }
    public bool ManageUsers { get; set; }
    public bool ManageClasses { get; set; }
    public bool ManageRooms { get; set; }
    public bool ManageAssets { get; set; }
    public bool ManageBookings { get; set; }
    public bool ManageCampuses { get; set; }
    public bool ManageRoles { get; set; }
}
