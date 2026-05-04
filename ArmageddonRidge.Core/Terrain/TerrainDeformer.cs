using ArmageddonRidge.Core.Geometry;
using ArmageddonRidge.Core.Models;

namespace ArmageddonRidge.Core.Terrain;

public sealed class TerrainDeformer
{
    public int Apply(TerrainMask terrain, WeaponDefinition weapon, Vec2 center)
    {
        return weapon.BehaviorType == WeaponBehaviorType.Dirt
            ? terrain.AddCircle(center, weapon.TerrainRadius)
            : terrain.RemoveCircle(center, weapon.TerrainRadius);
    }
}
