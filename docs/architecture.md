# Architecture

Armageddon Ridge is split around a simple rule: C# owns gameplay; JavaScript owns browser hot paths.

## Core

`ArmageddonRidge.Core` contains deterministic models and services:

- `GameEngine` coordinates phases, firing, turn progression, round results, rewards, and next-round setup.
- `ProjectileSimulator` runs fixed-step projectile motion.
- `TerrainMask` stores a compact heightmap/mask hybrid for fast collision and deformation.
- `ExplosionService` applies falloff, shield bypass, radiation, and tank damage.
- `CpuOpponent` uses the same projectile simulator as the player shot flow.

## Client

`ArmageddonRidge.Client` contains:

- Blazor pages/components for menu, HUD, shop, settings, and benchmarks.
- `CanvasRenderer` interop to `canvasRenderer.js`.
- `AudioService` interop to `audioEngine.js`.
- `BrowserStorage` for local settings/progress.

## Rendering

Rendering receives compact scene snapshots from C#. Terrain remains authoritative in the core. JavaScript draws sprites, terrain, projectile trails, explosions, shield shimmer, radiation zones, and screen shake.

## Static Deployment

The client publishes as static files and uses relative asset URLs, making CDN and GitHub Pages deployment straightforward.
