import { useRef, useMemo, useEffect } from 'react'
import * as THREE from 'three'
import { useGameStore } from '../../store/useGameStore'

// Simple seeded PRNG
function mulberry32(a) {
  return function() {
    let t = a += 0x6D2B79F5;
    t = Math.imul(t ^ t >>> 15, t | 1);
    t ^= t + Math.imul(t ^ t >>> 7, t | 61);
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  }
}

export function Archipelago() {
  const meshRef = useRef()
  const seed = useGameStore(state => state.seed)
  const count = 8 // 1 main + 7 satellites

  const dummy = useMemo(() => new THREE.Object3D(), [])
  
  // 0.0 for Main Island, 1.0 for Satellites
  const terrainTypes = useMemo(() => {
    const arr = new Float32Array(count)
    arr[0] = 0.0 // Main
    for (let i = 1; i < count; i++) arr[i] = 1.0 // Satellites
    return arr
  }, [count])

  useEffect(() => {
    if (!meshRef.current) return
    
    // Seed PRNG based on World State
    const random = mulberry32(Math.floor(seed * 1000000))
    
    // 0 = Main Island (Large, gently sloping white sand beach into forest)
    dummy.position.set(0, -10, 0)
    dummy.scale.set(6, 2, 6) 
    dummy.rotation.y = random() * Math.PI * 2
    dummy.updateMatrix()
    meshRef.current.setMatrixAt(0, dummy.matrix)
    
    // 1 to 7 = Satellite Islands
    for (let i = 1; i < count; i++) {
      const angle = random() * Math.PI * 2
      const radius = 250 + random() * 350 // spread
      
      const x = Math.cos(angle) * radius
      const z = Math.sin(angle) * radius
      
      // Random depth so beaches hit the water differently
      const yDepth = -5 - random() * 15
      dummy.position.set(x, yDepth, z)
      
      // Scaled as squashed spheres
      const s = 1.5 + random() * 2.0
      const heightScale = 0.5 + random() * 1.5
      dummy.scale.set(s, heightScale, s)
      
      // Random rotation
      dummy.rotation.y = random() * Math.PI * 2
      
      dummy.updateMatrix()
      meshRef.current.setMatrixAt(i, dummy.matrix)
    }
    
    meshRef.current.instanceMatrix.needsUpdate = true
  }, [seed, dummy, count])

  // Custom Shader Injection for Sand-to-Forest Triplanar Mapping
  const onBeforeCompile = (shader) => {
    shader.vertexShader = `
      attribute float aTerrainType;
      varying float vTerrainType;
      varying vec3 vWorldPosition;
      varying vec3 vWorldNormal;
      ${shader.vertexShader}
    `.replace(
      '#include <worldpos_vertex>',
      `
      #include <worldpos_vertex>
      vWorldPosition = (modelMatrix * instanceMatrix * vec4(transformed, 1.0)).xyz;
      // Normal matrix for instanced meshes
      vWorldNormal = normalize((modelMatrix * instanceMatrix * vec4(normal, 0.0)).xyz);
      vTerrainType = aTerrainType;
      `
    );

    shader.fragmentShader = `
      varying float vTerrainType;
      varying vec3 vWorldPosition;
      varying vec3 vWorldNormal;
      
      // Simple random procedural noise
      float noise(vec3 p) {
        return fract(sin(dot(p, vec3(12.9898, 78.233, 45.164))) * 43758.5453);
      }
      
      vec3 getIslandColor(vec3 pos, vec3 normal) {
          // Height boundaries relative to ocean at Y=-2
          float h = pos.y;
          float steepness = 1.0 - normal.y; // 0 is flat top, 1 is vertical cliff
          
          // Colors
          vec3 whiteSand = vec3(0.95, 0.93, 0.88);
          vec3 lightGrass = vec3(0.3, 0.6, 0.2);
          vec3 darkForest = vec3(0.1, 0.35, 0.15);
          vec3 cliffRock = vec3(0.45, 0.45, 0.5);
          
          vec3 topColor = whiteSand;
          
          // Generate organic sand-to-forest gradient
          if (h < 1.0) {
              topColor = whiteSand;
          } else if (h < 6.0) {
              float mixVal = smoothstep(1.0, 6.0, h);
              topColor = mix(whiteSand, lightGrass, mixVal);
          } else {
              float mixVal = smoothstep(6.0, 25.0, h);
              topColor = mix(lightGrass, darkForest, mixVal);
          }
          
          // Add macro texture variation
          float macroNoise = noise(floor(pos * 0.2)) * 0.5 + 0.5;
          topColor *= macroNoise;
          
          // Blend in rock on extreme slopes (cliffs)
          float rockMix = smoothstep(0.4, 0.7, steepness);
          
          // Final mix
          return mix(topColor, cliffRock * macroNoise, rockMix);
      }
      
      ${shader.fragmentShader}
    `.replace(
      '#include <color_fragment>',
      `
      #include <color_fragment>
      diffuseColor.rgb = getIslandColor(vWorldPosition, vWorldNormal);
      `
    );
  }

  return (
    <instancedMesh ref={meshRef} args={[null, null, count]} receiveShadow castShadow>
      {/* A high-res sphere acting as a smoothed, squashed dome terrain */}
      <sphereGeometry args={[50, 128, 64]}>
        <instancedBufferAttribute attach="attributes-aTerrainType" args={[terrainTypes, 1]} />
      </sphereGeometry>
      <meshStandardMaterial 
        color="#ffffff" 
        roughness={0.9} // Dull surface
        metalness={0.0}
        onBeforeCompile={onBeforeCompile}
      />
    </instancedMesh>
  )
}
