using Microsoft.JSInterop;

namespace ArmageddonRidge.Client.Services;

/// <summary>
/// Blazor wrapper around the generated WebAudio sound-effect engine.
/// </summary>
/// <param name="js">Browser JavaScript runtime used to import and call the audio module.</param>
public sealed class AudioService(IJSRuntime js) : IAsyncDisposable
{
    private IJSObjectReference? _module;

    /// <summary>
    /// Imports and initializes the browser audio module.
    /// </summary>
    public async ValueTask InitializeAsync()
    {
        _module ??= await js.InvokeAsync<IJSObjectReference>("import", "./js/audioEngine.js");
        await _module.InvokeVoidAsync("initialize");
    }

    /// <summary>
    /// Unlocks audio playback after a user gesture.
    /// </summary>
    public async ValueTask UnlockAsync()
    {
        if (_module is not null)
        {
            await _module.InvokeVoidAsync("unlock");
        }
    }

    /// <summary>
    /// Plays a named generated sound effect when audio is initialized.
    /// </summary>
    public async ValueTask PlayAsync(string sound)
    {
        if (_module is not null)
        {
            await _module.InvokeVoidAsync("play", sound);
        }
    }

    /// <summary>
    /// Sets the master sound-effect volume.
    /// </summary>
    public async ValueTask SetVolumeAsync(float volume)
    {
        if (_module is not null)
        {
            await _module.InvokeVoidAsync("setVolume", volume);
        }
    }

    /// <summary>
    /// Releases the imported JavaScript module.
    /// </summary>
    public async ValueTask DisposeAsync()
    {
        if (_module is not null)
        {
            await _module.DisposeAsync();
        }
    }
}
