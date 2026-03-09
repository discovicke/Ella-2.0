using System.Data;
using Backend.app.Core.Interfaces;
using Dapper;

namespace Backend.app.Infrastructure.Data.DbUtils;

/// <summary>
/// Initializes and seeds the SQLite database for tests.
/// </summary>
public class SqliteDbInitializer(
    IDbConnectionFactory connectionFactory,
    ILogger<SqliteDbInitializer> logger,
    IPasswordHasher passwordHasher
) : IDbInitializer
{
    public async Task InitializeAsync()
    {
        logger.LogInformation("Initializing SQLite database...");

        await using var conn = connectionFactory.CreateConnection();
        await conn.OpenAsync();

        await RunSchemaAsync(conn);
        await SeedIfEmptyAsync(conn);

        logger.LogInformation("SQLite database initialization complete.");
    }

    private async Task RunSchemaAsync(IDbConnection conn)
    {
        var schemaPath = DbPathHelper.GetFullPath("SqliteSchema.sqlite");
        if (!File.Exists(schemaPath))
        {
            throw new FileNotFoundException($"Schema file not found at: {schemaPath}");
        }

        var schemaSql = await File.ReadAllTextAsync(schemaPath);
        await conn.ExecuteAsync(schemaSql);
    }

    private async Task SeedIfEmptyAsync(IDbConnection conn)
    {
        var userCount = await conn.ExecuteScalarAsync<int>("SELECT COUNT(*) FROM users;");
        if (userCount > 0) return;

        var seedPath = DbPathHelper.GetFullPath("SqliteSeed.sqlite");
        if (!File.Exists(seedPath)) return;

        var seedSql = await File.ReadAllTextAsync(seedPath);
        while (seedSql.Contains("__HASH__"))
        {
            seedSql = ReplaceFirst(seedSql, "__HASH__", passwordHasher.HashPassword("lösen123"));
        }
        seedSql = seedSql.Replace("__NOLOGIN__", "!NOLOGIN");

        await conn.ExecuteAsync(seedSql);
    }

    private static string ReplaceFirst(string text, string search, string replace)
    {
        var pos = text.IndexOf(search, StringComparison.Ordinal);
        if (pos < 0) return text;
        return string.Concat(text.AsSpan(0, pos), replace, text.AsSpan(pos + search.Length));
    }
}