using System.Data.Common;
using Backend.app.Core.Interfaces;
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

        return dbProvider.ToLower() switch
        {
            "sqlite" => new SqliteConnection(connectionString),
            "sqlserver" => new SqlConnection(connectionString),
            "postgresql" => new NpgsqlConnection(connectionString),
            _ => throw new NotSupportedException(
                $"Database provider '{dbProvider}' is not supported."
            ),
        };
    }

}
