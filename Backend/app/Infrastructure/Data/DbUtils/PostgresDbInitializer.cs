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

        // Post-schema migration: ensure new columns exist (for databases created before these were added)
        
        // 1. Bookings lesson flag and recurring group id
        await conn.ExecuteAsync(
            "ALTER TABLE bookings ADD COLUMN IF NOT EXISTS is_lesson BOOLEAN NOT NULL DEFAULT FALSE;"
        );
        await conn.ExecuteAsync(
            "ALTER TABLE bookings ADD COLUMN IF NOT EXISTS recurring_group_id UUID;"
        );

        // 2. Account activation and password reset columns
        await conn.ExecuteAsync(
            "ALTER TABLE users ADD COLUMN IF NOT EXISTS is_active BOOLEAN NOT NULL DEFAULT TRUE;"
        );
        await conn.ExecuteAsync(
            "ALTER TABLE users ADD COLUMN IF NOT EXISTS reset_token_hash TEXT;"
        );
        await conn.ExecuteAsync(
            "ALTER TABLE users ADD COLUMN IF NOT EXISTS reset_token_expires TIMESTAMPTZ;"
        );

        // Add permission_level column
        await conn.ExecuteAsync(@"
            ALTER TABLE users ADD COLUMN IF NOT EXISTS permission_level INTEGER NOT NULL DEFAULT 1;
            ALTER TABLE users DROP CONSTRAINT IF EXISTS chk_permission_level;
            ALTER TABLE users ADD CONSTRAINT chk_permission_level CHECK (permission_level >= 1 AND permission_level <= 10);
        ");

        // Set default levels for existing users based on their template
        await conn.ExecuteAsync(@"
            UPDATE users SET permission_level = 10 WHERE permission_template_id = (SELECT id FROM permission_templates WHERE name = 'admin');
            UPDATE users SET permission_level = 5 WHERE permission_template_id = (SELECT id FROM permission_templates WHERE name = 'teacher');
            UPDATE users SET permission_level = 1 WHERE permission_template_id = (SELECT id FROM permission_templates WHERE name = 'student');
        ");

        // Add user_booking_slugs table
        await conn.ExecuteAsync(@"
            CREATE TABLE IF NOT EXISTS user_booking_slugs (
                id BIGINT PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
                user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                slug TEXT NOT NULL UNIQUE,
                is_active BOOLEAN NOT NULL DEFAULT TRUE,
                created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
            );
            CREATE UNIQUE INDEX IF NOT EXISTS idx_booking_slugs_slug ON user_booking_slugs(slug);
        ");

        // 4. Resource Management tables
        await conn.ExecuteAsync(@"
            CREATE TABLE IF NOT EXISTS resource_categories (
                id BIGINT PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
                name TEXT NOT NULL UNIQUE
            );
            CREATE TABLE IF NOT EXISTS bookable_resources (
                id BIGINT PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
                category_id BIGINT NOT NULL REFERENCES resource_categories(id) ON DELETE RESTRICT,
                campus_id BIGINT NOT NULL REFERENCES campus(id) ON DELETE RESTRICT,
                name TEXT NOT NULL,
                description TEXT,
                is_active BOOLEAN NOT NULL DEFAULT TRUE
            );
            CREATE TABLE IF NOT EXISTS resource_bookings (
                id BIGINT PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
                resource_id BIGINT NOT NULL REFERENCES bookable_resources(id) ON DELETE CASCADE,
                user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
                start_time TIMESTAMPTZ NOT NULL,
                end_time TIMESTAMPTZ NOT NULL,
                notes TEXT,
                created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
            );
            CREATE INDEX IF NOT EXISTS idx_resource_bookings_time ON resource_bookings(start_time, end_time);
            CREATE INDEX IF NOT EXISTS idx_resource_bookings_resource ON resource_bookings(resource_id);
        ");

        logger.LogInformation("Schema applied.");
    }

    private async Task SeedIfEmptyAsync(IDbConnection conn)
    {
        // Check if users table has any rows.
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
        var path = Path.Combine(AppContext.BaseDirectory, "app", "Infrastructure", "Data", fileName);
        if (File.Exists(path)) return path;

        var current = new DirectoryInfo(Directory.GetCurrentDirectory());
        for (int i = 0; i < 6; i++)
        {
            if (current == null) break;

            path = Path.Combine(current.FullName, "Backend", "app", "Infrastructure", "Data", fileName);
            if (File.Exists(path)) return path;

            path = Path.Combine(current.FullName, "app", "Infrastructure", "Data", fileName);
            if (File.Exists(path)) return path;

            current = current.Parent;
        }

        return Path.Combine(AppContext.BaseDirectory, "app", "Infrastructure", "Data", fileName);
    }

    private string ReplaceHashPlaceholders(string sql, string password)
    {
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