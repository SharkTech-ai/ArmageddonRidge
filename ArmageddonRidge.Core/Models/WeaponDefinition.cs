namespace ArmageddonRidge.Core.Models;

/// <summary>
/// Data-driven weapon tuning used by simulation, shop, AI scoring, and renderer hints.
/// </summary>
/// <param name="Id">Stable weapon identifier.</param>
/// <param name="DisplayName">Player-facing weapon name.</param>
/// <param name="Category">Broad tactical role.</param>
/// <param name="Cost">Cash cost for one inventory item.</param>
/// <param name="MaxDamage">Maximum direct blast damage at the explosion center.</param>
/// <param name="BlastRadius">Radius used for damage falloff.</param>
/// <param name="TerrainRadius">Radius used for terrain deformation.</param>
/// <param name="ProjectileSpeedMultiplier">Multiplier applied to the launch speed.</param>
/// <param name="GravityInfluence">Multiplier applied to gravity acceleration.</param>
/// <param name="WindInfluence">Multiplier applied to wind acceleration.</param>
/// <param name="BehaviorType">Special behavior resolver for this weapon.</param>
/// <param name="CanDamageSelf">Whether the owner can take damage from its own blast.</param>
/// <param name="ShieldBypassPercent">Fraction of damage that bypasses shields.</param>
/// <param name="Falloff">Damage curve exponent from center to edge.</param>
/// <param name="Description">Short shop/HUD tactical description.</param>
/// <param name="ClusterCount">Number of child impacts for cluster-style weapons.</param>
/// <param name="RadiationTurns">Number of turns a lingering hazard remains.</param>
/// <param name="RadiationDamagePerTurn">Damage applied by each lingering hazard turn.</param>
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

/// <summary>
/// Shop definition for a defensive or utility upgrade.
/// </summary>
/// <param name="Type">Stable upgrade identifier.</param>
/// <param name="DisplayName">Player-facing upgrade name.</param>
/// <param name="Cost">Cash cost for the upgrade.</param>
/// <param name="Description">Short shop/HUD tactical description.</param>
public sealed record UpgradeDefinition(
    UpgradeType Type,
    string DisplayName,
    int Cost,
    string Description);

/// <summary>
/// Stable identifiers for every built-in weapon.
/// </summary>
public static class WeaponIds
{
    /// <summary>
    /// Free basic ballistic shell.
    /// </summary>
    public const string PeaShell = "pea-shell";

    /// <summary>
    /// Mid-weight standard shell.
    /// </summary>
    public const string HeavyShell = "heavy-shell";

    /// <summary>
    /// Stronger standard missile.
    /// </summary>
    public const string BabyMissile = "baby-missile";

    /// <summary>
    /// Five-fragment cluster weapon.
    /// </summary>
    public const string ClusterPopper = "cluster-popper";

    /// <summary>
    /// Seven-fragment MIRV weapon.
    /// </summary>
    public const string SplitterMirv = "splitter-mirv";

    /// <summary>
    /// Impact and lingering heat weapon.
    /// </summary>
    public const string NapalmFlask = "napalm-flask";

    /// <summary>
    /// Terrain-adding weapon.
    /// </summary>
    public const string DirtDrop = "dirt-drop";

    /// <summary>
    /// Terrain-removing weapon.
    /// </summary>
    public const string Excavator = "excavator";

    /// <summary>
    /// Single-stage terrain penetrator.
    /// </summary>
    public const string BunkerBuster = "bunker-buster";

    /// <summary>
    /// Wind-ignoring precision beam.
    /// </summary>
    public const string LaserLance = "laser-lance";

    /// <summary>
    /// Utility shot that repositions the owner.
    /// </summary>
    public const string TeleportShot = "teleport-shot";

    /// <summary>
    /// Guided hypersonic-style arcade missile.
    /// </summary>
    public const string DarkEagle = "dark-eagle";

    /// <summary>
    /// Wandering drone swarm weapon.
    /// </summary>
    public const string ShahedDroneSwarm = "shahed-drone-swarm";

    /// <summary>
    /// Two-stage heavy penetrator weapon.
    /// </summary>
    public const string Gbu57Mop = "gbu-57-mop";

    /// <summary>
    /// Smaller nuclear-class weapon.
    /// </summary>
    public const string TacticalNuke = "tactical-nuke";

    /// <summary>
    /// Largest nuclear-class weapon.
    /// </summary>
    public const string DoomsdayNuke = "doomsday-nuke";
}
