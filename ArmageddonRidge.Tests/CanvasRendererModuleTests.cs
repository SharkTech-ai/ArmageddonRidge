using System.Diagnostics;
using System.Text.Json;

namespace ArmageddonRidge.Tests;

public sealed class CanvasRendererModuleTests
{
    [Fact]
    public async Task CanvasRendererDropsNonFiniteRenderPoints()
    {
        var repoRoot = FindRepoRoot();
        var modulePath = Path.GetFullPath(Path.Combine(repoRoot, "ArmageddonRidge.Client", "wwwroot", "js", "canvasRenderer.js"));
        var moduleUri = new Uri(modulePath).AbsoluteUri;
        var script = $$"""
            const canvas = await import({{JsonSerializer.Serialize(moduleUri)}});
            const points = canvas.sanitizeRenderPoints([
                { x: 10, y: 20 },
                { x: Number.NaN, y: 30 },
                { x: 40, y: Number.POSITIVE_INFINITY },
                { x: '50', y: '60' }
            ], 2);
            const incomplete = canvas.sanitizeRenderPoints([
                { x: Number.NaN, y: 30 },
                { x: 40, y: 50 }
            ], 2);

            if (points.length !== 2 || points[0].x !== 10 || points[0].y !== 20 || points[1].x !== 50 || points[1].y !== 60) {
                throw new Error(`Unexpected sanitized points ${JSON.stringify(points)}`);
            }

            if (incomplete.length !== 0) {
                throw new Error(`Expected incomplete geometry to be dropped, got ${JSON.stringify(incomplete)}`);
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

        Assert.True(process.Start(), "Failed to start node for Canvas renderer module smoke.");
        var output = await process.StandardOutput.ReadToEndAsync();
        var error = await process.StandardError.ReadToEndAsync();
        await process.WaitForExitAsync();

        Assert.True(
            process.ExitCode == 0,
            $"Canvas renderer module smoke failed with exit code {process.ExitCode}.{Environment.NewLine}{output}{Environment.NewLine}{error}");
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
