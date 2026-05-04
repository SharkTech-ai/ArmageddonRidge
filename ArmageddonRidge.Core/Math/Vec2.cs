namespace ArmageddonRidge.Core.Geometry;

public readonly record struct Vec2(float X, float Y)
{
    public static Vec2 Zero => new(0, 0);

    public float Length => MathF.Sqrt((X * X) + (Y * Y));

    public static float Distance(Vec2 a, Vec2 b)
    {
        var dx = a.X - b.X;
        var dy = a.Y - b.Y;
        return MathF.Sqrt((dx * dx) + (dy * dy));
    }

    public static Vec2 operator +(Vec2 a, Vec2 b) => new(a.X + b.X, a.Y + b.Y);

    public static Vec2 operator -(Vec2 a, Vec2 b) => new(a.X - b.X, a.Y - b.Y);

    public static Vec2 operator *(Vec2 a, float scale) => new(a.X * scale, a.Y * scale);
}
