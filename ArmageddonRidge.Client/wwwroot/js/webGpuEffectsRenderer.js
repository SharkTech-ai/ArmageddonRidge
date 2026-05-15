let canvas;
let adapter;
let device;
let context;
let format;
let particleBuffer;
let uniformBuffer;
let computePipeline;
let renderPipeline;
let computeBindGroup;
let renderBindGroup;
let rafId = 0;
let lastFrame = 0;
let frameMs = 0;
let supported = false;
let enabled = false;
let fallbackReason = "Not initialized";
let currentScene;
let currentWorld = { width: 1200, height: 700 };
let currentWeather = { type: "clear", intensity: 0 };
let currentWind = 0;
let terrainCache = [];
let reducedMotion = false;
let ambientAccumulator = 0;
let qualityScale = 1;
let writeIndex = 0;
let spawnCount = 0;
let scheduledImpactId = 0;

const maxParticles = 6000;
const particleFloats = 12;
const particleStride = particleFloats * 4;
const workgroupSize = 64;
const gravity = 170;
const particleData = new Float32Array(maxParticles * particleFloats);
const expirations = new Float64Array(maxParticles);
const uniformData = new Float32Array(8);

const kinds = {
    spark: 0,
    smoke: 1,
    ember: 2,
    shockwave: 3,
    shield: 4,
    rain: 5,
    snow: 6,
    heat: 7,
    radiation: 8,
    debris: 9,
    flash: 10,
    plasma: 11
};

export async function initialize(element, options = {}) {
    canvas = element;
    fallbackReason = "";

    if (!options.enabled) {
        enabled = false;
        supported = false;
        fallbackReason = "Disabled";
        clearScheduledImpact();
        clearCpuState();
        return getStats();
    }

    if (!navigator.gpu) {
        enabled = false;
        supported = false;
        fallbackReason = "WebGPU unavailable";
        clearScheduledImpact();
        clearCpuState();
        return getStats();
    }

    try {
        adapter = await navigator.gpu.requestAdapter({ powerPreference: "high-performance" });
        if (!adapter) {
            enabled = false;
            supported = false;
            fallbackReason = "No WebGPU adapter";
            return getStats();
        }

        device = await adapter.requestDevice();
        device.lost.then(info => {
            enabled = false;
            supported = false;
            fallbackReason = info?.message ? `Device lost: ${info.message}` : "WebGPU device lost";
            stopLoop();
        });

        context = canvas.getContext("webgpu");
        if (!context) {
            enabled = false;
            supported = false;
            fallbackReason = "WebGPU context unavailable";
            return getStats();
        }

        format = navigator.gpu.getPreferredCanvasFormat();
        createResources();
        supported = true;
        enabled = true;
        fallbackReason = "";
        resizeCanvas();
        startLoop();
    } catch (error) {
        enabled = false;
        supported = false;
        fallbackReason = shortError(error);
        stopLoop();
    }

    return getStats();
}

export async function setEnabled(value) {
    if (!value) {
        enabled = false;
        fallbackReason = "Disabled";
        clearScheduledImpact();
        clearOverlay();
        stopLoop();
        return getStats();
    }

    if (!canvas || !device || !context) {
        return await initialize(canvas, { enabled: true });
    }

    enabled = supported;
    fallbackReason = supported ? "" : fallbackReason;
    startLoop();
    return getStats();
}

export function setScene(scene, terrainRevision, options = {}) {
    currentScene = scene;
    currentWorld = scene?.world ?? currentWorld;
    currentWeather = scene?.weather ?? currentWeather;
    currentWind = Number(scene?.wind ?? 0);
    reducedMotion = Boolean(options?.reducedMotion);
    if (scene?.terrain?.length) {
        terrainCache = Array.from(scene.terrain);
    }

    if (enabled) startLoop();
    return getStats();
}

export function spawnShotEffects(payload) {
    if (!enabled || !device) return getStats();

    if (String(payload?.phase ?? "").toLowerCase() === "flight") {
        spawnFlightEffects(payload);
        scheduleImpactEffects(payload);
    } else {
        spawnImpactEffects(payload);
    }

    return getStats();
}

