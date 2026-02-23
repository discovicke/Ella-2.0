namespace Backend.app.Core.Models.Entities;

/// <summary>
/// Maps to the 'user_class' junction table.
/// Links a user to a class.
/// </summary>
public class UserClass
{
    public long Id { get; set; }
    public long UserId { get; set; }
    public long ClassId { get; set; }
}
