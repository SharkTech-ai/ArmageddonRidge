let context;
let master;
let unlocked = false;

export function initialize() {
    ensureContext();
}

export async function unlock() {
    ensureContext();
    if (context.state === "suspended") {
        await context.resume();
    }

    unlocked = true;
}

export function setVolume(value) {
    ensureContext();
    master.gain.value = Math.max(0, Math.min(1, value));
}

export function play(name) {
    ensureContext();
    if (!unlocked) {
        return;
    }

    const recipe = recipes[name] ?? recipes.menu;
    recipe();
}

function ensureContext() {
    if (context) {
        return;
    }

    context = new AudioContext();
    master = context.createGain();
    master.gain.value = 0.85;
    master.connect(context.destination);
}

function tone(frequency, duration, type = "square", gain = 0.08, sweep = 0) {
    const osc = context.createOscillator();
    const amp = context.createGain();
    const now = context.currentTime;
    osc.type = type;
    osc.frequency.setValueAtTime(frequency, now);
    if (sweep !== 0) {
        osc.frequency.exponentialRampToValueAtTime(Math.max(30, frequency + sweep), now + duration);
    }

    amp.gain.setValueAtTime(0.0001, now);
    amp.gain.exponentialRampToValueAtTime(gain, now + 0.01);
    amp.gain.exponentialRampToValueAtTime(0.0001, now + duration);
    osc.connect(amp);
    amp.connect(master);
    osc.start(now);
    osc.stop(now + duration + 0.02);
}

function noise(duration, gain = 0.16) {
    const buffer = context.createBuffer(1, context.sampleRate * duration, context.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < data.length; i++) {
        data[i] = (Math.random() * 2 - 1) * (1 - i / data.length);
    }

    const source = context.createBufferSource();
    const amp = context.createGain();
    amp.gain.value = gain;
    source.buffer = buffer;
    source.connect(amp);
    amp.connect(master);
    source.start();
}

const recipes = {
    menu: () => tone(640, 0.07, "triangle", 0.05, 180),
    fire: () => {
        tone(150, 0.18, "sawtooth", 0.09, -80);
        noise(0.12, 0.08);
    },
    smallExplosion: () => {
        tone(96, 0.16, "sawtooth", 0.12, -48);
        noise(0.24, 0.18);
    },
    largeExplosion: () => {
        tone(68, 0.36, "sawtooth", 0.16, -34);
        noise(0.48, 0.24);
    },
    nuclear: () => {
        tone(440, 0.18, "sine", 0.09, -220);
        setTimeout(() => recipes.largeExplosion(), 180);
    },
    shield: () => tone(880, 0.16, "triangle", 0.07, -260),
    shieldHit: () => {
        tone(1180, 0.09, "triangle", 0.08, 320);
        setTimeout(() => tone(760, 0.11, "sine", 0.05, -260), 36);
        noise(0.055, 0.035);
    },
    dirt: () => noise(0.18, 0.08),
    damage: () => tone(180, 0.12, "square", 0.07, -60),
    win: () => {
        tone(520, 0.08, "triangle", 0.06);
        setTimeout(() => tone(780, 0.12, "triangle", 0.06), 90);
    },
    loss: () => tone(220, 0.32, "sawtooth", 0.07, -120)
};
