# Contributing

Thanks for helping make Armageddon Ridge a sharper Blazor WebAssembly showcase.

## Quality Bar

- Keep gameplay rules in `ArmageddonRidge.Core` unless the behavior is strictly browser rendering or audio.
- Keep JavaScript interop batched and narrow.
- Add tests for deterministic physics, terrain edits, economy, and CPU decision changes.
- Run the asset pipeline when sprite manifest or generated art source changes.
- Prefer readable hot paths over clever code; measure before optimizing.

## Checks

```powershell
dotnet restore ArmageddonRidge.slnx
dotnet run --project tools\ArmageddonRidge.AssetPipeline\ArmageddonRidge.AssetPipeline.csproj
dotnet format ArmageddonRidge.slnx --verify-no-changes
dotnet test ArmageddonRidge.Tests\ArmageddonRidge.Tests.csproj
dotnet publish ArmageddonRidge.Client\ArmageddonRidge.Client.csproj -c Release
```
