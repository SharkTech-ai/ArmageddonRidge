using Microsoft.JSInterop;

namespace ArmageddonRidge.Client.Services;

public sealed class AudioService : IAsyncDisposable
{
    private readonly IJSRuntime _js;
    private IJSObjectReference? _module;

    public AudioService(IJSRuntime js)
    {
        _js = js;
    }

    public async ValueTask InitializeAsync()
    {
        _module ??= await _js.InvokeAsync<IJSObjectReference>("import", "./js/audioEngine.js");
        await _module.InvokeVoidAsync("initialize");
    }

    public async ValueTask UnlockAsync()
    {
        if (_module is not null)
        {
            await _module.InvokeVoidAsync("unlock");
        }
    }

    public async ValueTask PlayAsync(string sound)
    {
        if (_module is not null)
        {
            await _module.InvokeVoidAsync("play", sound);
        }
    }

    public async ValueTask SetVolumeAsync(float volume)
    {
        if (_module is not null)
        {
            await _module.InvokeVoidAsync("setVolume", volume);
        }
    }

    public async ValueTask DisposeAsync()
    {
        if (_module is not null)
        {
            await _module.DisposeAsync();
        }
    }
}
