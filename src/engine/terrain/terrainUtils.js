/**
 * terrainUtils.js
 * ─────────────────────────────────────────────────────────────────────────────
 * CPU terrain height / normal / biome helpers.
 *
 * SYNC CONTRACT: Every noise function here is a direct JS port of the matching
 * GLSL code in shaders/terrain.js.  If you change the math here, change the
 * shader too — and vice versa — so that raycasting (PlotGrid), building
 * placement, and GPU rendering always agree.
 *
 * Design: Single dramatic Ghibli island — central peak with radial ridges,
 * lush forested hills, sandy beach ring, rocky coastal cliffs.
 * ─────────────────────────────────────────────────────────────────────────────
 */

// ─── Primitive noise ─────────────────────────────────────────────────────────

/** Smooth gradient noise via sin/cos pair — deterministic, no LUT */
function gradNoise(x, z) {
  return (
    Math.sin(x * 1.9 + Math.cos(z * 0.8)) *
    Math.cos(z * 1.7 + Math.sin(x * 0.6))
  )
}

/** Ridged noise — abs-folded for sharp mountain ridges */
function ridgedNoise(x, z) {
  return 1.0 - Math.abs(gradNoise(x, z))
}

/**
 * FBM — multi-octave smooth noise
 * @returns value in approximately [-1, 1]
 */
function fbm(x, z, octaves = 5, lacunarity = 2.1, gain = 0.48) {
  let value = 0, amplitude = 1.0, frequency = 1.0, maxVal = 0
  for (let i = 0; i < octaves; i++) {
    value    += gradNoise(x * frequency, z * frequency) * amplitude
    maxVal   += amplitude
    amplitude *= gain
    frequency *= lacunarity
  }
  return value / maxVal
}

/**
 * Ridged FBM — powers each octave for sharper ridges.
 * @returns value in [0, 1]
 */
function ridgedFBM(x, z, octaves = 4) {
  let value = 0, amplitude = 1.0, frequency = 1.0, maxVal = 0
  for (let i = 0; i < octaves; i++) {
    const r = ridgedNoise(x * frequency, z * frequency)
    value    += Math.pow(r, 2.2) * amplitude
    maxVal   += amplitude
    amplitude *= 0.5
    frequency *= 2.2
  }
  return value / maxVal
}

// ─── Island radial masks ──────────────────────────────────────────────────────

/**
 * Warped circular falloff — organic coastline, not a perfect circle.
 * Input coords should be normalised so radius = 1.
 * Returns 1 at centre, 0 at shore and beyond.
 */
function coastlineMask(lx, lz, islandSeed) {
  const s   = islandSeed * 6.28
  const wAmp = 0.22                                       // jaggedness amplitude
  // Domain-warp with multiple frequencies for organic irregular shore
  const wx = lx + Math.sin(lz * 3.1 + s) * wAmp
                + Math.sin(lz * 7.5 + s * 1.3) * wAmp * 0.3
  const wz = lz + Math.cos(lx * 2.7 + s * 0.7) * wAmp
                + Math.cos(lx * 6.3 + s * 1.1) * wAmp * 0.3
  const d  = Math.sqrt(wx * wx + wz * wz)
  // Smooth step from inner=0.68 to outer=1.0
  const t  = Math.min(Math.max((d - 0.68) / 0.32, 0.0), 1.0)
  return 1.0 - t * t * (3.0 - 2.0 * t)   // smoothstep
}

// ─── Per-type height profiles ─────────────────────────────────────────────────

/**
 * MAIN — dramatic single island with:
 *   - Central peak (tall, rocky)
 *   - 5-8 radial ridges extending from center
 *   - Lush rolling hills at mid-elevation
 *   - Sandy flat beach ring at shore
 *   - Rocky cliff drop-off
 */
function mainHeight(lx, lz, s) {
  const dist = Math.sqrt(lx * lx + lz * lz)
  const mask = coastlineMask(lx, lz, s)

  // ── Central peak cone ──────────────────────────────────────────────────
  // Steep falloff from center — dominates inner 35%
  const peakMask = Math.max(0, 1.0 - Math.pow(dist / 0.35, 1.8))
  const peakNoise = ridgedFBM(lx * 4.0 + s * 1.1, lz * 4.0 + s * 0.9, 5)
  const peak = peakMask * peakNoise * 140.0

  // ── Radial ridges ─────────────────────────────────────────────────────
  // Angular modulation creates ridge-valley pattern radiating from center
  const angle = Math.atan2(lz, lx)
  // 6 primary ridges + noise offset
  const ridgePattern = Math.pow(
    Math.max(0, Math.sin(angle * 6.0 + s * 2.0) * 0.5 + 0.5),
    1.5
  )
  const ridgeMask = Math.max(0, 1.0 - Math.pow(dist / 0.70, 2.0))
  const ridgeNoise = ridgedFBM(lx * 3.0 + s * 0.5, lz * 3.0 + s * 1.2, 4)
  const ridges = ridgeMask * ridgePattern * ridgeNoise * 70.0

  // ── Rolling mid-terrain hills ─────────────────────────────────────────
  const hillMask = Math.max(0, 1.0 - Math.pow(dist / 0.85, 2.5))
  const hills = (fbm(lx * 2.0 + s * 0.5, lz * 2.0 + s * 0.4, 4) * 0.5 + 0.5) * 30.0 * hillMask

  // ── Surface micro-detail ──────────────────────────────────────────────
  const detail = fbm(lx * 8.0 + s * 2.1, lz * 8.0 + s * 1.9, 3) * 5.0

  // ── Beach shelf — flat area near shore with slight elevation ──────────
  const beachBand = Math.max(0, 1.0 - Math.pow(dist / 0.90, 6.0)) * 3.0

  const raw = peak + ridges + hills + detail + beachBand
  return mask * Math.max(0, raw)
}

