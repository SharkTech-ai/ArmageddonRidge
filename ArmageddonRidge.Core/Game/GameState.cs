using ArmageddonRidge.Core.Models;
using ArmageddonRidge.Core.Terrain;

namespace ArmageddonRidge.Core.Game;

public sealed class GameState
{
    public string MatchId { get; init; } = Guid.NewGuid().ToString("N");
    public int RoundNumber { get; set; } = 1;
    public TurnOwner CurrentTurn { get; set; } = TurnOwner.Player;
    public GamePhase Phase { get; set; } = GamePhase.MainMenu;
    public required TerrainMask Terrain { get; init; }
    public int Wind { get; set; }
    public required Tank PlayerTank { get; init; }
    public required Tank CpuTank { get; init; }
    public List<RadiationZone> RadiationZones { get; } = [];
    public int RandomSeed { get; init; }
    public List<string> EventLog { get; } = [];
    public string SelectedWeaponId { get; set; } = WeaponIds.PeaShell;
    public Random Random { get; init; } = new(0);
    public int ShotsFired { get; set; }
    public float DamageDealtByPlayer { get; set; }
    public float DamageDealtByCpu { get; set; }
    public PerformanceSample LastPerformance { get; set; } = new(0, 0, 0, 0, 0);
}
