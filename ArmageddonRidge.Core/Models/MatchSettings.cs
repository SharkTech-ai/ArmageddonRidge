namespace ArmageddonRidge.Core.Models;

public sealed record MatchSettings(
    Difficulty Difficulty = Difficulty.Normal,
    int StartingCash = GameConstants.StartingCash,
    int? TerrainSeed = null,
    int RoundLimit = 10,
    bool EnableNuclearWeapons = true,
    bool EnableShop = true);

public sealed record SaveGame(
    int BestScore,
    int CampaignRound,
    int Losses,
    IReadOnlyCollection<string> UnlockedWeapons,
    string LastUsedWeapon,
    GameSettings Settings);

public sealed record GameSettings(
    float MasterVolume = 0.8f,
    float SfxVolume = 0.9f,
    bool ScreenShake = true,
    bool ReducedMotion = false,
    bool ShowTutorialHints = true,
    bool EnableNuclearWeapons = true,
    Difficulty Difficulty = Difficulty.Normal);
