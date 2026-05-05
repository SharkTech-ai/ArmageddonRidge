using System.Numerics;
using ArmageddonRidge.Core;
using ArmageddonRidge.Core.Game;
using ArmageddonRidge.Core.Models;

namespace ArmageddonRidge.Tests;

public sealed class PatriotDefenseTests
{
    [Fact]
    public void PatriotDefenseInterceptsProjectedExplosionNearProtectedTank()
    {
        var tank = Tank("player", 300, 500);
        var projected = new[]
        {
            new ExplosionResult(new Vector2(310, 475), 35, 30, 0, 0, false, false, [], ShotVisualKind.Missile)
        };

        Assert.True(PatriotDefense.ShouldIntercept(tank, projected));
    }

    [Fact]
    public void PatriotDefenseIgnoresProjectedExplosionFarFromProtectedTank()
    {
        var tank = Tank("player", 300, 500);
        var projected = new[]
        {
            new ExplosionResult(new Vector2(700, 475), 35, 30, 0, 0, false, false, [], ShotVisualKind.Missile)
        };

        Assert.False(PatriotDefense.ShouldIntercept(tank, projected));
    }

    [Fact]
    public void PatriotDefenseChoosesClosestTrailPointAsInterceptPoint()
    {
        var tank = Tank("player", 300, 500);
        var trail = new[]
        {
            new Vector2(100, 300),
            new Vector2(260, 430),
            new Vector2(900, 300)
        };

        Assert.Equal(trail[1], PatriotDefense.InterceptPoint(tank, trail));
    }

    private static Tank Tank(string id, float x, float y) => new()
    {
        Id = id,
        Name = id,
        Position = new Vector2(x, y),
        TurretAngle = 45
    };
}
