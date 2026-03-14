import { useRef, useMemo, useState } from 'react'
import { useFrame } from '@react-three/fiber'
import { Sky, Cloud, Clouds, Environment } from '@react-three/drei'
import { useGameStore, GPU_TIERS } from '../../../store/useGameStore'
import * as THREE from 'three'

/*
──────────────────────────────────────────────
  SkySystem — Cinematic Atmosphere
  
  Target: Image 1 — vivid cobalt blue sky,
  dramatic cumulus clouds, brilliant sun starburst
──────────────────────────────────────────────
*/

// Deterministic cloud positions (avoid Math.random re-rolls on re-render)
function seededPositions(count, seed) {
  const positions = []
  let s = seed
  const next = () => { s = (s * 16807 + 0) % 2147483647; return s / 2147483647 }
  for (let i = 0; i < count; i++) {
    positions.push([
      (next() - 0.5) * 12000,
      350 + next() * 300,
      (next() - 0.5) * 12000
    ])
  }
  return positions
}

const CLOUD_POSITIONS = seededPositions(18, 42)

export function SkySystemStable({ islands = [] }) {
  const sunTime = useGameStore(state => state.sunTime)
  const gpuTier = useGameStore(state => state.gpuTier)

  const dirLightRef = useRef()
  const cloudGroupRef = useRef()
  const fogRef = useRef() 
  const windDir = useRef(new THREE.Vector3(1, 0, 0.3).normalize())

  const isHighTier = gpuTier === GPU_TIERS.HIGH
  const isMidTier  = gpuTier === GPU_TIERS.MEDIUM
  const isLowTier  = !isHighTier && !isMidTier
  const isNight = sunTime > 19 || sunTime < 5

  // Regional Weather State
  const [localWeather, setLocalWeather] = useState({ fogDensity: 1, colorShift: 1 })

  useFrame((state) => {
    const time = state.clock.elapsedTime
    const camPos = state.camera.position

    // 1. Detect Nearest Island Weather
    let nearestDist = 99999
    let weatherTone = 0 // 0: Clear, 1: Stormy, 2: Foggy
    
    islands.forEach(is => {
      const d = camPos.distanceTo(new THREE.Vector3(...is.position))
      if (d < nearestDist) {
        nearestDist = d
        weatherTone = is.weatherType || 0
      }
    })

    // Interpolate weather influence (focus radius 800m)
    const factor = 1.0 - THREE.MathUtils.smoothstep(nearestDist, 200, 1000)
    
    // Wind — slow drift
    const windAngle = time * 0.03
    const windStrength = 0.3 + Math.sin(time * 0.08) * 0.2
    windDir.current.set(Math.cos(windAngle), 0, Math.sin(windAngle)).multiplyScalar(windStrength)

    // Animate clouds
    if (cloudGroupRef.current) {
      cloudGroupRef.current.children.forEach((cloud, i) => {
        const speedFact = 1.0 + (i * 0.08)
        cloud.position.x += windDir.current.x * speedFact * 0.15
        cloud.position.z += windDir.current.z * speedFact * 0.15
        
        // Wrap
        const bound = 7000
        if (cloud.position.x > bound) cloud.position.x = -bound
        if (cloud.position.x < -bound) cloud.position.x = bound
        if (cloud.position.z > bound) cloud.position.z = -bound
        if (cloud.position.z < -bound) cloud.position.z = bound
      })
    }

    // Update Lighting & Fog
    if (dirLightRef.current) {
      const t = sunTime / 24.0
      const angle = t * Math.PI * 2 - (Math.PI / 2)
      dirLightRef.current.position.set(Math.cos(angle) * 1000, Math.sin(angle) * 1000, 120)
      
      const sy = dirLightRef.current.position.y
      if (sy > 0) {
        const baseIntensity = sy < 200 ? 1.5 : 1.8
        const stormIntensity = weatherTone === 1 ? 0.4 : 1.0
        dirLightRef.current.intensity = baseIntensity * THREE.MathUtils.lerp(1.0, stormIntensity, factor)
        dirLightRef.current.color.set(weatherTone === 1 ? '#88aabb' : '#fffbe8')
      } else {
        dirLightRef.current.intensity = 0.2
      }
    }

    if (fogRef.current) {
        const isDense = weatherTone === 1 || weatherTone === 2
        const densityFactor = isDense ? factor : 0
        fogRef.current.near = THREE.MathUtils.lerp(8000, 100, densityFactor)
        fogRef.current.far = THREE.MathUtils.lerp(50000, 1500, densityFactor)
    }
  })

  const atmosphereParams = useMemo(() => {
    const isSunset  = sunTime > 16 && sunTime < 20
    const isSunrise = sunTime > 4 && sunTime < 8
    const fogColor = isNight ? '#030810' : (isSunset ? '#8a3a15' : (isSunrise ? '#4a5a8a' : '#1565c0'))

    const t = sunTime / 24.0
    const angle = t * Math.PI * 2 - (Math.PI / 2)

    return {
      sunPos: [Math.cos(angle) * 1000, Math.sin(angle) * 1000, 120],
      fogColor,
      rayleigh: isSunset || isSunrise ? 4.0 : 2.5,
      turbidity: isNight ? 0.1 : 0.6,
      mieCoefficient: 0.005,
      mieDirectionalG: 0.85
    }
  }, [sunTime, isNight])

  return (
    <group name="sky-atmosphere">
      <fog attach="fog" args={[atmosphereParams.fogColor, 8000, 50000]} />

      {/* ── Dramatic Cumulus Clouds (Hardware Aware) ── */}
      {!isLowTier && (
        <Clouds material={THREE.MeshBasicMaterial} limit={isHighTier ? 300 : 80}>
          {CLOUD_POSITIONS.slice(0, isHighTier ? 20 : 8).map((pos, i) => (
            <Cloud
              key={i}
              seed={i + 200}
              position={pos}
              scale={15 + (i % 5) * 5}
              volume={35 + (i % 4) * 15}
              color={isNight ? '#0a1a2a' : '#ffffff'}
              fade={1500}
              speed={0.12}
              opacity={0.65 + (i % 3) * 0.15}
            />
          ))}
        </Clouds>
      )}

      {/* ── Vivid Blue Sky ── */}
      <Sky
        distance={40000}
        sunPosition={atmosphereParams.sunPos}
        mieCoefficient={atmosphereParams.mieCoefficient}
        mieDirectionalG={atmosphereParams.mieDirectionalG}
        rayleigh={atmosphereParams.rayleigh}
        turbidity={atmosphereParams.turbidity}
      />

      <Environment preset={isNight ? 'night' : 'sunset'} background={false} />

      <ambientLight intensity={isNight ? 0.05 : 0.45} color={isNight ? '#1a2a50' : '#ffffff'} />

      {/* Directional Sun */}
      <directionalLight
        ref={dirLightRef}
        castShadow
        shadow-mapSize-width={512}
        shadow-mapSize-height={512}
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
