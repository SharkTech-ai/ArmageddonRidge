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
    public bool WebGpuEffectsSupported { get; init; }
    public bool WebGpuEffectsEnabled { get; init; }
    public double EffectFrameMs { get; init; }
    public int EffectParticleCount { get; init; }
    public int EffectSpawnCount { get; init; }
    public string EffectFallbackReason { get; init; } = string.Empty;
    public string Mode { get; init; } = "Hybrid (JS + WASM)";
}

public sealed record WebGpuEffectsStats
{
    public bool Supported { get; init; }
    public bool Enabled { get; init; }
    public double FrameMs { get; init; }
    public int ParticleCount { get; init; }
    public int SpawnCount { get; init; }
    public string FallbackReason { get; init; } = "Not initialized";
}
