﻿using Backend.app.API.Endpoints;
using Backend.app.Core.Interfaces;
using Backend.app.Core.Services;
using Backend.app.Infrastructure.Auth;
using Backend.app.Infrastructure.Data;
using Backend.app.Infrastructure.Repositories.Sqlite;
using Scalar.AspNetCore;

Dapper.DefaultTypeMap.MatchNamesWithUnderscores = true;

var builder = WebApplication.CreateBuilder(args);

// Add services to the container.
// Learn more about configuring OpenAPI at https://aka.ms/aspnet/openapi

// TODO: Configure services and middleware pipeline
// Reference: src/app.js and src/server.js for Express setup
// Check CORS settings, authentication flow, and static file serving

// IN - appsettings.json
// TODO: Configure connection strings, JWT settings, CORS origins
// Reference: Environment variables or config in src/app.js

// IN - appsettings.Development.json
// TODO: Configure development-specific settings
// Reference: Development environment setup in JS project

builder.Services.AddOpenApi();

#region DYNAMIC DB CONFIG

// Retrieve the Provider string from appsettings.json to determine flow
var dbProvider = builder.Configuration["DatabaseSettings:Provider"]?.ToLower();

// Validate configuration exists
if (string.IsNullOrEmpty(dbProvider))
{
    throw new InvalidOperationException("Database Provider is not configured in appsettings.json.");
}

// Register the Connection Factory (Singleton)
builder.Services.AddSingleton<IDbConnectionFactory, DbConnectionFactory>();

// Register Repositories Dynamically based on Provider
switch (dbProvider)
{
    case "sqlite":
        // Register SQLite-specific implementations
        builder.Services.AddScoped<IRoomRepository, SqliteRoomRepo>();
        builder.Services.AddScoped<IUserRepository, SqliteUserRepo>();
        builder.Services.AddScoped<IBookingRepository, SqliteBookingRepo>();
        
        // Register SQLite Initializer
        builder.Services.AddScoped<DbInitializer>();
        break;

    case "sqlserver":
    case "postgres":
        // Future proofing for other providers
        throw new NotImplementedException($"The provider '{dbProvider}' is not yet implemented.");

    default:
        throw new NotSupportedException($"The database provider '{dbProvider}' is not supported.");
}

#endregion

// Register Auth infrastructure (Singleton - stateless services)
builder.Services.AddSingleton<PasswordHasher>();
builder.Services.AddSingleton<TokenService>();

// Register Business Logic Services (Scoped - per request)
builder.Services.AddScoped<AuthService>();
builder.Services.AddScoped<RoomService>();
builder.Services.AddScoped<UserService>();

var app = builder.Build();

// Acquire a logger from DI and log startup/shutdown events
var logger = app.Services.GetRequiredService<ILogger<Program>>();
logger.LogInformation("Application starting. Environment: {Env}", app.Environment.EnvironmentName);

app.Lifetime.ApplicationStarted.Register(() =>
{
    logger.LogInformation("Application started and is now accepting requests.");
});

app.Lifetime.ApplicationStopping.Register(() =>
{
    logger.LogInformation("Application is stopping...");
});

app.Lifetime.ApplicationStopped.Register(() =>
{
    logger.LogInformation("Application has stopped.");
});

// Initialize database (run schema + seed if empty)
using (var scope = app.Services.CreateScope())
{
    // Try to get the initializer (it might not be registered if provider doesn't support it)
    var dbInitializer = scope.ServiceProvider.GetService<DbInitializer>();
    if (dbInitializer != null)
    {
        await dbInitializer.InitializeAsync();
    }
}

if (app.Environment.IsDevelopment())
{
    app.MapOpenApi(); // Generates the underlying JSON file
    app.MapScalarApiReference(); // Hosts the Scalar UI
}

// Enable JWT authentication middleware (validates tokens and attaches user to HttpContext)
app.UseJwtAuthentication();

// API ENDPOINT MAPPINGS
var apiGroup = app.MapGroup("/api");
apiGroup.MapRoomEndpoints();
apiGroup.MapAuthEndpoints();
apiGroup.MapUserEndpoints();

try
{
    logger.LogInformation("Starting web host...");
    app.Run();
}
catch (Exception ex)
{
    logger.LogCritical(ex, "Host terminated unexpectedly");
    throw;
}
finally
{
    logger.LogInformation("Host shutdown sequence complete.");
}