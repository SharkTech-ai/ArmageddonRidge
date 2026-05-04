using ArmageddonRidge.Core.Content;
using ArmageddonRidge.Core.Models;

namespace ArmageddonRidge.Core.Game;

public sealed class EconomyService
{
    private readonly WeaponCatalog _weapons;
    private readonly UpgradeCatalog _upgrades;

    public EconomyService(WeaponCatalog weapons, UpgradeCatalog upgrades)
    {
        _weapons = weapons;
        _upgrades = upgrades;
    }

    public bool BuyWeapon(Tank tank, string weaponId, int count = 1)
    {
        var weapon = _weapons.Get(weaponId);
        var total = weapon.Cost * count;
        if (weapon.Cost <= 0 || tank.Cash < total)
        {
            return false;
        }

        tank.Cash -= total;
        tank.AddWeapon(weaponId, count);
        return true;
    }

    public bool BuyUpgrade(Tank tank, UpgradeType upgradeType)
    {
        var upgrade = _upgrades.Get(upgradeType);
        if (tank.Cash < upgrade.Cost)
        {
            return false;
        }

        tank.Cash -= upgrade.Cost;
        tank.Upgrades.Add(upgradeType);

        switch (upgradeType)
        {
            case UpgradeType.LightShield:
                tank.Shield = MathF.Max(tank.Shield, 50);
                break;
            case UpgradeType.HeavyShield:
                tank.Shield = MathF.Max(tank.Shield, 120);
                break;
            case UpgradeType.Parachute:
                tank.HasParachute = true;
                break;
            case UpgradeType.RepairKit:
                tank.Health = Math.Min(tank.MaxHealth, tank.Health + 35);
                break;
            case UpgradeType.Battery:
                tank.Shield += 25;
                break;
        }

        return true;
    }

    public void AwardRound(GameState state, TurnOwner winner)
    {
        var playerWon = winner == TurnOwner.Player;
        state.PlayerTank.Cash += playerWon ? GameConstants.WinReward + GameConstants.KillBonus : GameConstants.LossConsolation;
        var hitReward = (int)MathF.Floor(state.DamageDealtByPlayer / 10f) * 10;
        state.PlayerTank.Cash += hitReward;
    }
}
