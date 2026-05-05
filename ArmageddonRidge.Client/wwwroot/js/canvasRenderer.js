let canvas;
let ctx;
let atlas;
let manifest;
let lastFrame = performance.now();
let fps = 60;
let frameMs = 16.7;
let renderMs = 0;
let lastScene;
let cachedTerrain;
let rafId = 0;
let shotInProgress = false;
const spriteManifestVersion = "2026-05-04-genesis-v4";
const cloudBands = [
    { x: 90, y: 64, scale: 1.08, speed: 7 },
    { x: 360, y: 104, scale: 0.84, speed: 11 },
    { x: 690, y: 72, scale: 1.18, speed: 8 },
    { x: 1010, y: 118, scale: 0.72, speed: 13 },
    { x: 1260, y: 48, scale: 0.96, speed: 9 }
];
const weatherTypes = ["clear", "rain", "snow", "storm"];
const terrainStride = 4;

export async function initialize(element) {
    canvas = element;
    ctx = canvas.getContext("2d", { alpha: false });
    ctx.imageSmoothingEnabled = false;
    await loadSprites();
    startStatsLoop();
}

export function render(scene) {
    if (!ctx || !scene?.world) {
        return { fps: 0, frameMs: 0, renderMs: 0 };
    }

    if (shotInProgress) {
        return getStats();
    }

    const started = performance.now();
    const renderScene = prepareScene(scene);
    lastScene = renderScene;
    sizeCanvas();
    drawScene(renderScene, 0, 0);
    updateStats();
    renderMs = performance.now() - started;
    return getStats();
}

export async function playShot(scene, trail, explosions, screenShake, weaponId) {
    if (!ctx || !trail?.length) {
        render(scene);
        return;
    }

    const shotScene = prepareScene(scene);
    shotInProgress = true;
    const points = Array.from(trail);
    const duration = Math.min(1200, Math.max(260, points.length * 4));
    const started = performance.now();

    return new Promise(resolve => {
        const finish = () => {
            if (!explosions?.length) {
                setTimeout(() => {
                    shotInProgress = false;
                    resolve();
                }, 120);
                return;
            }

            animateExplosions(scene, explosions ?? [], screenShake).then(() => {
                shotInProgress = false;
                resolve();
            });
        };

        const tick = now => {
            const t = Math.min(1, (now - started) / duration);
            const count = Math.max(1, Math.floor(points.length * t));
            const shake = screenShake && explosions?.some(e => e.nuclear || e.radius > 80) ? Math.sin(now * 0.08) * (1 - t) * 8 : 0;
            drawScene(shotScene, shake, -shake * 0.4);
            drawTrail(points, count, weaponId);
            if (t < 1) {
                requestAnimationFrame(tick);
                return;
            }

            requestAnimationFrame(() => {
                drawScene(shotScene, 0, 0);
                drawTrail(points, points.length, weaponId);
                finish();
            });
        };

        requestAnimationFrame(tick);
    });
}

export function getStats() {
    return { fps: Math.round(fps), frameMs, renderMs };
}

function prepareScene(scene) {
    if (scene?.terrain?.length) {
        cachedTerrain = scene.terrain;
        return scene;
    }

    return { ...scene, terrain: cachedTerrain ?? [] };
}

function drawScene(scene, offsetX, offsetY) {
    const scaleX = canvas.width / scene.world.width;
    const scaleY = canvas.height / scene.world.height;
    ctx.save();
    ctx.setTransform(scaleX, 0, 0, scaleY, offsetX, offsetY);
    drawSky(scene);
    drawWeather(scene, false);
    drawRadiation(scene.radiation ?? []);
    drawTerrain(scene.terrain ?? [], scene.world);
    drawTank(scene.player, "playerTank");
    drawTank(scene.cpu, "cpuTank");
    drawWind(scene.wind);
    drawWeather(scene, true);
    ctx.restore();
}

function drawSky(scene) {
    const gradient = ctx.createLinearGradient(0, 0, 0, scene.world.height);
    gradient.addColorStop(0, "#82c8ee");
    gradient.addColorStop(0.58, "#f2d9a2");
    gradient.addColorStop(1, "#5b4a3d");
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, scene.world.width, scene.world.height);
    drawClouds(scene);
}

function drawClouds(scene) {
    const worldWidth = scene.world.width;
    const wind = scene.wind ?? 0;
    const windDirection = wind === 0 ? 1 : Math.sign(wind);
    const windStrength = Math.abs(wind);
    const nowSeconds = performance.now() / 1000;

    for (const cloud of cloudBands) {
        const travel = worldWidth + 260;
        const speed = (cloud.speed * 0.35) + (windStrength * 1.35);
        const x = positiveModulo(cloud.x + (windDirection * speed * nowSeconds), travel) - 150;
        drawCloud(x, cloud.y, cloud.scale);
    }
}

