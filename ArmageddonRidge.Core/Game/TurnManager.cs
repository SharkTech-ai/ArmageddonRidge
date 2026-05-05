using ArmageddonRidge.Core.Models;

namespace ArmageddonRidge.Core.Game;

/// <summary>
/// Small turn-flow helpers shared by the engine and tests.
/// </summary>
public static class TurnManager
{
    /// <summary>
    /// Gets the opposing turn owner.
    /// </summary>
    public static TurnOwner OpponentOf(TurnOwner owner) => owner == TurnOwner.Player ? TurnOwner.Cpu : TurnOwner.Player;
}
