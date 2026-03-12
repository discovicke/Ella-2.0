using System.Data;
using Dapper;

namespace Backend.app.Infrastructure.Data.DbUtils;

/// <summary>
/// Ensures all DateTime objects processed by Dapper are treated as UTC.
/// Crucial for SQLite which stores dates as TEXT, preventing sorting/filtering bugs
/// caused by implicit local time string conversion.
/// </summary>
public class UtcDateTimeHandler : SqlMapper.TypeHandler<DateTime>
{
    private const string SqliteDateFormat = "yyyy-MM-dd HH:mm:ss";

    public override void SetValue(IDbDataParameter parameter, DateTime value)
    {
        // Always ensure the value is treated as UTC
        var utcValue = value.Kind == DateTimeKind.Utc ? value : value.ToUniversalTime();
        
        // Use standard SQL date format (without T and Z) to remain compatible 
        // with SQLite's internal date() and datetime() functions
        parameter.Value = utcValue.ToString(SqliteDateFormat);
    }

    public override DateTime Parse(object value)
    {
        if (value is DateTime dt)
        {
            return DateTime.SpecifyKind(dt, DateTimeKind.Utc);
        }

        if (value is string str)
        {
            if (DateTime.TryParse(str, out var parsedDt))
            {
                return DateTime.SpecifyKind(parsedDt, DateTimeKind.Utc);
            }
        }

        return DateTime.SpecifyKind(Convert.ToDateTime(value), DateTimeKind.Utc);
    }
}