export function spawnTerrainEffects(payload) {
    if (!enabled || !device || Number(payload?.terrainColumnsTouched ?? 0) <= 0) {
        return getStats();
    }

    const wind = Number(payload.wind ?? currentWind);
    const explosions = payload.explosions ?? [];
    for (const explosion of explosions) {
        const x = Number(explosion.x ?? 0);
        const radius = Math.max(16, Number(explosion.terrainRadius ?? explosion.radius ?? 40));
        const centerY = Number(explosion.y ?? surfaceY(x));
        const surface = Math.min(centerY, surfaceY(x));
        const count = scaledCount(radius * 1.1, 24, 110);
        for (let i = 0; i < count; i++) {
            const t = randomBetween(-1, 1);
            const px = x + t * radius * randomBetween(0.25, 1.05);
            const py = Math.min(surfaceY(px), surface + randomBetween(-12, 22));
            const vx = wind * 0.85 + t * randomBetween(16, 76);
            const vy = randomBetween(-112, -22);
            spawnParticle(px, py, vx, vy, 0.56, 0.42, 0.25, 0.46, randomBetween(4, 10), randomBetween(0.85, 1.8), kinds.debris);
            if (i % 3 === 0) {
                spawnParticle(px, py, wind * 1.1 + randomBetween(-18, 18), randomBetween(-38, -8), 0.74, 0.61, 0.42, 0.26, randomBetween(12, 30), randomBetween(1.1, 2.4), kinds.smoke);
            }
        }
    }

    return getStats();
}

export function getStats() {
    return {
        supported,
        enabled,
        frameMs,
        particleCount: estimateParticleCount(),
        spawnCount,
        fallbackReason: fallbackReason ?? ""
    };
}

export function dispose() {
    stopLoop();
    clearScheduledImpact();
    clearCpuState();
    if (particleBuffer) particleBuffer.destroy();
    if (uniformBuffer) uniformBuffer.destroy();
    particleBuffer = undefined;
    uniformBuffer = undefined;
    computePipeline = undefined;
    renderPipeline = undefined;
    computeBindGroup = undefined;
    renderBindGroup = undefined;
    enabled = false;
}

function createResources() {
    resizeCanvas();
    context.configure({
        device,
        format,
        alphaMode: "premultiplied"
    });

    particleBuffer = device.createBuffer({
        size: maxParticles * particleStride,
        usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST
    });

    uniformBuffer = device.createBuffer({
        size: uniformData.byteLength,
        usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST
    });

    const computeModule = device.createShaderModule({ code: computeShader });
    computePipeline = device.createComputePipeline({
        layout: "auto",
        compute: { module: computeModule, entryPoint: "updateParticles" }
    });
    computeBindGroup = device.createBindGroup({
        layout: computePipeline.getBindGroupLayout(0),
        entries: [
            { binding: 0, resource: { buffer: particleBuffer } },
            { binding: 1, resource: { buffer: uniformBuffer } }
        ]
    });

    const renderModule = device.createShaderModule({ code: renderShader });
    renderPipeline = device.createRenderPipeline({
        layout: "auto",
        vertex: { module: renderModule, entryPoint: "vertexMain" },
        fragment: {
            module: renderModule,
            entryPoint: "fragmentMain",
            targets: [
                {
                    format,
                    blend: {
                        color: {
                            srcFactor: "one",
                            dstFactor: "one-minus-src-alpha",
                            operation: "add"
                        },
                        alpha: {
                            srcFactor: "one",
                            dstFactor: "one-minus-src-alpha",
                            operation: "add"
                        }
                    }
                }
            ]
        },
        primitive: { topology: "triangle-list" }
    });
    renderBindGroup = device.createBindGroup({
        layout: renderPipeline.getBindGroupLayout(0),
        entries: [
            { binding: 0, resource: { buffer: particleBuffer } },
            { binding: 1, resource: { buffer: uniformBuffer } }
        ]
    });

    clearCpuState();
}

function startLoop() {
    if (rafId || !enabled) return;
    lastFrame = performance.now();
    rafId = requestAnimationFrame(frame);
}

function stopLoop() {
    if (!rafId) return;
    cancelAnimationFrame(rafId);
    rafId = 0;
}

function clearScheduledImpact() {
    if (scheduledImpactId) {
        clearTimeout(scheduledImpactId);
        scheduledImpactId = 0;
    }
}

