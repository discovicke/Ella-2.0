namespace Backend.app.Core.Models.Entities;

/// <summary>
/// Maps to the 'user_campus' junction table.
/// Links a user to a campus.
/// </summary>
public class UserCampus
{
    public long Id { get; set; }
    public long UserId { get; set; }
    public long CampusId { get; set; }
}
