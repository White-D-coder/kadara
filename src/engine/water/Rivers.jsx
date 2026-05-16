import React, { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import useGameStore from '../../store/useGameStore'
import { generateArchipelago } from '../terrain/IslandGenerator'
import { getTerrainHeight } from '../terrain/terrainUtils'

const riverVertexShader = `
  varying vec2 vUv;
  varying vec3 vWorldPosition;
  uniform float uTime;

  void main() {
    vUv = uv;
    // UV scrolls in flow direction
    vUv.x += uTime * 0.4;
    
    vec4 worldPosition = modelMatrix * vec4(position, 1.0);
    vWorldPosition = worldPosition.xyz;
    gl_Position = projectionMatrix * viewMatrix * worldPosition;
  }
`;

const riverFragmentShader = `
  varying vec2 vUv;
  uniform float uTime;

  float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453123); }
  float noise(vec2 p) {
    vec2 i = floor(p); vec2 f = fract(p);
    vec2 u = f*f*(3.0-2.0*f);
    return mix(mix(hash(i + vec2(0,0)), hash(i + vec2(1,0)), u.x),
               mix(hash(i + vec2(0,1)), hash(i + vec2(1,1)), u.x), u.y);
  }

  void main() {
    vec3 riverColor = vec3(0.23, 0.71, 0.75); // #3ab5c0
    vec3 foamColor = vec3(1.0);
    
    float foamMask = step(0.68, noise(vUv * 4.0 + uTime * 0.3));
    vec3 finalColor = mix(riverColor, foamColor, foamMask * 0.4);
    
    gl_FragColor = vec4(finalColor, 0.9);
  }
`;

const Rivers = () => {
  const meshRef = useRef()
  const seed = useGameStore((state) => state.seed)
  const islands = useMemo(() => generateArchipelago(seed), [seed])

  const curves = useMemo(() => {
    const generatePhysicPath = (startX, startZ) => {
      const points = []
      let currX = startX
      let currZ = startZ
      
      // Finer steps for more accurate physics
      const stepSize = 5.0
      const maxSteps = 200
      const eps = 1.0

      for (let i = 0; i < maxSteps; i++) {
        const h = getTerrainHeight(currX, currZ, 0, true, islands)
        // Sit tighter on the terrain
        points.push(new THREE.Vector3(currX, h + 0.15, currZ))

        // Stop if we hit water (sea level is 0)
        if (h < 0.2) break

        // Gradient descent
        const hL = getTerrainHeight(currX - eps, currZ, 0, true, islands)
        const hR = getTerrainHeight(currX + eps, currZ, 0, true, islands)
        const hD = getTerrainHeight(currX, currZ - eps, 0, true, islands)
        const hU = getTerrainHeight(currX, currZ + eps, 0, true, islands)
        
        const gradX = (hR - hL) / (2.0 * eps)
        const gradZ = (hU - hD) / (2.0 * eps)
        
        const len = Math.sqrt(gradX * gradX + gradZ * gradZ)
        if (len < 0.0001) break

        currX -= (gradX / len) * stepSize
        currZ -= (gradZ / len) * stepSize
      }

      if (points.length < 3) return null
      return new THREE.CatmullRomCurve3(points)
    }

    // Diverse starting points to simulate natural watershed
    const paths = [
      generatePhysicPath(80, 80),   
      generatePhysicPath(-100, 40), 
      generatePhysicPath(40, -120), 
      generatePhysicPath(-20, 150)  
    ].filter(p => p !== null)

    return paths
  }, [islands])

  const geometries = useMemo(() => {
    // Thicker, more detailed tubes
    return curves.map(curve => new THREE.TubeGeometry(curve, 240, 2.5, 12, false))
  }, [curves])

  useFrame((state) => {
    if (meshRef.current) {
      meshRef.current.children.forEach(child => {
        if (child.material && child.material.uniforms) {
          child.material.uniforms.uTime.value = state.clock.getElapsedTime()
        }
      })
    }
  })

  return (
    <group ref={meshRef}>
      {geometries.map((geo, i) => (
        <mesh key={i} geometry={geo}>
          <shaderMaterial
            transparent
            uniforms={{ uTime: { value: 0 } }}
            vertexShader={riverVertexShader}
            fragmentShader={riverFragmentShader}
            polygonOffset
            polygonOffsetFactor={-1}
            polygonOffsetUnits={-1}
          />
        </mesh>
      ))}
    </group>
  )
}

export default Rivers
