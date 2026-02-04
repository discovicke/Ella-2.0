using Backend.app.API.Endpoints;
using Backend.app.Core.Interfaces;
using Backend.app.Core.Services;
using Backend.app.Infrastructure.Auth;
using Backend.app.Infrastructure.Data;
using Backend.app.Infrastructure.Repositories;
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

// DEPENDENCY INJECTION SETUP
// Register the Factory as a Singleton (Lives forever, shared across app)
builder.Services.AddSingleton<IDbConnectionFactory, DbConnectionFactory>();

// Register the Repository as Scoped (Created fresh for each HTTP request)
builder.Services.AddScoped<IRoomRepository, RoomRepo>();
builder.Services.AddScoped<IUserRepository, UserRepo>();
builder.Services.AddScoped<IBookingRepository, BookingRepo>();

// Register the AuthService so it can be injected into our endpoints
builder.Services.AddSingleton<PasswordHasher>();
builder.Services.AddScoped<AuthService>();

// Register the DbInitializer for schema/seed setup
builder.Services.AddScoped<DbInitializer>();

var app = builder.Build();

// Initialize database (run schema + seed if empty)
using (var scope = app.Services.CreateScope())
{
    var dbInitializer = scope.ServiceProvider.GetRequiredService<DbInitializer>();
    await dbInitializer.InitializeAsync();
}

if (app.Environment.IsDevelopment())
{
    app.MapOpenApi(); // Generates the underlying JSON file
    app.MapScalarApiReference(); // Hosts the Scalar UI
}

// ENDPOINT MAPPINGS
app.MapAuthEndpoints();

app.Run();
