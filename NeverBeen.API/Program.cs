using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Diagnostics.HealthChecks;
using Microsoft.IdentityModel.Tokens;
using Microsoft.OpenApi.Models;
using NeverBeen.API.Data;
using NeverBeen.API.Middleware;
using NeverBeen.API.Services;
using System.Text;

var builder = WebApplication.CreateBuilder(args);

// ---------------------------------------------------------------------------
// Database.
// Default provider is Azure SQL Server (Microsoft.EntityFrameworkCore.SqlServer).
// Set Database:Provider to "Sqlite" for quick local development without SQL Server
// (see appsettings.Development.json).
// ---------------------------------------------------------------------------
var dbProvider = builder.Configuration["Database:Provider"] ?? "SqlServer";
var connectionString = builder.Configuration.GetConnectionString("NeverBeen")
    ?? "Server=localhost;Database=NeverBeen;User Id=sa;Password=ChangeMe;TrustServerCertificate=True;";

builder.Services.AddDbContext<AppDbContext>(options =>
{
    if (dbProvider.Equals("Sqlite", StringComparison.OrdinalIgnoreCase))
        options.UseSqlite(connectionString);
    else
        options.UseSqlServer(connectionString);
});

// ---------------------------------------------------------------------------
// Authentication (JWT issued after the OAuth login) and authorization.
// ---------------------------------------------------------------------------
var jwtSection = builder.Configuration.GetSection("Jwt");
var signingKey = jwtSection["SigningKey"] ?? string.Empty;
if (Encoding.UTF8.GetByteCount(signingKey) < 32)
    throw new InvalidOperationException(
        "Jwt:SigningKey is not configured or is too short. Set a strong secret of at least 32 characters " +
        "(e.g. via user secrets or Azure App Configuration / Key Vault).");

builder.Services
    .AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
    .AddJwtBearer(options =>
    {
        options.TokenValidationParameters = new TokenValidationParameters
        {
            ValidateIssuer = true,
            ValidIssuer = jwtSection["Issuer"] ?? "NeverBeen.API",
            ValidateAudience = true,
            ValidAudience = jwtSection["Audience"] ?? "NeverBeen.Web",
            ValidateIssuerSigningKey = true,
            IssuerSigningKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(signingKey)),
            ValidateLifetime = true,
            ClockSkew = TimeSpan.FromMinutes(5)
        };
    });

builder.Services.AddAuthorization();

// ---------------------------------------------------------------------------
// Controllers + Swagger UI (available under /swagger in Development).
// ---------------------------------------------------------------------------
builder.Services.AddControllers();
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen(options =>
{
    options.SwaggerDoc("v1", new OpenApiInfo
    {
        Title = "NeverBeen Community API",
        Version = "v1",
        Description = "OAuth (Google / Facebook / Microsoft) SSO login, registration, user profiles, photo galleries and the NeverBeen Community Message Book."
    });

    options.AddSecurityDefinition("Bearer", new OpenApiSecurityScheme
    {
        Name = "Authorization",
        Type = SecuritySchemeType.Http,
        Scheme = "bearer",
        BearerFormat = "JWT",
        In = ParameterLocation.Header,
        Description = "Paste the JWT returned by POST /api/auth/oauth/login (e.g. \"Bearer eyJ...\")"
    });

    options.AddSecurityRequirement(new OpenApiSecurityRequirement
    {
        {
            new OpenApiSecurityScheme
            {
                Reference = new OpenApiReference { Type = ReferenceType.SecurityScheme, Id = "Bearer" }
            },
            Array.Empty<string>()
        }
    });
});

// ---------------------------------------------------------------------------
// OAuth login providers (Google, Facebook, Microsoft).
// ---------------------------------------------------------------------------
builder.Services.Configure<OauthOptions>(builder.Configuration.GetSection("OAuth"));
builder.Services.AddHttpClient();
builder.Services.AddScoped<IOauthLoginProvider, GoogleOauthLoginProvider>();
builder.Services.AddScoped<IOauthLoginProvider, FacebookOauthLoginProvider>();
builder.Services.AddScoped<IOauthLoginProvider, MicrosoftOauthLoginProvider>();

builder.Services.AddSingleton<JwtTokenService>();

// ---------------------------------------------------------------------------
// CORS for the Angular frontend. List the allowed origins (comma separated)
// in Cors:AllowedOrigins. When the list is empty any origin is allowed -
// only use this during local development.
// ---------------------------------------------------------------------------
var corsOrigins = (builder.Configuration["Cors:AllowedOrigins"] ?? string.Empty)
    .Split(',', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries);

builder.Services.AddCors(options =>
{
    options.AddDefaultPolicy(policy =>
    {
        if (corsOrigins.Length == 0)
            policy.AllowAnyOrigin().AllowAnyHeader().AllowAnyMethod();
        else
            policy.WithOrigins(corsOrigins).AllowAnyHeader().AllowAnyMethod();
    });
});

// ---------------------------------------------------------------------------
// Health check (GET /health) including a database connectivity check.
// ---------------------------------------------------------------------------
builder.Services.AddHealthChecks().AddDbContextCheck<AppDbContext>("neverbeen-db");

// ---------------------------------------------------------------------------
// Database initializer: creates the schema and seeds countries/cities.
// ---------------------------------------------------------------------------
builder.Services.AddScoped<IDbInitializer, DbInitializer>();

var app = builder.Build();

using (var scope = app.Services.CreateScope())
{
    var initializer = scope.ServiceProvider.GetRequiredService<IDbInitializer>();
    await initializer.InitializeAsync();
}

app.UseMiddleware<ExceptionHandlingMiddleware>();

if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI();
}

app.UseCors();
app.UseAuthentication();
app.UseAuthorization();

app.MapControllers();
app.MapHealthChecks("/health");

app.Run();
