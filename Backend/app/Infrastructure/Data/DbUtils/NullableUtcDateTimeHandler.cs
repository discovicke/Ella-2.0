using System.Data;
using Dapper;

namespace Backend.app.Infrastructure.Data.DbUtils;

public class NullableUtcDateTimeHandler : SqlMapper.TypeHandler<DateTime?>
{
    private const string SqliteDateFormat = "yyyy-MM-dd HH:mm:ss";

    public override void SetValue(IDbDataParameter parameter, DateTime? value)
    {
        if (value.HasValue)
        {
            var utcValue = value.Value.Kind == DateTimeKind.Utc ? value.Value : value.Value.ToUniversalTime();
            parameter.Value = utcValue.ToString(SqliteDateFormat);
        }
        else
        {
            parameter.Value = DBNull.Value;
        }
    }

    public override DateTime? Parse(object value)
    {
        if (value == null || value is DBNull)
        {
            return null;
        }

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
