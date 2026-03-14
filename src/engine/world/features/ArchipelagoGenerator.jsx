import { useMemo } from 'react'
import { useGameStore } from '../../../store/useGameStore'
import { IslandTerrain } from './IslandTerrain'
import { VegetationSystem } from './VegetationSystem'
import { WaterShader } from './WaterShader'
import { SkySystem } from './SkySystem'

function mulberry32(a) {
  return function() {
    let t = a += 0x6D2B79F5;
    t = Math.imul(t ^ t >>> 15, t | 1);
    t ^= t + Math.imul(t ^ t >>> 7, t | 61);
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  }
}

/**
 * Generates the deterministic layout for the entire archipelago.
 * 1 large central island (~500m)
 * 7 surrounding satellite islands (~100-250m) at 300-600m radius
 */
export function ArchipelagoGenerator() {
  const seed = useGameStore(state => state.seed)

  const islandData = useMemo(() => {
    const random = mulberry32(Math.floor(seed * 1000000))
    const islands = []

    // 0: Central Island
    // Diameter ~500m -> Radius ~250m. We will assume the base geometry radius is 50m.
    // So scale factor = 5.0 (50 * 5 = 250m radius = 500m diameter)
    islands.push({
      id: 'main',
      isMain: true,
      position: [0, -10, 0], // submerged slightly 
      scale: [5.0, 3.0, 5.0], // Increased Y for mountainous center
      rotation: random() * Math.PI * 2,
      terrainType: 0.0
    })

    // 1-7: Satellite Islands
    for (let i = 0; i < 7; i++) {
      const angle = random() * Math.PI * 2
      const radius = 300 + random() * 300 // distance from center: 300m - 600m
      
      const x = Math.cos(angle) * radius
      const z = Math.sin(angle) * radius
      
      // Diameter 100-250m -> Radius 50-125m -> Scale 1.0 to 2.5
      const s = 1.0 + random() * 1.5 
      const yOffset = -5 - random() * 15 // Sink them variably into the ocean

      islands.push({
        id: `sat_${i}`,
        isMain: false,
        position: [x, yOffset, z],
        scale: [s, 0.8 + random() * 1.5, s],
        rotation: random() * Math.PI * 2,
        terrainType: 1.0
      })
    }

    return islands
  }, [seed])

  return (
    <group name="archipelago-environment">
      <SkySystem />
      <WaterShader />
      <IslandTerrain islands={islandData} />
      <VegetationSystem islands={islandData} />
    </group>
  )
}
