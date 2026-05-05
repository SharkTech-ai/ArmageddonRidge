using System.Numerics;

namespace ArmageddonRidge.Core.Models;

public sealed record RadiationZone(Vector2 Center, float Radius, int TurnsRemaining, float DamagePerTurn);

public sealed record ExplosionResult(
    Vector2 Center,
    float DamageRadius,
    float TerrainRadius,
    float PlayerDamage,
    float CpuDamage,
    bool DirtAdded,
    bool Nuclear,
    IReadOnlyList<RadiationZone> RadiationZones,
    ShotVisualKind VisualKind = ShotVisualKind.Ballistic);

public sealed record ShotResolution(
    string WeaponId,
    string OwnerTankId,
    IReadOnlyList<Vector2> Trail,
    IReadOnlyList<ExplosionResult> Explosions,
    IReadOnlyList<string> Events,
    bool RoundEnded,
    TurnOwner? Winner,
    PerformanceSample Performance,
    ShotVisualKind VisualKind = ShotVisualKind.Ballistic,
    bool Intercepted = false,
    Vector2? InterceptPoint = null);

public sealed record PerformanceSample(
    double SimulationMs,
    double TerrainMs,
    double CpuPlanningMs,
    int TrailPoints,
    int TerrainColumnsTouched);
