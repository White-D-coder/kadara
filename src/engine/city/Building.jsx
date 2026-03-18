import React, { useMemo } from 'react'
import { useGLTF, Clone } from '@react-three/drei'

const Building = ({ type, position, rotation = [0, 0, 0], scale = 0.5 }) => {
  const { scene } = useGLTF('/static/areas/areas.glb')
  
  // We can select specific sub-scenes or nodes from areas.glb
  // For now, we'll just show the whole scene for development verification
  // But scaled down as a building
  
  return (
    <group position={position} rotation={rotation} scale={scale}>
       <Clone object={scene} castShadow receiveShadow />
    </group>
  )
}

export default Building
