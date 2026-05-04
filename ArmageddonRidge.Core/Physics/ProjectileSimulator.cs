using ArmageddonRidge.Core.Geometry;
using ArmageddonRidge.Core.Models;
using ArmageddonRidge.Core.Terrain;

namespace ArmageddonRidge.Core.Physics;

public sealed class ProjectileSimulator
{
    public ProjectileSimulation Simulate(
        TerrainMask terrain,
        Tank owner,
        Tank opponent,
        WeaponDefinition weapon,
        float angleDegrees,
        int power,
        int wind,
        int maxSteps = 60 * 9)
    {
        var angleRadians = angleDegrees * MathF.PI / 180f;
        var muzzle = owner.Center + new Vec2(MathF.Cos(angleRadians) * 23f, -MathF.Sin(angleRadians) * 23f);
        var speed = Math.Clamp(power, GameConstants.PowerMin, GameConstants.PowerMax) * 4.15f * weapon.ProjectileSpeedMultiplier;
        var projectile = new Projectile(
            muzzle,
            new Vec2(MathF.Cos(angleRadians) * speed, -MathF.Sin(angleRadians) * speed),
            weapon.GravityInfluence,
            weapon.WindInfluence,
            3,
            weapon.Id,
            owner.Id);

        var trail = new List<Vec2>(maxSteps / 3);
        var nearestOpponent = float.MaxValue;
        var nearestOwner = float.MaxValue;

        for (var step = 0; step < maxSteps; step++)
        {
            if (step % 2 == 0)
            {
                trail.Add(projectile.Position);
            }

            nearestOpponent = MathF.Min(nearestOpponent, Vec2.Distance(projectile.Position, opponent.Center));
            nearestOwner = MathF.Min(nearestOwner, Vec2.Distance(projectile.Position, owner.Center));

            if (step > 2 && HitsTank(projectile.Position, opponent))
            {
                trail.Add(projectile.Position);
                return new ProjectileSimulation(trail, projectile.Position, ProjectileStopReason.TankHit, nearestOpponent, nearestOwner);
            }

            if (step > 8 && HitsTank(projectile.Position, owner))
            {
                trail.Add(projectile.Position);
                return new ProjectileSimulation(trail, projectile.Position, ProjectileStopReason.OwnerHit, nearestOpponent, nearestOwner);
            }

            if (terrain.IsSolid(projectile.Position))
            {
                trail.Add(projectile.Position);
                return new ProjectileSimulation(trail, projectile.Position, ProjectileStopReason.TerrainHit, nearestOpponent, nearestOwner);
            }

            if (projectile.Position.X < -50 || projectile.Position.X > terrain.Width + 50 || projectile.Position.Y > terrain.Height + 80)
            {
                trail.Add(projectile.Position);
                return new ProjectileSimulation(trail, projectile.Position, ProjectileStopReason.OutOfBounds, nearestOpponent, nearestOwner);
            }

            var velocity = projectile.Velocity;
            velocity = new Vec2(
                velocity.X + (wind * weapon.WindInfluence * GameConstants.FixedDeltaTime),
                velocity.Y + (GameConstants.Gravity * weapon.GravityInfluence * GameConstants.FixedDeltaTime));
            projectile = projectile with
            {
                Velocity = velocity,
                Position = projectile.Position + (velocity * GameConstants.FixedDeltaTime),
                Age = projectile.Age + GameConstants.FixedDeltaTime
            };
        }

        return new ProjectileSimulation(trail, projectile.Position, ProjectileStopReason.Expired, nearestOpponent, nearestOwner);
    }

    private static bool HitsTank(Vec2 point, Tank tank)
    {
        var left = tank.Position.X - (GameConstants.TankWidth / 2f);
        var right = tank.Position.X + (GameConstants.TankWidth / 2f);
        var top = tank.Position.Y - GameConstants.TankHeight;
        var bottom = tank.Position.Y;
        return point.X >= left && point.X <= right && point.Y >= top && point.Y <= bottom;
    }
}

public enum ProjectileStopReason
{
    TerrainHit,
    TankHit,
    OwnerHit,
    OutOfBounds,
    Expired
}

public sealed record ProjectileSimulation(
    IReadOnlyList<Vec2> Trail,
    Vec2 ImpactPoint,
    ProjectileStopReason StopReason,
    float NearestOpponentDistance,
    float NearestOwnerDistance);