function frame(now) {
    rafId = 0;
    if (!enabled || !device || !context) return;

    const dt = Math.min(0.05, Math.max(0.001, (now - lastFrame) / 1000));
    lastFrame = now;
    const started = performance.now();
    resizeCanvas();
    emitAmbient(dt, now);
    updateUniforms(dt, now);

    const encoder = device.createCommandEncoder();
    const computePass = encoder.beginComputePass();
    computePass.setPipeline(computePipeline);
    computePass.setBindGroup(0, computeBindGroup);
    computePass.dispatchWorkgroups(Math.ceil(maxParticles / workgroupSize));
    computePass.end();

    const renderPass = encoder.beginRenderPass({
        colorAttachments: [
            {
                view: context.getCurrentTexture().createView(),
                clearValue: { r: 0, g: 0, b: 0, a: 0 },
                loadOp: "clear",
                storeOp: "store"
            }
        ]
    });
    renderPass.setPipeline(renderPipeline);
    renderPass.setBindGroup(0, renderBindGroup);
    renderPass.draw(6, maxParticles);
    renderPass.end();

    device.queue.submit([encoder.finish()]);
    frameMs = performance.now() - started;
    qualityScale = frameMs > 22 ? Math.max(0.35, qualityScale * 0.96) : Math.min(1, qualityScale + 0.006);
    rafId = requestAnimationFrame(frame);
}

function clearOverlay() {
    if (!device || !context) return;

    resizeCanvas();
    const encoder = device.createCommandEncoder();
    const renderPass = encoder.beginRenderPass({
        colorAttachments: [
            {
                view: context.getCurrentTexture().createView(),
                clearValue: { r: 0, g: 0, b: 0, a: 0 },
                loadOp: "clear",
                storeOp: "store"
            }
        ]
    });
    renderPass.end();
    device.queue.submit([encoder.finish()]);
}

function resizeCanvas() {
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const ratio = Math.max(1, window.devicePixelRatio || 1);
    const width = Math.max(1, Math.floor(rect.width * ratio));
    const height = Math.max(1, Math.floor(rect.height * ratio));
    if (canvas.width !== width || canvas.height !== height) {
        canvas.width = width;
        canvas.height = height;
    }
}

function updateUniforms(dt, now) {
    uniformData[0] = dt;
    uniformData[1] = currentWind;
    uniformData[2] = gravity;
    uniformData[3] = now * 0.001;
    uniformData[4] = canvas.width;
    uniformData[5] = canvas.height;
    uniformData[6] = Number(currentWorld?.width ?? 1200);
    uniformData[7] = Number(currentWorld?.height ?? 700);
    device.queue.writeBuffer(uniformBuffer, 0, uniformData);
}

function spawnFlightEffects(payload) {
    const trail = payload?.trail ?? [];
    if (trail.length < 2) return;

    const visual = normalized(payload.visualKind ?? payload.weaponId);
    const wind = Number(payload.wind ?? currentWind);
    const step = Math.max(2, Math.floor(trail.length / scaledCount(28, 12, 48)));
    for (let i = 1; i < trail.length; i += step) {
        const point = trail[i];
        const previous = trail[Math.max(0, i - 1)];
        const angle = Math.atan2(Number(point.y) - Number(previous.y), Number(point.x) - Number(previous.x));
        const x = Number(point.x);
        const y = Number(point.y);
        if (visual.includes("laser")) {
            spawnParticle(x, y, randomBetween(-16, 16) + wind * 0.25, randomBetween(-26, 18), 1, 0.25, 0.32, 0.72, randomBetween(3, 7), randomBetween(0.28, 0.62), kinds.plasma);
        } else if (visual.includes("drone")) {
            spawnParticle(x, y, wind * 0.35 + randomBetween(-18, 18), randomBetween(-8, 18), 0.78, 0.83, 0.78, 0.24, randomBetween(8, 18), randomBetween(0.75, 1.5), kinds.smoke);
            spawnParticle(x, y, Math.cos(angle + Math.PI) * 18, Math.sin(angle + Math.PI) * 18, 1, 0.74, 0.42, 0.36, randomBetween(3, 6), randomBetween(0.35, 0.7), kinds.spark);
        } else if (visual.includes("missile") || visual.includes("mop") || visual.includes("dark") || visual.includes("penetrator")) {
            spawnParticle(x, y, wind * 0.42 - Math.cos(angle) * 22 + randomBetween(-9, 9), -Math.sin(angle) * 14 + randomBetween(-8, 8), 0.72, 0.68, 0.56, 0.28, randomBetween(11, 24), randomBetween(0.7, 1.4), kinds.smoke);
            if (visual.includes("dark")) {
                spawnParticle(x, y, 0, 0, 0.66, 0.86, 1, 0.2, randomBetween(16, 28), randomBetween(0.18, 0.34), kinds.shockwave);
            }
        } else if (visual.includes("fire") || visual.includes("lava") || visual.includes("napalm")) {
            spawnParticle(x, y, wind * 0.35 + randomBetween(-26, 26), randomBetween(-38, 10), 1, 0.34, 0.1, 0.58, randomBetween(3, 8), randomBetween(0.55, 1.15), kinds.ember);
        } else {
            spawnParticle(x, y, wind * 0.2 + randomBetween(-10, 10), randomBetween(-12, 10), 1, 0.9, 0.58, 0.24, randomBetween(3, 6), randomBetween(0.35, 0.8), kinds.spark);
        }
    }
}

