export function isMissileWeapon(weaponId) {
    const id = (weaponId ?? "").toLowerCase();
    return id.includes("missile")
        || id.includes("rocket")
        || id.includes("nuke")
        || id.includes("napalm")
        || id.includes("dark-eagle")
        || id.includes("hypersonic")
        || id.includes("shahed")
        || id.includes("drone")
        || id.includes("gbu")
        || id.includes("mop")
        || id.includes("penetrator")
        || id.includes("patriot");
}

export function isLaserWeapon(weaponId, visualKind) {
    const id = (weaponId ?? "").toLowerCase();
    const kind = (visualKind ?? "").toLowerCase();
    return id.includes("laser") || kind.includes("laser");
}

export function isDroneWeapon(weaponId) {
    const id = (weaponId ?? "").toLowerCase();
    return id.includes("shahed") || id.includes("drone");
}

export function isDarkEagleWeapon(weaponId) {
    return (weaponId ?? "").toLowerCase().includes("dark-eagle");
}

export function isMirvWeapon(weaponId) {
    const id = (weaponId ?? "").toLowerCase();
    return id.includes("mirv") || id.includes("splitter");
}

export function isMopWeapon(weaponId) {
    const id = (weaponId ?? "").toLowerCase();
    return id.includes("gbu") || id.includes("mop") || id.includes("penetrator");
}

export function isNapalmWeapon(weaponId) {
    const id = (weaponId ?? "").toLowerCase();
    return id.includes("napalm") || id.includes("lava");
}

export function isLavaExplosion(explosion) {
    const id = (explosion.weaponId ?? explosion.weapon ?? explosion.kind ?? "").toLowerCase();
    return Boolean(explosion.lava || explosion.napalm || id === "napalm-flask" || id.includes("napalm") || id.includes("lava"));
}

export function isPatriotExplosion(explosion) {
    const kind = (explosion.visualKind ?? "").toLowerCase();
    return Boolean(explosion.patriotIntercept || kind.includes("patriot"));
}

export function isShieldHitExplosion(explosion) {
    if (isPatriotExplosion(explosion)) return false;

    const kind = (explosion.visualKind ?? "").toLowerCase();
    return Boolean(explosion.shieldHit
        || explosion.shieldAbsorbed
        || explosion.absorbedByShield
        || Number(explosion.shieldDamage ?? explosion.shieldAbsorption ?? 0) > 0
        || kind.includes("shield"));
}

export function isLaserExplosion(explosion) {
    const kind = (explosion.visualKind ?? "").toLowerCase();
    const id = (explosion.weaponId ?? explosion.weapon ?? "").toLowerCase();
    return kind.includes("laser") || id.includes("laser");
}

export function isPenetratorExplosion(explosion) {
    const kind = (explosion.visualKind ?? "").toLowerCase();
    const id = (explosion.weaponId ?? "").toLowerCase();
    return kind.includes("penetrator") || kind.includes("mop") || kind.includes("gbu") || id.includes("gbu") || id.includes("mop");
}
