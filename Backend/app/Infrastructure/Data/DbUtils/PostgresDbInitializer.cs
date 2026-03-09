
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

        var schemaPath = GetFullPath("PostgresSchema.sql");

        if (!File.Exists(schemaPath))
        {
            throw new FileNotFoundException($"Schema file not found at: {schemaPath}");
        }

        var schemaSql = await File.ReadAllTextAsync(schemaPath);

        // Apply schema (creates tables if they don't exist)
        await conn.ExecuteAsync(schemaSql);

        // Post-schema migration: ensure is_lesson exists (for databases created before this column was added)
        await conn.ExecuteAsync(
            "ALTER TABLE bookings ADD COLUMN IF NOT EXISTS is_lesson BOOLEAN NOT NULL DEFAULT FALSE;"
        );

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

        var seedPath = GetFullPath("PostgresSeed.sql");

        if (!File.Exists(seedPath))
        {
            throw new FileNotFoundException($"Seed file not found at: {seedPath}");
        }

        var seedSql = await File.ReadAllTextAsync(seedPath);

        // Replace __HASH__ placeholders with stub hashes
        const string stubPassword = "lösen123";
        logger.LogInformation("Generating password hashes for seed users...");

        seedSql = ReplaceHashPlaceholders(seedSql, stubPassword);

        // Replace __NOLOGIN__ placeholders with an impossible hash (system accounts)
        seedSql = seedSql.Replace("__NOLOGIN__", "!NOLOGIN");

        await conn.ExecuteAsync(seedSql);

        logger.LogInformation("Database seeded successfully.");
    }

    private string GetFullPath(string fileName)
    {
        // 1. Try AppContext.BaseDirectory (standard)
        var path = Path.Combine(AppContext.BaseDirectory, "app", "Infrastructure", "Data", fileName);
        if (File.Exists(path)) return path;

        // 2. Climb up from CurrentDirectory to find the project root or Backend folder
        var current = new DirectoryInfo(Directory.GetCurrentDirectory());
        for (int i = 0; i < 6; i++)
        {
            if (current == null) break;

            // Try <current>/Backend/app/Infrastructure/Data
            path = Path.Combine(current.FullName, "Backend", "app", "Infrastructure", "Data", fileName);
            if (File.Exists(path)) return path;

            // Try <current>/app/Infrastructure/Data
            path = Path.Combine(current.FullName, "app", "Infrastructure", "Data", fileName);
            if (File.Exists(path)) return path;

            current = current.Parent;
        }

        return Path.Combine(AppContext.BaseDirectory, "app", "Infrastructure", "Data", fileName);
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
