using Backend.app.Core.Interfaces;
using Backend.app.Infrastructure.Data;
using Backend.app.Infrastructure.Repositories.SQLite;

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

// --- 1. DEPENDENCY INJECTION SETUP ---

// Register the Factory as a Singleton (Lives forever, shared across app)
builder.Services.AddSingleton<IDbConnectionFactory, DbConnectionFactory>();

// Register the Repository as Scoped (Created fresh for each HTTP request)
builder.Services.AddScoped<IRoomRepository, SQLiteRoomRepo>();
builder.Services.AddScoped<IUserRepository, SQLiteUserRepo>();
builder.Services.AddScoped<IBookingRepository, SQLiteBookingRepo>();

var app = builder.Build();

app.Run();
