namespace Backend.app.Core.Validation;

/// <summary>
/// Centralised max-length constants for every user-submitted string field.
/// Referenced by endpoint validators (backend) and mirrored on the frontend.
/// </summary>
public static class InputLimits
{
    // ── Identity ──
    public const int Email = 254; // RFC 5321
    public const int Password = 128;
    public const int DisplayName = 100;

    // ── Booking ──
    public const int BookerName = 100;
    public const int BookingNotes = 500;

    // ── Room ──
    public const int RoomName = 100;
    public const int RoomFloor = 20;
    public const int RoomNotes = 200;

    // ── Campus ──
    public const int CampusCity = 100;
    public const int CampusStreet = 150;
    public const int CampusZip = 20;
    public const int CampusCountry = 100;
    public const int CampusContact = 150;

    // ── Class ──
    public const int ClassName = 100;

    // ── Asset ──
    public const int AssetDescription = 100;

    // ── Permission template ──
    public const int TemplateName = 50;
    public const int TemplateLabel = 100;
    public const int TemplateCssClass = 50;

    /// <summary>
    /// Returns a 400 BadRequest result if the value exceeds the max length, or null if valid.
    /// Null/empty values pass (use required checks separately).
    /// </summary>
    public static Microsoft.AspNetCore.Http.IResult? CheckLength(
        string? value,
        int maxLength,
        string fieldName
    )
    {
        if (value is not null && value.Length > maxLength)
            return Microsoft.AspNetCore.Http.Results.BadRequest(
                $"{fieldName} must be at most {maxLength} characters."
            );
        return null;
    }
}
