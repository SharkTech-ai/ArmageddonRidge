# Armageddon Ridge

Armageddon Ridge is a single-player, turn-based artillery game built as a .NET 10 Blazor WebAssembly standalone app. It is designed as a playable game and as an open-source performance showcase for putting deterministic C# game logic in WebAssembly while using the browser only for canvas rendering and generated WebAudio.

The game is original, retro-inspired, and intentionally avoids copied names, assets, UI, or art from classic artillery games.

## What Is Implemented

- Blazor WebAssembly standalone client with static publish output.
- Deterministic C# core for terrain, projectile physics, explosions, turn flow, CPU shot planning, economy, inventory, shields, radiation zones, and save models.
- Canvas renderer backed by original generated RGBA PNG sprite atlases.
- Generated WebAudio sound effects with browser unlock and volume control.
- Duel flow: menu, shop, battle HUD, player firing, CPU return fire, round result, next round.
- Developer performance overlay and `/benchmarks` route.
- xUnit coverage for projectiles, terrain, game engine behavior, CPU planning, and sprite manifest integrity.

## Requirements

- .NET SDK 10.0 or newer.
- WebAssembly workload installed with the SDK.

## Local Development

```powershell
dotnet restore ArmageddonRidge.slnx
dotnet run --project tools\ArmageddonRidge.AssetPipeline\ArmageddonRidge.AssetPipeline.csproj
dotnet test ArmageddonRidge.Tests\ArmageddonRidge.Tests.csproj
dotnet run --project ArmageddonRidge.Client\ArmageddonRidge.Client.csproj
```

The app runs fully in-browser. No server API is required for gameplay.

Open the local URL printed by `dotnet run`, usually `https://localhost:7141` or `http://localhost:5188`.

## Static CDN Publish

```powershell
dotnet publish ArmageddonRidge.Client\ArmageddonRidge.Client.csproj -c Release
```

Deploy the contents of:

```text
ArmageddonRidge.Client/bin/Release/net10.0/publish/wwwroot
```

The app uses relative asset loading through `<base href="./" />`, so it can be hosted from a CDN origin, GitHub Pages subpath, or any static file host. The generated sprite assets live under `wwwroot/assets/sprites`.

## Performance Notes

- Gameplay simulation is deterministic C# running in WebAssembly.
- Rendering is isolated behind a narrow canvas module to keep JS interop batched.
- The FPS overlay shows frame time, render time, simulation time, terrain edit time, and CPU planning time.
- `/benchmarks` runs repeatable local projectile/AI scenarios for quick smoke checks.

## Architecture

`ArmageddonRidge.Core` owns gameplay truth. Physics, terrain, damage, economy, weapons, CPU AI, and save models are testable C# classes.

`ArmageddonRidge.Client` owns Blazor UI, browser storage, JS interop, canvas rendering, and generated WebAudio playback.

`tools/ArmageddonRidge.AssetPipeline` creates original retro-console PNG sprites and shop icons. Generated assets are checked in so CDN deploys do not need a build-time art step, but the pipeline remains reproducible.

More detail is in [docs/architecture.md](docs/architecture.md).

## Roadmap

- Richer weapon behavior and visual effects.
- More CPU personalities and difficulty tuning.
- Browser smoke tests for canvas rendering.
- Optional WebAssembly AOT/profile-guided publishing pass.
- GitHub Pages or CDN deployment workflow.

## License

MIT. The project uses original names and generated assets; it does not copy copyrighted assets, names, or UI from classic artillery games.
