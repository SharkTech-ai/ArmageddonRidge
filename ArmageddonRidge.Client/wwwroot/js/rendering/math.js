export function quadraticScalar(a, b, c, t) {
    const oneMinus = 1 - t;
    return oneMinus * oneMinus * a + 2 * oneMinus * t * b + t * t * c;
}

export function hash2d(x, y) {
    const value = Math.sin(x * 12.9898 + y * 78.233) * 43758.5453;
    return Math.abs(Math.floor(value));
}

export function positiveModulo(value, divisor) {
    return ((value % divisor) + divisor) % divisor;
}

export function clamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
}

export function clamp01(value) {
    return clamp(Number.isFinite(value) ? value : 0.45, 0, 1);
}
