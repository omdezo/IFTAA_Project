using IFTAA_Project;

var builder = WebApplication.CreateBuilder(args);

// Add services to the container.
// Learn more about configuring OpenAPI at https://aka.ms/aspnet/openapi
builder.Services.AddSingleton<FatwaDataProcessor>();
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

app.Run();

record WeatherForecast(DateOnly Date, int TemperatureC, string? Summary)
{
    public int TemperatureF => 32 + (int)(TemperatureC / 0.5556);
}
