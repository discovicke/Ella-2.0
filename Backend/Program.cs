var builder = WebApplication.CreateBuilder(args);

// Add services to the container.
// Learn more about configuring OpenAPI at https://aka.ms/aspnet/openapi

// TODO: Configure services and middleware pipeline
// Reference: src/app.js and src/server.js for Express setup
// Check CORS settings, authentication flow, and static file serving

// TODO: Configure connection strings, JWT settings, CORS origins
// Reference: Environment variables or config in src/app.js

// TODO: Configure development-specific settings
// Reference: Development environment setup in JS project


builder.Services.AddOpenApi();

var app = builder.Build();

app.Run();
