using System.Text.Json;

namespace ArmageddonRidge.Tests;

public sealed class AssetManifestTests
{
    [Fact]
    public void SpriteManifestPointsAtExistingAtlasAndFramesFit()
    {
        var repoRoot = FindRepoRoot();
        var manifestPath = Path.Combine(repoRoot, "ArmageddonRidge.Client", "wwwroot", "assets", "sprites", "atlas.json");
        using var document = JsonDocument.Parse(File.ReadAllText(manifestPath));
        var version = document.RootElement.GetProperty("version").GetString();
        Assert.False(string.IsNullOrWhiteSpace(version));

        var image = document.RootElement.GetProperty("image").GetString();
        Assert.False(string.IsNullOrWhiteSpace(image));

        var imagePath = Path.Combine(repoRoot, "ArmageddonRidge.Client", "wwwroot", image!.Replace('/', Path.DirectorySeparatorChar));
        Assert.True(File.Exists(imagePath));
        var (width, height, hasAlpha) = ReadPngHeader(imagePath);
        Assert.True(hasAlpha, "Sprite atlas should be RGBA PNG so transparent pixels stay transparent in browsers.");

        var frames = document.RootElement.GetProperty("frames");
        foreach (var requiredFrame in new[] { "playerHull", "cpuHull", "playerTankLow", "playerTankMid", "playerTankHigh", "cpuTankLow", "cpuTankMid", "cpuTankHigh" })
        {
            Assert.True(frames.TryGetProperty(requiredFrame, out _), $"Missing gameplay sprite frame {requiredFrame}.");
        }

        foreach (var frame in frames.EnumerateObject())
        {
            var value = frame.Value;
            var x = value.GetProperty("x").GetInt32();
            var y = value.GetProperty("y").GetInt32();
            var w = value.GetProperty("w").GetInt32();
            var h = value.GetProperty("h").GetInt32();
            Assert.True(x >= 0 && y >= 0 && w > 0 && h > 0, frame.Name);
            Assert.True(x + w <= width, frame.Name);
            Assert.True(y + h <= height, frame.Name);
        }
    }

    private static (int Width, int Height, bool HasAlpha) ReadPngHeader(string path)
    {
        using var stream = File.OpenRead(path);
        using var reader = new BinaryReader(stream);
        var signature = reader.ReadBytes(8);
        Assert.Equal(new byte[] { 137, 80, 78, 71, 13, 10, 26, 10 }, signature);

        var chunkLength = ReadBigEndianInt32(reader);
        var chunkType = new string(reader.ReadChars(4));
        Assert.Equal(13, chunkLength);
        Assert.Equal("IHDR", chunkType);

        var width = ReadBigEndianInt32(reader);
        var height = ReadBigEndianInt32(reader);
        var bitDepth = reader.ReadByte();
        var colorType = reader.ReadByte();
        return (width, height, bitDepth == 8 && colorType == 6);
    }

    private static int ReadBigEndianInt32(BinaryReader reader)
    {
        var bytes = reader.ReadBytes(4);
        return (bytes[0] << 24) | (bytes[1] << 16) | (bytes[2] << 8) | bytes[3];
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
