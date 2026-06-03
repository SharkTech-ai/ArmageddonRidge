using System.Text.Json;
using ArmageddonRidge.Core;
using ArmageddonRidge.Core.Models;

namespace ArmageddonRidge.Tests;

public sealed class GameSettingsTests
{
    [Fact]
    public void GameSettingsDefaultRendererIsHybrid()
    {
        var settings = new GameSettings();

        Assert.Equal(RenderMode.Hybrid, settings.RenderMode);
    }

    [Fact]
    public void MissingRenderModeDeserializesAsHybridForExistingSaves()
    {
        const string json = """
        {
          "sfxVolume": 0.5,
          "screenShake": false,
          "reducedMotion": true,
          "difficulty": 2,
          "startingCash": 2500,
          "targetingComputerEnabledByDefault": false
        }
        """;

        var settings = JsonSerializer.Deserialize<GameSettings>(json, new JsonSerializerOptions(JsonSerializerDefaults.Web));

        Assert.NotNull(settings);
        Assert.Equal(RenderMode.Hybrid, settings.RenderMode);
        Assert.Equal(Difficulty.Veteran, settings.Difficulty);
        Assert.False(settings.ScreenShake);
    }

    [Fact]
    public void FullWasmRenderModeRoundTripsThroughSaveSettings()
    {
        var settings = new GameSettings(RenderMode: RenderMode.FullWasm);
        var json = JsonSerializer.Serialize(settings, new JsonSerializerOptions(JsonSerializerDefaults.Web));
        var restored = JsonSerializer.Deserialize<GameSettings>(json, new JsonSerializerOptions(JsonSerializerDefaults.Web));

        Assert.NotNull(restored);
        Assert.Equal(RenderMode.FullWasm, restored.RenderMode);
    }

    [Fact]
    public void DisabledNuclearWeaponsRoundTripThroughSaveSettings()
    {
        var settings = new GameSettings(EnableNuclearWeapons: false);
        var json = JsonSerializer.Serialize(settings, new JsonSerializerOptions(JsonSerializerDefaults.Web));
        var restored = JsonSerializer.Deserialize<GameSettings>(json, new JsonSerializerOptions(JsonSerializerDefaults.Web));

        Assert.NotNull(restored);
        Assert.False(restored.EnableNuclearWeapons);
    }
}
