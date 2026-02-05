using System.Data;
using Backend.app.Core.Interfaces;
using Backend.app.Infrastructure.Auth;
using Dapper;

namespace Backend.app.Infrastructure.Data;

/// <summary>
/// Initializes and seeds the database on application startup.
/// Equivalent to the JS db.js initialization logic.
/// </summary>
public class DbInitializer(IDbConnectionFactory connectionFactory, ILogger<DbInitializer> logger, PasswordHasher passwordHasher)
{
    public async Task InitializeAsync()
    {
        logger.LogInformation("Initializing database...");

        await using var conn = connectionFactory.CreateConnection();
        await using (conn.ConfigureAwait(false))
        {
            await conn.OpenAsync();

            // Enable WAL mode for better concurrency
            await conn.ExecuteAsync("PRAGMA journal_mode = WAL;");

            // Enable foreign key constraints
            await conn.ExecuteAsync("PRAGMA foreign_keys = ON;");

            // Run schema
            await RunSchemaAsync(conn);

            // Seed if empty
            await SeedIfEmptyAsync(conn);
        }

        logger.LogInformation("Database initialization complete.");
    }

    private async Task RunSchemaAsync(IDbConnection conn)
    {
        logger.LogInformation("Running schema.sqlite...");

        var schemaPath = Path.Combine(
            AppContext.BaseDirectory,
            "app",
            "Infrastructure",
            "Data",
            "schema.sqlite"
        );

        // Fallback: try relative path from project root (for development)
        if (!File.Exists(schemaPath))
        {
            schemaPath = Path.Combine(
                Directory.GetCurrentDirectory(),
                "app",
                "Infrastructure",
                "Data",
                "schema.sqlite"
            );
        }

        if (!File.Exists(schemaPath))
        {
            throw new FileNotFoundException($"Schema file not found at: {schemaPath}");
        }

        var schemaSql = await File.ReadAllTextAsync(schemaPath);
        await conn.ExecuteAsync(schemaSql);

        logger.LogInformation("Schema applied.");
    }

    private async Task SeedIfEmptyAsync(IDbConnection conn)
    {
        // Check if users table has any rows
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
            "seed.sqlite"
        );

        // Fallback: try relative path from project root (for development)
        if (!File.Exists(seedPath))
        {
            seedPath = Path.Combine(
                Directory.GetCurrentDirectory(),
                "app",
                "Infrastructure",
                "Data",
                "seed.sqlite"
            );
        }

        if (!File.Exists(seedPath))
        {
            throw new FileNotFoundException($"Seed file not found at: {seedPath}");
        }

        var seedSql = await File.ReadAllTextAsync(seedPath);

        // Replace __HASH__ placeholders with stub hashes
        // TODO: Replace with real password hashing when auth is implemented
        const string stubPassword = "lösen123";
        logger.LogInformation("Generating password hashes for seed users...");

        seedSql = ReplaceHashPlaceholders(seedSql, stubPassword);

        await conn.ExecuteAsync(seedSql);

        logger.LogInformation("Database seeded successfully.");
    }

    private string ReplaceHashPlaceholders(string sql, string password)
    {
        // Each __HASH__ gets its own hash (same password, but would be different salts in real impl)
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
