import React, { useMemo, useRef } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'
import { gridVertexShader, gridFragmentShader } from '../../shaders/grid'
import { getTerrainHeight } from './terrainUtils'
import useGameStore, { CAMERA_MODES } from '../../store/useGameStore'

const PlotGrid = () => {
  const mode = useGameStore((state) => state.cameraMode)
  const setHoveredPlot = useGameStore((state) => state.setHoveredPlot)
  const addBuilding = useGameStore((state) => state.addBuilding)
  const meshRef = useRef()
  const { raycaster, mouse, camera } = useThree()
  
  const size = 2000
  const divisions = 50 // Plot resolution (50x50 plots over 2000m)
  
  // High subdivision geometry to follow terrain topography in the shader
  const geometry = useMemo(() => new THREE.PlaneGeometry(size, size, 128, 128).rotateX(-Math.PI / 2), [])
  
  const uniforms = useMemo(() => ({
    uHoveredPlot: { value: new THREE.Vector2(-1, -1) },
    uTime: { value: 0 },
    uOpacity: { value: 0 }
  }), [])

  const handlePlotClick = () => {
    if (mode !== CAMERA_MODES.PLANNER) return

    raycaster.setFromCamera(mouse, camera)
    const intersects = raycaster.intersectObject(meshRef.current)
    
    if (intersects.length > 0) {
      const point = intersects[0].point
      const x = Math.floor((point.x + size / 2) / (size / divisions))
      const z = Math.floor((point.z + size / 2) / (size / divisions))
      
      const plotWorldX = (x + 0.5) * (size / divisions) - size / 2
      const plotWorldZ = (z + 0.5) * (size / divisions) - size / 2
      const h = getTerrainHeight(plotWorldX, plotWorldZ, 0)
      
      // Add building to store
      addBuilding({
        type: 'default',
        position: [plotWorldX, h, plotWorldZ],
        rotation: [0, Math.random() * Math.PI * 2, 0],
        scale: 0.15
      })
    }
  }

  useFrame((state) => {
    if (!meshRef.current) return
    
    // Smooth opacity transition between modes
    const targetOpacity = mode === CAMERA_MODES.PLANNER ? 1.0 : 0.0
    uniforms.uOpacity.value = THREE.MathUtils.lerp(uniforms.uOpacity.value, targetOpacity, 0.1)
    
    if (mode === CAMERA_MODES.PLANNER && uniforms.uOpacity.value > 0.01) {
      // Raycasting for plot selection
      raycaster.setFromCamera(mouse, camera)
      const intersects = raycaster.intersectObject(meshRef.current)
      
      if (intersects.length > 0) {
        const point = intersects[0].point
        // Convert world hit point to grid index
        const x = Math.floor((point.x + size / 2) / (size / divisions))
        const z = Math.floor((point.z + size / 2) / (size / divisions))
        
        // Calculate exact world position of the plot center for building placement
        const plotWorldX = (x + 0.5) * (size / divisions) - size / 2
        const plotWorldZ = (z + 0.5) * (size / divisions) - size / 2
        const h = getTerrainHeight(plotWorldX, plotWorldZ, 0)
        
        const newHover = new THREE.Vector2(x, z)
        if (!uniforms.uHoveredPlot.value.equals(newHover)) {
          uniforms.uHoveredPlot.value.copy(newHover)
          setHoveredPlot({ 
            id: `${x}_${z}`,
            x, z, 
            height: h, 
            position: [plotWorldX, h, plotWorldZ] 
          })
        }
      } else {
        uniforms.uHoveredPlot.value.set(-1, -1)
        setHoveredPlot(null)
      }
    }
    
    uniforms.uTime.value = state.clock.getElapsedTime()
  })

  return (
    <mesh ref={meshRef} geometry={geometry} position={[0, 0, 0]} onClick={handlePlotClick}>
      <shaderMaterial
        vertexShader={gridVertexShader}
        fragmentShader={gridFragmentShader}
        uniforms={uniforms}
        transparent
        depthWrite={false}
      />
    </mesh>
  )
}

export default PlotGrid
