/**
 * CityArchitect.jsx
 * ─────────────────────────────────────────────────────────────────────────────
 * Dense, multi-zone city anchored at plot (51, 42)
 *
 * World origin from plot:
 *   worldX = (51 + 0.5) * 20 - 1000 =  30
 *   worldZ = (42 + 0.5) * 20 - 1000 = -150
 *
 * Layout (centred on CITY_X, CITY_Z):
 *   Zone A – Downtown core    : rad 0-30   → tall glass skyscrapers (30-80m)
 *   Zone B – Mid-rise ring    : rad 30-70  → apartment / office (12-30m)
 *   Zone C – Residential ring : rad 70-120 → low-rise houses (4-10m)
 *   Mansion : in the downtown core as landmark headquarters
 *   Roads   : two perpendicular avenues + a ring road
 *   Sidewalks + lampposts + rooftop water tanks for detail
 */

import React, { useMemo, useEffect, memo, useRef } from 'react'
import * as THREE from 'three'
import Mansion from './Mansion'
import useGameStore from '../../store/useGameStore'
import { generateArchipelago } from '../terrain/IslandGenerator'
import { getTerrainHeight, CITY_X, CITY_Z, CITY_GROUND_LEVEL } from '../terrain/terrainUtils'

// ─── Deterministic RNG ────────────────────────────────────────────────────────
const sr = (s) => {
  const n = Math.sin(s * 9301 + 49297) * 233280
  return n - Math.floor(n)
}

// ─── Generate city data (runs once per seed) ──────────────────────────────────
function generateCity(islands) {
  const buildings = []

  // ── Zone A: Downtown core (dense, tall) ──────────────────────────────────
  const GRID_STEP = 12   // city block spacing
  const HALF      = 2    // ±2 blocks = 5×5 downtown grid
  for (let gx = -HALF; gx <= HALF; gx++) {
    for (let gz = -HALF; gz <= HALF; gz++) {
      const skip = Math.abs(gx) <= 1 && Math.abs(gz) <= 1 && gx >= -1 && gz >= -1 && gx <= 0 && gz <= 0
      if (skip) continue // leave room for mansion

      const bx = CITY_X + gx * GRID_STEP + sr(gx * 3 + gz) * 2 - 1
      const bz = CITY_Z + gz * GRID_STEP + sr(gz * 7 + gx) * 2 - 1
      const by  = getTerrainHeight(bx, bz, 0, true, islands)

      const w  = 7  + sr(gx + gz * 10) * 4      // 7-11
      const d  = 7  + sr(gx * 9 + gz)  * 4
      const h  = 30 + sr(gx * gz + 1)  * 50     // 30-80m skyscraper
      const r  = Math.floor(195 + sr(gx * 3.1) * 40)
      const g  = Math.floor(210 + sr(gz * 2.7) * 35)
      const b2 = Math.floor(220 + sr((gx + gz) * 1.9) * 35)
      buildings.push({ zone: 'A', bx, bz, by, w, d, h, r, g, b: b2, id: `A_${gx}_${gz}` })
    }
  }

  // ── Zone B: Mid-rise ring (offices, apartments) ───────────────────────────
  const MID_RING_COUNT = 40
  for (let i = 0; i < MID_RING_COUNT; i++) {
    const angle = (i / MID_RING_COUNT) * Math.PI * 2 + 0.1
    const dist  = 35 + sr(i * 1.3) * 30   // 35–65m
    const bx    = CITY_X + Math.cos(angle) * dist + sr(i * 2.7) * 4 - 2
    const bz    = CITY_Z + Math.sin(angle) * dist + sr(i * 3.1) * 4 - 2
    const by    = getTerrainHeight(bx, bz, 0, true, islands)

    const w  = 6  + sr(i * 1.1) * 6    // 6-12
    const d  = 6  + sr(i * 2.2) * 6
    const h  = 12 + sr(i * 0.7) * 18   // 12-30m
    const shade = Math.floor(200 + sr(i * 5.3) * 50)
    buildings.push({ zone: 'B', bx, bz, by, w, d, h, r: shade, g: shade + 5, b: shade + 8, id: `B_${i}` })
  }

  // ── Zone C: Residential outer ring (houses, small blocks) ─────────────────
  const RES_COUNT = 60
  for (let i = 0; i < RES_COUNT; i++) {
    const angle = (i / RES_COUNT) * Math.PI * 2 + sr(i) * 0.3
    const dist  = 70 + sr(i * 2.1) * 45  // 70–115m
    const bx    = CITY_X + Math.cos(angle) * dist + sr(i * 1.7) * 5 - 2.5
    const bz    = CITY_Z + Math.sin(angle) * dist + sr(i * 4.3) * 5 - 2.5
    const by    = getTerrainHeight(bx, bz, 0, true, islands)

    const w  = 4 + sr(i * 3.3) * 5     // 4-9
    const d  = 4 + sr(i * 1.6) * 5
    const h  = 4 + sr(i * 2.9) * 6     // 4-10m
    // Warm terracotta / cream hues for residences
    const rv = Math.floor(200 + sr(i * 0.9) * 45)
    const gv = Math.floor(170 + sr(i * 1.4) * 30)
    const bv = Math.floor(140 + sr(i * 2.1) * 30)
    buildings.push({ zone: 'C', bx, bz, by, w, d, h, r: rv, g: gv, b: bv, id: `C_${i}` })
  }

  return buildings
}

