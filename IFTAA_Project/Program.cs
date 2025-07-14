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

// 2. Configure Authentication
builder.Services.AddAuthentication("BasicAuthentication")
    .AddScheme<AuthenticationSchemeOptions, BasicAuthenticationHandler>("BasicAuthentication", null);

// 3. Configure HttpClient for Python Service
builder.Services.AddHttpClient("PythonApiClient", client =>
{
    client.BaseAddress = new Uri(builder.Configuration["PYTHON_AI_SERVICE_URL"] ?? "http://python-ai-service:5001");
});

// 4. Register Custom Services
builder.Services.AddScoped<PythonAiServiceClient>();
builder.Services.AddScoped<FatwaService>();
builder.Services.AddScoped<UserService>();

// Add services to the container.
// Learn more about configuring OpenAPI at https://aka.ms/aspnet/openapi
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();

builder.Services.AddControllers();
// Learn more about configuring Swagger/OpenAPI at https://aka.ms/aspnetcore/swashbuckle

var app = builder.Build();

// Configure the HTTP request pipeline.
if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI();
}

app.UseHttpsRedirection();

app.UseAuthorization();

// Add health check endpoint
app.MapGet("/health", () => Results.Ok(new { status = "healthy", timestamp = DateTime.UtcNow }));

app.MapControllers();

app.Run();
