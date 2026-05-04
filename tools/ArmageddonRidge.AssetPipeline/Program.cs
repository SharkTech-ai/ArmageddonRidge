using System.IO.Compression;
using System.Text;
using System.Text.Json;

var repoRoot = FindRepoRoot();
var spriteRoot = Path.Combine(repoRoot, "ArmageddonRidge.Client", "wwwroot", "assets", "sprites");
var iconRoot = Path.Combine(spriteRoot, "icons");
Directory.CreateDirectory(spriteRoot);
Directory.CreateDirectory(iconRoot);

var atlas = new Bitmap32(256, 128, Color32.Transparent);
var frames = new Dictionary<string, Frame>();

AddFrame("playerTank", 0, 0, 48, 32, bmp => DrawTank(bmp, new Color32(51, 203, 185), new Color32(20, 28, 35)));
AddFrame("cpuTank", 48, 0, 48, 32, bmp => DrawTank(bmp, new Color32(232, 84, 78), new Color32(20, 28, 35)));
AddFrame("playerTurret", 96, 0, 40, 12, bmp => DrawTurret(bmp, new Color32(65, 220, 205)));
AddFrame("cpuTurret", 136, 0, 40, 12, bmp => DrawTurret(bmp, new Color32(255, 116, 87)));
AddFrame("shell", 176, 0, 16, 16, bmp => DrawProjectile(bmp, new Color32(249, 218, 100)));
AddFrame("missile", 192, 0, 24, 16, bmp => DrawMissile(bmp));
AddFrame("shield", 216, 0, 32, 32, bmp => DrawRing(bmp, new Color32(89, 180, 255, 190)));
AddFrame("explosionSmall", 0, 40, 32, 32, bmp => DrawBurst(bmp, new Color32(255, 246, 173), new Color32(241, 78, 55)));
AddFrame("explosionLarge", 32, 40, 48, 48, bmp => DrawBurst(bmp, new Color32(255, 247, 178), new Color32(219, 50, 55)));
AddFrame("nuclear", 80, 40, 56, 56, bmp => DrawBurst(bmp, new Color32(211, 255, 86), new Color32(246, 177, 60)));
AddFrame("dirt", 136, 40, 32, 32, bmp => DrawRock(bmp));
AddFrame("laser", 168, 40, 48, 12, bmp => DrawLaser(bmp));

atlas.WritePng(Path.Combine(spriteRoot, "armageddon-ridge-sprites.png"));
File.WriteAllText(
    Path.Combine(spriteRoot, "atlas.json"),
    JsonSerializer.Serialize(
        new { image = "assets/sprites/armageddon-ridge-sprites.png", frames },
        new JsonSerializerOptions { WriteIndented = true, PropertyNamingPolicy = JsonNamingPolicy.CamelCase }));

var iconIds = new[]
{
    "heavy-shell", "baby-missile", "cluster-popper", "splitter-mirv", "napalm-flask", "dirt-drop",
    "excavator", "bunker-buster", "laser-lance", "teleport-shot", "tactical-nuke", "doomsday-nuke",
    "lightshield", "heavyshield", "reflectorshield", "parachute", "repairkit", "battery", "teleporter",
    "windmeter", "tracerrounds", "targetingcomputer"
};

foreach (var id in iconIds)
{
    var icon = new Bitmap32(40, 40, Color32.Transparent);
    DrawIcon(icon, id);
    icon.WritePng(Path.Combine(iconRoot, $"{id}.png"));
}

Console.WriteLine($"Wrote sprites to {spriteRoot}");

void AddFrame(string name, int x, int y, int w, int h, Action<Bitmap32> draw)
{
    var frame = new Bitmap32(w, h, Color32.Transparent);
    draw(frame);
    atlas.Blit(frame, x, y);
    frames[name] = new Frame(x, y, w, h);
}

static void DrawTank(Bitmap32 bmp, Color32 body, Color32 tread)
{
    var outline = new Color32(11, 15, 20);
    var shadow = body.Darken(64);
    var mid = body.Darken(22);
    var light = body.Lighten(44);

    bmp.FillRect(5, 22, 38, 7, outline);
    bmp.FillRect(7, 23, 34, 4, tread);
    bmp.FillRect(9, 27, 30, 1, tread.Lighten(28));
    for (var x = 9; x <= 36; x += 7)
    {
        bmp.FillEllipse(x, 24, 3, 2, outline.Lighten(26));
        bmp.Set(x, 24, tread.Lighten(70));
    }

    bmp.FillPolygon(
        new[] { (7, 16), (14, 10), (32, 9), (41, 16), (43, 22), (6, 22) },
        outline);
    bmp.FillPolygon(
        new[] { (9, 16), (15, 12), (31, 11), (39, 16), (40, 20), (9, 20) },
        body);
    bmp.FillRect(12, 18, 27, 3, mid);
    bmp.FillRect(16, 12, 13, 2, light);
    bmp.FillRect(31, 14, 6, 2, body.Lighten(18));
    bmp.FillRect(11, 15, 5, 2, shadow);
    bmp.Set(39, 17, Color32.White);
    bmp.Set(38, 18, light);

    bmp.FillRect(17, 7, 15, 5, outline);
    bmp.FillRect(19, 6, 11, 5, body.Lighten(25));
    bmp.FillRect(21, 6, 7, 1, light);
    bmp.FillRect(18, 11, 14, 1, shadow);
}