function scheduleImpactEffects(payload) {
    clearScheduledImpact();
    const delay = estimateImpactDelayMs(payload);
    scheduledImpactId = setTimeout(() => {
        scheduledImpactId = 0;
        if (!enabled || !device) return;
        spawnImpactEffects(payload);
    }, delay);
}

function estimateImpactDelayMs(payload) {
    const trailCount = Math.max(2, Number(payload?.trailPointCount ?? payload?.trail?.length ?? 2));
    const weaponId = normalized(payload?.weaponId);
    const visualKind = normalized(payload?.visualKind);
    let visualDuration;
    if (weaponId.includes("dark-eagle") || visualKind.includes("dark")) {
        visualDuration = 2900;
    } else if (weaponId.includes("shahed") || visualKind.includes("drone")) {
        visualDuration = Math.min(3400, Math.max(1500, trailCount * 13));
    } else if (weaponId.includes("splitter") || visualKind.includes("mirv")) {
        visualDuration = Math.min(1800, Math.max(900, trailCount * 5.5));
    } else if (weaponId.includes("gbu") || weaponId.includes("mop")) {
        visualDuration = Math.min(2100, Math.max(900, trailCount * 8.5));
    } else {
        visualDuration = Math.min(1200, Math.max(260, trailCount * 4));
    }

    if (payload?.intercepted) {
        visualDuration = Math.max(2900, Math.min(3400, visualDuration * 2.6));
    }

    return Math.max(80, Math.min(3400, visualDuration - 45));
}

function spawnImpactEffects(payload) {
    const explosions = payload?.explosions ?? [];
    const wind = Number(payload?.wind ?? currentWind);
    for (const explosion of explosions) {
        spawnExplosion(explosion, payload, wind);
    }

    if (payload?.shieldHit) {
        spawnShieldRipple(payload);
    }
}

