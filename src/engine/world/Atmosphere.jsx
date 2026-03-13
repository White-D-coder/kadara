import { useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { Environment, SoftShadows } from '@react-three/drei'
import { useGameStore, GPU_TIERS } from '../../store/useGameStore'
import * as THREE from 'three'

export function Atmosphere() {
  const sunTime = useGameStore(state => state.sunTime)
  const gpuTier = useGameStore(state => state.gpuTier)
  const dirLightRef = useRef()

  useFrame(() => {
    if (!dirLightRef.current) return
    
    // Orbit around X axis based on sunTime (0 to 24)
    const timeRatio = sunTime / 24.0
    // At 6am (0.25), angle should be 0 (sunrise)
    const angle = timeRatio * Math.PI * 2 - (Math.PI / 2)
    
    const radius = 500
    dirLightRef.current.position.y = Math.sin(angle) * radius
    dirLightRef.current.position.z = Math.cos(angle) * radius
    dirLightRef.current.position.x = 100 // Slight offset
    
    const normalizedY = Math.max(0, Math.min(1, dirLightRef.current.position.y / radius))
    
    if (normalizedY < 0.2 && dirLightRef.current.position.y > 0) {
      // Golden Hour
      dirLightRef.current.color.set('#ff9e00')
      dirLightRef.current.intensity = 1.0
    } else if (dirLightRef.current.position.y > 0) {
      // Day
      dirLightRef.current.color.set('#ffffff')
      dirLightRef.current.intensity = 1.5
    } else {
      // Night
      dirLightRef.current.color.set('#4444ff')
      dirLightRef.current.intensity = 0.2
    }
  })

  // Dynamic ambient intensity based on time
  const isNight = sunTime > 18 || sunTime < 6;
  const isHighTier = gpuTier === GPU_TIERS.HIGH;

  return (
    <>
      {isHighTier && <SoftShadows size={20} samples={16} focus={0.5} />}
      
      {/* City gives good bright reflections, night provides dark neon-friendly ambiance */}
      <Environment preset={isNight ? "night" : "city"} background={false} />
      
      <ambientLight intensity={isNight ? 0.1 : 0.4} />
      <directionalLight
        ref={dirLightRef}
        position={[0, 500, 0]}
        castShadow
        shadow-mapSize-width={isHighTier ? 2048 : 512}
        shadow-mapSize-height={isHighTier ? 2048 : 512}
        shadow-camera-near={0.5}
        shadow-camera-far={1000}
        shadow-camera-left={-200}
        shadow-camera-right={200}
        shadow-camera-top={200}
        shadow-camera-bottom={-200}
        shadow-bias={-0.0001}
      />
    </>
  )
}