static void DrawTurret(Bitmap32 bmp, Color32 color)
{
    var outline = new Color32(12, 15, 20);
    bmp.FillRect(2, 3, 11, 7, outline);
    bmp.FillRect(4, 4, 8, 5, color.Lighten(24));
    bmp.FillRect(10, 5, 23, 5, outline);
    bmp.FillRect(11, 5, 21, 3, color);
    bmp.FillRect(13, 5, 13, 1, color.Lighten(40));
    bmp.FillRect(31, 6, 6, 2, color.Darken(38));
    bmp.Set(5, 4, Color32.White);
}

static void DrawProjectile(Bitmap32 bmp, Color32 color)
{
    var outline = new Color32(24, 22, 28);
    bmp.FillEllipse(8, 8, 5, 5, outline);
    bmp.FillEllipse(8, 8, 4, 4, color);
    bmp.FillRect(4, 9, 3, 2, new Color32(238, 82, 58));
    bmp.FillRect(2, 10, 2, 1, new Color32(255, 180, 66, 210));
    bmp.Set(7, 5, Color32.White);
    bmp.Set(10, 10, color.Darken(58));
}

static void DrawMissile(Bitmap32 bmp)
{
    var outline = new Color32(19, 22, 28);
    bmp.FillPolygon(new[] { (3, 7), (7, 4), (18, 4), (22, 8), (18, 11), (7, 11) }, outline);
    bmp.FillPolygon(new[] { (5, 7), (8, 5), (17, 5), (20, 8), (17, 10), (8, 10) }, new Color32(226, 230, 211));
    bmp.FillRect(9, 5, 7, 1, Color32.White);
    bmp.FillRect(16, 9, 3, 1, new Color32(154, 164, 152));
    bmp.FillPolygon(new[] { (4, 7), (1, 5), (2, 8), (1, 11) }, new Color32(255, 188, 69, 220));
    bmp.FillRect(17, 6, 3, 4, new Color32(232, 84, 78));
}

static void DrawRing(Bitmap32 bmp, Color32 color)
{
    for (var y = 0; y < bmp.Height; y++)
    {
        for (var x = 0; x < bmp.Width; x++)
        {
            var dx = x - 16;
            var dy = y - 16;
            var d = Math.Sqrt((dx * dx) + (dy * dy));
            if (d is > 12 and < 15)
            {
                var shine = y < 13 || x > 21 ? color.Lighten(45) : color;
                bmp.Set(x, y, shine);
            }
            else if (d is > 10 and < 11 && (x + y) % 3 == 0)
            {
                bmp.Set(x, y, new Color32(color.R, color.G, color.B, 88));
            }
        }
    }
}

static void DrawBurst(Bitmap32 bmp, Color32 inner, Color32 outer)
{
    var cx = bmp.Width / 2;
    var cy = bmp.Height / 2;
    var max = Math.Min(cx, cy) - 2;
    for (var y = 0; y < bmp.Height; y++)
    {
        for (var x = 0; x < bmp.Width; x++)
        {
            var dx = x - cx;
            var dy = y - cy;
            var d = Math.Sqrt((dx * dx) + (dy * dy));
            var jag = ((x * 13) + (y * 7)) % 9;
            var limit = max - jag + (Math.Abs(dx) < 3 || Math.Abs(dy) < 3 ? 4 : 0);
            if (d > limit)
            {
                continue;
            }

            if (d < max * 0.34)
            {
                bmp.Set(x, y, inner);
            }
            else if (d < max * 0.62)
            {
                bmp.Set(x, y, new Color32(255, 171, 59));
            }
            else
            {
                bmp.Set(x, y, outer);
            }
        }
    }

    bmp.FillRect(cx - 2, 2, 4, Math.Max(5, bmp.Height / 4), outer.Lighten(18));
    bmp.FillRect(cx - 2, bmp.Height - 8, 4, 6, new Color32(96, 47, 48, 210));
    bmp.Set(cx - 1, cy - 2, Color32.White);
    bmp.Set(cx + 1, cy, Color32.White);
}

