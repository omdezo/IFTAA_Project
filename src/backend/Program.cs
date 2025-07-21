using IFTAA_Project.Data;
using IFTAA_Project.Services;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.IdentityModel.Tokens;
using MongoDB.Driver;
using System.Text;

var builder = WebApplication.CreateBuilder(args);

// 1. Configure MongoDB
var mongoConnectionString = builder.Configuration["MONGODB_URI"] ?? "mongodb://admin:IftaaDB2024!@mongodb:27017/iftaa_db?authSource=admin";
var mongoClient = new MongoClient(mongoConnectionString);
var database = mongoClient.GetDatabase("iftaa_db");
builder.Services.AddSingleton<IMongoDatabase>(database);

// 2. Register MongoDB Context
builder.Services.AddScoped<IftaaDbContext>();

// 3. Configure JWT Authentication
var jwtSecret = builder.Configuration["JWT:Secret"] ?? "IftaaJWTSecretKey2024ForDevelopmentPurposes";
var jwtIssuer = builder.Configuration["JWT:Issuer"] ?? "IFTAA_API";

builder.Services.AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
    .AddJwtBearer(options =>
    {
        options.TokenValidationParameters = new TokenValidationParameters
        {
            ValidateIssuerSigningKey = true,
            IssuerSigningKey = new SymmetricSecurityKey(Encoding.ASCII.GetBytes(jwtSecret)),
            ValidateIssuer = true,
            ValidIssuer = jwtIssuer,
            ValidateAudience = true,
            ValidAudience = jwtIssuer,
            ValidateLifetime = true,
            ClockSkew = TimeSpan.Zero
        };
    });

builder.Services.AddAuthorization();

// 4. Configure CORS
builder.Services.AddCors(options =>
{
    options.AddPolicy("AllowFrontend", policy =>
    {
        policy.WithOrigins(
                "http://localhost:3000", 
                "http://frontend:3000",
                "http://127.0.0.1:3000",
                "https://localhost:3000",
                "http://iftaa-frontend-dev:3000"
              )
              .AllowAnyMethod()
              .AllowAnyHeader()
              .AllowCredentials();
    });
});

// 5. Configure HttpClient
builder.Services.AddHttpClient();

// 6. Configure Python service URL
var pythonServiceUrl = builder.Configuration["PYTHON_AI_SERVICE_URL"] ?? "http://python-ai-service:5001";
builder.Configuration["PythonServiceUrl"] = pythonServiceUrl;

// 7. Register Custom Services
builder.Services.AddScoped<FatwaService>();
builder.Services.AddScoped<UserService>();
builder.Services.AddScoped<CategoryService>();
builder.Services.AddScoped<IJwtAuthenticationService, JwtAuthenticationService>();
builder.Services.AddScoped<DatabaseSetupService>();

// Add services to the container.
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen(c =>
{
    c.SwaggerDoc("v1", new Microsoft.OpenApi.Models.OpenApiInfo
    {
        Title = "IFTAA Fatwa Management API",
        Version = "v1",
        Description = "RESTful API for managing Islamic fatwas with hierarchical categories and semantic search capabilities",
        Contact = new Microsoft.OpenApi.Models.OpenApiContact
        {
            Name = "IFTAA Development Team",
            Email = "developer@iftaa.com"
        }
    });

    // Add JWT Bearer authentication
    c.AddSecurityDefinition("Bearer", new Microsoft.OpenApi.Models.OpenApiSecurityScheme
    {
        Description = "JWT Authorization header using the Bearer scheme. Enter 'Bearer' [space] and then your token in the text input below.",
        Name = "Authorization",
        In = Microsoft.OpenApi.Models.ParameterLocation.Header,
        Type = Microsoft.OpenApi.Models.SecuritySchemeType.ApiKey,
        Scheme = "Bearer"
    });

    c.AddSecurityRequirement(new Microsoft.OpenApi.Models.OpenApiSecurityRequirement
    {
        {
            new Microsoft.OpenApi.Models.OpenApiSecurityScheme
            {
                Reference = new Microsoft.OpenApi.Models.OpenApiReference
                {
                    Type = Microsoft.OpenApi.Models.ReferenceType.SecurityScheme,
                    Id = "Bearer"
                }
            },
            Array.Empty<string>()
        }
    });

    // Include XML comments for better documentation
    c.IncludeXmlComments(Path.Combine(AppContext.BaseDirectory, "IFTAA_Project.xml"), true);
});
builder.Services.AddControllers()
    .AddJsonOptions(options =>
    {
        options.JsonSerializerOptions.Encoder = System.Text.Encodings.Web.JavaScriptEncoder.UnsafeRelaxedJsonEscaping;
        options.JsonSerializerOptions.PropertyNamingPolicy = null;
    });

var app = builder.Build();

// Configure the HTTP request pipeline.
if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI();
}

app.UseHttpsRedirection();
app.UseCors("AllowFrontend");
app.UseAuthentication();
app.UseAuthorization();

// Add health check endpoint
app.MapGet("/health", () => Results.Ok(new { status = "healthy", timestamp = DateTime.UtcNow }));

app.MapControllers();

// Initialize database indexes and category relationships on startup
using (var scope = app.Services.CreateScope())
{
    var logger = scope.ServiceProvider.GetRequiredService<ILogger<Program>>();
    
    // Initialize database indexes
    var dbSetupService = scope.ServiceProvider.GetRequiredService<DatabaseSetupService>();
    try
    {
        await dbSetupService.EnsureIndexesAsync();
        logger.LogInformation("Database indexes created successfully");
    }
    catch (Exception ex)
    {
        logger.LogWarning(ex, "Failed to create database indexes on startup - continuing anyway");
    }

    // Initialize categories and synchronize category-fatwa relationships
    var categoryService = scope.ServiceProvider.GetRequiredService<CategoryService>();
    try
    {
        // First, ensure category structure is initialized
        var categoriesExist = (await categoryService.GetAllCategoriesAsync()).Any();
        if (!categoriesExist)
        {
            logger.LogInformation("No categories found in database, initializing category structure...");
            await categoryService.InitializeCategoryStructureAsync();
            logger.LogInformation("Category structure initialized successfully");
        }
        
        // Then synchronize category-fatwa relationships
        await categoryService.SyncCategoryFatwaRelationshipsAsync();
        logger.LogInformation("Category-fatwa relationships synchronized successfully");
    }
    catch (Exception ex)
    {
        logger.LogWarning(ex, "Failed to initialize categories or synchronize category-fatwa relationships on startup - continuing anyway");
    }
}

app.Run();