using System.Data;
using Backend.app.Core.Interfaces;
using Dapper;

namespace Backend.app.Infrastructure.Data;

/// <summary>
/// Initializes and seeds the PostgreSQL database on application startup.
/// </summary>
public class PostgresDbInitializer(
    IDbConnectionFactory connectionFactory,
    ILogger<PostgresDbInitializer> logger,
    IPasswordHasher passwordHasher
) : IDbInitializer
{
    public async Task InitializeAsync()
    {
        logger.LogInformation("Initializing PostgreSQL database...");

        await using var conn = connectionFactory.CreateConnection();
        await using (conn.ConfigureAwait(false))
        {
            await conn.OpenAsync();

            // Run schema
            await RunSchemaAsync(conn);

            // Seed if empty
            await SeedIfEmptyAsync(conn);
        }

        logger.LogInformation("PostgreSQL database initialization complete.");
    }

    private async Task RunSchemaAsync(IDbConnection conn)
    {
        logger.LogInformation("Running schema.sql...");

        var schemaPath = Path.Combine(
            AppContext.BaseDirectory,
            "app",
            "Infrastructure",
            "Data",
            "PostgresSchema.sql"
        );

        // Fallback: try relative path from project root (for development)
        if (!File.Exists(schemaPath))
        {
            schemaPath = Path.Combine(
                Directory.GetCurrentDirectory(),
                "app",
                "Infrastructure",
                "Data",
                "PostgresSchema.sql"
            );
        }

        if (!File.Exists(schemaPath))
        {
            throw new FileNotFoundException($"Schema file not found at: {schemaPath}");
        }

        var schemaSql = await File.ReadAllTextAsync(schemaPath);

        // Simple migration: ensure is_lesson exists before running the full schema (which might update views)
        await conn.ExecuteAsync("ALTER TABLE bookings ADD COLUMN IF NOT EXISTS is_lesson BOOLEAN NOT NULL DEFAULT FALSE;");

        // Apply schema
        await conn.ExecuteAsync(schemaSql);

        logger.LogInformation("Schema applied.");
    }

    private async Task SeedIfEmptyAsync(IDbConnection conn)
    {
        // Check if users table has any rows.
        // Table existence should be guaranteed by RunSchemaAsync.
        var userCount = await conn.ExecuteScalarAsync<int>("SELECT COUNT(*) FROM users;");

        if (userCount > 0)
        {
            logger.LogInformation(
                "Database already seeded ({UserCount} users found). Skipping seed.",
                userCount
            );
            return;
        }

        logger.LogInformation("Seeding database with initial data...");

        var seedPath = Path.Combine(
            AppContext.BaseDirectory,
            "app",
            "Infrastructure",
            "Data",
            "PostgresSeed.sql"
        );

        // Fallback: try relative path from project root (for development)
        if (!File.Exists(seedPath))
        {
            seedPath = Path.Combine(
                Directory.GetCurrentDirectory(),
                "app",
                "Infrastructure",
                "Data",
                "PostgresSeed.sql"
            );
        }

        if (!File.Exists(seedPath))
        {
            throw new FileNotFoundException($"Seed file not found at: {seedPath}");
        }

        var seedSql = await File.ReadAllTextAsync(seedPath);

        // Replace __HASH__ placeholders with stub hashes
        const string stubPassword = "lösen123";
        logger.LogInformation("Generating password hashes for seed users...");

        seedSql = ReplaceHashPlaceholders(seedSql, stubPassword);

        await conn.ExecuteAsync(seedSql);

        logger.LogInformation("Database seeded successfully.");
    }

    private string ReplaceHashPlaceholders(string sql, string password)
    {
        // Each __HASH__ gets its own hash
        while (sql.Contains("__HASH__"))
        {
            var hash = passwordHasher.HashPassword(password);
            sql = ReplaceFirst(sql, "__HASH__", hash);
        }

        return sql;
    }

    private static string ReplaceFirst(string text, string search, string replace)
    {
        var pos = text.IndexOf(search, StringComparison.Ordinal);
        if (pos < 0)
            return text;
        return string.Concat(text.AsSpan(0, pos), replace, text.AsSpan(pos + search.Length));
    }
}
