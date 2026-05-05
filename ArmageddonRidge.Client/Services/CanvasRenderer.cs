using System.Numerics;
using ArmageddonRidge.Core.Models;
using Microsoft.AspNetCore.Components;
using Microsoft.JSInterop;

namespace ArmageddonRidge.Client.Services;

/// <summary>
/// Blazor wrapper around the canvas renderer JavaScript module.
/// </summary>
public sealed class CanvasRenderer : IAsyncDisposable
{
    private readonly IJSRuntime _js;
    private IJSObjectReference? _module;

    /// <summary>
    /// Creates a renderer service using the browser JavaScript runtime.
    /// </summary>
    public CanvasRenderer(IJSRuntime js)
    {
        _js = js;
    }

    /// <summary>
    /// Imports the renderer module and binds it to the provided canvas element.
    /// </summary>
    public async ValueTask InitializeAsync(ElementReference canvas)
    {
        _module ??= await _js.InvokeAsync<IJSObjectReference>("import", "./js/canvasRenderer.js");
        await _module.InvokeVoidAsync("initialize", canvas);
    }

    /// <summary>
    /// Sends the current scene snapshot to the renderer.
    /// </summary>
    public async ValueTask<RenderStats?> RenderAsync(object scene)
    {
        if (_module is null)
        {
            return null;
        }

        return await _module.InvokeAsync<RenderStats>("render", scene);
    }

    /// <summary>
    /// Plays the shot animation and explosion effects for a resolved turn.
    /// </summary>
    public async ValueTask PlayShotAsync(
        object scene,
        IReadOnlyList<Vector2> trail,
        IReadOnlyList<ExplosionResult> explosions,
        bool screenShake,
        string? weaponId = null,
        bool intercepted = false,
        Vector2? interceptPoint = null,
        string? ownerTankId = null)
    {
        if (_module is null)
        {
            return;
        }

        await _module.InvokeVoidAsync(
            "playShot",
            scene,
            trail.Select(static point => new { x = point.X, y = point.Y }),
            explosions.Select(explosion => new
            {
                x = explosion.Center.X,
                y = explosion.Center.Y,
                radius = explosion.DamageRadius,
                terrainRadius = explosion.TerrainRadius,
                nuclear = explosion.Nuclear,
                dirt = explosion.DirtAdded,
                weaponId,
                visualKind = explosion.VisualKind.ToString(),
                napalm = explosion.VisualKind == ShotVisualKind.Fire,
                lava = explosion.VisualKind == ShotVisualKind.Lava,
                missile = explosion.VisualKind == ShotVisualKind.Missile,
                drone = explosion.VisualKind == ShotVisualKind.DroneSwarm,
                patriotIntercept = explosion.VisualKind == ShotVisualKind.PatriotIntercept,
                triggerIndex = explosion.TriggerTrailIndex
            }),
            screenShake,
            weaponId,
            new
            {
                intercepted,
                interceptX = interceptPoint?.X,
                interceptY = interceptPoint?.Y,
                ownerTankId
            });
    }

    /// <summary>
    /// Plays the shot animation and explosion effects for a complete resolution object.
    /// </summary>
    public ValueTask PlayShotAsync(object scene, ShotResolution resolution, bool screenShake) =>
        PlayShotAsync(scene, resolution.Trail, resolution.Explosions, screenShake, resolution.WeaponId, resolution.Intercepted, resolution.InterceptPoint, resolution.OwnerTankId);

    /// <summary>
    /// Reads renderer performance counters from the JavaScript module.
    /// </summary>
    public async ValueTask<RenderStats?> GetStatsAsync()
    {
        if (_module is null)
        {
            return null;
        }

        return await _module.InvokeAsync<RenderStats>("getStats");
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

/// <summary>
/// Renderer performance counters reported by the canvas module.
/// </summary>
/// <param name="Fps">Most recent frames-per-second estimate.</param>
/// <param name="FrameMs">Most recent total frame duration.</param>
/// <param name="RenderMs">Most recent canvas render duration.</param>
public sealed record RenderStats(int Fps, double FrameMs, double RenderMs);
