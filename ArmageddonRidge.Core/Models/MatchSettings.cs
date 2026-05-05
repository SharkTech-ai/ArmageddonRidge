namespace ArmageddonRidge.Core.Models;

/// <summary>
/// User-selectable setup values for creating a deterministic match.
/// </summary>
/// <param name="Difficulty">CPU skill profile used for planning and budgeting.</param>
/// <param name="StartingCash">Initial player cash for the run.</param>
/// <param name="TerrainSeed">Optional terrain seed; random when omitted.</param>
/// <param name="RoundLimit">Maximum campaign-style rounds before ending a run.</param>
/// <param name="EnableNuclearWeapons">Whether nuclear weapons can appear and be used.</param>
/// <param name="EnableShop">Whether the player starts rounds in the shop phase.</param>
public sealed record MatchSettings(
    Difficulty Difficulty = Difficulty.Normal,
    int StartingCash = GameConstants.StartingCash,
    int? TerrainSeed = null,
    int RoundLimit = 10,
    bool EnableNuclearWeapons = true,
    bool EnableShop = true);

/// <summary>
/// Persisted browser-local progression and preferences.
/// </summary>
/// <param name="BestScore">Highest recorded cash score.</param>
/// <param name="CampaignRound">Last reached campaign round.</param>
/// <param name="Losses">Number of campaign losses recorded for the run.</param>
/// <param name="UnlockedWeapons">Weapon identifiers unlocked for future runs.</param>
/// <param name="LastUsedWeapon">Weapon identifier selected most recently.</param>
/// <param name="Settings">Saved player settings.</param>
public sealed record SaveGame(
    int BestScore,
    int CampaignRound,
    int Losses,
    IReadOnlyCollection<string> UnlockedWeapons,
    string LastUsedWeapon,
    GameSettings Settings);

/// <summary>
/// Browser-local player preferences that affect presentation and starting conditions.
/// </summary>
public sealed record GameSettings(
    float MasterVolume = 0.8f,
    float SfxVolume = 0.9f,
    bool ScreenShake = true,
    bool ReducedMotion = false,
    bool ShowTutorialHints = true,
    bool EnableNuclearWeapons = true,
    Difficulty Difficulty = Difficulty.Normal,
    int StartingCash = GameConstants.StartingCash);