function spawnExplosion(explosion, payload, wind) {
    const x = Number(explosion.x ?? 0);
    const y = Number(explosion.y ?? 0);
    const radius = Math.max(12, Number(explosion.radius ?? 36));
    const terrainRadius = Math.max(radius * 0.6, Number(explosion.terrainRadius ?? radius));
    const visual = normalized(explosion.visualKind ?? payload?.visualKind ?? payload?.weaponId);
    const nuclear = Boolean(explosion.nuclear) || visual.includes("nuclear");
    const lava = visual.includes("lava") || visual.includes("fire") || visual.includes("napalm");
    const laser = visual.includes("laser");
    const dirt = Boolean(explosion.dirt) || visual.includes("dirt") || visual.includes("excavator");
    const penetrator = visual.includes("penetrator") || visual.includes("mop") || visual.includes("bunker");

    spawnParticle(x, y, 0, 0, nuclear ? 1 : 0.95, nuclear ? 0.9 : 0.78, nuclear ? 0.46 : 0.3, nuclear ? 0.52 : 0.38, radius * (nuclear ? 2.3 : 1.4), nuclear ? 0.72 : 0.48, kinds.flash);
    spawnParticle(x, y, 0, 0, nuclear ? 1 : 0.96, nuclear ? 0.78 : 0.65, nuclear ? 0.32 : 0.22, nuclear ? 0.78 : 0.58, radius * 0.95, nuclear ? 1.25 : 0.75, kinds.shockwave);
    if (nuclear) {
        spawnParticle(x, y, 0, 0, 1, 0.92, 0.62, 0.52, radius * 1.75, 1.6, kinds.shockwave);
    }

    const debrisCount = scaledCount(nuclear ? radius * 1.5 : radius, 18, nuclear ? 220 : 120);
    for (let i = 0; i < debrisCount; i++) {
        const angle = randomBetween(-Math.PI, Math.PI);
        const speed = randomBetween(radius * 0.7, radius * (nuclear ? 3.2 : 2.1));
        const upward = Math.sin(angle) < 0 ? 1.15 : 0.72;
        const vx = Math.cos(angle) * speed + wind * randomBetween(0.2, 1.1);
        const vy = Math.sin(angle) * speed * upward - randomBetween(22, nuclear ? 160 : 80);
        const color = dirt ? [0.54, 0.42, 0.25] : penetrator ? [0.62, 0.48, 0.34] : [0.82, 0.55, 0.24];
        spawnParticle(x, y, vx, vy, color[0], color[1], color[2], randomBetween(0.42, 0.78), randomBetween(3, nuclear ? 12 : 9), randomBetween(0.65, nuclear ? 2.2 : 1.45), kinds.debris);
    }

    const smokeCount = scaledCount(radius * (nuclear ? 1.4 : 0.7), 10, nuclear ? 130 : 70);
    for (let i = 0; i < smokeCount; i++) {
        const angle = randomBetween(-Math.PI, Math.PI);
        const speed = randomBetween(6, radius * 0.7);
        spawnParticle(
            x + Math.cos(angle) * randomBetween(0, terrainRadius * 0.35),
            y + Math.sin(angle) * randomBetween(0, terrainRadius * 0.2),
            Math.cos(angle) * speed + wind * randomBetween(0.5, 1.7),
            Math.sin(angle) * speed - randomBetween(10, nuclear ? 90 : 42),
            nuclear ? 0.44 : 0.37,
            nuclear ? 0.38 : 0.34,
            nuclear ? 0.3 : 0.27,
            randomBetween(0.14, 0.34),
            randomBetween(18, nuclear ? 72 : 42),
            randomBetween(1.2, nuclear ? 4.6 : 2.7),
            kinds.smoke);
    }

    if (lava) {
        for (let i = 0; i < scaledCount(radius, 20, 140); i++) {
            const angle = randomBetween(-Math.PI, 0);
            const speed = randomBetween(18, radius * 1.7);
            spawnParticle(x, y, Math.cos(angle) * speed + wind * 0.6, Math.sin(angle) * speed - randomBetween(18, 96), 1, randomBetween(0.25, 0.62), 0.08, randomBetween(0.46, 0.82), randomBetween(3, 9), randomBetween(0.65, 1.9), kinds.ember);
        }

        for (let i = 0; i < scaledCount(radius * 0.45, 8, 36); i++) {
            spawnParticle(x + randomBetween(-radius, radius), y + randomBetween(-radius * 0.2, radius * 0.35), wind * 0.2 + randomBetween(-6, 6), randomBetween(-12, 2), 1, 0.36, 0.12, 0.16, randomBetween(22, 56), randomBetween(0.8, 1.8), kinds.heat);
        }
    }

    if (laser) {
        for (let i = 0; i < scaledCount(radius * 1.2, 14, 90); i++) {
            const angle = randomBetween(-Math.PI, Math.PI);
            const speed = randomBetween(40, 220);
            spawnParticle(x, y, Math.cos(angle) * speed + wind * 0.25, Math.sin(angle) * speed, 1, randomBetween(0.2, 0.4), randomBetween(0.32, 0.68), randomBetween(0.48, 0.86), randomBetween(2, 7), randomBetween(0.22, 0.75), kinds.plasma);
        }
    }
}

function spawnShieldRipple(payload) {
    if (!currentScene) return;

    const target = payload.ownerTankId === "player" ? currentScene.cpu : currentScene.player;
    if (!target) return;

    const x = Number(target.x ?? 0);
    const y = Number(target.y ?? 0) - 62;
    spawnParticle(x, y, 0, 0, 0.42, 0.82, 1, 0.62, 78, 0.75, kinds.shield);
    spawnParticle(x, y, 0, 0, 0.78, 0.96, 1, 0.5, 52, 0.45, kinds.shield);
    for (let i = 0; i < scaledCount(34, 14, 42); i++) {
        const angle = randomBetween(-Math.PI, Math.PI);
        const rx = Math.cos(angle) * randomBetween(34, 76);
        const ry = Math.sin(angle) * randomBetween(22, 58);
        spawnParticle(x + rx, y + ry, Math.cos(angle) * 34, Math.sin(angle) * 22, 0.6, 0.9, 1, 0.62, randomBetween(3, 7), randomBetween(0.35, 0.8), kinds.plasma);
    }
}

