using System.IO;
using System.Threading.RateLimiting;
using Backend.app.API.Endpoints;
using Backend.app.Core.Interfaces;
using Backend.app.Core.Models.DTO;
using Backend.app.Core.Models.Enums;
using Backend.app.Core.Services;
using Backend.app.Infrastructure.Auth;
using Backend.app.Infrastructure.Data;
using Backend.app.Infrastructure.Data.DbUtils;
using Backend.app.Infrastructure.Email;
using Backend.app.Infrastructure.Middleware;
using Backend.app.Infrastructure.Parser;
using Backend.app.Infrastructure.Repositories.Postgres;
using Backend.app.Infrastructure.Repositories.Sqlite;
using DotNetEnv;
using Microsoft.AspNetCore.RateLimiting;
using Microsoft.OpenApi;
using Microsoft.OpenApi.Models;
using Scalar.AspNetCore;

var builder = WebApplication.CreateBuilder(args);

// 1. LOAD SECRETS (.env)
LoadEnvironmentVariables();

// 2. CONFIGURATION
builder.Configuration.AddEnvironmentVariables();
builder.Services.Configure<EmailSettings>(builder.Configuration.GetSection("EmailSettings"));
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

// 3. SETUP
ConfigureDatabase(builder);
ConfigureCoreServices(builder.Services);
builder.Services.AddScoped<IBookingSlugRepository, PostgresBookingSlugRepo>(); // TODO: move into provider switch when SqliteBookingSlugRepo exists
builder.Services.AddScoped<BookingSlugService>();
ConfigureRateLimiting(builder.Services);

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
app.UseRateLimiter();

// 4. THE API GATES
var api = app.MapGroup("api").AddEndpointFilter<ValidationFilter>();
api.MapAuthEndpoints();
api.MapBookingSlugEndpoints();
api.MapUserEndpoints();
api.MapResourceEndpoints();
api.MapRoomEndpoints();
api.MapAssetEndpoints();
api.MapBookingEndpoints();
api.MapRegistrationEndpoints();
api.MapPermissionTemplateEndpoints();
api.MapCampusEndpoints();
api.MapClassEndpoints();
api.MapImportEndpoints();
api.MapPublicBookingEndpoints();

// 5. THE CATCH-ALL (SPA Fallback)
app.MapFallbackToFile("index.html");

// --- END OF PIPELINE ---

app.Run(); // <--- Start the machine!

// ---------------------------------------------------------
// LOCAL CONFIGURATION METHODS
// ---------------------------------------------------------

