namespace ArmageddonRidge.Core.Terrain;

/// <summary>
/// Generates deterministic artillery terrain from a numeric seed.
/// </summary>
public sealed class TerrainGenerator
{
    /// <summary>
    /// Creates a full-width heightmap with broad hills and smaller sinusoidal detail.
    /// </summary>
    public TerrainMask Generate(int seed, int width = GameConstants.WorldWidth, int height = GameConstants.WorldHeight)
    {
        var rng = new Random(seed);
        var controlSpacing = 80;
        var controls = new float[(width / controlSpacing) + 3];
        for (var i = 0; i < controls.Length; i++)
        {
            var trend = MathF.Sin((seed * 0.01f) + (i * 0.9f)) * 58f;
            controls[i] = Math.Clamp(
                (GameConstants.GroundMinY + GameConstants.GroundMaxY) / 2f + trend + rng.Next(-95, 96),
                GameConstants.GroundMinY,
                GameConstants.GroundMaxY);
        }

        var heights = new float[width];
        for (var x = 0; x < width; x++)
        {
            var index = x / controlSpacing;
            var t = (x % controlSpacing) / (float)controlSpacing;
            var smoothT = t * t * (3f - (2f * t));
            var baseY = Lerp(controls[index], controls[index + 1], smoothT);
            var detail = (MathF.Sin((x + seed) * 0.027f) * 22f) + (MathF.Sin((x - seed) * 0.061f) * 9f);
            heights[x] = Math.Clamp(baseY + detail, GameConstants.GroundMinY, GameConstants.GroundMaxY);
        }

        return new TerrainMask(width, height, heights);
    }

    private static float Lerp(float a, float b, float t) => a + ((b - a) * t);
}
