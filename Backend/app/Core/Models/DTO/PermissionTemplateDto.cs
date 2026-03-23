using System.ComponentModel.DataAnnotations;
using System.Text.Json.Serialization;

namespace Backend.app.Core.Models.DTO;

/// <summary>
/// Represents a named permission template (e.g. "Student", "Admin").
/// </summary>
public class PermissionTemplateDto
{
    /// <summary>
    /// Template ID from the database. Null/0 for new templates.
    /// Used to track which users are assigned to this template.
    /// </summary>
    [JsonPropertyName("id")]
    public long? Id { get; set; }

    /// <summary>
    /// Unique internal name (slug). e.g. "admin", "student".
    /// </summary>
    [JsonPropertyName("name")]
    [MaxLength(50)]
    public string Name { get; set; } = string.Empty;

    /// <summary>
    /// Display name. e.g. "Administrator".
    /// </summary>
    [JsonPropertyName("label")]
    [MaxLength(100)]
    public string Label { get; set; } = string.Empty;

    [JsonPropertyName("cssClass")]
    [MaxLength(50)]
    public string CssClass { get; set; } = string.Empty;

    [JsonPropertyName("defaultPermissionLevel")]
    public int DefaultPermissionLevel { get; set; } = 1;

    /// <summary>
    /// Dictionary of permission_name → true/false.
    /// Keys should match system_permissions(key).
    /// </summary>
    [JsonPropertyName("permissions")]
    public Dictionary<string, bool> Permissions { get; set; } = new();
}