function drawWeather(scene, foreground) {
    const weather = resolveWeather(scene);
    if (weather.type === "clear") {
        return;
    }

    if (!foreground && weather.type === "storm") {
        drawStormSky(scene, weather);
        return;
    }

    if (weather.type === "rain" || weather.type === "storm") {
        drawRain(scene, weather, foreground);
    } else if (weather.type === "snow") {
        drawSnow(scene, weather, foreground);
    }
}

function resolveWeather(scene) {
    const source = scene.weather ?? scene.world?.weather ?? scene.environment?.weather;
    const explicit = typeof source === "string" ? source : source?.type ?? source?.kind;
    const normalized = String(explicit ?? "").toLowerCase();
    const wind = Number(scene.wind ?? 0);
    const round = Number(scene.round ?? scene.turn ?? 0);
    const phaseValue = scene.phase ? String(scene.phase).length : 0;
    const seed = hash2d(Math.round(wind * 19) + round * 31, phaseValue + Math.round((scene.world?.width ?? 1200) * 0.1));
    const type = weatherTypes.includes(normalized) ? normalized : weatherTypes[seed % weatherTypes.length];
    const intensity = clamp01(Number(source?.intensity ?? source?.strength ?? (0.36 + (seed % 31) / 100)));
    return { type, intensity, seed, wind };
}

function drawStormSky(scene, weather) {
    const world = scene.world;
    const pulse = Math.sin(performance.now() * 0.004 + weather.seed) * 0.5 + 0.5;
    ctx.fillStyle = `rgba(19, 24, 34, ${0.18 + weather.intensity * 0.18})`;
    ctx.fillRect(0, 0, world.width, world.height);

    if ((weather.seed % 7) < 2 && pulse > 0.82) {
        const x = 160 + (weather.seed % 820);
        ctx.strokeStyle = `rgba(226, 238, 255, ${(pulse - 0.82) * 2.2})`;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(x, 38);
        ctx.lineTo(x + 24, 112);
        ctx.lineTo(x - 5, 174);
        ctx.lineTo(x + 42, 256);
        ctx.stroke();
        ctx.fillStyle = `rgba(235, 245, 255, ${(pulse - 0.82) * 0.12})`;
        ctx.fillRect(0, 0, world.width, world.height);
    }
}

function drawRain(scene, weather, foreground) {
    const world = scene.world;
    const now = performance.now() * 0.001;
    const baseCount = 58 + Math.floor(weather.intensity * 48);
    const count = foreground ? baseCount : Math.floor(baseCount * 0.36);
    const slant = clamp(weather.wind * 0.75, -34, 34);
    const alpha = foreground ? (weather.type === "storm" ? 0.38 : 0.34) : 0.14;
    ctx.strokeStyle = weather.type === "storm" ? `rgba(190, 218, 240, ${alpha})` : `rgba(207, 232, 245, ${alpha})`;
    ctx.lineWidth = foreground ? 1.2 : 0.8;
    ctx.beginPath();
    for (let i = 0; i < count; i++) {
        const lane = hash2d(i + weather.seed, 19) % 1220;
        const speed = 380 + (hash2d(i, weather.seed) % 180);
        const x = positiveModulo(lane + slant * now * 5, world.width + 80) - 40;
        const y = positiveModulo((hash2d(i, 43) % 720) + now * speed, world.height + 80) - 40;
        ctx.moveTo(x, y);
        ctx.lineTo(x + slant * 0.45, y + (foreground ? 24 : 16));
    }
    ctx.stroke();
}

function drawSnow(scene, weather, foreground) {
    const world = scene.world;
    const now = performance.now() * 0.001;
    const baseCount = 42 + Math.floor(weather.intensity * 34);
    const count = foreground ? baseCount : Math.floor(baseCount * 0.4);
    ctx.fillStyle = foreground ? "rgba(246, 251, 255, 0.56)" : "rgba(246, 251, 255, 0.24)";
    for (let i = 0; i < count; i++) {
        const drift = Math.sin(now * 0.9 + i) * 18 + weather.wind * 0.25;
        const x = positiveModulo((hash2d(i, weather.seed) % 1240) + drift + now * weather.wind * 2, world.width + 60) - 30;
        const y = positiveModulo((hash2d(weather.seed, i) % 760) + now * (36 + (i % 5) * 9), world.height + 50) - 25;
        const size = 1.2 + (i % 3) * 0.7;
        ctx.fillRect(x, y, size, size);
    }
}

