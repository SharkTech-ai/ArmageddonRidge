using System.Text.Json;
using Microsoft.JSInterop;

namespace ArmageddonRidge.Client.Services;

/// <summary>
/// Typed JSON helper for browser localStorage persistence.
/// </summary>
public sealed class BrowserStorage
{
    private static readonly JsonSerializerOptions JsonOptions = new(JsonSerializerDefaults.Web);
    private readonly IJSRuntime _js;

    /// <summary>
    /// Creates a browser storage helper using the JavaScript runtime.
    /// </summary>
    public BrowserStorage(IJSRuntime js)
    {
        _js = js;
    }

    /// <summary>
    /// Reads and deserializes a value from localStorage.
    /// </summary>
    public async ValueTask<T?> GetAsync<T>(string key)
    {
        var json = await _js.InvokeAsync<string?>("localStorage.getItem", key);
        return string.IsNullOrWhiteSpace(json) ? default : JsonSerializer.Deserialize<T>(json, JsonOptions);
    }

    /// <summary>
    /// Serializes and writes a value to localStorage.
    /// </summary>
    public async ValueTask SetAsync<T>(string key, T value)
    {
        var json = JsonSerializer.Serialize(value, JsonOptions);
        await _js.InvokeVoidAsync("localStorage.setItem", key, json);
    }
}
