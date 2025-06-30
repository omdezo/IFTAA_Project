using IFTAA_Project;
using IFTAA_Project.DTOs;
using System.Text;
using System.Text.Json;

var builder = WebApplication.CreateBuilder(args);

// Add services to the container.
// Learn more about configuring OpenAPI at https://aka.ms/aspnet/openapi
builder.Services.AddSingleton<FatwaDataProcessor>();
builder.Services.AddHttpClient();
builder.Services.AddOpenApi();

var app = builder.Build();

// Configure the HTTP request pipeline.
if (app.Environment.IsDevelopment())
{
    app.MapOpenApi();
}

app.UseHttpsRedirection();

app.MapGet("/process-fatwas", (FatwaDataProcessor processor) =>
{
    var csvFilePath = Path.Combine(app.Environment.ContentRootPath, "..", "fatwas.csv");
    var outputFilePath = Path.Combine(app.Environment.ContentRootPath, "..", "fatwas.json");

    var fatwas = processor.LoadAndCleanFatwas(csvFilePath);
    processor.SaveFatwasByCategoryAsJson(fatwas, outputFilePath);

    return Results.Ok("Fatwas processed and saved to fatwas.json");
})
.WithName("ProcessFatwas");

// New Search Endpoint
app.MapPost("/api/search", async (SearchRequestDto request, IHttpClientFactory clientFactory) =>
{
    var httpClient = clientFactory.CreateClient();
    var pythonApiUrl = "http://127.0.0.1:5001/search";

    var jsonRequest = JsonSerializer.Serialize(new { query = request.Query, lang = request.Language });
    var content = new StringContent(jsonRequest, Encoding.UTF8, "application/json");

    try
    {
        var response = await httpClient.PostAsync(pythonApiUrl, content);
        if (response.IsSuccessStatusCode)
        {
            var jsonResponse = await response.Content.ReadAsStringAsync();
            return Results.Content(jsonResponse, "application/json");
        }
        return Results.StatusCode((int)response.StatusCode);
    }
    catch (HttpRequestException e)
    {
        return Results.Problem($"Could not connect to the search service: {e.Message}", statusCode: 503);
    }
});

app.Run();

record WeatherForecast(DateOnly Date, int TemperatureC, string? Summary)
{
    public int TemperatureF => 32 + (int)(TemperatureC / 0.5556);
}