static void DrawRock(Bitmap32 bmp)
{
    var outline = new Color32(34, 27, 23);
    bmp.FillPolygon(new[] { (6, 23), (10, 15), (15, 9), (24, 11), (29, 18), (26, 25), (11, 27) }, outline);
    bmp.FillPolygon(new[] { (9, 22), (12, 16), (16, 11), (23, 13), (27, 18), (24, 23), (12, 25) }, new Color32(121, 91, 59));
    bmp.FillRect(13, 14, 7, 3, new Color32(154, 115, 68));
    bmp.FillRect(20, 17, 5, 5, new Color32(74, 59, 45));
    bmp.Set(14, 13, new Color32(205, 161, 91));
}

static void DrawLaser(Bitmap32 bmp)
{
    bmp.FillRect(0, 3, 48, 6, new Color32(25, 255, 229, 95));
    bmp.FillRect(0, 5, 48, 3, new Color32(255, 250, 220));
    bmp.FillRect(0, 6, 48, 1, new Color32(72, 218, 207));
    for (var x = 4; x < 48; x += 9)
    {
        bmp.Set(x, 4, Color32.White);
        bmp.Set(x + 1, 8, new Color32(72, 218, 207, 160));
    }
}

static void DrawIcon(Bitmap32 bmp, string id)
{
    var hash = id.Aggregate(17, static (acc, c) => (acc * 31) + c);
    var primary = new Color32((byte)(80 + Math.Abs(hash) % 120), (byte)(100 + Math.Abs(hash / 3) % 120), (byte)(90 + Math.Abs(hash / 7) % 120));
    bmp.FillRect(3, 3, 34, 34, new Color32(10, 13, 18, 235));
    bmp.FillRect(5, 5, 30, 30, new Color32(40, 48, 55, 240));
    bmp.FillRect(6, 6, 28, 2, primary.Lighten(30));
    bmp.FillRect(6, 30, 28, 4, primary.Darken(50));

    if (id.Contains("nuke", StringComparison.OrdinalIgnoreCase))
    {
        DrawBurst(bmp, new Color32(211, 255, 86), new Color32(246, 177, 60));
        return;
    }

    if (id.Contains("shield", StringComparison.OrdinalIgnoreCase))
    {
        DrawRing(bmp, new Color32(89, 180, 255, 190));
        return;
    }

    if (id.Contains("laser", StringComparison.OrdinalIgnoreCase))
    {
        DrawLaser(bmp);
        return;
    }

    if (id.Contains("dirt", StringComparison.OrdinalIgnoreCase) || id.Contains("excavator", StringComparison.OrdinalIgnoreCase))
    {
        DrawRock(bmp);
        return;
    }

    bmp.FillPolygon(new[] { (10, 20), (14, 16), (27, 16), (32, 20), (27, 24), (14, 24) }, new Color32(20, 22, 28));
    bmp.FillPolygon(new[] { (12, 20), (15, 17), (26, 17), (30, 20), (26, 23), (15, 23) }, new Color32(246, 225, 128));
    bmp.FillRect(25, 18, 5, 4, new Color32(236, 106, 92));
}

static string FindRepoRoot()
{
    var dir = AppContext.BaseDirectory;
    while (dir is not null)
    {
        if (File.Exists(Path.Combine(dir, "ArmageddonRidge.slnx")))
        {
            return dir;
        }

        dir = Directory.GetParent(dir)?.FullName;
    }

    throw new InvalidOperationException("Could not locate repo root.");
}

internal sealed record Frame(int X, int Y, int W, int H);

internal readonly record struct Color32(byte R, byte G, byte B, byte A = 255)
{
    public static Color32 Transparent => new(0, 0, 0, 0);
    public static Color32 White => new(255, 255, 255);

    public Color32 Lighten(byte amount) => new((byte)Math.Min(255, R + amount), (byte)Math.Min(255, G + amount), (byte)Math.Min(255, B + amount), A);

    public Color32 Darken(byte amount) => new((byte)Math.Max(0, R - amount), (byte)Math.Max(0, G - amount), (byte)Math.Max(0, B - amount), A);
}

internal sealed class Bitmap32
{
    private readonly Color32[] _pixels;

    public Bitmap32(int width, int height, Color32 fill)
    {
        Width = width;
        Height = height;
        _pixels = Enumerable.Repeat(fill, width * height).ToArray();
    }

    public int Width { get; }

    public int Height { get; }

    public void Set(int x, int y, Color32 color)
    {
        if (x < 0 || y < 0 || x >= Width || y >= Height)
        {
            return;
        }

        _pixels[(y * Width) + x] = color;
    }

    public void FillRect(int x, int y, int width, int height, Color32 color)
    {
        for (var yy = y; yy < y + height; yy++)
        {
            for (var xx = x; xx < x + width; xx++)
            {
                Set(xx, yy, color);
            }
        }
    }

