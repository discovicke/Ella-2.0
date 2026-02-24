using System.Data.Common;
using Backend.app.Core.Interfaces;
using Backend.app.Core.Models.Enums;
using Microsoft.Data.SqlClient;
using Microsoft.Data.Sqlite;
using Npgsql;

namespace Backend.app.Infrastructure.Data;

public class DbConnectionFactory(IConfiguration configurationFile) : IDbConnectionFactory
{
    public DbConnection CreateConnection()
    {
        string? dbProvider = configurationFile.GetValue<string>("DatabaseSettings:Provider");
        string? connectionString = configurationFile.GetValue<string>(
            "DatabaseSettings:ConnectionString"
        );

        if (string.IsNullOrWhiteSpace(dbProvider))
        {
            throw new InvalidOperationException(
                "Database provider not configured in 'DatabaseSettings:Provider'."
            );
        }

        if (string.IsNullOrWhiteSpace(connectionString))
        {
            throw new InvalidOperationException(
                "Connection string not configured in 'DatabaseSettings:ConnectionString'."
            );
        }

        if (!Enum.TryParse<DbProviders>(dbProvider, ignoreCase: true, out var provider))
        {
            throw new InvalidOperationException($"Database provider '{dbProvider}' is not valid.");
        }

        return provider switch
        {
            DbProviders.Sqlite => new SqliteConnection(connectionString),
            DbProviders.Postgres => new NpgsqlConnection(connectionString),
            DbProviders.SqlServer => new SqlConnection(connectionString),

            _ => throw new NotSupportedException(
                $"Database provider '{dbProvider}' is not supported."
            ),
        };
    }
}
