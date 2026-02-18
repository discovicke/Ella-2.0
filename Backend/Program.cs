using System.IO;
using Backend.app.API.Endpoints;
using Backend.app.Core.Interfaces;
using Backend.app.Core.Services;
using Backend.app.Infrastructure.Auth;
using Backend.app.Infrastructure.Data;
using Backend.app.Infrastructure.Middleware;
using Backend.app.Infrastructure.Repositories.Sqlite;
using DotNetEnv;
using Microsoft.OpenApi.Models;
using Scalar.AspNetCore;

// 1. LOAD SECRETS (.env)
// Try explicit path inside the Backend project directory first (helps IDEs with different working directories)
var envPathExplicit = Path.Combine(Directory.GetCurrentDirectory(), ".env");
if (File.Exists(envPathExplicit))
{
    Env.Load(envPathExplicit);
}
else
{
    // Fallback to default behavior (searches upwards from current dir)
    Env.Load();
}

var builder = WebApplication.CreateBuilder(args);

// 2. CONFIGURATION
builder.Configuration.AddEnvironmentVariables();
ConfigureOpenApi(builder.Services);
builder.Services.AddProblemDetails();
builder.Services.AddExceptionHandler<GlobalExceptionHandler>();

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

// --- RUN DATABASE INITIALIZER ON STARTUP ---
using (var scope = app.Services.CreateScope())
{
    var initializer = scope.ServiceProvider.GetService<IDbInitializer>();
    if (initializer is not null)
    {
        try
        {
            await initializer.InitializeAsync();
        }
        catch (Exception ex)
        {
            var logger = scope.ServiceProvider.GetService<ILogger<Program>>();
            logger?.LogError(ex, "Database initialization failed on startup.");
            throw;
        }
    }
}

// --- START OF PIPELINE ---

// 0. THE SAFETY NET
app.UseExceptionHandler();

// 1. THE FILE CHECKER
app.UseDefaultFiles();
app.UseStaticFiles();

// 2. THE DEV TOOLS (Conditional)
if (app.Environment.IsDevelopment())
{
    app.MapOpenApi();
    app.MapScalarApiReference();
}

// 3. THE BOUNCER (Security)
app.UseJwtAuthentication();

// 4. THE API GATES
var api = app.MapGroup("api");
api.MapAuthEndpoints();
api.MapUserEndpoints();
api.MapRoomEndpoints();
api.MapAssetEndpoints();
api.MapBookingEndpoints();
api.MapRegistrationEndpoints();
api.MapPermissionTemplateEndpoints();

// 5. THE CATCH-ALL (SPA Fallback)
app.MapFallbackToFile("index.html");

// --- END OF PIPELINE ---

app.Run(); // <--- Start the machine!

// ---------------------------------------------------------
// LOCAL CONFIGURATION METHODS
// ---------------------------------------------------------

static void ConfigureOpenApi(IServiceCollection services)
{
    services.AddOpenApi(options =>
    {
        options.AddDocumentTransformer(
            (document, context, cancellationToken) =>
            {
                // Ensure the document is not null
                document.Info ??= new OpenApiInfo();
                document.Components ??= new OpenApiComponents();
                document.Components.SecuritySchemes ??=
                    new Dictionary<string, OpenApiSecurityScheme>();
                document.SecurityRequirements ??= new List<OpenApiSecurityRequirement>();

                // Configure the document
                document.Info.Title = "ELLA Booking System API";
                document.Info.Version = "v1";
                document.Info.Description =
                    "Welcome to the ELLA Booking System API. \n\n"
                    + "This API provides endpoints for managing rooms, assets, users, registrations, and bookings. "
                    + "Most modification endpoints require authentication and Admin privileges.\n\n"
                    + "**Authentication:**\n"
                    + "1. Login via `POST /api/auth/login` to receive a JWT token.\n"
                    + "2. Copy the received token (e.g. `ey...`).\n"
                    + "3. Enter the token in the value field to the right.\n\n\n"
                    + "*Note: Scalar automatically adds the 'Bearer ' prefix for you.*";

                const string schemeKey = "Bearer";

                // Define the Security Scheme
                document.Components.SecuritySchemes[schemeKey] = new OpenApiSecurityScheme
                {
                    Type = SecuritySchemeType.Http,
                    Scheme = "bearer",
                    BearerFormat = "JWT",
                    In = ParameterLocation.Header,
                    Description = "JWT Authorization header using the Bearer scheme.",
                };

                // Apply globally
                document.SecurityRequirements.Clear();
                document.SecurityRequirements.Add(
                    new OpenApiSecurityRequirement
                    {
                        {
                            new OpenApiSecurityScheme
                            {
                                Reference = new OpenApiReference
                                {
                                    Type = ReferenceType.SecurityScheme,
                                    Id = schemeKey,
                                },
                            },
                            Array.Empty<string>()
                        },
                    }
                );

                return Task.CompletedTask;
            }
        );
    });
}

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
            services.AddScoped<IAssetRepository, SqliteAssetRepo>();
            services.AddScoped<IPermissionRepository, SqlitePermissionRepo>();
            services.AddScoped<IPermissionTemplateRepository, SqlitePermissionTemplateRepo>();
            services.AddScoped<IRegistrationRepository, SqliteRegistrationRepo>();
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
    services.AddScoped<AssetService>();
    services.AddScoped<RegistrationService>();
    services.AddScoped<PermissionTemplateService>();
}
