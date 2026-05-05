using ArmageddonRidge.Core.Models;

namespace ArmageddonRidge.Core.Content;

/// <summary>
/// Read-only catalog of built-in defensive and utility upgrades.
/// </summary>
public sealed class UpgradeCatalog
{
    private readonly IReadOnlyDictionary<UpgradeType, UpgradeDefinition> _upgrades;

    /// <summary>
    /// Creates the default MVP upgrade catalog.
    /// </summary>
    public UpgradeCatalog()
    {
        var upgrades = new[]
        {
            new UpgradeDefinition(UpgradeType.LightShield, "Light Shield", 300, "Absorbs 50 damage."),
            new UpgradeDefinition(UpgradeType.HeavyShield, "Heavy Shield", 800, "Absorbs 120 damage."),
            new UpgradeDefinition(UpgradeType.ReflectorShield, "Reflector Shield", 1200, "Small chance to deflect weak shots."),
            new UpgradeDefinition(UpgradeType.Parachute, "Parachute", 150, "Prevents fall damage once."),
            new UpgradeDefinition(UpgradeType.RepairKit, "Repair Kit", 400, "Restores 35 health between rounds."),
            new UpgradeDefinition(UpgradeType.Battery, "Battery", 250, "Recharges shield by 25."),
            new UpgradeDefinition(UpgradeType.Teleporter, "Teleporter", 700, "Reposition once before firing."),
            new UpgradeDefinition(UpgradeType.WindMeter, "Wind Meter", 500, "Shows precise wind."),
            new UpgradeDefinition(UpgradeType.TracerRounds, "Tracer Rounds", 250, "Shows previous trajectory ghost."),
            new UpgradeDefinition(UpgradeType.TargetingComputer, "Targeting Computer", 1000, "Shows approximate arc preview."),
            new UpgradeDefinition(UpgradeType.PatriotBattery, "Patriot Battery", 450, "Single-use arcade defense that intercepts one threatening CPU shot.")
        };

        _upgrades = upgrades.ToDictionary(static upgrade => upgrade.Type);
    }

    /// <summary>
    /// Gets all available upgrade definitions.
    /// </summary>
    public IReadOnlyCollection<UpgradeDefinition> All => _upgrades.Values.ToArray();

    /// <summary>
    /// Gets an upgrade definition by stable identifier.
    /// </summary>
    public UpgradeDefinition Get(UpgradeType type) => _upgrades[type];
}
