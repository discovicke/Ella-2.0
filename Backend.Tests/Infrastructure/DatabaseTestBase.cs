using Backend.app.Core.Interfaces;
using Backend.app.Infrastructure.Data;
using Microsoft.Extensions.Configuration;
using System.IO;
using System.Collections.Generic;

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
            configDict["DatabaseSettings:Provider"] = "postgres";
            configDict["DatabaseSettings:ConnectionString"] = "Host=localhost;Port=5432;Database=net25_db;Username=net25;Password=SecretNet25Password!;";
        }

        Configuration = new ConfigurationBuilder()
            .AddInMemoryCollection(configDict)
            .Build();

        ConnectionFactory = new DbConnectionFactory(Configuration);
        Dapper.DefaultTypeMap.MatchNamesWithUnderscores = true;
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
