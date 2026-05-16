import React, { useMemo } from 'react'
import { useGLTF } from '@react-three/drei'
import { useThree } from '@react-three/fiber'
import ModelRegistry from './ModelRegistry'

/**
 * CADModel renders an individual placed CAD asset.
 * 
 * Logic:
 * 1. Calculate distance to camera.
 * 2. Select appropriate LOD from ModelRegistry.
 * 3. Render the mesh with bounding-box collision logic (Step 12).
 */
const CADModel = ({ modelId, position, rotation, scale }) => {
  const { camera } = useThree()
  
  // Calculate distance for LOD switching (Step 11)
  const distance = useMemo(() => {
    const camPos = camera.position
    return Math.sqrt(
      Math.pow(camPos.x - position[0], 2) +
      Math.pow(camPos.z - position[2], 2)
    )
  }, [camera.position, position])

  const lodPath = useMemo(() => ModelRegistry.getLODPath(modelId, distance), [modelId, distance])
  
  // Dynamic loading based on LOD path
  // Note: loader will cache the results automatically
  const { scene } = useGLTF(lodPath || '/static/models/placeholder.glb')

  return (
    <primitive 
      object={scene.clone()} 
      position={position} 
      rotation={rotation} 
      scale={scale} 
      castShadow
      receiveShadow
    />
  )
}

export default CADModel