function emitAmbient(dt, now) {
    if (!currentScene || reducedMotion) return;

    ambientAccumulator += dt;
    if (ambientAccumulator < 0.016) return;
    const elapsed = Math.min(0.08, ambientAccumulator);
    ambientAccumulator = 0;

    const weather = normalized(currentWeather?.type);
    const intensity = clamp(Number(currentWeather?.intensity ?? 0.35), 0, 1);
    if (weather === "rain" || weather === "storm") {
        const rate = (weather === "storm" ? 260 : 150) * (0.45 + intensity) * qualityScale;
        emitCount(rate * elapsed, spawnRain);
        if (weather === "storm" && Math.random() < elapsed * 0.35 * intensity) {
            spawnParticle(randomBetween(160, currentWorld.width - 160), randomBetween(60, 220), 0, 0, 0.72, 0.86, 1, 0.22, randomBetween(280, 520), randomBetween(0.16, 0.32), kinds.flash);
        }
    } else if (weather === "snow") {
        const rate = 85 * (0.5 + intensity) * qualityScale;
        emitCount(rate * elapsed, spawnSnow);
    }

    const windStrength = Math.abs(currentWind);
    if (windStrength > 4) {
        emitCount(windStrength * 0.7 * elapsed * qualityScale, spawnWindDust);
    }

    const zones = currentScene.radiation ?? [];
    for (const zone of zones) {
        const rate = (zone.lava ? 28 : 18) * qualityScale;
        emitCount(rate * elapsed, () => spawnRadiation(zone));
    }
}

function spawnRain() {
    const x = randomBetween(-80, currentWorld.width + 80);
    const y = randomBetween(-60, -6);
    const wind = currentWind * randomBetween(1.5, 2.8);
    spawnParticle(x, y, wind, randomBetween(420, 620), 0.72, 0.86, 1, 0.34, randomBetween(10, 18), randomBetween(0.9, 1.45), kinds.rain);
}

function spawnSnow() {
    const x = randomBetween(-40, currentWorld.width + 40);
    const y = randomBetween(-40, -4);
    spawnParticle(x, y, currentWind * 0.55 + randomBetween(-16, 16), randomBetween(28, 74), 0.94, 0.98, 1, 0.42, randomBetween(2.5, 5.5), randomBetween(4.8, 8), kinds.snow);
}

function spawnWindDust() {
    const fromLeft = currentWind > 0;
    const x = fromLeft ? randomBetween(-30, 80) : randomBetween(currentWorld.width - 80, currentWorld.width + 30);
    const y = surfaceY(x) - randomBetween(4, 30);
    spawnParticle(x, y, currentWind * randomBetween(2.6, 4.8), randomBetween(-12, 8), 0.74, 0.62, 0.42, 0.18, randomBetween(10, 24), randomBetween(1.5, 3.2), kinds.smoke);
}

function spawnRadiation(zone) {
    const radius = Number(zone.radius ?? 32);
    const angle = randomBetween(-Math.PI, Math.PI);
    const distance = radius * Math.sqrt(Math.random());
    const x = Number(zone.x ?? 0) + Math.cos(angle) * distance;
    const y = Number(zone.y ?? 0) + Math.sin(angle) * distance * 0.55;
    if (zone.lava) {
        spawnParticle(x, y, currentWind * 0.25 + randomBetween(-18, 18), randomBetween(-46, -8), 1, randomBetween(0.24, 0.58), 0.08, 0.44, randomBetween(3, 7), randomBetween(0.6, 1.4), kinds.ember);
        if (Math.random() < 0.32) spawnParticle(x, y, currentWind * 0.16, randomBetween(-12, 0), 1, 0.36, 0.12, 0.12, randomBetween(20, 44), randomBetween(0.8, 1.8), kinds.heat);
    } else {
        spawnParticle(x, y, currentWind * 0.18 + randomBetween(-10, 10), randomBetween(-24, -4), 0.44, 1, 0.38, 0.28, randomBetween(4, 10), randomBetween(0.85, 1.8), kinds.radiation);
    }
}

function spawnParticle(x, y, vx, vy, r, g, b, a, size, lifetime, kind) {
    if (!enabled || !device || !particleBuffer) return;

    const index = writeIndex;
    writeIndex = (writeIndex + 1) % maxParticles;
    const offset = index * particleFloats;
    particleData[offset] = x;
    particleData[offset + 1] = y;
    particleData[offset + 2] = vx;
    particleData[offset + 3] = vy;
    particleData[offset + 4] = clamp(r, 0, 1);
    particleData[offset + 5] = clamp(g, 0, 1);
    particleData[offset + 6] = clamp(b, 0, 1);
    particleData[offset + 7] = clamp(a, 0, 1);
    particleData[offset + 8] = 0;
    particleData[offset + 9] = Math.max(0.05, lifetime);
    particleData[offset + 10] = Math.max(1, size);
    particleData[offset + 11] = kind;
    expirations[index] = performance.now() + (lifetime * 1000);
    device.queue.writeBuffer(particleBuffer, index * particleStride, particleData, offset, particleFloats);
    spawnCount++;
}

