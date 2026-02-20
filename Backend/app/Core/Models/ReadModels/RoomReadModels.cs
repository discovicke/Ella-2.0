using System.Text.Json.Serialization;
using System.Linq;
using Backend.app.Core.Models.Enums;

namespace Backend.app.Core.Models.ReadModels;

public record RoomDetailModel(
    long RoomId,
    long CampusId,
    string Name,
    string CampusCity,
    int? Capacity,
    RoomType Type,
    string? Floor,
    string? Notes,
    // Dapper maps to this (matches SQL column 'AssetsString')
    // We hide it from the Frontend JSON
    [property: JsonIgnore] string? AssetsString
)
{
    // Parameterless constructor for Dapper materialization
    public RoomDetailModel()
        : this(0, 0, string.Empty, string.Empty, null, default, null, null, null) { }

    // Frontend sees this Clean List
    public List<string>? Assets =>
        string.IsNullOrEmpty(AssetsString)
            ? null
            : AssetsString.Split("|||", StringSplitOptions.RemoveEmptyEntries).ToList();
}
