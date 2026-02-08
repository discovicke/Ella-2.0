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

// --- START OF PIPELINE ---

// 1. THE FILE CHECKER
// "Is the user asking for a file like 'styles.scss'?"
// If YES: Give it to them and STOP here.
// If NO: Pass them to the next step.
app.UseDefaultFiles();
app.UseStaticFiles();

// 2. THE DEV TOOLS (Conditional)
// "Is this a developer?"
// If YES: Show them the API documentation pages.
if (app.Environment.IsDevelopment())
{
    app.MapOpenApi();
    app.MapScalarApiReference();
}

// 3. THE BOUNCER (Security)
// "Does this request have a valid ID card (JWT)?"
// Action: Check the token and stamp the request with the User ID.
app.UseJwtAuthentication();

// 4. THE API GATES
// "Is the user asking for data (e.g., /api/bookings)?"
// Action: Route them to the C# method that handles that specific data.
var api = app.MapGroup("api");
api.MapAuthEndpoints();
api.MapUserEndpoints();
api.MapRoomEndpoints();
api.MapBookingEndpoints();

// 5. THE CATCH-ALL (SPA Fallback)
// "I don't know what this URL is. It must be an Angular page."
// Action: Send them 'index.html' so Angular can handle the routing in the browser.
app.MapFallbackToFile("index.html");

// --- END OF PIPELINE ---

app.Run(); // <--- Start the machine!

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
