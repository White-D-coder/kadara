import { useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { Sky, Cloud, Clouds, Environment, SoftShadows } from '@react-three/drei'
import { useGameStore, GPU_TIERS } from '../../../store/useGameStore'
import * as THREE from 'three'

export function SkySystem() {
  const sunTime = useGameStore(state => state.sunTime) // 0 - 24
  const gpuTier = useGameStore(state => state.gpuTier)
  const dirLightRef = useRef()
  const cloudGroupRef = useRef()

  const isHighTier = gpuTier === GPU_TIERS.HIGH
  const isNight = sunTime > 18 || sunTime < 6

  useFrame((state) => {
    // 1. Move Clouds slowly for sweeping shadows
    if (cloudGroupRef.current) {
      cloudGroupRef.current.position.x = Math.sin(state.clock.elapsedTime * 0.05) * 200
      cloudGroupRef.current.position.z = Math.cos(state.clock.elapsedTime * 0.05) * 200
    }

    // 2. Sun Orbit Animation
    if (!dirLightRef.current) return
    const timeRatio = sunTime / 24.0
    const angle = timeRatio * Math.PI * 2 - (Math.PI / 2)
    
    const radius = 800
    dirLightRef.current.position.y = Math.sin(angle) * radius
    dirLightRef.current.position.z = Math.cos(angle) * radius
    dirLightRef.current.position.x = 200
    
    const normalizedY = Math.max(0, Math.min(1, dirLightRef.current.position.y / radius))
    
    // Cinematic Color Grading
    if (normalizedY < 0.2 && dirLightRef.current.position.y > 0) {
      // Golden Hour (Sunrise/Sunset)
      dirLightRef.current.color.set('#ff7b00')
      dirLightRef.current.intensity = 2.0
    } else if (dirLightRef.current.position.y > 0) {
      // Midday (Bright White/Blue)
      dirLightRef.current.color.set('#ffffff')
      dirLightRef.current.intensity = 2.5
    } else {
      // Moonlight
      dirLightRef.current.color.set('#203060')
      dirLightRef.current.intensity = 0.5
    }
  })

  // Calculate sun position for the Sky shader
  const timeRatio = sunTime / 24.0
  const angle = timeRatio * Math.PI * 2 - (Math.PI / 2)
  const sunPos = new THREE.Vector3(
    Math.cos(angle) * 800,
    Math.sin(angle) * 800,
    100 
  )

  return (
    <group name="cinematic-sky-system">
      {/* 1. Atmospheric Fog */}
      {isNight ? (
        <fog attach="fog" args={['#0a0f18', 200, 2000]} />
      ) : (
        <fog attach="fog" args={['#ccf0ff', 300, 2500]} />
      )}

      {/* 2. Volumetric Clouds matching Sun Direction */}
      {isHighTier && (
        <group ref={cloudGroupRef}>
          <Clouds material={THREE.MeshBasicMaterial} limit={400} range={500}>
            <Cloud 
              seed={1} 
              scale={2.5} 
              volume={15} 
              color={isNight ? "#112233" : "#ffffff"} 
              fade={100} 
              position={[0, 400, 0]} 
              speed={0.2} 
            />
          </Clouds>
        </group>
      )}

      {/* 3. Aerial Perspective Sky Scattering */}
      {!isNight && (
        <Sky 
          distance={450000} 
          sunPosition={sunPos} 
          inclination={0} 
          azimuth={0.25} 
          mieCoefficient={0.005} 
          mieDirectionalG={0.8} 
          rayleigh={2} 
          turbidity={5} 
        />
      )}

      {/* 4. HDRI Environment Mapping for physically based water/rock reflections */}
      <Environment preset={isNight ? "night" : "sunset"} background={false} />

      {/* 5. Directional Sunlight / Moonlight */}
      <ambientLight intensity={isNight ? 0.2 : 0.6} color={isNight ? "#203060" : "#ffffff"} />
      
      {isHighTier && <SoftShadows size={40} samples={16} focus={0.5} />}
      
      <directionalLight
        ref={dirLightRef}
        castShadow
        shadow-mapSize-width={isHighTier ? 2048 : 512}
        shadow-mapSize-height={isHighTier ? 2048 : 512}
        shadow-camera-near={1}
        shadow-camera-far={2000}
        shadow-camera-left={-800}
        shadow-camera-right={800}
        shadow-camera-top={800}
        shadow-camera-bottom={-800}
        shadow-bias={-0.0001}
      />
    </group>
  )
}
