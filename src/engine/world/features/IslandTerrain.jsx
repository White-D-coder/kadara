import { useRef, useEffect, useMemo } from 'react'
import * as THREE from 'three'
import { useGameStore, GPU_TIERS } from '../../../store/useGameStore'

/*
──────────────────────────────────────────────
  IslandTerrain — Ultra Performance Cinematic
──────────────────────────────────────────────
*/

const SEGMENTS = 160 // Slightly reduced for better FPS while keeping detail
const islandGeometry = new THREE.PlaneGeometry(100, 100, SEGMENTS, SEGMENTS)
islandGeometry.rotateX(-Math.PI / 2)

const GLSL_UTILS = `
  float kHash(vec3 p) {
    p = fract(p * vec3(0.1031, 0.1030, 0.0973));
    p += dot(p, p.yxz + 33.33);
    return fract((p.x + p.y) * p.z);
  }
  float kNoise(vec3 p) {
    vec3 i = floor(p), f = fract(p);
    f = f * f * (3.0 - 2.0 * f);
    return mix(mix(mix(kHash(i+vec3(0,0,0)),kHash(i+vec3(1,0,0)),f.x),mix(kHash(i+vec3(0,1,0)),kHash(i+vec3(1,1,0)),f.x),f.y),mix(mix(kHash(i+vec3(0,0,1)),kHash(i+vec3(1,0,1)),f.x),mix(kHash(i+vec3(0,1,1)),kHash(i+vec3(1,1,1)),f.x),f.y),f.z);
  }
  float kFbm(vec3 p, int oct) {
    float v=0., a=.5, f=1.;
    for(int i=0; i<4; i++){ if(i>=oct) break; v+=a*kNoise(p*f); f*=2.1; a*=.48; }
    return v;
  }
`

const TERRAIN_HEIGHT_FN = `
  float getTerrainHeight(vec3 p) {
    float d = length(p.xz);
    float nd = d / 46.0;
    float islandMask = 1.0 - smoothstep(0.45, 0.95, nd);
    if(islandMask < 0.01) return -6.0;

    float h = kFbm(vec3(p.xz * 0.045, 0.0), 4) * 45.0 * islandMask;
    h += (kNoise(vec3(p.xz * 0.15, 1.2)) - 0.5) * 8.0 * islandMask;
    
    return max(h, -5.0);
  }
`

export function IslandTerrain({ islands }) {
  const meshRef = useRef()
  const count = islands ? islands.length : 0

  useEffect(() => {
    if (!meshRef.current || !islands) return
    const dummy = new THREE.Object3D()
    islands.forEach((is, i) => {
      dummy.position.set(...is.position)
      dummy.scale.set(...is.scale)
      dummy.rotation.set(0, is.rotation, 0)
      dummy.updateMatrix()
      meshRef.current.setMatrixAt(i, dummy.matrix)
    })
    meshRef.current.instanceMatrix.needsUpdate = true
  }, [islands])

  const gpuTier = useGameStore(state => state.gpuTier)
  const isHigh = gpuTier === GPU_TIERS.HIGH

  const onBeforeCompile = useMemo(() => (shader) => {
    shader.vertexShader = shader.vertexShader.replace('#include <common>', `
      #include <common>
      varying float vKElev;
      varying vec3 vKBWeights;
      ${GLSL_UTILS}
      ${TERRAIN_HEIGHT_FN}
    `)

    shader.vertexShader = shader.vertexShader.replace('#include <begin_vertex>', `
      #include <begin_vertex>
      float h = getTerrainHeight(position);
      transformed.y += h;
      vKElev = h;
      vKBWeights = vec3(smoothstep(4.0, 1.0, h), smoothstep(22.0, 42.0, h), 0.0);
    `)

    shader.fragmentShader = shader.fragmentShader.replace('#include <common>', `
      #include <common>
      varying float vKElev;
      varying vec3 vKBWeights;
    `)

    shader.fragmentShader = shader.fragmentShader.replace('#include <color_fragment>', `
      #include <color_fragment>
      vec3 sand = vec3(0.9, 0.82, 0.6);
      vec3 grass = vec3(0.2, 0.52, 0.1);
      vec3 rock = vec3(0.42, 0.40, 0.38);
      vec3 snow = vec3(0.95, 0.98, 1.0);
      
      vec3 col = mix(grass, sand, vKBWeights.x);
      col = mix(col, rock, vKBWeights.y);
      col = mix(col, snow, smoothstep(44.0, 52.0, vKElev));
      diffuseColor.rgb = col;
    `)
  }, [])

  if (count === 0) return null

  return (
    <instancedMesh ref={meshRef} args={[islandGeometry, null, count]} receiveShadow castShadow>
      <meshStandardMaterial color="#ffffff" roughness={0.8} onBeforeCompile={onBeforeCompile} />
    </instancedMesh>
  )
}