using System.Diagnostics;
using System.Text.Json;

namespace ArmageddonRidge.Tests;

public sealed class WeaponVisualsModuleTests
{
    [Fact]
    public async Task WeaponVisualPredicatesHonorVisualKindFallbacks()
    {
        var repoRoot = FindRepoRoot();
        var modulePath = Path.GetFullPath(Path.Combine(repoRoot, "ArmageddonRidge.Client", "wwwroot", "js", "rendering", "weaponVisuals.js"));
        var moduleUri = new Uri(modulePath).AbsoluteUri;
        var script = $$"""
            const visuals = await import({{JsonSerializer.Serialize(moduleUri)}});
            const checks = [
                ['drone visual kind', visuals.isDroneWeapon(undefined, 'DroneSwarm')],
                ['MOP visual kind', visuals.isMopWeapon(undefined, 'PenetratorSecondary')],
                ['napalm visual kind', visuals.isNapalmWeapon(undefined, 'Fire')],
                ['lava explosion visual kind', visuals.isLavaExplosion({ visualKind: 'Lava' })],
                ['nuclear missile visual kind', visuals.isMissileWeapon(undefined, 'Nuclear')],
                ['patriot visual kind', visuals.isPatriotExplosion({ visualKind: 'PatriotIntercept' })],
                ['shield visual kind', visuals.isShieldHitExplosion({ visualKind: 'ShieldHit' })]
            ];
            const failed = checks.filter(([, ok]) => !ok).map(([name]) => name);
            if (failed.length) {
                throw new Error(`Weapon visual predicate checks failed: ${failed.join(', ')}`);
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

        Assert.True(process.Start(), "Failed to start node for weapon visual predicate smoke.");
        var output = await process.StandardOutput.ReadToEndAsync();
        var error = await process.StandardError.ReadToEndAsync();
        await process.WaitForExitAsync();

        Assert.True(
            process.ExitCode == 0,
            $"Weapon visual predicate smoke failed with exit code {process.ExitCode}.{Environment.NewLine}{output}{Environment.NewLine}{error}");
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
