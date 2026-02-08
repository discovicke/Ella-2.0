using Backend.app.API.Endpoints;
using Backend.app.Core.Interfaces;
using Backend.app.Core.Services;
using Backend.app.Infrastructure.Auth;
using Backend.app.Infrastructure.Data;
using Backend.app.Infrastructure.Repositories.Sqlite;
using DotNetEnv;
using Scalar.AspNetCore;

// 1. LOAD SECRETS (.env)
Env.Load();

var builder = WebApplication.CreateBuilder(args);

// 2. CONFIGURATION
builder.Configuration.AddEnvironmentVariables();
builder.Services.AddOpenApi();

// Fix Enums for Frontend
builder.Services.ConfigureHttpJsonOptions(options =>
{
    options.SerializerOptions.Converters.Add(
        new System.Text.Json.Serialization.JsonStringEnumConverter()
    );
});

// 3. SETUP (Using Local Methods)
ConfigureDatabase(builder);
ConfigureCoreServices(builder.Services);

var app = builder.Build();

// 4. PIPELINE
var logger = app.Services.GetRequiredService<ILogger<Program>>();
app.Lifetime.ApplicationStarted.Register(() => logger.LogInformation("App started."));

// Seed Database
using (var scope = app.Services.CreateScope())
{
    var dbInitializer = scope.ServiceProvider.GetService<IDbInitializer>();
    if (dbInitializer != null)
        await dbInitializer.InitializeAsync();
}

// Frontend & Dev Tools
app.UseDefaultFiles();
app.UseStaticFiles();

if (app.Environment.IsDevelopment())
{
    app.MapOpenApi();
    app.MapScalarApiReference();
}

// Security
app.UseJwtAuthentication();

// Endpoints
var api = app.MapGroup("api");
api.MapAuthEndpoints();
api.MapUserEndpoints();
api.MapRoomEndpoints();
api.MapBookingEndpoints();

// Fallback to index.html for SPA routing
app.MapFallbackToFile("index.html");

app.Run();

// ---------------------------------------------------------
// LOCAL CONFIGURATION METHODS
// ---------------------------------------------------------

static void ConfigureDatabase(WebApplicationBuilder builder)
{
    // Global Dapper Settings
    Dapper.DefaultTypeMap.MatchNamesWithUnderscores = true;

    var services = builder.Services;
    var configuration = builder.Configuration;

    var dbProvider = configuration["DatabaseSettings:Provider"]?.ToLower();

    if (string.IsNullOrEmpty(dbProvider))
    {
        throw new InvalidOperationException("Database Provider is not configured.");
    }

    services.AddSingleton<IDbConnectionFactory, DbConnectionFactory>();

    switch (dbProvider)
    {
        case "sqlite":
            services.AddScoped<IRoomRepository, SqliteRoomRepo>();
            services.AddScoped<IRoomReadModelRepository, SqliteRoomReadModelRepo>();
            services.AddScoped<IUserRepository, SqliteUserRepo>();
            services.AddScoped<IBookingRepository, SqliteBookingRepo>();
            services.AddScoped<IBookingReadModelRepository, SqliteBookingReadModelRepo>();
            services.AddScoped<IDbInitializer, SqliteDbInitializer>();
            break;

        case "postgres":
            throw new NotImplementedException("Postgres is not supported yet.");

        default:
            throw new NotSupportedException($"Provider '{dbProvider}' is not supported.");
    }
}

static void ConfigureCoreServices(IServiceCollection services)
{
    // Auth
    services.AddSingleton<IPasswordHasher, Argon2PasswordHasher>();
    services.AddSingleton<ITokenProvider, JwtTokenProvider>();

    // Business Logic
    services.AddScoped<AuthService>();
    services.AddScoped<RoomService>();
    services.AddScoped<UserService>();
    services.AddScoped<BookingService>();
}
