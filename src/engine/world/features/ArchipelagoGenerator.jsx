import { useMemo } from 'react'
import * as THREE from 'three'
import { useGameStore } from '../../../store/useGameStore'

import { IslandTerrain } from './IslandTerrain'
import { VegetationSystem } from './VegetationSystem'
import { WaterShader } from './WaterShader'
import { SkySystemStable } from './SkySystemStable'
import { UnderwaterEffect } from './UnderwaterEffect'

/*
──────────────────────────────────────────────
  ArchipelagoGenerator — Scene Composition
──────────────────────────────────────────────
*/

function mulberry32(a) {
  return function () {
    let _seedState = (a += 0x6d2b79f5);
    _seedState = Math.imul(_seedState ^ (_seedState >>> 15), _seedState | 1);
    _seedState ^= _seedState + Math.imul(_seedState ^ (_seedState >>> 7), _seedState | 61);
    return ((_seedState ^ (_seedState >>> 14)) >>> 0) / 4294967296;
  };
}

export function ArchipelagoGenerator() {
  const seed = useGameStore((state) => state.seed)
  const sunTime = useGameStore((state) => state.sunTime)

  // Sun Direction (used by water reflections & underwater)
  const sunDirection = useMemo(() => {
    const timeRatio = sunTime / 24
    const angle = timeRatio * Math.PI * 2 - Math.PI / 2

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
      position: [0, -5, 0],
      scale: [20, 18, 20], 
      rotation: random() * Math.PI * 2,
      terrainType: 0.0,
      weatherType: 0, // Main island starts clear
      floraType: 2,   // Dense jungle/alpine mix
    })

    // SATELLITE ISLANDS (Varied shapes and climates)
    for (let i = 0; i < 15; i++) {
      const angle = (i / 15) * Math.PI * 2 + (random() - 0.5) * 1.5
      const radius = 1200 + random() * 4000

      const x = Math.cos(angle) * radius
      const z = Math.sin(angle) * radius

      const pillarWeight = random()
      const s = pillarWeight > 0.8 ? (5 + random() * 7) : (3 + random() * 5)
      const yOffset = -3 - random() * 4

      islands.push({
        id: `sat_${i}`,
        isMain: false,
        position: [x, yOffset, z],
        scale: [s, s * (pillarWeight > 0.8 ? 1.3 : 0.9), s],
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
    const arr = new Float32Array(16 * 3)
    islandData.forEach((is, i) => {
      if (i < 16) {
        arr[i * 3 + 0] = is.position[0]
        arr[i * 3 + 1] = is.position[1]
        arr[i * 3 + 2] = is.position[2]
      }
    })
    return arr
  }, [islandData])

  // Pack island scales
  const islandScales = useMemo(() => {
    const arr = new Float32Array(16)
    islandData.forEach((is, i) => {
      if (i < 16) {
        arr[i] = is.scale[0]
      }
    })
    return arr
  }, [islandData])

  // Scene Composition
  return (
    <>
      <SkySystemStable islands={islandData} />
      
      <WaterShader 
        islandPositions={islandPositions}
        islandScales={islandScales}
        sunDirection={sunDirection}
      />

      <IslandTerrain islands={islandData} />

      <VegetationSystem islands={islandData} />

      <UnderwaterEffect sunDirection={sunDirection} />
    </>
  )
}
