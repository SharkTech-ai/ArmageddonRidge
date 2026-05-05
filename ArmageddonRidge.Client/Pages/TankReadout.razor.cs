using ArmageddonRidge.Core.Models;
using Microsoft.AspNetCore.Components;

namespace ArmageddonRidge.Client.Pages;

public partial class TankReadout
{
    [Parameter] public required string Label { get; set; }
    [Parameter] public required Tank Tank { get; set; }
    [Parameter] public bool HealthHit { get; set; }
    [Parameter] public bool ShieldHit { get; set; }

    private string ReadoutCss => $"tank-readout{(HealthHit ? " is-hurt" : "")}{(ShieldHit ? " is-shield-hit" : "")}";

    private int CurrentHealth => Math.Max(0, Tank.Health);

    private string HealthWidth => $"{Math.Clamp(CurrentHealth / (float)Math.Max(Tank.MaxHealth, 1), 0, 1) * 100:0}%";

    private string ShieldWidth => $"{Math.Clamp(MathF.Max(0, Tank.Shield) / 120f, 0, 1) * 100:0}%";
}
