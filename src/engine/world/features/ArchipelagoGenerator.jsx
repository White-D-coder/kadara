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

export function ArchipelagoGenerator() {
  const seed = useGameStore(state => state.seed)

  const islandData = useMemo(() => {
    const random = mulberry32(Math.floor(seed * 1000000))
    const islands = []

    // Central Island — 1.5km diameter
    islands.push({
      id: 'main',
      isMain: true,
      position: [0, -15, 0],
      scale: [15.0, 15.0, 15.0],
      rotation: random() * Math.PI * 2,
      terrainType: 0.0
    })

    // 12 Satellite Islands — Expansive spacing (5km radius)
    for (let i = 0; i < 12; i++) {
      const angle = (i / 12) * Math.PI * 2 + (random() - 0.5) * 1.5
      const radius = 1500 + random() * 3500

      const x = Math.cos(angle) * radius
      const z = Math.sin(angle) * radius

      const s = 3.0 + random() * 5.0
      const yOffset = -5 - random() * 10

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

  const islandPositions = useMemo(() => {
    const arr = new Float32Array(13 * 3)
    islandData.forEach((is, i) => {
      if (i < 13) {
        arr[i * 3 + 0] = is.position[0]
        arr[i * 3 + 1] = is.position[1]
        arr[i * 3 + 2] = is.position[2]
      }
    })
    return arr
  }, [islandData])
  
  const islandScales = useMemo(() => {
    const arr = new Float32Array(13)
    islandData.forEach((is, i) => {
      if (i < 13) arr[i] = is.scale[0]
    })
    return arr
  }, [islandData])

  return (
    <group name="cad-city-archipelago">
      <SkySystem />
      <WaterShader islandPositions={islandPositions} islandScales={islandScales} />
      <IslandTerrain islands={islandData} />
      <VegetationSystem islands={islandData} />
    </group>
  )
}