    public void FillEllipse(int centerX, int centerY, int radiusX, int radiusY, Color32 color)
    {
        for (var y = centerY - radiusY; y <= centerY + radiusY; y++)
        {
            for (var x = centerX - radiusX; x <= centerX + radiusX; x++)
            {
                var dx = (double)(x - centerX) / radiusX;
                var dy = (double)(y - centerY) / radiusY;
                if ((dx * dx) + (dy * dy) <= 1)
                {
                    Set(x, y, color);
                }
            }
        }
    }

    public void FillPolygon(IReadOnlyList<(int X, int Y)> points, Color32 color)
    {
        var minY = points.Min(static p => p.Y);
        var maxY = points.Max(static p => p.Y);
        for (var y = minY; y <= maxY; y++)
        {
            var intersections = new List<int>();
            for (var i = 0; i < points.Count; i++)
            {
                var a = points[i];
                var b = points[(i + 1) % points.Count];
                if ((a.Y <= y && b.Y > y) || (b.Y <= y && a.Y > y))
                {
                    intersections.Add(a.X + ((y - a.Y) * (b.X - a.X) / (b.Y - a.Y)));
                }
            }

            intersections.Sort();
            for (var i = 0; i + 1 < intersections.Count; i += 2)
            {
                FillRect(intersections[i], y, intersections[i + 1] - intersections[i] + 1, 1, color);
            }
        }
    }

    public void Blit(Bitmap32 source, int x, int y)
    {
        for (var yy = 0; yy < source.Height; yy++)
        {
            for (var xx = 0; xx < source.Width; xx++)
            {
                var color = source._pixels[(yy * source.Width) + xx];
                if (color.A != 0)
                {
                    Set(x + xx, y + yy, color);
                }
            }
        }
    }

    public void WritePng(string path)
    {
        using var stream = File.Create(path);
        using var writer = new BinaryWriter(stream, Encoding.ASCII);
        writer.Write(new byte[] { 137, 80, 78, 71, 13, 10, 26, 10 });

        var ihdr = new byte[13];
        WriteBigEndian(ihdr, 0, Width);
        WriteBigEndian(ihdr, 4, Height);
        ihdr[8] = 8;
        ihdr[9] = 6;
        WriteChunk(writer, "IHDR", ihdr);

        using var raw = new MemoryStream();
        for (var y = 0; y < Height; y++)
        {
            raw.WriteByte(0);
            for (var x = 0; x < Width; x++)
            {
                var c = _pixels[(y * Width) + x];
                raw.WriteByte(c.R);
                raw.WriteByte(c.G);
                raw.WriteByte(c.B);
                raw.WriteByte(c.A);
            }
        }

        using var compressed = new MemoryStream();
        using (var zlib = new ZLibStream(compressed, CompressionLevel.SmallestSize, leaveOpen: true))
        {
            raw.Position = 0;
            raw.CopyTo(zlib);
        }

        WriteChunk(writer, "IDAT", compressed.ToArray());
        WriteChunk(writer, "IEND", Array.Empty<byte>());
    }

    private static void WriteChunk(BinaryWriter writer, string name, byte[] data)
    {
        var nameBytes = Encoding.ASCII.GetBytes(name);
        WriteBigEndian(writer, data.Length);
        writer.Write(nameBytes);
        writer.Write(data);

        var crc = new Crc32();
        crc.Update(nameBytes);
        crc.Update(data);
        WriteBigEndian(writer, unchecked((int)crc.Value));
    }

    private static void WriteBigEndian(BinaryWriter writer, int value)
    {
        writer.Write((byte)((value >> 24) & 0xff));
        writer.Write((byte)((value >> 16) & 0xff));
        writer.Write((byte)((value >> 8) & 0xff));
        writer.Write((byte)(value & 0xff));
    }

    private static void WriteBigEndian(byte[] buffer, int offset, int value)
    {
        buffer[offset] = (byte)((value >> 24) & 0xff);
        buffer[offset + 1] = (byte)((value >> 16) & 0xff);
        buffer[offset + 2] = (byte)((value >> 8) & 0xff);
        buffer[offset + 3] = (byte)(value & 0xff);
    }
}

internal sealed class Crc32
{
    private static readonly uint[] Table = CreateTable();
    private uint _value = 0xffffffff;

    public uint Value => _value ^ 0xffffffff;

    public void Update(byte[] bytes)
    {
        foreach (var b in bytes)
        {
            _value = Table[(_value ^ b) & 0xff] ^ (_value >> 8);
        }
    }

    private static uint[] CreateTable()
    {
        var table = new uint[256];
        for (uint i = 0; i < table.Length; i++)
        {
            var value = i;
            for (var bit = 0; bit < 8; bit++)
            {
                value = (value & 1) == 1 ? 0xedb88320 ^ (value >> 1) : value >> 1;
            }

            table[i] = value;
        }

        return table;
    }
}