function drawCloud(x, y, scale) {
    ctx.save();
    ctx.translate(x, y);
    ctx.scale(scale, scale);
    ctx.fillStyle = "rgba(255,255,255,0.46)";
    ctx.beginPath();
    ctx.ellipse(26, 10, 32, 13, 0, 0, Math.PI * 2);
    ctx.ellipse(62, 5, 44, 18, 0, 0, Math.PI * 2);
    ctx.ellipse(104, 12, 38, 14, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "rgba(225,239,245,0.32)";
    ctx.fillRect(18, 16, 108, 8);
    ctx.restore();
}

function drawTerrain(terrain, world) {
    if (!terrain.length) {
        return;
    }

    const worldHeight = world?.height ?? 700;
    const surfaceTop = terrain.reduce((lowest, y) => Math.min(lowest, y), worldHeight);
    ctx.beginPath();
    ctx.moveTo(0, worldHeight);
    for (let x = 0; x < terrain.length; x++) {
        ctx.lineTo(x, terrain[x]);
    }
    ctx.lineTo(terrain.length - 1, worldHeight);
    ctx.closePath();
    const dirtGradient = ctx.createLinearGradient(0, surfaceTop, 0, worldHeight);
    dirtGradient.addColorStop(0, "#4f6d38");
    dirtGradient.addColorStop(0.08, "#2f4324");
    dirtGradient.addColorStop(0.34, "#3d3327");
    dirtGradient.addColorStop(1, "#171511");
    ctx.fillStyle = dirtGradient;
    ctx.fill();

    ctx.save();
    ctx.beginPath();
    ctx.moveTo(0, worldHeight);
    for (let x = 0; x < terrain.length; x++) {
        ctx.lineTo(x, terrain[x]);
    }
    ctx.lineTo(terrain.length - 1, worldHeight);
    ctx.closePath();
    ctx.clip();
    drawTerrainStrata(terrain, worldHeight);
    drawTerrainGrain(terrain, worldHeight);
    drawTerrainRocks(terrain, worldHeight);
    ctx.restore();

    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.strokeStyle = "rgba(30, 42, 22, 0.65)";
    ctx.lineWidth = 7;
    strokeTerrainTop(terrain, terrainStride, 7);
    ctx.strokeStyle = "#8fbf64";
    ctx.lineWidth = 4;
    strokeTerrainTop(terrain, terrainStride);
    ctx.strokeStyle = "rgba(232, 211, 143, 0.55)";
    ctx.lineWidth = 1.5;
    strokeTerrainTop(terrain, 6, 5);
    drawTerrainGrass(terrain);
}

function drawTerrainStrata(terrain, worldHeight) {
    for (let y = 330; y < worldHeight; y += 28) {
        ctx.beginPath();
        let started = false;
        for (let x = 0; x < terrain.length; x += 7) {
            const surface = terrain[x] ?? worldHeight;
            const lineY = y + Math.sin((x + y) * 0.018) * 5 + ((hash2d(x, y) % 5) - 2);
            if (lineY <= surface + 12) {
                started = false;
                continue;
            }

            if (!started) {
                ctx.moveTo(x, lineY);
                started = true;
            } else {
                ctx.lineTo(x, lineY);
            }
        }

        ctx.strokeStyle = y % 56 === 0 ? "rgba(112, 82, 54, 0.46)" : "rgba(226, 194, 128, 0.17)";
        ctx.lineWidth = y % 84 === 0 ? 3 : 1.5;
        ctx.stroke();
    }
}

function drawTerrainGrain(terrain, worldHeight) {
    ctx.fillStyle = "rgba(255, 235, 178, 0.11)";
    for (let x = 3; x < terrain.length; x += 17) {
        const top = terrain[x] ?? worldHeight;
        const depth = Math.max(18, worldHeight - top);
        const y = top + 12 + (hash2d(x, top) % Math.floor(depth));
        ctx.fillRect(x, y, 2, 1);
    }

    ctx.fillStyle = "rgba(9, 9, 7, 0.2)";
    for (let x = 9; x < terrain.length; x += 23) {
        const top = terrain[x] ?? worldHeight;
        const depth = Math.max(18, worldHeight - top);
        const y = top + 18 + (hash2d(x, top + 11) % Math.floor(depth));
        ctx.fillRect(x, y, 3, 2);
    }
}

function drawTerrainRocks(terrain, worldHeight) {
    for (let x = 14; x < terrain.length; x += 47) {
        const top = terrain[x] ?? worldHeight;
        const depth = worldHeight - top;
        if (depth < 42) {
            continue;
        }

        const y = top + 16 + (hash2d(x, top) % Math.min(150, Math.floor(depth - 12)));
        const w = 5 + (hash2d(top, x) % 9);
        const h = 3 + (hash2d(x + 7, top) % 5);
        ctx.fillStyle = "rgba(18, 18, 16, 0.34)";
        ctx.fillRect(x + 1, y + 1, w, h);
        ctx.fillStyle = "rgba(145, 126, 93, 0.34)";
        ctx.fillRect(x, y, w, Math.max(1, h - 1));
        ctx.fillStyle = "rgba(230, 208, 151, 0.2)";
        ctx.fillRect(x + 1, y, Math.max(2, w * 0.45), 1);
    }
}

function drawTerrainGrass(terrain) {
    ctx.strokeStyle = "rgba(159, 214, 94, 0.62)";
    ctx.lineWidth = 1;
    ctx.beginPath();
    for (let x = 2; x < terrain.length; x += 11) {
        const y = terrain[x] ?? 0;
        const h = 3 + (hash2d(x, y) % 6);
        const lean = ((hash2d(y, x) % 5) - 2) * 0.8;
        ctx.moveTo(x, y + 1);
        ctx.lineTo(x + lean, y - h);
    }
    ctx.stroke();
}

function strokeTerrainTop(terrain, step, yOffset = 0) {
    ctx.beginPath();
    for (let x = 0; x < terrain.length; x += step) {
        const y = terrain[x] + yOffset;
        if (x === 0) {
            ctx.moveTo(x, y);
        } else {
            ctx.lineTo(x, y);
        }
    }
    ctx.stroke();
}

function drawRadiation(zones) {
    for (const zone of zones) {
        ctx.beginPath();
        ctx.arc(zone.x, zone.y, zone.radius, 0, Math.PI * 2);
        ctx.fillStyle = "rgba(164, 255, 78, 0.16)";
        ctx.fill();
        ctx.strokeStyle = "rgba(164, 255, 78, 0.55)";
        ctx.lineWidth = 4;
        ctx.stroke();
    }
}

function drawTank(tank, frameName) {
    if (!tank) {
        return;
    }

    ctx.save();
    ctx.globalAlpha = 0.3;
    ctx.fillStyle = "#05070a";
    ctx.beginPath();
    ctx.ellipse(tank.x, tank.y - 4, 40, 9, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    drawTankSprite(tank, frameName);

    if (tank.shield > 0) {
        ctx.save();
        ctx.globalAlpha = 0.5 + Math.sin(performance.now() * 0.008) * 0.16;
        drawSprite("shield", tank.x - 34, tank.y - 50, 68, 58);
        ctx.restore();
    }

    if (tank.health <= 35) {
        drawSmokeStack(tank.x, tank.y - 54);
    }
}

function drawTankSprite(tank, baseFrameName) {
    const frameName = tank.isCpu || baseFrameName === "cpuTank" ? "cpuHull" : "playerHull";
    const frame = manifest?.frames?.[frameName];

    if (!frame) {
        drawSprite(baseFrameName, tank.x - 48, tank.y - 52, 96, 48);
        drawTankBarrel(tank);
        return;
    }

    const targetHeight = tank.isCpu ? 54 : 56;
    const targetWidth = targetHeight * (frame.w / frame.h);
    const anchorX = targetWidth * 0.5;
    const footY = tank.y + 4;
    drawSpriteFacing(frameName, tank.x - anchorX, footY - targetHeight, targetWidth, targetHeight, tank.isCpu ? -1 : 1);
    drawTankBarrel(tank);
}

function drawTankBarrel(tank) {
    const facing = tank.isCpu ? -1 : 1;
    const pivotX = tank.x + (facing * 15);
    const pivotY = tank.y - 38;
    const angle = Number(tank?.angle ?? (tank?.isCpu ? 138 : 42));
    const length = 48;

    ctx.save();
    ctx.translate(pivotX, pivotY);
    ctx.rotate(-angle * Math.PI / 180);

    ctx.lineCap = "round";
    ctx.strokeStyle = "#070a0d";
    ctx.lineWidth = 12;
    ctx.beginPath();
    ctx.moveTo(-4, 0);
    ctx.lineTo(length, 0);
    ctx.stroke();

    const metal = ctx.createLinearGradient(0, -5, 0, 5);
    metal.addColorStop(0, "#f6f4dc");
    metal.addColorStop(0.28, "#87949f");
    metal.addColorStop(0.58, "#2d343c");
    metal.addColorStop(0.82, "#cfd8df");
    metal.addColorStop(1, "#111720");
    ctx.strokeStyle = metal;
    ctx.lineWidth = 8;
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(length, 0);
    ctx.stroke();

    ctx.strokeStyle = "rgba(255, 255, 255, 0.58)";
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(5, -3);
    ctx.lineTo(length - 8, -3);
    ctx.stroke();

    ctx.fillStyle = "#070a0d";
    for (let x = 12; x < length - 4; x += 12) {
        ctx.fillRect(x, -5, 3, 10);
    }

    ctx.fillStyle = "#1b2028";
    ctx.fillRect(length - 2, -6, 8, 12);
    ctx.fillStyle = "#e6edf0";
    ctx.fillRect(length, -3, 5, 6);
    ctx.restore();

    drawTurretCap(tank, pivotX, pivotY);
}

function drawTurretCap(tank, x, y) {
    ctx.save();
    const capGradient = ctx.createLinearGradient(x - 16, y - 8, x + 16, y + 8);
    if (tank.isCpu) {
        capGradient.addColorStop(0, "#721f13");
        capGradient.addColorStop(0.5, "#ff7a2f");
        capGradient.addColorStop(1, "#33100d");
    } else {
        capGradient.addColorStop(0, "#073c42");
        capGradient.addColorStop(0.5, "#22d8cd");
        capGradient.addColorStop(1, "#08232b");
    }

    ctx.fillStyle = "#070a0d";
    ctx.beginPath();
    ctx.ellipse(x, y + 2, 17, 10, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = capGradient;
    ctx.beginPath();
    ctx.ellipse(x, y, 15, 8, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
}

function drawSmokeStack(x, y) {
    for (let i = 0; i < 3; i++) {
        const drift = Math.sin(performance.now() * 0.002 + i) * 5;
        ctx.fillStyle = `rgba(28, 28, 28, ${0.38 - i * 0.08})`;
        ctx.beginPath();
        ctx.arc(x + drift, y - i * 11, 6 + i * 2, 0, Math.PI * 2);
        ctx.fill();
    }
}

function drawWind(wind) {
    ctx.fillStyle = "#172028";
    ctx.fillRect(520, 18, 160, 36);
    ctx.fillStyle = "#f3f6e8";
    ctx.font = "18px system-ui";
    const arrow = wind > 0 ? "->" : wind < 0 ? "<-" : "--";
    ctx.fillText(`Wind ${arrow} ${Math.abs(wind ?? 0)}`, 545, 42);
}

function drawTrail(points, count = points.length, weaponId) {
    if (!points?.length || count <= 0) {
        return;
    }

    ctx.save();
    ctx.setTransform(canvas.width / 1200, 0, 0, canvas.height / 700, 0, 0);
    const visibleCount = Math.min(points.length, count);
    const missileLike = isMissileWeapon(weaponId) || (!weaponId && visibleCount > 36);
    if (missileLike) {
        drawSmokeTrail(points, visibleCount, weaponId);
    }

    ctx.strokeStyle = missileLike ? "rgba(255, 246, 191, 0.86)" : "#fff6bf";
    ctx.lineWidth = missileLike ? 2.2 : 3;
    ctx.beginPath();
    for (let index = 0; index < visibleCount; index++) {
        const point = points[index];
        if (index === 0) {
            ctx.moveTo(point.x, point.y);
        } else {
            ctx.lineTo(point.x, point.y);
        }
    }
    ctx.stroke();
    const last = points[visibleCount - 1];
    const prev = points[Math.max(0, visibleCount - 3)];
    drawFlameTip(last, prev, missileLike);
    if (missileLike) {
        drawOrientedSprite("missile", last.x, last.y, 34, 14, Math.atan2(last.y - prev.y, last.x - prev.x));
    } else {
        drawSprite("shell", last.x - 9, last.y - 5, 18, 9);
    }
    ctx.restore();
}

function drawSmokeTrail(points, count, weaponId) {
    const napalm = isNapalmWeapon(weaponId);
    const step = Math.max(2, Math.floor(count / 28));
    for (let i = Math.max(0, count - 120); i < count; i += step) {
        const point = points[i];
        const age = (count - i) / Math.max(count, 1);
        const wobble = (hash2d(i, count) % 9) - 4;
        const size = 3 + age * 15 + (i % 3);
        ctx.fillStyle = napalm
            ? `rgba(78, 45, 32, ${0.12 + age * 0.18})`
            : `rgba(62, 64, 62, ${0.12 + age * 0.2})`;
        ctx.beginPath();
        ctx.arc(point.x + wobble, point.y + Math.sin(i) * 2, size, 0, Math.PI * 2);
        ctx.fill();

        if (napalm && i > count - 38) {
            ctx.fillStyle = `rgba(255, 103, 35, ${0.34 * (1 - age)})`;
            ctx.beginPath();
            ctx.arc(point.x - wobble * 0.4, point.y + 2, size * 0.42, 0, Math.PI * 2);
            ctx.fill();
        }
    }
}

function drawFlameTip(last, prev, missileLike) {
    if (!missileLike) {
        return;
    }

    const dx = last.x - prev.x;
    const dy = last.y - prev.y;
    const angle = Math.atan2(dy, dx);
    ctx.save();
    ctx.translate(last.x, last.y);
    ctx.rotate(angle);
    const gradient = ctx.createRadialGradient(-6, 0, 1, -6, 0, 15);
    gradient.addColorStop(0, "#fff6bf");
    gradient.addColorStop(0.42, "rgba(255, 126, 38, 0.82)");
    gradient.addColorStop(1, "rgba(255, 62, 28, 0)");
    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.ellipse(-8, 0, 18, 7, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
}

function animateExplosions(scene, explosions, screenShake) {
    const started = performance.now();
    const duration = explosions.some(explosion => explosion.nuclear) ? 560 : 420;

    return new Promise(resolve => {
        const tick = now => {
            const t = Math.min(1, (now - started) / duration);
            const strength = Math.sin(t * Math.PI);
            const shake = screenShake ? strength * (explosions.some(e => e.nuclear || e.radius > 80) ? 7 : 3) : 0;
            drawScene(scene, Math.sin(now * 0.09) * shake, Math.cos(now * 0.07) * shake * 0.45);
            drawExplosions(explosions, t);
            if (t < 1) {
                requestAnimationFrame(tick);
                return;
            }

            resolve();
        };

        requestAnimationFrame(tick);
    });
}

function drawExplosions(explosions, progress = 1) {
    ctx.save();
    ctx.setTransform(canvas.width / 1200, 0, 0, canvas.height / 700, 0, 0);
    for (const explosion of explosions) {
        const radius = explosion.radius ?? 32;
        const lava = isLavaExplosion(explosion);
        const patriot = isPatriotExplosion(explosion);
        const bloom = radius * (0.45 + progress * 0.9);
        const fade = Math.max(0, 1 - progress);
        const flash = Math.max(0, 1 - progress * 2.2);
        const spriteName = patriot ? "shield" : explosion.nuclear ? "nuclear" : radius > 58 ? "explosionLarge" : "explosionSmall";
        const spriteSize = radius * (1.4 + progress * (explosion.nuclear ? 1.4 : 0.95));
        ctx.save();
        ctx.globalAlpha = Math.min(1, 0.25 + progress * 1.2) * Math.max(0.18, 1 - progress * 0.16);
        drawSprite(spriteName, explosion.x - spriteSize / 2, explosion.y - spriteSize / 2, spriteSize, spriteSize);
        ctx.restore();

        const gradient = ctx.createRadialGradient(explosion.x, explosion.y, 2, explosion.x, explosion.y, bloom);
        gradient.addColorStop(0, "#fffdf0");
        gradient.addColorStop(0.22, patriot ? "#9fd6ff" : explosion.nuclear ? "#d7ff6a" : lava ? "#fff06a" : "#ffdc68");
        gradient.addColorStop(0.58, patriot ? "rgba(71, 165, 255, 0.58)" : explosion.nuclear ? "rgba(101, 197, 78, 0.58)" : lava ? "rgba(255, 80, 24, 0.78)" : "rgba(236, 106, 92, 0.72)");
        gradient.addColorStop(1, "rgba(28, 22, 18, 0)");
        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.arc(explosion.x, explosion.y, bloom, 0, Math.PI * 2);
        ctx.fill();

        ctx.strokeStyle = `rgba(255, 246, 191, ${0.78 * fade})`;
        ctx.lineWidth = 5;
        ctx.beginPath();
        ctx.arc(explosion.x, explosion.y, radius * (0.65 + progress * 1.1), 0, Math.PI * 2);
        ctx.stroke();

        drawBlastSparks(explosion, radius, progress, lava);
        drawSmokePuffs(explosion, radius, progress);

        if (flash > 0) {
            ctx.fillStyle = `rgba(255, 255, 255, ${flash * 0.72})`;
            ctx.beginPath();
            ctx.arc(explosion.x, explosion.y, radius * (0.18 + progress * 0.35), 0, Math.PI * 2);
            ctx.fill();
        }

        if (patriot) {
            drawPatriotIntercept(explosion, radius, progress);
        } else if (explosion.nuclear) {
            drawNukeColumn(explosion, radius, progress);
            ctx.strokeStyle = `rgba(213, 255, 106, ${0.75 * fade})`;
            ctx.lineWidth = 6;
            ctx.beginPath();
            ctx.arc(explosion.x, explosion.y, radius * (1.1 + progress * 1.15), 0, Math.PI * 2);
            ctx.stroke();
        } else if (lava) {
            drawLavaSplash(explosion, radius, progress);
        }
    }
    ctx.restore();
}

function drawBlastSparks(explosion, radius, progress, lava = false) {
    const count = explosion.nuclear ? 28 : lava ? 20 : 14;
    ctx.strokeStyle = lava ? `rgba(255, 82, 28, ${Math.max(0, 1 - progress * 0.75)})` : `rgba(255, 218, 104, ${Math.max(0, 1 - progress)})`;
    ctx.lineWidth = 2;
    for (let i = 0; i < count; i++) {
        const angle = (Math.PI * 2 * i / count) + hash2d(i, radius) * 0.0009;
        const inner = radius * (0.24 + progress * 0.38);
        const outer = radius * (0.42 + progress * ((lava ? 1.02 : 0.78) + (i % 3) * 0.12));
        ctx.beginPath();
        ctx.moveTo(explosion.x + Math.cos(angle) * inner, explosion.y + Math.sin(angle) * inner);
        ctx.lineTo(explosion.x + Math.cos(angle) * outer, explosion.y + Math.sin(angle) * outer);
        ctx.stroke();
    }
}

function drawSmokePuffs(explosion, radius, progress) {
    const count = explosion.nuclear ? 11 : 7;
    for (let i = 0; i < count; i++) {
        const angle = Math.PI * 2 * i / count;
        const drift = radius * (0.28 + progress * 0.55);
        const puffRadius = radius * (0.12 + progress * 0.18) * (1 + (i % 3) * 0.16);
        const x = explosion.x + Math.cos(angle) * drift;
        const y = explosion.y + Math.sin(angle) * drift - progress * radius * 0.16;
        ctx.fillStyle = `rgba(42, 37, 31, ${0.34 * progress * (1 - progress * 0.35)})`;
        ctx.beginPath();
        ctx.arc(x, y, puffRadius, 0, Math.PI * 2);
        ctx.fill();
    }
}

function drawLavaSplash(explosion, radius, progress) {
    const fade = Math.max(0, 1 - progress * 0.55);
    for (let i = 0; i < 13; i++) {
        const angle = -Math.PI + (Math.PI * i / 12);
        const arc = radius * (0.35 + progress * (0.55 + (i % 4) * 0.1));
        const x = explosion.x + Math.cos(angle) * arc;
        const y = explosion.y + Math.sin(angle) * arc + progress * radius * 0.65;
        ctx.fillStyle = i % 2 === 0 ? `rgba(255, 215, 74, ${0.75 * fade})` : `rgba(255, 75, 24, ${0.78 * fade})`;
        ctx.beginPath();
        ctx.arc(x, y, radius * (0.035 + (i % 3) * 0.012), 0, Math.PI * 2);
        ctx.fill();
    }

    ctx.fillStyle = `rgba(255, 68, 22, ${0.28 * fade})`;
    ctx.fillRect(explosion.x - radius * 0.55, explosion.y + radius * 0.18, radius * 1.1, Math.max(3, radius * 0.08));
    ctx.fillStyle = `rgba(255, 225, 92, ${0.34 * fade})`;
    ctx.fillRect(explosion.x - radius * 0.34, explosion.y + radius * 0.2, radius * 0.68, Math.max(2, radius * 0.035));
}

function drawNukeColumn(explosion, radius, progress) {
    const fade = Math.max(0, 1 - progress * 0.45);
    const stemHeight = radius * (1.15 + progress * 1.35);
    const stemWidth = radius * (0.22 + progress * 0.18);
    const x = explosion.x;
    const y = explosion.y;
    const gradient = ctx.createLinearGradient(x, y - stemHeight, x, y + radius * 0.25);
    gradient.addColorStop(0, `rgba(225, 255, 166, ${0.06 * fade})`);
    gradient.addColorStop(0.45, `rgba(241, 244, 205, ${0.22 * fade})`);
    gradient.addColorStop(1, `rgba(79, 62, 48, ${0.32 * fade})`);
    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.ellipse(x, y - stemHeight * 0.45, stemWidth, stemHeight * 0.55, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.strokeStyle = `rgba(235, 255, 182, ${0.48 * (1 - progress)})`;
    ctx.lineWidth = 3;
    for (let i = 0; i < 3; i++) {
        ctx.beginPath();
        ctx.arc(x, y - radius * (0.45 + i * 0.25), radius * (0.38 + progress * 0.72 + i * 0.16), 0, Math.PI * 2);
        ctx.stroke();
    }
}

function isMissileWeapon(weaponId) {
    const id = String(weaponId ?? "").toLowerCase();
    return id.includes("missile") || id.includes("rocket") || id.includes("nuke") || id.includes("napalm")
        || id.includes("dark-eagle") || id.includes("hypersonic") || id.includes("shahed") || id.includes("drone");
}

function isNapalmWeapon(weaponId) {
    const id = String(weaponId ?? "").toLowerCase();
    return id.includes("napalm") || id.includes("lava");
}

function isLavaExplosion(explosion) {
    const id = String(explosion.weaponId ?? explosion.weapon ?? explosion.kind ?? "").toLowerCase();
    return Boolean(explosion.lava || explosion.napalm || id === "napalm-flask" || id.includes("napalm") || id.includes("lava"));
}

function isPatriotExplosion(explosion) {
    const kind = String(explosion.visualKind ?? explosion.kind ?? "").toLowerCase();
    return Boolean(explosion.patriotIntercept || kind.includes("patriot"));
}

function drawPatriotIntercept(explosion, radius, progress) {
    const fade = Math.max(0, 1 - progress);
    ctx.strokeStyle = `rgba(113, 198, 255, ${0.82 * fade})`;
    ctx.lineWidth = 3;
    for (let i = 0; i < 3; i++) {
        ctx.beginPath();
        ctx.arc(explosion.x, explosion.y, radius * (0.45 + progress * (0.78 + i * 0.24)), 0, Math.PI * 2);
        ctx.stroke();
    }

    ctx.strokeStyle = `rgba(255, 248, 217, ${0.75 * fade})`;
    ctx.lineWidth = 2;
    for (let i = 0; i < 10; i++) {
        const angle = (Math.PI * 2 * i / 10) + progress * 0.4;
        ctx.beginPath();
        ctx.moveTo(explosion.x + Math.cos(angle) * radius * 0.18, explosion.y + Math.sin(angle) * radius * 0.18);
        ctx.lineTo(explosion.x + Math.cos(angle) * radius * (0.9 + progress * 0.42), explosion.y + Math.sin(angle) * radius * (0.9 + progress * 0.42));
        ctx.stroke();
    }
}

function drawSprite(name, x, y, width, height) {
    const frame = manifest?.frames?.[name];
    if (!atlas || !frame) {
        fallbackSprite(name, x, y, width, height);
        return;
    }

    ctx.drawImage(atlas, frame.x, frame.y, frame.w, frame.h, x, y, width, height);
}

function drawOrientedSprite(name, x, y, width, height, angle) {
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(angle);
    drawSprite(name, -width * 0.5, -height * 0.5, width, height);
    ctx.restore();
}

function drawSpriteFacing(name, x, y, width, height, facing = 1) {
    if (facing >= 0) {
        drawSprite(name, x, y, width, height);
        return;
    }

    ctx.save();
    ctx.translate(x + width, y);
    ctx.scale(-1, 1);
    drawSprite(name, 0, 0, width, height);
    ctx.restore();
}

function fallbackSprite(name, x, y, width, height) {
    ctx.fillStyle = name.includes("cpu") ? "#ec6a5c" : "#50c5b7";
    ctx.fillRect(x, y + height * 0.25, width, height * 0.55);
    ctx.fillStyle = "#111418";
    ctx.fillRect(x + width * 0.12, y + height * 0.78, width * 0.76, height * 0.12);
}

async function loadSprites() {
    try {
        const response = await fetch(`assets/sprites/atlas.json?v=${spriteManifestVersion}`, { cache: "no-cache" });
        manifest = await response.json();
        atlas = new Image();
        atlas.src = cacheBustedUrl(manifest.image, manifest.version ?? spriteManifestVersion);
        await atlas.decode();
    } catch {
        manifest = { frames: {} };
        atlas = undefined;
    }
}

function cacheBustedUrl(url, version) {
    if (!url) {
        return url;
    }

    return `${url}${url.includes("?") ? "&" : "?"}v=${encodeURIComponent(version)}`;
}

function sizeCanvas() {
    const rect = canvas.getBoundingClientRect();
    const nextWidth = Math.max(1, Math.floor(rect.width * devicePixelRatio));
    const nextHeight = Math.max(1, Math.floor(rect.height * devicePixelRatio));
    if (canvas.width !== nextWidth || canvas.height !== nextHeight) {
        canvas.width = nextWidth;
        canvas.height = nextHeight;
        ctx.imageSmoothingEnabled = false;
    }
}

function updateStats() {
    const now = performance.now();
    frameMs = now - lastFrame;
    lastFrame = now;
    fps = (fps * 0.9) + ((1000 / Math.max(frameMs, 1)) * 0.1);
}

function startStatsLoop() {
    if (rafId) {
        return;
    }

    const tick = () => {
        const started = performance.now();
        if (lastScene && !shotInProgress) {
            sizeCanvas();
            drawScene(lastScene, 0, 0);
            renderMs = performance.now() - started;
        }

        updateStats();
        rafId = requestAnimationFrame(tick);
    };

    rafId = requestAnimationFrame(tick);
}

function hash2d(x, y) {
    const value = Math.sin(x * 12.9898 + y * 78.233) * 43758.5453;
    return Math.abs(Math.floor(value));
}

function positiveModulo(value, divisor) {
    return ((value % divisor) + divisor) % divisor;
}

function clamp(value, min, max) {
    return Math.min(max, Math.max(min, value));
}

function clamp01(value) {
    return clamp(Number.isFinite(value) ? value : 0.45, 0, 1);
}
