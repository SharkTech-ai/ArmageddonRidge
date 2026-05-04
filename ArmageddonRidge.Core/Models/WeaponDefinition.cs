namespace ArmageddonRidge.Core.Models;

public sealed record WeaponDefinition(
    string Id,
    string DisplayName,
    WeaponCategory Category,
    int Cost,
    float MaxDamage,
    float BlastRadius,
    float TerrainRadius,
    float ProjectileSpeedMultiplier,
    float GravityInfluence,
    float WindInfluence,
    WeaponBehaviorType BehaviorType,
    bool CanDamageSelf,
    float ShieldBypassPercent,
    float Falloff,
    string Description,
    int ClusterCount = 0,
    int RadiationTurns = 0,
    float RadiationDamagePerTurn = 0);

public sealed record UpgradeDefinition(
    UpgradeType Type,
    string DisplayName,
    int Cost,
    string Description);

public static class WeaponIds
{
    public const string PeaShell = "pea-shell";
    public const string HeavyShell = "heavy-shell";
    public const string BabyMissile = "baby-missile";
    public const string ClusterPopper = "cluster-popper";
    public const string SplitterMirv = "splitter-mirv";
    public const string NapalmFlask = "napalm-flask";
    public const string DirtDrop = "dirt-drop";
    public const string Excavator = "excavator";
    public const string BunkerBuster = "bunker-buster";
    public const string LaserLance = "laser-lance";
    public const string TeleportShot = "teleport-shot";
    public const string TacticalNuke = "tactical-nuke";
    public const string DoomsdayNuke = "doomsday-nuke";
}
