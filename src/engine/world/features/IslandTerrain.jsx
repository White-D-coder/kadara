import { useRef, useEffect, useMemo } from 'react'
import * as THREE from 'three'
import { useTexture } from '@react-three/drei'

export function IslandTerrain({ islands }) {
  const meshRef = useRef()
  const count = islands ? islands.length : 0

  const terrainParams = useMemo(() => {
    const arr = new Float32Array(count * 4) // x,y,z,w (type, unused, unused, unused)
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

      // 3D Simplex Noise
      vec4 permute(vec4 x){return mod(((x*34.0)+1.0)*x, 289.0);}
      vec4 taylorInvSqrt(vec4 r){return 1.79284291400159 - 0.85373472095314 * r;}
      float snoise(vec3 v){ 
        const vec2  C = vec2(1.0/6.0, 1.0/3.0) ;
        const vec4  D = vec4(0.0, 0.5, 1.0, 2.0);
        vec3 i  = floor(v + dot(v, C.yyy) );
        vec3 x0 = v - i + dot(i, C.xxx) ;
        vec3 g = step(x0.yzx, x0.xyz);
        vec3 l = 1.0 - g;
        vec3 i1 = min( g.xyz, l.zxy );
        vec3 i2 = max( g.xyz, l.zxy );
        vec3 x1 = x0 - i1 + C.xxx;
        vec3 x2 = x0 - i2 + C.yyy;
        vec3 x3 = x0 - D.yyy;
        i = mod(i, 289.0 ); 
        vec4 p = permute( permute( permute( 
                   i.z + vec4(0.0, i1.z, i2.z, 1.0 ))
                 + i.y + vec4(0.0, i1.y, i2.y, 1.0 )) 
                 + i.x + vec4(0.0, i1.x, i2.x, 1.0 ));
        float n_ = 0.142857142857;
        vec3  ns = n_ * D.wyz - D.xzx;
        vec4 j = p - 49.0 * floor(p * ns.z * ns.z);
        vec4 x_ = floor(j * ns.z);
        vec4 y_ = floor(j - 7.0 * x_ );
        vec4 x = x_ *ns.x + ns.yyyy;
        vec4 y = y_ *ns.x + ns.yyyy;
        vec4 h = 1.0 - abs(x) - abs(y);
        vec4 b0 = vec4( x.xy, y.xy );
        vec4 b1 = vec4( x.zw, y.zw );
        vec4 s0 = floor(b0)*2.0 + 1.0;
        vec4 s1 = floor(b1)*2.0 + 1.0;
        vec4 sh = -step(h, vec4(0.0));
        vec4 a0 = b0.xzyw + s0.xzyw*sh.xxyy ;
        vec4 a1 = b1.xzyw + s1.xzyw*sh.zzww ;
        vec3 p0 = vec3(a0.xy,h.x);
        vec3 p1 = vec3(a0.zw,h.y);
        vec3 p2 = vec3(a1.xy,h.z);
        vec3 p3 = vec3(a1.zw,h.w);
        vec4 norm = taylorInvSqrt(vec4(dot(p0,p0), dot(p1,p1), dot(p2, p2), dot(p3,p3)));
        p0 *= norm.x;
        p1 *= norm.y;
        p2 *= norm.z;
        p3 *= norm.w;
        return 42.0 * dot( vec4(dot(p0,x0), dot(p1,x1), dot(p2,x2), dot(p3,x3)), vec4( 1.0, 1.0, 1.0, 1.0 ) );
      }

      float fbm(vec3 x) {
        float v = 0.0;
        float a = 0.5;
        vec3 shift = vec3(100.0);
        for (int i = 0; i < 5; ++i) {
          v += a * snoise(x);
          x = x * 2.0 + shift;
          a *= 0.5;
        }
        return v;
      }

      ${shader.vertexShader}
    `.replace(
      '#include <worldpos_vertex>',
      `
      #include <worldpos_vertex>
      
      // Calculate world position
      vec4 instanceWorldPos = modelMatrix * instanceMatrix * vec4(transformed, 1.0);
      
      // Geological Terrain Displacement (Erosion + Ridges)
      // Base frequency
      float noiseVal = fbm(instanceWorldPos.xyz * 0.02);
      
      // Add sharp ridges (erosion simulation)
      float ridge = 1.0 - abs(snoise(instanceWorldPos.xyz * 0.05));
      ridge = pow(ridge, 4.0);
      
      // Smooth out the shoreline so beaches form naturally at Y ~ 0
      float shoreSmoothing = smoothstep(0.0, 15.0, instanceWorldPos.y);
      
      float displacement = (noiseVal * 10.0 + ridge * 15.0) * shoreSmoothing;
      
      // Displace position along normal
      vec3 displacedPos = transformed + normal * displacement;
      
      // Recalculate World Position and Normal
      instanceWorldPos = modelMatrix * instanceMatrix * vec4(displacedPos, 1.0);
      vWorldPosition = instanceWorldPos.xyz;
      
      // Estimate new normal via finite difference for lighting
      vWorldNormal = normalize((modelMatrix * instanceMatrix * vec4(normal, 0.0)).xyz);
      
      // Pass to fragment
      vTerrainType = aTerrainParams.x;
      vElevation = instanceWorldPos.y;
      
      vec4 mvPosition = viewMatrix * instanceWorldPos;
      `
    ).replace(
      'gl_Position = projectionMatrix * mvPosition;',
      'gl_Position = projectionMatrix * mvPosition;'
    );

    const terrainFragmentUtils = `
      #include <packing>
      
      varying float vTerrainType;
      varying vec3 vWorldPosition;
      varying vec3 vWorldNormal;
      varying float vElevation;
      
      float random(in vec2 st) {
          return fract(sin(dot(st.xy, vec2(12.9898,78.233))) * 43758.5453123);
      }

      float noise(in vec2 st) {
          vec2 i = floor(st);
          vec2 f = fract(st);
          float a = random(i);
          float b = random(i + vec2(1.0, 0.0));
          float c = random(i + vec2(0.0, 1.0));
          float d = random(i + vec2(1.0, 1.0));
          vec2 u = f*f*(3.0-2.0*f);
          return mix(a, b, u.x) + (c - a)* u.y * (1.0 - u.x) + (d - b) * u.x * u.y;
      }

      vec3 getPhotorealisticColor(vec3 pos, vec3 normal, out float rockness, out float wetness) {
          float h = pos.y;
          float steepness = 1.0 - normal.y; // 0=flat, 1=vertical
          
          rockness = 0.0;
          wetness = 0.0;
          
          // Pure Colors (Cinematic Palette)
          vec3 wetSand = vec3(0.65, 0.60, 0.50);
          vec3 drySand = vec3(0.95, 0.93, 0.88);
          vec3 sparseJungle = vec3(0.35, 0.55, 0.20);
          vec3 denseJungle = vec3(0.15, 0.35, 0.10);
          vec3 cliffRock = vec3(0.40, 0.41, 0.42);
          
          vec3 baseColor = drySand;
          
          // Height Blending System
          if (h < -1.0) {
              baseColor = wetSand;
              wetness = 1.0;
          } else if (h < 2.0) {
              float w = smoothstep(-1.0, 2.0, h);
              baseColor = mix(wetSand, drySand, w);
              wetness = 1.0 - w;
          } else if (h < 8.0) {
              float mixGrass = smoothstep(2.0, 8.0, h);
              baseColor = mix(drySand, sparseJungle, mixGrass);
          } else {
              float mixJungle = smoothstep(8.0, 40.0, h);
              baseColor = mix(sparseJungle, denseJungle, mixJungle);
          }
          
          // Slope Blending (Cliffs override everything)
          float rockBlend = smoothstep(0.45, 0.7, steepness);
          rockness = rockBlend;
          
          // Tri-planar noise overlay for macro-detailing
          float nX = noise(pos.yz * 0.1);
          float nY = noise(pos.xz * 0.1);
          float nZ = noise(pos.xy * 0.1);
          vec3 blendWeight = abs(normal);
          blendWeight /= dot(blendWeight, vec3(1.0));
          float triNoise = nX * blendWeight.x + nY * blendWeight.y + nZ * blendWeight.z;
          
          baseColor = mix(baseColor, cliffRock, rockBlend);
          return baseColor * (0.8 + triNoise * 0.4); 
      }
    `;

    shader.fragmentShader = terrainFragmentUtils + shader.fragmentShader.replace(
      '#include <map_fragment>',
      `
      #include <map_fragment>
      float rockness;
      float wetness;
      diffuseColor.rgb = getPhotorealisticColor(vWorldPosition, vWorldNormal, rockness, wetness);
      
      // Wet sand = low roughness, Rock = high roughness, Jungle = med roughness
      float dynamicRoughness = mix(0.9, 0.1, wetness);
      roughnessFactor = mix(dynamicRoughness, 1.0, rockness);
      `
    );
  }

  if (count === 0) return null

  return (
    <instancedMesh ref={meshRef} args={[null, null, count]} receiveShadow castShadow>
      {/* High density sphere for rich vertex displacement. ~32k tris per mesh = 256k total */}
      <sphereGeometry args={[50, 256, 128]}>
        <instancedBufferAttribute attach="attributes-aTerrainParams" args={[terrainParams, 4]} />
      </sphereGeometry>
      <meshStandardMaterial 
        color="#ffffff" 
        roughness={1.0}
        metalness={0.05}
        onBeforeCompile={onBeforeCompile}
      />
    </instancedMesh>
  )
}