static void LoadEnvironmentVariables()
{
    // Search for .env or .env-example in current and parent directories (up to 3 levels)
    var currentDir = new DirectoryInfo(Directory.GetCurrentDirectory());
    string? envPath = null;
    string? envExamplePath = null;

    for (int i = 0; i < 4; i++)
    {
        if (currentDir == null) break;
        
        var potentialEnv = Path.Combine(currentDir.FullName, ".env");
        var potentialExample = Path.Combine(currentDir.FullName, ".env-example");

        if (envPath == null && File.Exists(potentialEnv)) envPath = potentialEnv;
        if (envExamplePath == null && File.Exists(potentialExample)) envExamplePath = potentialExample;

        if (envPath != null) break;
        currentDir = currentDir.Parent;
    }

    if (envPath != null)
    {
        Env.Load(envPath);
        Console.WriteLine($"  \u001b[32m\u2714\u001b[0m  Configuration loaded from {envPath}");
    }
    else if (envExamplePath != null)
    {
        var env = Environment.GetEnvironmentVariable("ASPNETCORE_ENVIRONMENT") ?? "";
        if (env.Equals("Production", StringComparison.OrdinalIgnoreCase))
        {
            throw new InvalidOperationException(
                $"Cannot use {envExamplePath} in Production. Create a .env with real credentials."
            );
        }

        Env.Load(envExamplePath);
        Console.WriteLine($"  \u001b[33m\u25b8\u001b[0m  Configuration loaded from {envExamplePath}");
    }
    else
    {
        throw new InvalidOperationException(
            "No .env or .env-example file found. Please ensure it exists in the project root or Backend folder."
        );
    }
}

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

    var dbProviderString = configuration["DatabaseSettings:Provider"];

    if (string.IsNullOrEmpty(dbProviderString))
    {
        throw new InvalidOperationException("Database Provider is not configured.");
    }

    if (!Enum.TryParse<DbProviders>(dbProviderString, ignoreCase: true, out var dbProvider))
    {
        throw new InvalidOperationException(
            $"Invalid database provider: '{dbProviderString}'. Supported values: {string.Join(", ", Enum.GetNames<DbProviders>())}"
        );
    }

    services.AddSingleton<IDbConnectionFactory, DbConnectionFactory>();

    switch (dbProvider)
    {
        case DbProviders.Sqlite:
            services.AddScoped<IDbInitializer, SqliteDbInitializer>();
            services.AddScoped<IRoomRepository, SqliteRoomRepo>();
            services.AddScoped<IRoomTypeRepository, SqliteRoomTypeRepo>();
            services.AddScoped<IRoomReadModelRepository, SqliteRoomReadModelRepo>();
            services.AddScoped<IUserRepository, SqliteUserRepo>();
            services.AddScoped<IBookingRepository, SqliteBookingRepo>();
            services.AddScoped<IBookingReadModelRepository, SqliteBookingReadModelRepo>();
            services.AddScoped<IAssetRepository, SqliteAssetRepo>();
            services.AddScoped<IPermissionRepository, SqlitePermissionRepo>();
            services.AddScoped<IPermissionTemplateRepository, SqlitePermissionTemplateRepo>();
            services.AddScoped<IRegistrationRepository, SqliteRegistrationRepo>();
            services.AddScoped<ICampusRepository, SqliteCampusRepo>();
            services.AddScoped<IClassRepository, SqliteClassRepo>();
            services.AddScoped<IResourceRepository, SqliteResourceRepo>();
            break;

        case DbProviders.Postgres:
            services.AddScoped<IDbInitializer, PostgresDbInitializer>();
            services.AddScoped<IAssetRepository, PostgresAssetRepo>();
            services.AddScoped<IUserRepository, PostgresUserRepo>();
            services.AddScoped<IBookingRepository, PostgresBookingRepo>();
            services.AddScoped<IBookingReadModelRepository, PostgresBookingReadModelRepo>();
            services.AddScoped<IPermissionRepository, PostgresPermissionRepo>();
            services.AddScoped<IPermissionTemplateRepository, PostgresPermissionTemplateRepo>();
            services.AddScoped<IRegistrationRepository, PostgresRegistrationRepo>();
            services.AddScoped<IRoomRepository, PostgresRoomRepo>();
            services.AddScoped<IRoomTypeRepository, PostgresRoomTypeRepo>();
            services.AddScoped<IRoomReadModelRepository, PostgresRoomReadModelRepo>();
            services.AddScoped<ICampusRepository, PostgresCampusRepo>();
            services.AddScoped<IClassRepository, PostgresClassRepo>();
            services.AddScoped<IResourceRepository, PostgresResourceRepo>();
            break;

        case DbProviders.SqlServer:
            throw new NotSupportedException("SQL Server provider is not yet implemented.");
        default:
            throw new NotSupportedException($"Provider '{dbProvider}' is not supported.");
    }
}

static void ConfigureCoreServices(IServiceCollection services)
{
    // Auth
    services.AddSingleton<IPasswordHasher, Argon2PasswordHasher>();
    services.AddSingleton<ITokenProvider, JwtTokenProvider>();

    // Email
    services.AddScoped<IEmailService, BrevoEmailService>();
    // Parser
    services.AddScoped<IParser<StudentImportDto>, ExcelContactsCsvParser>();

    // Business Logic
    services.AddScoped<AuthService>();
    services.AddScoped<RoomService>();
    services.AddScoped<RoomTypeService>();
    services.AddScoped<UserService>();
    services.AddScoped<BookingService>();
    services.AddScoped<AssetService>();
    services.AddScoped<RegistrationService>();
    services.AddScoped<PermissionTemplateService>();
    services.AddScoped<CampusService>();
    services.AddScoped<ClassService>();
    services.AddScoped<UserImportService>();
    services.AddScoped<ResourceService>();
}

static void ConfigureRateLimiting(IServiceCollection services)
{
    services.AddRateLimiter(options =>
    {
        options.RejectionStatusCode = StatusCodes.Status429TooManyRequests;

        options.AddPolicy(
            "publicBooking",
            context =>
                RateLimitPartition.GetSlidingWindowLimiter(
                    partitionKey: context.Connection.RemoteIpAddress?.ToString() ?? "unknown",
                    factory: _ => new SlidingWindowRateLimiterOptions
                    {
                        PermitLimit = 5,
                        Window = TimeSpan.FromMinutes(15),
                        SegmentsPerWindow = 3,
                        QueueProcessingOrder = QueueProcessingOrder.OldestFirst,
                        QueueLimit = 0,
                    }
                )
        );
    });
}