// ─── Lamppost component ───────────────────────────────────────────────────────
const Lamppost = memo(({ position }) => (
  <group position={position}>
    <mesh castShadow>
      <cylinderGeometry args={[0.08, 0.12, 5, 6]} />
      <meshStandardMaterial color="#444444" roughness={0.4} metalness={0.7} />
    </mesh>
    <mesh position={[0, 2.6, 0]}>
      <sphereGeometry args={[0.22, 8, 8]} />
      <meshStandardMaterial emissive="#ffe8aa" emissiveIntensity={2.5} color="#ffffff" />
      <pointLight intensity={12} distance={18} color="#ffdd88" decay={2} />
    </mesh>
  </group>
))

// ─── Road surface ─────────────────────────────────────────────────────────────
const Road = memo(({ position, args }) => (
  <mesh position={position} receiveShadow>
    <boxGeometry args={args} />
    <meshStandardMaterial color="#1c1c1c" roughness={0.95} metalness={0.0} />
  </mesh>
))

// ─── Building renderer ────────────────────────────────────────────────────────
const CityBuilding = memo(({ bx, bz, by, w, d, h, r, g, b, zone }) => {
  const isGlass  = zone === 'A'
  const hasTank  = zone === 'A' && h > 45
  const col      = `rgb(${r},${g},${b})`
  const glassCol = `rgb(${Math.min(r + 20, 255)},${Math.min(g + 30, 255)},${Math.min(b + 50, 255)})`

  return (
    <group position={[bx, by + h / 2, bz]}>
      {/* Main body */}
      <mesh castShadow receiveShadow>
        <boxGeometry args={[w, h, d]} />
        <meshStandardMaterial
          color={col}
          roughness={isGlass ? 0.05 : 0.25}
          metalness={isGlass ? 0.85 : 0.15}
          envMapIntensity={isGlass ? 2.0 : 0.5}
        />
      </mesh>

      {/* Window grid – front + back */}
      <mesh position={[0, h * 0.05, d / 2 + 0.06]}>
        <planeGeometry args={[w * 0.88, h * 0.88]} />
        <meshStandardMaterial
          color="#0a1433"
          emissive="#6699ff"
          emissiveIntensity={isGlass ? 0.55 : 0.3}
          transparent opacity={0.65}
        />
      </mesh>
      <mesh position={[0, h * 0.05, -(d / 2 + 0.06)]} rotation={[0, Math.PI, 0]}>
        <planeGeometry args={[w * 0.88, h * 0.88]} />
        <meshStandardMaterial
          color="#0a1433"
          emissive="#6699ff"
          emissiveIntensity={isGlass ? 0.45 : 0.25}
          transparent opacity={0.55}
        />
      </mesh>

      {/* Roof slab */}
      <mesh position={[0, h / 2 + 0.2, 0]} receiveShadow>
        <boxGeometry args={[w + 0.6, 0.4, d + 0.6]} />
        <meshStandardMaterial color="#aaaaaa" roughness={0.1} metalness={0.55} />
      </mesh>

      {/* Water tank on tall downtown buildings */}
      {hasTank && (
        <mesh position={[w * 0.3, h / 2 + 1.2, d * 0.3]}>
          <cylinderGeometry args={[1.0, 1.0, 2.4, 8]} />
          <meshStandardMaterial color="#5a3c1e" roughness={0.85} />
        </mesh>
      )}

      {/* Rooftop antenna on skyscrapers */}
      {zone === 'A' && h > 50 && (
        <mesh position={[0, h / 2 + 3, 0]}>
          <cylinderGeometry args={[0.06, 0.06, 6, 5]} />
          <meshStandardMaterial color="#888888" metalness={0.9} />
          <mesh position={[0, 2.5, 0]}>
            <sphereGeometry args={[0.18, 6, 6]} />
            <meshStandardMaterial emissive="#ff2200" emissiveIntensity={3} color="#ff0000" />
            <pointLight intensity={2} distance={8} color="#ff2200" />
          </mesh>
        </mesh>
      )}
    </group>
  )
})

