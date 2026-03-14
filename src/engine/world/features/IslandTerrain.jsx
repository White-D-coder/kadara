import { useRef, useEffect, useMemo } from 'react'
import * as THREE from 'three'

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

  const onBeforeCompile = useMemo(() => (shader) => {
    shader.vertexShader = shader.vertexShader.replace(
      'void main() {',
      `
      varying float vKElevation;
      varying float vKSlope;
      varying vec3 vKNormal;
      varying float vKEdgeDist;
      varying vec3 vKLocalPos;
      varying float vKRiver;

      float hash(vec3 p) {
        p = fract(p * 0.3183099 + 0.1);
        p *= 17.0;
        return fract(p.x * p.y * p.z * (p.x + p.y + p.z));
      }

      float noise(vec3 x) {
        vec3 i = floor(x);
        vec3 f = fract(x);
        f = f * f * (3.0 - 2.0 * f);
        return mix(mix(mix(hash(i + vec3(0,0,0)), hash(i + vec3(1,0,0)), f.x),
                       mix(hash(i + vec3(0,1,0)), hash(i + vec3(1,1,0)), f.x), f.y),
                   mix(mix(hash(i + vec3(0,0,1)), hash(i + vec3(1,0,1)), f.x),
                       mix(hash(i + vec3(0,1,1)), hash(i + vec3(1,1,1)), f.x), f.y), f.z);
      }

      float fbm(vec3 p) {
        float v = 0.0, a = 0.5;
        for (int i = 0; i < 2; i++) {
          v += a * noise(p);
          p *= 2.0;
          a *= 0.5;
        }
        return v;
      }

      float getTerrainHeight(vec3 lp) {
        // ── Organic Shaping (Domain Warping) ──
        vec2 warp = vec2(fbm(lp * 0.1), fbm(lp * 0.1 + 5.0));
        float d = length(lp.xz + warp * 8.0); 
        float nd = clamp(d / 45.0, 0.0, 1.0);

        // 1. Base Mountain Profile
        float baseHeight = pow(1.0 - nd, 1.6) * 40.0;

        // 2. Sharp Ridges (Image 2)
        float nStep = fbm(lp * 0.15);
        float crags = pow(abs(nStep - 0.5) * 2.0, 1.1) * 15.0;
        
        // 3. Erosion Channels & Rivers
        float riverNoise = fbm(lp * 0.25 + 10.0);
        float riverMask = smoothstep(0.48, 0.52, riverNoise) * (1.0 - nd);
        float h = baseHeight + crags - riverMask * 4.0;

        // 4. Natural Plain / Meadow (Plateau replacement)
        float plainMask = smoothstep(12.0, 18.0, d) * smoothstep(22.0, 18.0, d);
        h = mix(h, 6.0 + fbm(lp*0.5)*1.5, plainMask * 0.8);

        return max(h, -5.0);
      }

      void main() {
        vKLocalPos = position;
        float h = getTerrainHeight(position);
        
        // ── Detect Flowing River ──
        float riverNoise = fbm(position * 0.25 + 10.0);
        vKRiver = smoothstep(0.46, 0.54, riverNoise); 

        transformed.y += h;
        vKElevation = h;
        vKEdgeDist = clamp(length(position.xz) / 45.0, 0.0, 1.0);

        float eps = 0.4; 
        float hR = getTerrainHeight(position + vec3(eps, 0.0, 0.0));
        float hF = getTerrainHeight(position + vec3(0.0, 0.0, eps));
        vec3 localNml = normalize(vec3(h - hR, eps, h - hF));

        vKNormal = normalize((modelMatrix * instanceMatrix * vec4(localNml, 0.0)).xyz);
        vKSlope = 1.0 - abs(vKNormal.y);
      }
      `
    );

    shader.fragmentShader = shader.fragmentShader.replace(
      'void main() {',
      `
      varying float vKElevation;
      varying float vKSlope;
      varying vec3 vKNormal;
      varying float vKEdgeDist;
      varying vec3 vKLocalPos;
      varying float vKRiver;
      uniform float time;

      float hash2(vec2 p) {
        return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453);
      }

      void main() {
      `
    ).replace(
      '#include <map_fragment>',
      `
      #include <map_fragment>

      // ── Enhanced Tropical Palette ──
      vec3 jungle    = vec3(0.04, 0.38, 0.02);
      vec3 meadow    = vec3(0.25, 0.58, 0.08);
      vec3 sand      = vec3(0.96, 0.88, 0.72);
      vec3 cliffRock = vec3(0.42, 0.38, 0.32);
      vec3 darkRock  = vec3(0.18, 0.16, 0.15);
      vec3 peakSnow  = vec3(1.0, 1.0, 1.0);
      vec3 riverBlue = vec3(0.2, 0.7, 0.95);

      // Soft Horizontal Strata
      float strata = sin(vKElevation * 1.5 + hash2(vKLocalPos.xz * 0.1) * 0.8);
      vec3 rockColor = mix(cliffRock, darkRock, smoothstep(-0.4, 0.6, strata));

      // Moss/Grass on slopes
      float grassMask = smoothstep(0.40, 0.15, vKSlope);
      vec3 terrainColor = mix(rockColor, meadow, grassMask);

      // Jungle Overgrowth
      float jungleMask = smoothstep(2.0, 18.0, vKElevation) * (1.0 - smoothstep(0.2, 0.6, vKSlope));
      terrainColor = mix(terrainColor, jungle, jungleMask * 0.8);

      // ── River & Waterfall Logic ──
      float flow = fract(time * 0.8);
      float riverMotion = hash2(vKLocalPos.xz * 0.2 + flow);
      float isWater = vKRiver * smoothstep(0.5, 30.0, vKElevation);
      
      // Waterfall Detection (High slope in river zone)
      float waterfall = isWater * smoothstep(0.1, 0.6, vKSlope);
      vec3 waterfallColor = mix(riverBlue, vec3(0.9, 0.95, 1.0), riverMotion + 0.3);
      
      terrainColor = mix(terrainColor, riverBlue, isWater * 0.8);
      terrainColor = mix(terrainColor, waterfallColor, waterfall * 0.9);

      // Beach & Shore
      float beachMask = smoothstep(0.85, 0.98, vKEdgeDist);
      terrainColor = mix(terrainColor, sand, beachMask);

      // Alpine Peaks
      float snowBlend = smoothstep(32.0, 42.0, vKElevation) * (1.0 - smoothstep(0.4, 0.8, vKSlope));
      terrainColor = mix(terrainColor, peakSnow, snowBlend);

      diffuseColor.rgb = terrainColor;
      `
    );
  }, [])

  if (count === 0) return null

  return (
    <instancedMesh ref={meshRef} args={[islandGeometry, null, count]} receiveShadow castShadow>
      <meshStandardMaterial color="#ffffff" roughness={0.8} onBeforeCompile={onBeforeCompile} />
    </instancedMesh>
  )
}
