using IFTAA_Project.Data;
using IFTAA_Project.Services;
using Microsoft.AspNetCore.Authentication;
using MongoDB.Driver;

var builder = WebApplication.CreateBuilder(args);

// 1. Configure MongoDB
var mongoConnectionString = builder.Configuration["MONGODB_URI"] ?? "mongodb://admin:IftaaDB2024!@mongodb:27017/iftaa_db?authSource=admin";
var mongoClient = new MongoClient(mongoConnectionString);
var database = mongoClient.GetDatabase("iftaa_db");
builder.Services.AddSingleton<IMongoDatabase>(database);

// 2. Register MongoDB Context
builder.Services.AddScoped<IftaaDbContext>();

// 3. Configure Authentication
builder.Services.AddAuthentication("BasicAuthentication")
    .AddScheme<AuthenticationSchemeOptions, BasicAuthenticationHandler>("BasicAuthentication", null);

// 4. Configure HttpClient
builder.Services.AddHttpClient();

// 5. Configure Python service URL
var pythonServiceUrl = builder.Configuration["PYTHON_AI_SERVICE_URL"] ?? "http://python-ai-service:5001";
builder.Configuration["PythonServiceUrl"] = pythonServiceUrl;

// 6. Register Custom Services
builder.Services.AddScoped<FatwaService>();
builder.Services.AddScoped<UserService>();

// Add services to the container.
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();
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
app.UseAuthentication();
app.UseAuthorization();

// Add health check endpoint
app.MapGet("/health", () => Results.Ok(new { status = "healthy", timestamp = DateTime.UtcNow }));

app.MapControllers();

app.Run();