/**
 * ROCKY — spiky offshore rock spires, minimal flat area.
 */
function rockyHeight(lx, lz, s) {
  const dist = Math.sqrt(lx * lx + lz * lz)
  const mask = coastlineMask(lx, lz, s)
  const spikes = ridgedFBM(lx * 5.5 + s * 1.3, lz * 5.5 + s, 5) * 50.0
  const cone = Math.max(0, 1.0 - dist * 1.3) * 12.0
  return mask * Math.max(0, spikes + cone)
}

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Returns world-space terrain height at (x, z).
 *
 * Two calling modes:
 *
 * A) LEGACY (PlotGrid / backward-compat):
 *      getTerrainHeight(x, z, seed)
 *    Uses the global single-island radial mask.
 *
 * B) ARCHIPELAGO (Terrain.jsx):
 *      getTerrainHeight(x, z, 0, true, islands)
 *    Sums contributions from every island in the array.
 *
 * @param {number}  x
 * @param {number}  z
 * @param {number}  seed      legacy seed param (kept for API compat)
 * @param {boolean} isMain    legacy flag (kept for API compat)
 * @param {Array}   islands   archipelago array from generateArchipelago()
 */
export function getTerrainHeight(x, z, seed = 0, isMain = true, islands = null) {

  // ── A: Legacy single-island mode ────────────────────────────────────────
  if (!islands) {
    // Treat as if querying the main island at origin with radius 400
    const radius = 400
    const lx = x / radius
    const lz = z / radius
    if (lx * lx + lz * lz > 1.6 * 1.6) return 0
    const s = (seed || 0) * 13.7
    return Math.max(0, mainHeight(lx, lz, s))
  }

  // ── B: Multi-instance mode ─────────────────────────────────────────────
  let totalHeight = 0

  for (const island of islands) {
    const { position, radius, seed: iSeed, type } = island

    // Normalise world coords to island-local space (radius = 1)
    const lx = (x - position.x) / radius
    const lz = (z - position.z) / radius

    // Quick cull
    if (lx * lx + lz * lz > 1.6 * 1.6) continue

    const s = (iSeed || 0) * 13.7

    let h = 0
    switch (type) {
      case 'main':  h = mainHeight(lx, lz, s);  break
      case 'rocky': h = rockyHeight(lx, lz, s); break
      default:      h = rockyHeight(lx, lz, s); break
    }

    totalHeight += Math.max(0, h)
  }

  return totalHeight
}

/**
 * Terrain surface normal at (x, z) via central differences.
 */
export function getTerrainNormal(x, z, seed = 0, isMain = true, islands = null) {
  const step = 1.0
  const hL = getTerrainHeight(x - step, z,        seed, isMain, islands)
  const hR = getTerrainHeight(x + step, z,        seed, isMain, islands)
  const hD = getTerrainHeight(x,        z - step, seed, isMain, islands)
  const hU = getTerrainHeight(x,        z + step, seed, isMain, islands)

  const dx  = hL - hR
  const dz  = hD - hU
  const dy  = 2.0
  const len = Math.sqrt(dx * dx + dy * dy + dz * dz)

  return { x: dx / len, y: dy / len, z: dz / len }
}

/**
 * Returns terrain biome classification at (x, z).
 */
export function getTerrainBiome(x, z, seed = 0, isMain = true, islands = null) {
  const h      = getTerrainHeight(x, z, seed, isMain, islands)
  const normal = getTerrainNormal(x, z, seed, isMain, islands)
  const slope  = 1.0 - normal.y   // 0=flat, 1=vertical

  if (h <= 0.3)         return 'ocean'
  if (h <= 2.5)         return 'shallows'
  if (h <= 5.0)         return 'beach'
  if (slope  > 0.50)    return 'rock'
  if (h >= 120.0)       return 'snow'
  if (h >= 55.0)        return 'rock'
  if (h >= 18.0)        return 'forest'
  return 'grass'
}