// ─── Main Component ───────────────────────────────────────────────────────────
const CityArchitect = () => {
  const seed           = useGameStore((state) => state.seed)
  const setStartPos    = useGameStore((state) => state.setStartPosition)
  const setCityCreated = useGameStore((state) => state.setCityCreated)
  const cityCreated    = useGameStore((state) => state.cityCreated)

  const islands  = useMemo(() => generateArchipelago(seed), [seed])
  // We don't really need to query the ground height dynamically since we flattened it to CITY_GROUND_LEVEL,
  // but it's safe to use it directly in case we want to tweak the constants there.
  const groundY  = CITY_GROUND_LEVEL
  const buildings = useMemo(() => generateCity(islands), [islands])
  const setCityBuildings = useGameStore((state) => state.setCityBuildings)

  useEffect(() => {
    // Add mansion as a manually specified building for collision
    const allBuildings = [
      ...buildings,
      { id: 'mansion', bx: CITY_X - 14, bz: CITY_Z - 14, w: 25, d: 20 }
    ]
    setCityBuildings(allBuildings)
  }, [buildings, setCityBuildings])

  // ── Lamppost positions along two main avenues ──────────────────────────────
  const lampposts = useMemo(() => {
    const posts = []
    for (let i = -5; i <= 5; i++) {
      const d = i * 18
      posts.push({ id: `lx${i}a`, pos: [CITY_X + d, groundY + 0.05, CITY_Z - 8] })
      posts.push({ id: `lx${i}b`, pos: [CITY_X + d, groundY + 0.05, CITY_Z + 8] })
      posts.push({ id: `lz${i}a`, pos: [CITY_X - 8, groundY + 0.05, CITY_Z + d] })
      posts.push({ id: `lz${i}b`, pos: [CITY_X + 8, groundY + 0.05, CITY_Z + d] })
    }
    return posts
  }, [groundY])

  // ── Camera spawn ───────────────────────────────────────────────────────────
  useEffect(() => {
    if (!cityCreated && groundY > 0) {
      setStartPos([CITY_X + 5, groundY + 15, CITY_Z + 20])
      setCityCreated(true)
    }
  }, [groundY, cityCreated, setStartPos, setCityCreated])

  const y0 = groundY + 0.02

  return (
    <group>
      {/* ── Landmark Mansion ──────────────────────────────────────────────── */}
      <Mansion position={[CITY_X - 14, groundY, CITY_Z - 14]} scale={1.2} />

      {/* ── City Ground Plate ─────────────────────────────────────────────── */}
      <mesh position={[CITY_X, groundY - 0.15, CITY_Z]} receiveShadow>
        <cylinderGeometry args={[130, 130, 0.3, 64]} />
        <meshStandardMaterial color="#b0b0a0" roughness={0.9} />
      </mesh>

      {/* ── Main Avenue (E-W) ─────────────────────────────────────────────── */}
      <Road position={[CITY_X, y0, CITY_Z]}    args={[260, 0.15, 12]} />
      {/* Cross Street (N-S) */}
      <Road position={[CITY_X, y0, CITY_Z]}    args={[12, 0.15, 260]} />
      {/* Ring Road */}
      {Array.from({ length: 36 }, (_, i) => {
        const a1 = (i / 36) * Math.PI * 2
        const a2 = ((i + 1) / 36) * Math.PI * 2
        const mx = CITY_X + Math.cos((a1 + a2) / 2) * 68
        const mz = CITY_Z + Math.sin((a1 + a2) / 2) * 68
        const len = 2 * Math.PI * 68 / 36 + 1
        return (
          <mesh key={i} position={[mx, y0 + 0.01, mz]}
            rotation={[0, -(a1 + a2) / 2, 0]}
            receiveShadow>
            <boxGeometry args={[len, 0.12, 9]} />
            <meshStandardMaterial color="#1a1a1a" roughness={0.95} />
          </mesh>
        )
      })}

      {/* ── Buildings ─────────────────────────────────────────────────────── */}
      {buildings.map((b) => (
        <CityBuilding key={b.id} {...b} />
      ))}

      {/* ── Lampposts ─────────────────────────────────────────────────────── */}
      {lampposts.map(({ id, pos }) => (
        <Lamppost key={id} position={pos} />
      ))}

      {/* ── Central plaza fountain ────────────────────────────────────────── */}
      <group position={[CITY_X + 10, y0, CITY_Z + 10]}>
        {/* Fountain basin */}
        <mesh receiveShadow>
          <cylinderGeometry args={[5, 5.5, 0.8, 24]} />
          <meshStandardMaterial color="#cccccc" roughness={0.2} metalness={0.4} />
        </mesh>
        {/* Water surface */}
        <mesh position={[0, 0.35, 0]}>
          <cylinderGeometry args={[4.5, 4.5, 0.1, 24]} />
          <meshStandardMaterial color="#44aaff" transparent opacity={0.75} roughness={0.0} metalness={0.5} />
        </mesh>
        {/* Fountain pillar */}
        <mesh position={[0, 1.5, 0]}>
          <cylinderGeometry args={[0.3, 0.5, 2.5, 8]} />
          <meshStandardMaterial color="#aaaaaa" metalness={0.6} />
        </mesh>
        <mesh position={[0, 2.8, 0]}>
          <sphereGeometry args={[0.5, 12, 12]} />
          <meshStandardMaterial color="#dddddd" metalness={0.7} roughness={0.05} />
        </mesh>
        <pointLight position={[0, 1, 0]} color="#44aaff" intensity={15} distance={12} />
      </group>

      {/* ── City ambient glow (warm streetlight haze) ─────────────────────── */}
      <pointLight
        position={[CITY_X, groundY + 30, CITY_Z]}
        color="#ffeebb"
        intensity={80}
        distance={200}
        decay={2}
      />
    </group>
  )
}

export default CityArchitect
