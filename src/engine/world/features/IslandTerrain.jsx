import { useRef, useEffect, useMemo } from 'react'
import * as THREE from 'three'
import { useGameStore, GPU_TIERS } from '../../../store/useGameStore'

/*
──────────────────────────────────────────────
  IslandTerrain — Hyper-Realistic Cinematic
  
  Target: Image 1 — Sedimentary rock strata (horizontal layers)
  Target: Image 2 — Sharp alpine peaks & lush slopes
  Target: Image 4 — Integrated lagoon shoreline
──────────────────────────────────────────────
*/

const islandGeometry = new THREE.PlaneGeometry(100, 100, 64, 64)
islandGeometry.rotateX(-Math.PI / 2)

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
  const seed = useGameStore(state => state.seed)
  const isHighTier = gpuTier === GPU_TIERS.HIGH
  const isMidTier = gpuTier === GPU_TIERS.MEDIUM

  const onBeforeCompile = useMemo(() => (shader) => {
    shader.uniforms.time = { value: 0 }
    shader.uniforms.uSeed = { value: seed }
    
    shader.vertexShader = `
      varying float vKElevation;
      varying float vKSlope;
      varying vec3 vKNormal;
      varying float vKEdgeDist;
      varying vec3 vKLocalPos;
      varying float vKRiver;

      float hash(vec3 p) {
        return fract(sin(dot(p, vec3(127.1, 311.7, 74.7))) * 43758.5453123);
      }

      float noise(vec3 p) {
        vec3 i = floor(p), f = fract(p);
        f = f * f * (3.0 - 2.0 * f);
        return mix(mix(mix(hash(i + vec3(0,0,0)), hash(i + vec3(1,0,0)), f.x),
                       mix(hash(i + vec3(0,1,0)), hash(i + vec3(1,1,0)), f.x), f.y),
                   mix(mix(hash(i + vec3(0,0,1)), hash(i + vec3(1,0,1)), f.x),
                       mix(hash(i + vec3(0,1,1)), hash(i + vec3(1,1,1)), f.x), f.y), f.z);
      }

      float fbm(vec3 p) {
        float v = 0.0, a = 0.5;
        for (int i = 0; i < 3; i++) {
          v += a * noise(p);
          p = p * 2.1;
          a *= 0.5;
        }
        return v;
      }

      float getTerrainHeight(vec3 lp) {
        vec2 warp = vec2(fbm(lp * 0.1), fbm(lp * 0.1 + 7.0));
        float d = length(lp.xz + warp * 5.0);
        float nd = clamp(d / 45.0, 0.0, 1.0);
        
        // Base Mountain Shape
        float h = pow(1.0 - nd, 1.5) * 55.0;
        
        // Detail & Ridges (High Tier only)
        #if defined(IS_HIGH_TIER)
          float nDetail = fbm(lp * 0.2);
          h += pow(abs(nDetail - 0.5) * 2.0, 1.2) * 15.0;
        #else
          h += noise(lp * 0.15) * 8.0;
        #endif

        return max(h, -5.0);
      }
    ` + shader.vertexShader;

    // Inject "Hardware Tier" define
    if (isHighTier) shader.vertexShader = '#define IS_HIGH_TIER\n' + shader.vertexShader;

    shader.vertexShader = shader.vertexShader.replace(
      '#include <begin_vertex>',
      `
      #include <begin_vertex>
      vKLocalPos = position;
      float h = getTerrainHeight(position);
      transformed.y += h;
      vKElevation = h;
      vKEdgeDist = clamp(length(position.xz) / 45.0, 0.0, 1.0);

      // Simple Normal calc for lighting
      float eps = 0.5;
      float hR = getTerrainHeight(position + vec3(eps, 0.0, 0.0));
      float hF = getTerrainHeight(position + vec3(0.0, 0.0, eps));
      vec3 localNml = normalize(vec3(h - hR, eps, h - hF));
      vKNormal = normalize((modelMatrix * instanceMatrix * vec4(localNml, 0.0)).xyz);
      vKSlope = 1.0 - abs(vKNormal.y);
      vKRiver = 0.0;
      `
    );

    shader.fragmentShader = `
      varying float vKElevation;
      varying float vKSlope;
      varying vec3 vKNormal;
      varying float vKEdgeDist;
      varying vec3 vKLocalPos;
      varying float vKRiver;
      uniform float time;
    ` + shader.fragmentShader;

    shader.fragmentShader = shader.fragmentShader.replace(
      '#include <color_fragment>',
      `
      #include <color_fragment>
      
      // ── Tropical Palette (Image 1 & 2) ──
      vec3 soilCol  = vec3(0.48, 0.35, 0.28);
      vec3 rockCol  = vec3(0.38, 0.40, 0.45);
      vec3 grassCol = vec3(0.18, 0.48, 0.15);
      vec3 sandCol  = vec3(0.96, 0.92, 0.75);

      // Rocks strata (Image 1)
      float strata = sin(vKElevation * 0.5 + noise(vKLocalPos * 0.1) * 3.0) * 0.5 + 0.5;
      vec3 layeredRock = mix(rockCol, rockCol * 0.85, step(0.6, strata));

      // Composition
      vec3 color = layeredRock;
      
      // Slope-based grass
      float grassMask = smoothstep(0.35, 0.12, vKSlope) * smoothstep(1.0, 15.0, vKElevation);
      color = mix(color, grassCol, grassMask);

      // Shore sand
      float sandMask = smoothstep(5.0, 0.5, vKElevation);
      color = mix(color, sandCol, sandMask);
      
      diffuseColor.rgb = color;
      `
    );
  }, [isHighTier, seed])

  if (count === 0) return null

  // Performance Fallback for Tier 1
  if (!isHighTier && !isMidTier) {
    return (
      <instancedMesh ref={meshRef} args={[islandGeometry, null, count]} receiveShadow castShadow>
        <meshLambertMaterial color="#3a6b35" />
      </instancedMesh>
    )
  }

  return (
    <instancedMesh ref={meshRef} args={[islandGeometry, null, count]} receiveShadow castShadow>
      <meshStandardMaterial color="#ffffff" roughness={0.8} onBeforeCompile={onBeforeCompile} />
    </instancedMesh>
  )
}
