import React, { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils'

const Weather = () => {
  const cloudGroupRef = useRef()
  const islandRadius = 500

  // Step 7: Cloud Layer System
  const clouds = useMemo(() => {
    const cloudClusters = []
    const sphereGeo = new THREE.SphereGeometry(1, 12, 12)
    
    for (let i = 0; i < 12; i++) {
      const geometries = []
      const clusterSize = 5 + Math.floor(Math.random() * 3)
      
      for (let j = 0; j < clusterSize; j++) {
        const g = sphereGeo.clone()
        const radius = 6 + Math.random() * 12
        g.scale(radius, radius * 0.6, radius)
        g.translate(
          (Math.random() - 0.5) * 20,
          (Math.random() - 0.5) * 8,
          (Math.random() - 0.5) * 20
        )
        geometries.push(g)
      }
      
      const mergedGeo = mergeGeometries(geometries)
      const altitude = 120 + Math.random() * 80
      const orbitRadius = islandRadius * (0.6 + Math.random() * 0.5)
      const angle = (i / 12) * Math.PI * 2 + Math.random() * 0.5
      
      cloudClusters.push({
        geometry: mergedGeo,
        position: new THREE.Vector3(
          Math.cos(angle) * orbitRadius,
          altitude,
          Math.sin(angle) * orbitRadius
        ),
        speed: 0.25 + i * 0.03
      })
    }
    return cloudClusters
  }, [])

  useFrame((state, delta) => {
    if (cloudGroupRef.current) {
      cloudGroupRef.current.children.forEach((cloud, i) => {
        const data = clouds[i]
        cloud.position.x += delta * data.speed * 10
        cloud.position.y += Math.sin(state.clock.getElapsedTime() * 0.18 + i * 1.1) * 0.015
        
        // Wrap around logic
        if (cloud.position.x > 800) cloud.position.x = -800
      })
    }
  })

  return (
    <group ref={cloudGroupRef}>
      {clouds.map((cloud, i) => (
        <mesh key={i} geometry={cloud.geometry} position={cloud.position}>
          <meshStandardMaterial
            color="#f0f8ff"
            transparent
            opacity={0.8}
            depthWrite={false}
            roughness={1.0}
            metalness={0.0}
          />
        </mesh>
      ))}
    </group>
  )
}

export default Weather
