import { useRef } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'

/*
──────────────────────────────────────────────
  UnderwaterEffect — Cinematic Underwater
  
  Target: Image 3 — god-rays penetrating surface,
  depth absorption, rising bubble particles
──────────────────────────────────────────────
*/

// Simple bubble particle system
function BubbleParticles({ count = 60 }) {
  const meshRef = useRef()

  const positions = useRef(
    Array.from({ length: count }, () => ({
      x: (Math.random() - 0.5) * 200,
      y: -Math.random() * 80 - 5,
      z: (Math.random() - 0.5) * 200,
      speed: 0.3 + Math.random() * 0.8,
      size: 0.15 + Math.random() * 0.4,
      wobble: Math.random() * Math.PI * 2
    }))
  )

  useFrame((state) => {
    if (!meshRef.current) return
    const time = state.clock.elapsedTime
    const dummy = new THREE.Object3D()

    positions.current.forEach((b, i) => {
      // Rise upward
      b.y += b.speed * 0.02
      if (b.y > -0.5) {
        b.y = -Math.random() * 80 - 5
        b.x = (Math.random() - 0.5) * 200
        b.z = (Math.random() - 0.5) * 200
      }

      // Gentle wobble
      const wx = Math.sin(time * 0.8 + b.wobble) * 0.3
      const wz = Math.cos(time * 0.6 + b.wobble) * 0.3

      dummy.position.set(b.x + wx, b.y, b.z + wz)
      dummy.scale.setScalar(b.size)
      dummy.updateMatrix()
      meshRef.current.setMatrixAt(i, dummy.matrix)
    })

    meshRef.current.instanceMatrix.needsUpdate = true
  })

  return (
    <instancedMesh ref={meshRef} args={[undefined, undefined, count]}>
      <sphereGeometry args={[1, 8, 8]} />
      <meshStandardMaterial
        color="#88ccff"
        transparent
        opacity={0.35}
        roughness={0.1}
        metalness={0.3}
        emissive="#4488cc"
        emissiveIntensity={0.2}
      />
    </instancedMesh>
  )
}

// God-ray light shafts (simplified volumetric)
function GodRays({ sunDirection }) {
  const meshRef = useRef()

  useFrame((state) => {
    if (!meshRef.current) return
    const time = state.clock.elapsedTime

    // Slowly rotate rays
    meshRef.current.rotation.y = time * 0.02

    // Shimmer individual ray opacities
    meshRef.current.children.forEach((child, i) => {
      if (child.material) {
        child.material.opacity = 0.04 + (i % 3) * 0.015 + Math.sin(time * 0.5 + i) * 0.02
      }
    })
  })

  // Create ray geometry — tall thin cones pointing down from surface
  const rayCount = 8
  const rays = []
  for (let i = 0; i < rayCount; i++) {
    const angle = (i / rayCount) * Math.PI * 2
    const r = 30 + (i % 3) * 20
    rays.push(
      <mesh
        key={i}
        position={[
          Math.cos(angle) * r,
          -20,
          Math.sin(angle) * r
        ]}
        rotation={[0, 0, (Math.random() - 0.5) * 0.15]}
      >
        <cylinderGeometry args={[0.5, 4 + i % 3, 45, 6, 1, true]} />
        <meshBasicMaterial
          color="#6eb8e0"
          transparent
          opacity={0.04 + (i % 3) * 0.015}
          side={THREE.DoubleSide}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
        />
      </mesh>
    )
  }

  return <group ref={meshRef}>{rays}</group>
}

export function UnderwaterEffect({ sunDirection }) {
  const { camera, scene } = useThree()
  const fogRef = useRef()

  useFrame(() => {
    const isUnderwater = camera.position.y < 0

    // Toggle underwater fog
    if (isUnderwater) {
      if (!scene.fog || scene.fog.color.getHexString() !== '041830') {
        scene.fog = new THREE.FogExp2(0x041830, 0.015)
      }
    }
    // Above-water fog is managed by SkySystem
  })

  const isUnderwater = true // Always render, visibility controlled by camera Y

  return (
    <group name="underwater-effect" visible={true}>
      {/* Underwater ambient — deep blue (Image 3) */}
      <pointLight
        position={[0, -10, 0]}
        color="#1a5590"
        intensity={0.8}
        distance={150}
        decay={2}
      />

      {/* God-rays from above */}
      <GodRays sunDirection={sunDirection} />

      {/* Rising bubbles */}
      <BubbleParticles count={50} />
    </group>
  )
}
