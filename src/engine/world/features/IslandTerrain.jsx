import { useRef, useEffect, useMemo } from 'react'
import * as THREE from 'three'

// 128 segments balances detail vs performance for 500m islands
const islandGeometry = new THREE.PlaneGeometry(100, 100, 128, 128)
islandGeometry.rotateX(-Math.PI / 2)

export function IslandTerrain({ islands }) {
  const meshRef = useRef()
  const count = islands ? islands.length : 0

  const terrainParams = useMemo(() => {
    const arr = new Float32Array(count * 4)
    if (islands) {
      islands.forEach((is, i) => {
        arr[i * 4 + 0] = is.terrainType
      })
    }
    return arr
  }, [islands, count])

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

  const onBeforeCompile = (shader) => {
    shader.vertexShader = `
      attribute vec4 aTerrainParams;
      varying float vTerrainType;
      varying vec3 vWorldPosition;
      varying vec3 vWorldNormal;
      varying float vElevation;
      varying float vSlope;

      // === 3D Simplex Noise ===
      vec4 permute(vec4 x){return mod(((x*34.0)+1.0)*x, 289.0);}
      vec4 taylorInvSqrt(vec4 r){return 1.79284291400159 - 0.85373472095314 * r;}
      float snoise(vec3 v){ 
        const vec2 C = vec2(1.0/6.0, 1.0/3.0);
        const vec4 D = vec4(0.0, 0.5, 1.0, 2.0);
        vec3 i = floor(v + dot(v, C.yyy));
        vec3 x0 = v - i + dot(i, C.xxx);
        vec3 g = step(x0.yzx, x0.xyz);
        vec3 l = 1.0 - g;
        vec3 i1 = min(g.xyz, l.zxy);
        vec3 i2 = max(g.xyz, l.zxy);
        vec3 x1 = x0 - i1 + C.xxx;
        vec3 x2 = x0 - i2 + C.yyy;
        vec3 x3 = x0 - D.yyy;
        i = mod(i, 289.0);
        vec4 p = permute(permute(permute(
                   i.z + vec4(0.0, i1.z, i2.z, 1.0))
                 + i.y + vec4(0.0, i1.y, i2.y, 1.0))
                 + i.x + vec4(0.0, i1.x, i2.x, 1.0));
        float n_ = 0.142857142857;
        vec3 ns = n_ * D.wyz - D.xzx;
        vec4 j = p - 49.0 * floor(p * ns.z * ns.z);
        vec4 x_ = floor(j * ns.z);
        vec4 y_ = floor(j - 7.0 * x_);
        vec4 x = x_ * ns.x + ns.yyyy;
        vec4 y = y_ * ns.x + ns.yyyy;
        vec4 h = 1.0 - abs(x) - abs(y);
        vec4 b0 = vec4(x.xy, y.xy);
        vec4 b1 = vec4(x.zw, y.zw);
        vec4 s0 = floor(b0) * 2.0 + 1.0;
        vec4 s1 = floor(b1) * 2.0 + 1.0;
        vec4 sh = -step(h, vec4(0.0));
        vec4 a0 = b0.xzyw + s0.xzyw * sh.xxyy;
        vec4 a1 = b1.xzyw + s1.xzyw * sh.zzww;
        vec3 p0 = vec3(a0.xy, h.x);
        vec3 p1 = vec3(a0.zw, h.y);
        vec3 p2 = vec3(a1.xy, h.z);
        vec3 p3 = vec3(a1.zw, h.w);
        vec4 norm = taylorInvSqrt(vec4(dot(p0,p0), dot(p1,p1), dot(p2,p2), dot(p3,p3)));
        p0 *= norm.x; p1 *= norm.y; p2 *= norm.z; p3 *= norm.w;
        return 42.0 * dot(vec4(dot(p0,x0), dot(p1,x1), dot(p2,x2), dot(p3,x3)), vec4(1.0));
      }

      // 4-octave FBM for broad terrain features
      float fbm(vec3 x) {
        float v = 0.0;
        float a = 0.5;
        vec3 shift = vec3(100.0);
        for (int i = 0; i < 4; ++i) {
          v += a * snoise(x);
          x = x * 2.0 + shift;
          a *= 0.5;
        }
        return v;
      }

      // Gentle island terrain — realistic 1:17 width-to-height ratio
      // Local space: plane is 100×100, radius 50. Scale 5× = 500m island
      // Peak 6 local units × 5 scale = 30m world height (realistic for tropical island)
      float getTerrainDisplacement(vec3 localPos) {
        float dist = length(localPos.xz);
        
        // Smooth bell curve: cos(PI * dist/R) gives natural dome falloff
        // Gradually tapers from center to edge with no cliff faces
        float normDist = clamp(dist / 48.0, 0.0, 1.0);
        float profile = 0.5 + 0.5 * cos(3.14159 * normDist);
        
        // Gentle terrain noise
        float broad = fbm(localPos * 0.05) * 0.3 + 0.5;
        float ridge = max(0.0, snoise(localPos * 0.03)) * 0.2;
        float detail = snoise(localPos * 0.1) * 0.05;
        
        // Combined height: profile × noise
        float height = profile * (broad + ridge + detail);
        
        // Max 6 local units → 30m world height at 5× scale
        return height * 6.0;
      }

      ${shader.vertexShader}
    `.replace(
      '#include <begin_vertex>',
      `
      #include <begin_vertex>
      
      // Get displacement using LOCAL position (before instance transform)
      float displacement = getTerrainDisplacement(position);
      transformed.y += displacement;
      
      // Compute world position after displacement
      vec4 finalWorldPos = modelMatrix * instanceMatrix * vec4(transformed, 1.0);
      vWorldPosition = finalWorldPos.xyz;
      
      // Analytic normal via finite difference in local space
      float eps = 0.8;
      float hC = displacement;
      float hR = getTerrainDisplacement(position + vec3(eps, 0.0, 0.0));
      float hF = getTerrainDisplacement(position + vec3(0.0, 0.0, eps));
      
      // Normal in local space
      vec3 localNormal = normalize(vec3(
        (hC - hR) / eps,
        1.0,
        (hC - hF) / eps
      ));
      
      // Transform normal to world space (approximate, ignoring non-uniform scale for now)
      vWorldNormal = normalize((modelMatrix * instanceMatrix * vec4(localNormal, 0.0)).xyz);
      vSlope = 1.0 - abs(vWorldNormal.y);
      
      vTerrainType = aTerrainParams.x;
      vElevation = finalWorldPos.y;
      `
    );

    // === Fragment Shader: 5-Layer PBR Material System ===
    const terrainFragmentUtils = `
      #include <packing>
      
      varying float vTerrainType;
      varying vec3 vWorldPosition;
      varying vec3 vWorldNormal;
      varying float vElevation;
      varying float vSlope;
      
      float random2(in vec2 st) {
          return fract(sin(dot(st.xy, vec2(12.9898, 78.233))) * 43758.5453123);
      }

      float noise2(in vec2 st) {
          vec2 i = floor(st);
          vec2 f = fract(st);
          float a = random2(i);
          float b = random2(i + vec2(1.0, 0.0));
          float c = random2(i + vec2(0.0, 1.0));
          float d = random2(i + vec2(1.0, 1.0));
          vec2 u = f * f * (3.0 - 2.0 * f);
          return mix(a, b, u.x) + (c - a) * u.y * (1.0 - u.x) + (d - b) * u.x * u.y;
      }

      vec3 getTerrainColor(vec3 pos, vec3 normal, float slope, float elevation, out float rockness, out float wetness) {
          rockness = 0.0;
          wetness = 0.0;
          
          // Cinematic tropical color palette
          vec3 underwaterSand = vec3(0.55, 0.50, 0.42);
          vec3 wetSand        = vec3(0.75, 0.68, 0.58);
          vec3 drySand         = vec3(0.92, 0.88, 0.78);
          vec3 tropicalGrass  = vec3(0.22, 0.45, 0.12);
          vec3 denseJungle    = vec3(0.08, 0.28, 0.05);
          vec3 highJungle     = vec3(0.15, 0.35, 0.10);
          vec3 cliffRock      = vec3(0.45, 0.42, 0.38);
          vec3 peakRock       = vec3(0.55, 0.52, 0.48);
          
          vec3 baseColor;
          float h = elevation;
          
          // Height-based biome blending (world-space elevation 0-30m)
          if (h < -2.0) {
              baseColor = underwaterSand;
              wetness = 1.0;
          } else if (h < 1.0) {
              float t = smoothstep(-2.0, 1.0, h);
              baseColor = mix(underwaterSand, wetSand, t);
              wetness = 1.0 - t * 0.7;
          } else if (h < 5.0) {
              float t = smoothstep(1.0, 5.0, h);
              baseColor = mix(drySand, tropicalGrass, t);
          } else if (h < 15.0) {
              float t = smoothstep(5.0, 15.0, h);
              baseColor = mix(tropicalGrass, denseJungle, t);
          } else if (h < 25.0) {
              float t = smoothstep(15.0, 25.0, h);
              baseColor = mix(denseJungle, highJungle, t);
          } else {
              float t = smoothstep(25.0, 30.0, h);
              baseColor = mix(highJungle, peakRock, t);
          }
          
          // Cliff rock override based on slope
          float rockBlend = smoothstep(0.35, 0.65, slope);
          rockness = rockBlend;
          baseColor = mix(baseColor, cliffRock, rockBlend);
          
          // Tri-planar micro-noise for surface variation
          float nScale = 0.08;
          float nX = noise2(pos.yz * nScale);
          float nY = noise2(pos.xz * nScale);
          float nZ = noise2(pos.xy * nScale);
          vec3 bw = abs(normal);
          bw /= dot(bw, vec3(1.0));
          float triNoise = nX * bw.x + nY * bw.y + nZ * bw.z;
          
          return baseColor * (0.80 + triNoise * 0.40);
      }
    `;

    shader.fragmentShader = terrainFragmentUtils + shader.fragmentShader.replace(
      '#include <roughnessmap_fragment>',
      `
      #include <roughnessmap_fragment>
      
      float rockness;
      float wetness;
      diffuseColor.rgb = getTerrainColor(vWorldPosition, vWorldNormal, vSlope, vElevation, rockness, wetness);
      
      // Dynamic PBR roughness
      float dynRoughness = mix(0.85, 0.15, wetness);
      dynRoughness = mix(dynRoughness, 0.95, rockness);
      roughnessFactor = dynRoughness;
      `
    );
  }

  if (count === 0) return null

  return (
    <instancedMesh ref={meshRef} args={[islandGeometry, null, count]} receiveShadow castShadow>
      <instancedBufferAttribute attach="attributes-aTerrainParams" args={[terrainParams, 4]} />
      <meshStandardMaterial
        color="#ffffff"
        roughness={1.0}
        metalness={0.05}
        onBeforeCompile={onBeforeCompile}
      />
    </instancedMesh>
  )
}
