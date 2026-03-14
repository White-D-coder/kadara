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
      position: [0, -50, 0], // submerged slightly 
      scale: [50.0, 40.0, 50.0], // Cinematic 5km diameter, 400m+ height
      rotation: random() * Math.PI * 2,
      terrainType: 0.0
    })

    // 1-7: Satellite Islands
    for (let i = 0; i < 7; i++) {
      const angle = random() * Math.PI * 2
      const radius = 5000 + random() * 5000 // distance from center: 5km - 10km
      
      const x = Math.cos(angle) * radius
      const z = Math.sin(angle) * radius
      
      // Scale 10x - 25x for 500m-1.2km islands
      const s = 10.0 + random() * 15.0 
      const yOffset = -25 - random() * 100 // Sink them deeper

      islands.push({
        id: `sat_${i}`,
        isMain: false,
        position: [x, yOffset, z],
        scale: [s, 5.0 + random() * 10.0, s],
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
