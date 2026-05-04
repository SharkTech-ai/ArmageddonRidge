let canvas;
let ctx;
let atlas;
let manifest;
let lastFrame = performance.now();
let fps = 60;
let frameMs = 16.7;
let renderMs = 0;
let lastScene;
let rafId = 0;

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

    const started = performance.now();
    lastScene = scene;
    sizeCanvas();
    drawScene(scene, 0, 0);
    updateStats();
    renderMs = performance.now() - started;
    return getStats();
}

export async function playShot(scene, trail, explosions, screenShake) {
    if (!ctx || !trail?.length) {
        render(scene);
        return;
    }

    const points = Array.from(trail);
    const duration = Math.min(1200, Math.max(260, points.length * 4));
    const started = performance.now();

    return new Promise(resolve => {
        const tick = now => {
            const t = Math.min(1, (now - started) / duration);
            const count = Math.max(1, Math.floor(points.length * t));
            const shake = screenShake && explosions?.some(e => e.nuclear || e.radius > 80) ? Math.sin(now * 0.08) * (1 - t) * 8 : 0;
            drawScene(scene, shake, -shake * 0.4);
            drawTrail(points.slice(0, count));
            if (t < 1) {
                requestAnimationFrame(tick);
                return;
            }

            drawExplosions(explosions ?? []);
            setTimeout(() => {
                render(scene);
                resolve();
            }, 120);
        };

        requestAnimationFrame(tick);
    });
}

export function getStats() {
    return { fps: Math.round(fps), frameMs, renderMs };
}

function drawScene(scene, offsetX, offsetY) {
    const scaleX = canvas.width / scene.world.width;
    const scaleY = canvas.height / scene.world.height;
    ctx.save();
    ctx.setTransform(scaleX, 0, 0, scaleY, offsetX, offsetY);
    drawSky(scene);
    drawRadiation(scene.radiation ?? []);
    drawTerrain(scene.terrain ?? []);
    drawTank(scene.player, "playerTank");
    drawTank(scene.cpu, "cpuTank");
    drawWind(scene.wind);
    ctx.restore();
}

function drawSky(scene) {
    const gradient = ctx.createLinearGradient(0, 0, 0, scene.world.height);
    gradient.addColorStop(0, "#82c8ee");
    gradient.addColorStop(0.58, "#f2d9a2");
    gradient.addColorStop(1, "#5b4a3d");
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, scene.world.width, scene.world.height);
    ctx.fillStyle = "rgba(255,255,255,0.55)";
    for (let i = 0; i < 5; i++) {
        const x = 120 + i * 230 + (scene.wind ?? 0);
        const y = 60 + (i % 2) * 34;
        ctx.fillRect(x, y, 70, 10);
        ctx.fillRect(x + 18, y - 10, 82, 10);
    }
}

function drawTerrain(terrain) {
    if (!terrain.length) {
        return;
    }

    ctx.beginPath();
    ctx.moveTo(0, 700);
    for (let x = 0; x < terrain.length; x++) {
        ctx.lineTo(x, terrain[x]);
    }
    ctx.lineTo(terrain.length - 1, 700);
    ctx.closePath();
    ctx.fillStyle = "#222018";
    ctx.fill();
    ctx.strokeStyle = "#7aa35b";
    ctx.lineWidth = 3;
    ctx.beginPath();
    for (let x = 0; x < terrain.length; x += 4) {
        if (x === 0) {
            ctx.moveTo(x, terrain[x]);
        } else {
            ctx.lineTo(x, terrain[x]);
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

    drawSprite(frameName, tank.x - 24, tank.y - 28, 48, 32);
    ctx.save();
    ctx.translate(tank.x, tank.y - 22);
    ctx.rotate(-(tank.angle ?? 45) * Math.PI / 180);
    drawSprite(tank.isCpu ? "cpuTurret" : "playerTurret", -4, -5, 36, 10);
    ctx.restore();

    if (tank.shield > 0) {
        ctx.beginPath();
        ctx.arc(tank.x, tank.y - 15, 28 + Math.sin(performance.now() * 0.008) * 2, 0, Math.PI * 2);
        ctx.strokeStyle = "rgba(101, 167, 242, 0.75)";
        ctx.lineWidth = 3;
        ctx.stroke();
    }

    if (tank.health <= 35) {
        ctx.fillStyle = "rgba(40,40,40,0.55)";
        ctx.fillRect(tank.x - 6, tank.y - 48, 12, 20);
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

function drawTrail(points) {
    ctx.save();
    ctx.setTransform(canvas.width / 1200, 0, 0, canvas.height / 700, 0, 0);
    ctx.strokeStyle = "#fff6bf";
    ctx.lineWidth = 3;
    ctx.beginPath();
    points.forEach((point, index) => {
        if (index === 0) {
            ctx.moveTo(point.x, point.y);
        } else {
            ctx.lineTo(point.x, point.y);
        }
    });
    ctx.stroke();
    const last = points[points.length - 1];
    drawSprite("shell", last.x - 5, last.y - 5, 10, 10);
    ctx.restore();
}

function drawExplosions(explosions) {
    ctx.save();
    ctx.setTransform(canvas.width / 1200, 0, 0, canvas.height / 700, 0, 0);
    for (const explosion of explosions) {
        const radius = explosion.radius ?? 32;
        const gradient = ctx.createRadialGradient(explosion.x, explosion.y, 2, explosion.x, explosion.y, radius);
        gradient.addColorStop(0, "#fffdf0");
        gradient.addColorStop(0.32, explosion.nuclear ? "#c8ff5b" : "#ffdc68");
        gradient.addColorStop(1, "rgba(236,106,92,0)");
        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.arc(explosion.x, explosion.y, radius, 0, Math.PI * 2);
        ctx.fill();
        if (explosion.nuclear) {
            ctx.strokeStyle = "rgba(255,255,255,0.75)";
            ctx.lineWidth = 5;
            ctx.beginPath();
            ctx.arc(explosion.x, explosion.y, radius * 1.45, 0, Math.PI * 2);
            ctx.stroke();
        }
    }
    ctx.restore();
}

function drawSprite(name, x, y, width, height) {
    const frame = manifest?.frames?.[name];
    if (!atlas || !frame) {
        fallbackSprite(name, x, y, width, height);
        return;
    }

    ctx.drawImage(atlas, frame.x, frame.y, frame.w, frame.h, x, y, width, height);
}

function fallbackSprite(name, x, y, width, height) {
    ctx.fillStyle = name.includes("cpu") ? "#ec6a5c" : "#50c5b7";
    ctx.fillRect(x, y + height * 0.25, width, height * 0.55);
    ctx.fillStyle = "#111418";
    ctx.fillRect(x + width * 0.12, y + height * 0.78, width * 0.76, height * 0.12);
}

async function loadSprites() {
    try {
        const response = await fetch("assets/sprites/atlas.json", { cache: "force-cache" });
        manifest = await response.json();
        atlas = new Image();
        atlas.src = manifest.image;
        await atlas.decode();
    } catch {
        manifest = { frames: {} };
        atlas = undefined;
    }
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
        if (lastScene) {
            sizeCanvas();
            drawScene(lastScene, 0, 0);
            renderMs = performance.now() - started;
        }

        updateStats();
        rafId = requestAnimationFrame(tick);
    };

    rafId = requestAnimationFrame(tick);
}
