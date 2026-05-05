namespace ArmageddonRidge.Core.Models;

public enum GamePhase
{
    MainMenu,
    Shop,
    Battle,
    Animating,
    RoundOver
}

public enum TurnOwner
{
    Player,
    Cpu
}

public enum Difficulty
{
    Rookie,
    Normal,
    Veteran,
    Maniac,
    Oracle
}

public enum WeaponCategory
{
    BasicBallistic,
    AreaDamage,
    Cluster,
    Terrain,
    Fire,
    Precision,
    Nuclear,
    Utility
}

public enum WeaponBehaviorType
{
    Ballistic,
    Cluster,
    Dirt,
    Excavator,
    BunkerBuster,
    Laser,
    Teleport,
    Nuclear,
    Napalm,
    Missile,
    DroneSwarm
}

public enum UpgradeType
{
    LightShield,
    HeavyShield,
    ReflectorShield,
    Parachute,
    RepairKit,
    Battery,
    Teleporter,
    WindMeter,
    TracerRounds,
    TargetingComputer,
    PatriotBattery
}

public enum ShotVisualKind
{
    Ballistic,
    Fire,
    Lava,
    Missile,
    Nuclear,
    DroneSwarm,
    Laser,
    Teleport,
    Dirt,
    PatriotIntercept
}