function clearCpuState() {
    particleData.fill(0);
    expirations.fill(0);
    writeIndex = 0;
    spawnCount = 0;
    if (device && particleBuffer) {
        device.queue.writeBuffer(particleBuffer, 0, particleData);
    }
}

function estimateParticleCount() {
    const now = performance.now();
    let count = 0;
    for (let i = 0; i < expirations.length; i++) {
        if (expirations[i] > now) count++;
    }

    return count;
}

function emitCount(value, callback) {
    const whole = Math.floor(value);
    const extra = Math.random() < value - whole ? 1 : 0;
    for (let i = 0; i < whole + extra; i++) callback();
}

function scaledCount(value, min, max) {
    const scale = reducedMotion ? 0.38 : qualityScale;
    return Math.floor(clamp(value * scale, min * scale, max * scale));
}

function surfaceY(x) {
    if (!terrainCache.length) return currentWorld.height * 0.72;

    const index = Math.max(0, Math.min(terrainCache.length - 1, Math.round(x)));
    return Number(terrainCache[index] ?? currentWorld.height * 0.72);
}

function normalized(value) {
    return String(value ?? "").toLowerCase();
}

function randomBetween(min, max) {
    return min + Math.random() * (max - min);
}

function clamp(value, min, max) {
    return Math.min(max, Math.max(min, value));
}

function shortError(error) {
    const text = error?.message ?? String(error ?? "WebGPU initialization failed");
    return text.length > 96 ? `${text.slice(0, 93)}...` : text;
}

const computeShader = `
struct Particle {
    position: vec2f,
    velocity: vec2f,
    color: vec4f,
    meta: vec4f
};

struct Uniforms {
    dt: f32,
    wind: f32,
    gravity: f32,
    time: f32,
    canvasSize: vec2f,
    worldSize: vec2f
};

@group(0) @binding(0) var<storage, read_write> particles: array<Particle>;
@group(0) @binding(1) var<uniform> uniforms: Uniforms;

fn inKind(kind: f32, target: f32) -> bool {
    return abs(kind - target) < 0.5;
}

@compute @workgroup_size(${workgroupSize})
fn updateParticles(@builtin(global_invocation_id) id: vec3u) {
    let index = id.x;
    if (index >= arrayLength(&particles)) {
        return;
    }

    var particle = particles[index];
    if (particle.meta.y <= 0.0 || particle.meta.x >= particle.meta.y) {
        return;
    }

    let dt = uniforms.dt;
    let kind = particle.meta.w;
    particle.meta.x = particle.meta.x + dt;

    if (inKind(kind, 0.0) || inKind(kind, 2.0) || inKind(kind, 9.0) || inKind(kind, 11.0)) {
        particle.velocity.y = particle.velocity.y + uniforms.gravity * dt;
        particle.velocity.x = particle.velocity.x + uniforms.wind * 0.02 * dt;
    } else if (inKind(kind, 1.0)) {
        particle.velocity.x = particle.velocity.x + uniforms.wind * 0.08 * dt;
        particle.velocity.y = particle.velocity.y - 12.0 * dt;
        particle.meta.z = particle.meta.z + 10.0 * dt;
    } else if (inKind(kind, 5.0)) {
        particle.velocity.x = particle.velocity.x + uniforms.wind * 0.2 * dt;
    } else if (inKind(kind, 6.0)) {
        particle.velocity.x = particle.velocity.x + sin(uniforms.time + f32(index) * 0.37) * 18.0 * dt + uniforms.wind * 0.035 * dt;
    } else if (inKind(kind, 7.0) || inKind(kind, 8.0)) {
        particle.velocity.x = particle.velocity.x + uniforms.wind * 0.05 * dt;
        particle.velocity.y = particle.velocity.y - 8.0 * dt;
        particle.meta.z = particle.meta.z + 6.0 * dt;
    }

    particle.position = particle.position + particle.velocity * dt;
    if (particle.position.y > uniforms.worldSize.y + 120.0 || particle.position.x < -180.0 || particle.position.x > uniforms.worldSize.x + 180.0) {
        if (!inKind(kind, 5.0) && !inKind(kind, 6.0)) {
            particle.meta.x = particle.meta.y;
        }
    }

    particles[index] = particle;
}
`;

