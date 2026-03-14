import { useRef, useMemo } from 'react'
import { useFrame } from '@react-three/fiber'
import { Sky, Cloud, Clouds, Environment } from '@react-three/drei'
import { useGameStore, GPU_TIERS } from '../../../store/useGameStore'
import * as THREE from 'three'

export function SkySystem() {
  const sunTime = useGameStore(state => state.sunTime)
  const gpuTier = useGameStore(state => state.gpuTier)
  const dirLightRef = useRef()
  const cloudGroupRef = useRef()
  const windDir = useRef(new THREE.Vector3(1, 0, 0.5).normalize())

  const isHighTier = gpuTier === GPU_TIERS.HIGH
  const isNight = sunTime > 19 || sunTime < 5
  
  // Dynamic Atmosphere Values based on sunTime
  const atmosphereParams = useMemo(() => {
    const t = sunTime / 24.0
    const angle = t * Math.PI * 2 - (Math.PI / 2)
    
    // Dawn/Dusk check
    const isSunset = sunTime > 16 && sunTime < 20
    const isSunrise = sunTime > 4 && sunTime < 8
    
    let fogColor = '#1a3a6a' // Day blue
    if (isNight) fogColor = '#05070a'
    if (isSunset) fogColor = '#6a2a1a' // Deep orange/red
    if (isSunrise) fogColor = '#4a5a7a'
    
    return {
      sunPos: [Math.cos(angle) * 800, Math.sin(angle) * 800, 100],
      fogColor,
      rayleigh: isSunset || isSunrise ? 10.0 : 4.0,
      turbidity: isNight ? 0.1 : 0.05,
      mieCoefficient: 0.005
    }
  }, [sunTime, isNight])

  useFrame((state) => {
    const time = state.clock.elapsedTime
    
    // 1. Dynamic Wind Logic
    const windAngle = time * 0.05
    const windStrength = 0.5 + Math.sin(time * 0.1) * 0.4
    windDir.current.set(Math.cos(windAngle), 0, Math.sin(windAngle)).multiplyScalar(windStrength)

    // 2. Animate clouds with Wind
    if (cloudGroupRef.current) {
        cloudGroupRef.current.children.forEach((cloud, i) => {
            const speedFact = 1.0 + (i * 0.1)
            cloud.position.x += windDir.current.x * speedFact * 0.2
            cloud.position.z += windDir.current.z * speedFact * 0.2
            
            const bound = 8000
            if (cloud.position.x > bound) cloud.position.x = -bound
            if (cloud.position.x < -bound) cloud.position.x = bound
            if (cloud.position.z > bound) cloud.position.z = -bound
            if (cloud.position.z < -bound) cloud.position.z = bound

            const pulse = 1.0 + Math.sin(time * 0.2 + i) * 0.1
            cloud.scale.set(pulse, pulse, pulse)
        })
    }

    // 4. Sun orbit and Lighting
    if (!dirLightRef.current) return
    const [sx, sy, sz] = atmosphereParams.sunPos
    dirLightRef.current.position.set(sx, sy, sz)
    
    const normalizedY = Math.max(0, Math.min(1, sy / 800))
    
    if (sy > 0) {
      if (normalizedY < 0.25) {
        dirLightRef.current.color.set('#ff9d4d')
        dirLightRef.current.intensity = 1.2
      } else {
        dirLightRef.current.color.set('#fff4e6')
        dirLightRef.current.intensity = 1.8
      }
    } else {
        dirLightRef.current.color.set('#6a8aff')
        dirLightRef.current.intensity = 0.3
    }
  })

  return (
    <group name="sky-atmosphere">
      <fog attach="fog" args={[atmosphereParams.fogColor, 2000, 45000]} />

      <group ref={cloudGroupRef}>
        <Clouds material={THREE.MeshBasicMaterial} limit={400}>
            {[...Array(25)].map((_, i) => (
                <Cloud 
                    key={i}
                    seed={i + 100}
                    position={[
                        (Math.random() - 0.5) * 10000,
                        400 + Math.random() * 200,
                        (Math.random() - 0.5) * 10000
                    ]}
                    scale={5 + Math.random() * 10} 
                    volume={15 + Math.random() * 20} 
                    color={isNight ? "#0a1a2a" : "#ffffff"}
                    fade={800}
                    speed={0.1}
                    opacity={0.3 + Math.random() * 0.4}
                />
            ))}
        </Clouds>
      </group>

      <Sky 
        distance={450000} 
        sunPosition={atmosphereParams.sunPos} 
        mieCoefficient={atmosphereParams.mieCoefficient} 
        mieDirectionalG={0.8} 
        rayleigh={atmosphereParams.rayleigh} 
        turbidity={atmosphereParams.turbidity} 
      />

      <Environment preset={isNight ? "night" : "sunset"} background={false} />
      <ambientLight intensity={isNight ? 0.1 : 0.4} color={isNight ? "#203060" : "#fff4e6"} />
      
      <directionalLight
        ref={dirLightRef}
        castShadow
        shadow-mapSize-width={isHighTier ? 2048 : 512}
        shadow-mapSize-height={isHighTier ? 2048 : 512}
        shadow-camera-near={1}
        shadow-camera-far={15000}
        shadow-camera-left={-5000}
        shadow-camera-right={5000}
        shadow-camera-top={5000}
        shadow-camera-bottom={-5000}
        shadow-bias={-0.0001}
      />
    </group>
  )
}
