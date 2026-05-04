using ArmageddonRidge.Core.Geometry;

namespace ArmageddonRidge.Core.Models;

public sealed record Projectile(
    Vec2 Position,
    Vec2 Velocity,
    float GravityScale,
    float WindScale,
    float CollisionRadius,
    string WeaponId,
    string OwnerTankId,
    float Age = 0);

public sealed record RadiationZone(Vec2 Center, float Radius, int TurnsRemaining, float DamagePerTurn);

public sealed record ExplosionResult(
    Vec2 Center,
    float DamageRadius,
    float TerrainRadius,
    float PlayerDamage,
    float CpuDamage,
    bool DirtAdded,
    bool Nuclear,
    IReadOnlyList<RadiationZone> RadiationZones);

public sealed record ShotResolution(
    string WeaponId,
    string OwnerTankId,
    IReadOnlyList<Vec2> Trail,
    IReadOnlyList<ExplosionResult> Explosions,
    IReadOnlyList<string> Events,
    bool RoundEnded,
    TurnOwner? Winner,
    PerformanceSample Performance);

public sealed record PerformanceSample(
    double SimulationMs,
    double TerrainMs,
    double CpuPlanningMs,
    int TrailPoints,
    int TerrainColumnsTouched);
