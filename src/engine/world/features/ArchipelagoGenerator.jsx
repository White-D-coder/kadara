import { useMemo } from 'react'
import * as THREE from 'three'
import { useGameStore } from '../../../store/useGameStore'

import { IslandTerrain } from './IslandTerrain'
import { VegetationSystem } from './VegetationSystem'
import { WaterShader } from './WaterShader'
import { SkySystem } from './SkySystem'
import { UnderwaterEffect } from './UnderwaterEffect'

/*
──────────────────────────────────────────────
  ArchipelagoGenerator — Scene Composition
──────────────────────────────────────────────
*/

function mulberry32(a) {
  return function () {
    let t = (a += 0x6d2b79f5)
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

export function ArchipelagoGenerator() {
  const seed = useGameStore((state) => state.seed)
  const sunTime = useGameStore((state) => state.sunTime)

  // Sun Direction (used by water reflections & underwater)
  const sunDirection = useMemo(() => {
    const t = sunTime / 24
    const angle = t * Math.PI * 2 - Math.PI / 2

    const dir = new THREE.Vector3(
      Math.cos(angle),
      Math.sin(angle),
      0.2
    )
    return dir.normalize()
  }, [sunTime])

  // Generate Islands (deterministic)
  const islandData = useMemo(() => {
    const random = mulberry32(Math.floor(seed * 1000000))
    const islands = []

    // MAIN ISLAND (Image 2 Alpine Mountain)
    islands.push({
      id: 'main',
      isMain: true,
      position: [0, -18, 0],
      scale: [18, 22, 18], 
      rotation: random() * Math.PI * 2,
      terrainType: 0.0,
      weatherType: 0, // Main island starts clear
      floraType: 2,   // Dense jungle/alpine mix
    })

    // SATELLITE ISLANDS (Varied shapes and climates)
    for (let i = 0; i < 18; i++) {
      const angle = (i / 18) * Math.PI * 2 + (random() - 0.5) * 1.5
      const radius = 1500 + random() * 4500

      const x = Math.cos(angle) * radius
      const z = Math.sin(angle) * radius

      const pillarWeight = random()
      const s = pillarWeight > 0.8 ? (4 + random() * 6) : (2 + random() * 3)
      const yOffset = pillarWeight > 0.8 ? -8 : (-5 - random() * 12)

      islands.push({
        id: `sat_${i}`,
        isMain: false,
        position: [x, yOffset, z],
        scale: [s, s * (pillarWeight > 0.8 ? 1.5 : 1.0), s],
        rotation: random() * Math.PI * 2,
        terrainType: 1.0,
        weatherType: Math.floor(random() * 3), // Random: Clear, Stormy, Foggy
        floraType: Math.floor(random() * 3),   // Random: Palms, Pines, Jungle
      })
    }

    return islands
  }, [seed])

  // Pack island positions for shader
  const islandPositions = useMemo(() => {
    const arr = new Float32Array(19 * 3)
    islandData.forEach((is, i) => {
      if (i < 19) {
        arr[i * 3 + 0] = is.position[0]
        arr[i * 3 + 1] = is.position[1]
        arr[i * 3 + 2] = is.position[2]
      }
    })
    return arr
  }, [islandData])

  // Pack island scales
  const islandScales = useMemo(() => {
    const arr = new Float32Array(19)
    islandData.forEach((is, i) => {
      if (i < 19) {
        arr[i] = is.scale[0]
      }
    })
    return arr
  }, [islandData])

  // Scene Composition
  return (
    <group name="cad-city-archipelago">

      <SkySystem islands={islandData} />

      <WaterShader
        islandPositions={islandPositions}
        islandScales={islandScales}
        sunDirection={sunDirection}
      />

      <IslandTerrain islands={islandData} />

      <VegetationSystem islands={islandData} />

      <UnderwaterEffect sunDirection={sunDirection} />

    </group>
  )
}
