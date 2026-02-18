using System.Text.Json.Serialization;

namespace Backend.app.Core.Models.DTO;

/// <summary>
/// Represents a named permission template (e.g. "Student", "Admin").
/// Stored in permission-templates.json and served via API.
/// </summary>
public class PermissionTemplateDto
{
    [JsonPropertyName("label")]
    public string Label { get; set; } = string.Empty;

    [JsonPropertyName("cssClass")]
    public string CssClass { get; set; } = string.Empty;

    /// <summary>
    /// Dictionary of permission_name → true/false.
    /// Keys use snake_case matching the DB column names (e.g. "book_room").
    /// </summary>
    [JsonPropertyName("permissions")]
    public Dictionary<string, bool> Permissions { get; set; } = new();
}
