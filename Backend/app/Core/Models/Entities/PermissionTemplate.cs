namespace Backend.app.Core.Models.Entities;

/// <summary>
/// Maps to 'permission_templates'.
/// Represents a named role template (e.g. "Student", "Admin").
/// </summary>
public class PermissionTemplate
{
    public long Id { get; set; }
    public string Name { get; set; } = string.Empty;
    public string Label { get; set; } = string.Empty;
    public string CssClass { get; set; } = string.Empty;
    public int SortOrder { get; set; }
}

/// <summary>
/// Maps to 'permission_template_flags'.
/// One row per permission key per template.
/// </summary>
public class PermissionTemplateFlag
{
    public long TemplateId { get; set; }
    public string PermissionKey { get; set; } = string.Empty;
    public bool Value { get; set; }
}
