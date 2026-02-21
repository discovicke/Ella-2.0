namespace Backend.app.Core.Models.Entities;

/// <summary>
/// Maps to 'user_permission_templates'.
/// Links a user to their base role/template.
/// </summary>
public class UserPermissionTemplate
{
    public long UserId { get; set; }
    public long TemplateId { get; set; }
}
