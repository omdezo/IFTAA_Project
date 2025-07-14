using System.Text.Json;
using IFTAA_Project.DTOs;

namespace IFTAA_Project.Services
{
    public class PythonAiServiceClient
    {
        private readonly HttpClient _httpClient;
        private readonly ILogger<PythonAiServiceClient> _logger;

        public PythonAiServiceClient(IHttpClientFactory httpClientFactory, IConfiguration configuration, ILogger<PythonAiServiceClient> logger)
        {
            _httpClient = httpClientFactory.CreateClient("PythonApiClient");
            _httpClient.BaseAddress = new Uri(configuration["PYTHON_AI_SERVICE_URL"] ?? "http://python-ai-service:5001");
            _logger = logger;
        }

        public async Task<string> TranslateAsync(string text, string source = "ar", string target = "en")
        {
            // This is a placeholder. The Python service will need a /translate endpoint.
            // For now, we simulate a translation.
            _logger.LogInformation("Translating text: '{text}' from {source} to {target}", text.Substring(0, Math.Min(20, text.Length)), source, target);
            // return $"Translated: {text}";
            // In a real scenario, you'd have:
            var response = await _httpClient.PostAsJsonAsync("/translate", new { text, source, target });
            if (response.IsSuccessStatusCode)
            {
                var result = await response.Content.ReadFromJsonAsync<JsonElement>();
                return result.GetProperty("translated_text").GetString() ?? text;
            }
            _logger.LogWarning("Translation failed with status code {statusCode}", response.StatusCode);
            return text; // Fallback to original text
        }

        public async Task TriggerEmbeddingAsync(int fatwaId)
        {
            // This endpoint will tell the Python service to embed a specific fatwa.
            _logger.LogInformation("Triggering embedding for Fatwa ID: {fatwaId}", fatwaId);
            // var response = await _httpClient.PostAsJsonAsync("/embed", new { fatwa_id = fatwaId });
            // response.EnsureSuccessStatusCode();
            await Task.CompletedTask; // Placeholder
        }

        public async Task<List<int>> VectorSearchAsync(string query, string language = "ar", int limit = 10)
        {
            try
            {
                var payload = new { query, language, limit };
                var response = await _httpClient.PostAsJsonAsync("/vector-search", payload);
                if (response.IsSuccessStatusCode)
                {
                    var json = await response.Content.ReadFromJsonAsync<JsonElement>();
                    if (json.TryGetProperty("fatwa_ids", out var idsElement) && idsElement.ValueKind == JsonValueKind.Array)
                    {
                        var ids = new List<int>();
                        foreach (var idElem in idsElement.EnumerateArray())
                        {
                            if (idElem.TryGetInt32(out var id)) ids.Add(id);
                        }
                        return ids;
                    }
                }
                _logger.LogWarning("Vector search failed for query '{query}'", query);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "VectorSearchAsync error");
            }
            return new List<int>();
        }

        public async Task DeleteVectorAsync(int fatwaId)
        {
            try
            {
                var response = await _httpClient.PostAsJsonAsync("/delete-vector", new { fatwa_id = fatwaId });
                if (!response.IsSuccessStatusCode)
                {
                    _logger.LogWarning("Vector deletion failed for Fatwa {fatwaId}", fatwaId);
                }
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "DeleteVectorAsync error");
            }
        }
    }
} 