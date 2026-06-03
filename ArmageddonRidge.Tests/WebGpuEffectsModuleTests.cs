using System.Diagnostics;
using System.Text.Json;

namespace ArmageddonRidge.Tests;

public sealed class WebGpuEffectsModuleTests
{
    [Fact]
    public async Task WebGpuImpactTimingHonorsExplosionTriggerIndexes()
    {
        var repoRoot = FindRepoRoot();
        var modulePath = Path.GetFullPath(Path.Combine(repoRoot, "ArmageddonRidge.Client", "wwwroot", "js", "webGpuEffectsRenderer.js"));
        var moduleUri = new Uri(modulePath).AbsoluteUri;
        var script = $$"""
            const effects = await import({{JsonSerializer.Serialize(moduleUri)}});
            const payload = {
                weaponId: 'gbu-57-mop',
                visualKind: 'PenetratorSecondary',
                trailPointCount: 100,
                trail: Array.from({ length: 100 }, (_, index) => ({ x: index, y: index })),
                explosions: [
                    { x: 40, y: 40, radius: 32, terrainRadius: 50, visualKind: 'PenetratorPrimary', triggerIndex: 40 },
                    { x: 80, y: 80, radius: 62, terrainRadius: 130, visualKind: 'PenetratorSecondary', triggerIndex: -1 }
                ]
            };

            const finalDelay = effects.estimateImpactDelayMs(payload);
            const primaryDelay = effects.estimateExplosionDelayMs(payload, payload.explosions[0]);
            const secondaryDelay = effects.estimateExplosionDelayMs(payload, payload.explosions[1]);
            const pascalDelay = effects.estimateExplosionDelayMs(payload, { TriggerIndex: 40 });
            if (!(primaryDelay >= 80 && primaryDelay < finalDelay)) {
                throw new Error(`Expected primary delay before final impact, got primary=${primaryDelay} final=${finalDelay}`);
            }
            if (secondaryDelay !== finalDelay) {
                throw new Error(`Expected untimed secondary to use final delay, got secondary=${secondaryDelay} final=${finalDelay}`);
            }
            if (pascalDelay !== primaryDelay) {
                throw new Error(`Expected Pascal-case trigger index to match camel-case delay, got pascal=${pascalDelay} camel=${primaryDelay}`);
            }
            """;

        using var process = new Process
        {
            StartInfo = new ProcessStartInfo
            {
                FileName = "node",
                ArgumentList = { "--input-type=module", "--eval", script },
                WorkingDirectory = repoRoot,
                RedirectStandardOutput = true,
                RedirectStandardError = true,
                UseShellExecute = false,
                CreateNoWindow = true
            }
        };

        Assert.True(process.Start(), "Failed to start node for WebGPU impact timing smoke.");
        var output = await process.StandardOutput.ReadToEndAsync();
        var error = await process.StandardError.ReadToEndAsync();
        await process.WaitForExitAsync();

        Assert.True(
            process.ExitCode == 0,
            $"WebGPU impact timing smoke failed with exit code {process.ExitCode}.{Environment.NewLine}{output}{Environment.NewLine}{error}");
    }

    private static string FindRepoRoot()
    {
        var dir = AppContext.BaseDirectory;
        while (dir is not null)
        {
            if (File.Exists(Path.Combine(dir, "ArmageddonRidge.slnx")))
            {
                return dir;
            }

            dir = Directory.GetParent(dir)?.FullName;
        }

        throw new InvalidOperationException("Could not locate repo root.");
    }
}
