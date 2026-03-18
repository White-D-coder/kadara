import * as THREE from 'three'

/**
 * Deterministic random number generator using a seed
 */
const Mulberry32 = (a) => {
  return function () {
    let t = (a += 0x6d2b79f5)
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

export const generateArchipelago = (seedString) => {
  const seed = seedString.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0)
  const rng = Mulberry32(seed)

  const islands = []

  // ─── 1. SINGLE MAIN ISLAND ─────────────────────────────────────────────────
  // Large Ghibli-scale landmass — central peak, radial ridges, lush forests,
  // sandy beach ring, rocky cliffs.  Radius 400 → 800m diameter.
  const ridgeCount = 5 + Math.floor(rng() * 4)          // 5-8 radial ridges
  const ridgeAngles = []
  for (let i = 0; i < ridgeCount; i++) {
    ridgeAngles.push(rng() * Math.PI * 2)
  }

  islands.push({
    id: 'central',
    position: new THREE.Vector3(0, 0, 0),
    radius: 400,
    scale: 1,
    seed: rng(),
    type: 'main',
    peakCount: ridgeCount,
    peakHeight: 130 + rng() * 30,          // 130-160 world units — dramatic peak
    riverCount: 2 + Math.floor(rng() * 2), // 2-3 rivers
    ridgeAngles,
  })

  // ─── 2. OFFSHORE ROCK SPIRES (8-12) ────────────────────────────────────────
  // Tiny jagged rocks poking out of the water around the island perimeter,
  // visible in the reference images as dark spires in the surrounding ocean.
  const spireTarget = 8 + Math.floor(rng() * 5)
  let spireAttempts = 0

  while (islands.length < spireTarget + 1 && spireAttempts < 200) {
    spireAttempts++
    const angle    = rng() * Math.PI * 2
    const distance = 440 + rng() * 320     // 440-760 units from center
    const x        = Math.cos(angle) * distance
    const z        = Math.sin(angle) * distance
    const newPos   = new THREE.Vector3(x, 0, z)
    const newRadius = 8 + rng() * 18       // 8-26 radius — tiny

    // Minimum spacing between spires
    let isOverlap = false
    for (const island of islands) {
      if (newPos.distanceTo(island.position) < newRadius + island.radius + 60) {
        isOverlap = true
        break
      }
    }

    if (!isOverlap) {
      islands.push({
        id: `spire-${islands.length}`,
        position: newPos,
        radius: newRadius,
        scale: newRadius / 400,
        seed: rng(),
        type: 'rocky',
        peakCount: 1 + Math.floor(rng() * 2),
        peakHeight: 15 + rng() * 35,       // 15-50 units — short spiky rocks
        riverCount: 0,
        ridgeAngles: [],
      })
    }
  }

  return islands
}