namespace ArmageddonRidge.Client.Services.Rendering;

public sealed record RenderStats
{
    public int Fps { get; init; }
    public double FrameMs { get; init; }
    public double RenderMs { get; init; }
    public double SceneBuildMs { get; init; }
    public double CommandBuildMs { get; init; }
    public double SubmitMs { get; init; }
    public int CommandCount { get; init; }
    public int PayloadBytes { get; init; }
    public bool SimdHardwareAccelerated { get; init; }
    public string Mode { get; init; } = "Hybrid (JS + WASM)";
}
