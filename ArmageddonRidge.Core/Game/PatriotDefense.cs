using System.Numerics;
using ArmageddonRidge.Core.Models;

namespace ArmageddonRidge.Core.Game;

public static class PatriotDefense
{
    private const float ThreatPadding = GameConstants.TankWidth * 0.65f;

    public static bool ShouldIntercept(Tank protectedTank, IReadOnlyList<ExplosionResult> projectedExplosions)
    {
        for (var i = 0; i < projectedExplosions.Count; i++)
        {
            var explosion = projectedExplosions[i];
            var radius = explosion.DamageRadius + ThreatPadding;
            if (radius <= 0)
            {
                continue;
            }

            if (Vector2.DistanceSquared(protectedTank.Center, explosion.Center) <= radius * radius)
            {
                return true;
            }
        }

        return false;
    }

    public static Vector2 InterceptPoint(Tank protectedTank, IReadOnlyList<Vector2> trail)
    {
        if (trail.Count == 0)
        {
            return protectedTank.Center + new Vector2(0, -70);
        }

        var best = trail[0];
        var bestDistance = Vector2.DistanceSquared(best, protectedTank.Center);
        for (var i = 1; i < trail.Count; i++)
        {
            var distance = Vector2.DistanceSquared(trail[i], protectedTank.Center);
            if (distance < bestDistance)
            {
                best = trail[i];
                bestDistance = distance;
            }
        }

        return best;
    }
}
