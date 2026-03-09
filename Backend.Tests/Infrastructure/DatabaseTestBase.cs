using Backend.app.Core.Interfaces;
using Backend.app.Infrastructure.Data;
using Backend.app.Infrastructure.Auth;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging.Abstractions;
using System.IO;
using System.Collections.Generic;
using System.Threading.Tasks;

namespace Backend.Tests.Infrastructure;

public abstract class DatabaseTestBase
{
    protected readonly IDbConnectionFactory ConnectionFactory;
    protected readonly IConfiguration Configuration;

    protected DatabaseTestBase()
    {
        var envPath = FindEnvFile(Directory.GetCurrentDirectory());
        var configDict = new Dictionary<string, string>();

        if (envPath != null)
        {
            var lines = File.ReadAllLines(envPath);
            foreach (var line in lines)
            {
                var trimmed = line.Trim();
                if (string.IsNullOrWhiteSpace(trimmed) || trimmed.StartsWith("#")) continue;
                
                var parts = trimmed.Split('=', 2);
                if (parts.Length != 2) continue;

                var key = parts[0].Trim();
                var value = parts[1].Trim();

                // Normalize keys for ConfigurationBuilder (replace __ with :)
                var normalizedKey = key.Replace("__", ":");
                configDict[normalizedKey] = value;
            }
        }

        // ⚠️ HARD FORCED FALLBACK FOR THIS SESSION IF .ENV FAILS ⚠️
        if (!configDict.ContainsKey("DatabaseSettings:Provider"))
        {
            configDict["DatabaseSettings:Provider"] = "sqlite";
            configDict["DatabaseSettings:ConnectionString"] = "Data Source=test.db";
        }

        Configuration = new ConfigurationBuilder()
            .AddInMemoryCollection(configDict)
            .Build();

        ConnectionFactory = new DbConnectionFactory(Configuration);
        Dapper.DefaultTypeMap.MatchNamesWithUnderscores = true;

        InitializeDatabaseAsync().Wait();
    }

    private async Task InitializeDatabaseAsync()
    {
        var provider = Configuration["DatabaseSettings:Provider"]?.ToLower();
        var hasher = new Argon2PasswordHasher(NullLogger<Argon2PasswordHasher>.Instance);

        if (provider == "postgres")
        {
            var initializer = new PostgresDbInitializer(
                ConnectionFactory, 
                NullLogger<PostgresDbInitializer>.Instance,
                hasher
            );
            await initializer.InitializeAsync();
        }
        else if (provider == "sqlite")
        {
            var initializer = new SqliteDbInitializer(
                ConnectionFactory,
                NullLogger<SqliteDbInitializer>.Instance,
                hasher
            );
            await initializer.InitializeAsync();
        }
    }

    private static string? FindEnvFile(string startDir)
    {
        var currentDir = new DirectoryInfo(startDir);
        for (int i = 0; i < 5; i++) // Go up max 5 levels
        {
            if (currentDir == null) break;
            var potentialPath = Path.Combine(currentDir.FullName, ".env");
            if (File.Exists(potentialPath)) return potentialPath;
            currentDir = currentDir.Parent;
        }
        return null;
    }
}
