using ArmageddonRidge.Core.Models;

namespace ArmageddonRidge.Core.Game;

public static class TurnManager
{
    public static TurnOwner OpponentOf(TurnOwner owner) => owner == TurnOwner.Player ? TurnOwner.Cpu : TurnOwner.Player;
}
