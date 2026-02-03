using System.Data;
using System.Data.Common;
using Backend.app.Core.Interfaces;
using Microsoft.Data.Sqlite;

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

        return dbProvider.ToLower() switch
        {
            "sqlite" => new SqliteConnection(connectionString),

            "postgresql" => throw new NotImplementedException(
                "PostgreSQL support not implemented yet."
            ),
            "sqlserver" => throw new NotImplementedException(
                "SQL Server support not implemented yet."
            ),
            _ => throw new NotSupportedException(
                $"Database provider '{dbProvider}' is not supported."
            ),
        };
    }

    // SQLite connection factory implementation
    // TODO: Implement IDbConnectionFactory with connection string from appsettings
    // Reference: src/db/db.js for connection handling
}
