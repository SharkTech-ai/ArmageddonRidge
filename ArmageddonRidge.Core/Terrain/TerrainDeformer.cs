using System.Numerics;
using ArmageddonRidge.Core.Models;

namespace ArmageddonRidge.Core.Terrain;

/// <summary>
/// Applies weapon terrain effects to the authoritative terrain mask.
/// </summary>
public sealed class TerrainDeformer
{
    /// <summary>
    /// Applies the weapon's crater or dirt effect and returns touched column count.
    /// </summary>
    public int Apply(TerrainMask terrain, WeaponDefinition weapon, Vector2 center)
    {
        return weapon.BehaviorType == WeaponBehaviorType.Dirt
            ? terrain.AddCircle(center, weapon.TerrainRadius)
            : terrain.RemoveCircle(center, weapon.TerrainRadius);
    }
}
