import { useMemo } from 'react'
import { useGameStore } from '../../../store/useGameStore'
import { IslandTerrain } from './IslandTerrain'
import { VegetationSystem } from './VegetationSystem'
import { WaterShader } from './WaterShader'
import { SkySystem } from './SkySystem'

// Deterministic PRNG
function mulberry32(a) {
  return function() {
    let t = a += 0x6D2B79F5;
    t = Math.imul(t ^ t >>> 15, t | 1);
    t ^= t + Math.imul(t ^ t >>> 7, t | 61);
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  }
}

/**
 * CAD CITY — Procedural Archipelago Generator
 * 
 * Scale: 1 engine unit = 1 meter
 * Base geometry: PlaneGeometry(100, 100) → radius 50
 * 
 * Central island: scale [5.0, 8.0, 5.0] → 500m diameter, 480m max peak height
 * Y-scale 8.0 allows displacement of 0-60 to produce 0-480m peaks
 * Satellites: scale 1.0-3.0 on XZ, 3.0-6.0 on Y
 */
export function ArchipelagoGenerator() {
  const seed = useGameStore(state => state.seed)

  const islandData = useMemo(() => {
    const random = mulberry32(Math.floor(seed * 1000000))
    const islands = []

    // Central Island — 500m diameter, uniform scale
    // Height controlled by displacement in shader, not Y-scale
    islands.push({
      id: 'main',
      isMain: true,
      position: [0, -5, 0],
      scale: [5.0, 5.0, 5.0],
      rotation: random() * Math.PI * 2,
      terrainType: 0.0
    })

    // 7 Satellite Islands — 100-300m diameter at 400-800m radius
    for (let i = 0; i < 7; i++) {
      const angle = (i / 7) * Math.PI * 2 + (random() - 0.5) * 0.8
      const radius = 400 + random() * 400

      const x = Math.cos(angle) * radius
      const z = Math.sin(angle) * radius

      const s = 1.0 + random() * 2.0
      const yOffset = -3 - random() * 5

      islands.push({
        id: `sat_${i}`,
        isMain: false,
        position: [x, yOffset, z],
        scale: [s, s, s],
        rotation: random() * Math.PI * 2,
        terrainType: 1.0
      })
    }

    return islands
  }, [seed])

  return (
    <group name="cad-city-archipelago">
      <SkySystem />
      <WaterShader />
      <IslandTerrain islands={islandData} />
      <VegetationSystem islands={islandData} />
    </group>
  )
}