const renderShader = `
struct Particle {
    position: vec2f,
    velocity: vec2f,
    color: vec4f,
    meta: vec4f
};

struct Uniforms {
    dt: f32,
    wind: f32,
    gravity: f32,
    time: f32,
    canvasSize: vec2f,
    worldSize: vec2f
};

struct VertexOut {
    @builtin(position) position: vec4f,
    @location(0) local: vec2f,
    @location(1) color: vec4f,
    @location(2) meta: vec4f
};

@group(0) @binding(0) var<storage, read> particles: array<Particle>;
@group(0) @binding(1) var<uniform> uniforms: Uniforms;

const corners = array<vec2f, 6>(
    vec2f(-1.0, -1.0),
    vec2f(1.0, -1.0),
    vec2f(-1.0, 1.0),
    vec2f(-1.0, 1.0),
    vec2f(1.0, -1.0),
    vec2f(1.0, 1.0)
);

fn inKind(kind: f32, target: f32) -> bool {
    return abs(kind - target) < 0.5;
}

@vertex
fn vertexMain(@builtin(vertex_index) vertexIndex: u32, @builtin(instance_index) instanceIndex: u32) -> VertexOut {
    let particle = particles[instanceIndex];
    let corner = corners[vertexIndex];
    let progress = clamp(particle.meta.x / max(particle.meta.y, 0.001), 0.0, 1.0);
    let kind = particle.meta.w;
    var size = particle.meta.z;
    if (inKind(kind, 3.0)) {
        size = size * (1.0 + progress * 3.2);
    } else if (inKind(kind, 4.0)) {
        size = size * (1.0 + progress * 2.4);
    } else if (inKind(kind, 7.0)) {
        size = size * (1.0 + progress * 1.5 + sin(uniforms.time * 8.0 + particle.position.x * 0.03) * 0.08);
    } else if (inKind(kind, 10.0)) {
        size = size * (1.0 + progress * 0.55);
    }

    if (particle.meta.y <= 0.0 || particle.meta.x >= particle.meta.y) {
        size = 0.0;
    }

    let worldPosition = particle.position + corner * size;
    let scale = min(uniforms.canvasSize.x / uniforms.worldSize.x, uniforms.canvasSize.y / uniforms.worldSize.y);
    let left = (uniforms.canvasSize.x - uniforms.worldSize.x * scale) * 0.5;
    let top = (uniforms.canvasSize.y - uniforms.worldSize.y * scale) * 0.5;
    let pixel = vec2f(left + worldPosition.x * scale, top + worldPosition.y * scale);
    let clip = vec2f((pixel.x / uniforms.canvasSize.x) * 2.0 - 1.0, 1.0 - (pixel.y / uniforms.canvasSize.y) * 2.0);

    var output: VertexOut;
    output.position = vec4f(clip, 0.0, 1.0);
    output.local = corner;
    output.color = particle.color;
    output.meta = particle.meta;
    return output;
}

@fragment
fn fragmentMain(input: VertexOut) -> @location(0) vec4f {
    let kind = input.meta.w;
    let progress = clamp(input.meta.x / max(input.meta.y, 0.001), 0.0, 1.0);
    let d = length(input.local);
    var alpha = input.color.a * (1.0 - progress);
    var color = input.color.rgb;

    if (input.meta.y <= 0.0 || input.meta.x >= input.meta.y) {
        discard;
    }

    if (inKind(kind, 3.0) || inKind(kind, 4.0)) {
        let ringTarget = 0.52 + progress * 0.34;
        let ring = 1.0 - smoothstep(0.035, 0.18, abs(d - ringTarget));
        alpha = alpha * ring;
        color = mix(color, vec3f(1.0, 0.96, 0.78), 0.22);
    } else if (inKind(kind, 5.0)) {
        alpha = alpha * (1.0 - smoothstep(0.05, 0.42, abs(input.local.x))) * (1.0 - smoothstep(0.75, 1.18, abs(input.local.y)));
    } else if (inKind(kind, 6.0)) {
        alpha = alpha * smoothstep(1.05, 0.2, d);
    } else if (inKind(kind, 7.0)) {
        alpha = alpha * smoothstep(1.1, 0.15, d) * (0.45 + 0.35 * sin(input.local.x * 8.0 + uniforms.time * 10.0));
        color = mix(color, vec3f(1.0, 0.68, 0.22), 0.32);
    } else if (inKind(kind, 10.0)) {
        alpha = alpha * smoothstep(1.2, 0.05, d);
    } else {
        alpha = alpha * smoothstep(1.05, 0.35, d);
    }

    if (!inKind(kind, 5.0) && d > 1.18) {
        discard;
    }

    if (alpha < 0.004) {
        discard;
    }

    return vec4f(color * alpha, alpha);
}
`;
