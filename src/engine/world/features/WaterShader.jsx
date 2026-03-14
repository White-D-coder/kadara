import { useRef, useMemo } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'

const vertexShader = `
  uniform float uTime;
  varying vec3 vWorldPosition;
  varying vec3 vViewPosition;
  varying float vWaveElevation;
  
  // Wave parameters: direction.x, direction.y, steepness, wavelength
  uniform vec4 uWaveA;
  uniform vec4 uWaveB;
  uniform vec4 uWaveC;
  uniform vec4 uWaveD;

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
    vec4 p = permute( permute( permute( i.z + vec4(0.0, i1.z, i2.z, 1.0 )) + i.y + vec4(0.0, i1.y, i2.y, 1.0 )) + i.x + vec4(0.0, i1.x, i2.x, 1.0 ));
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
    p0 *= norm.x; p1 *= norm.y; p2 *= norm.z; p3 *= norm.w;
    return 42.0 * dot( vec4(dot(p0,x0), dot(p1,x1), dot(p2,x2), dot(p3,x3)), vec4( 1.0, 1.0, 1.0, 1.0 ) );
  }

  vec3 gerstnerWave(vec4 wave, vec3 p, inout vec3 tangent, inout vec3 binormal) {
      float steepness = wave.z;
      float wavelength = wave.w;
      float k = 2.0 * 3.14159 / wavelength;
      float c = sqrt(9.8 / k);
      vec2 d = normalize(wave.xy);
      float f = k * (dot(d, p.xz) - c * uTime * 0.5);
      float a = steepness / k;
      
      tangent += vec3(
          -d.x * d.x * (steepness * sin(f)),
          d.x * (steepness * cos(f)),
          -d.x * d.y * (steepness * sin(f))
      );
      binormal += vec3(
          -d.x * d.y * (steepness * sin(f)),
          d.y * (steepness * cos(f)),
          -d.y * d.y * (steepness * sin(f))
      );
      return vec3(
          d.x * (a * cos(f)),
          a * sin(f),
          d.y * (a * cos(f))
      );
  }

  void main() {
    vec4 modelPosition = modelMatrix * vec4(position, 1.0);
    vec3 p = modelPosition.xyz;

    vec3 tangentAc = vec3(1.0, 0.0, 0.0);
    vec3 binormalAc = vec3(0.0, 0.0, 1.0);

    vec3 pAc = p;
    pAc += gerstnerWave(uWaveA, p, tangentAc, binormalAc);
    pAc += gerstnerWave(uWaveB, p, tangentAc, binormalAc);
    pAc += gerstnerWave(uWaveC, p, tangentAc, binormalAc);
    pAc += gerstnerWave(uWaveD, p, tangentAc, binormalAc);
    
    // Evaluate terrain optical depth identically to the fragment shader to mathematically calculate shore proximity
    float dist = length(p.xz);
    float baseSphereY = sqrt(max(0.0, 250000.0 - dist*dist)) - 500.0; 
    
    // simplified noise for vertex shader to save performance
    float noiseVal = snoise(p * 0.02) * 0.5 + 0.5; 
    float ridge = pow(1.0 - abs(snoise(p * 0.05)), 4.0);
    float groundY = baseSphereY + (noiseVal * 10.0 + ridge * 15.0);
    
    float shoreDepth = max(0.0, 0.0 - groundY); 
    
    // Shore Damping: Flatten waves physically as they hit the shallow coast
    float damping = smoothstep(0.0, 15.0, shoreDepth); 
    
    vec3 finalPos = p;
    finalPos.x = mix(p.x, pAc.x, damping);
    finalPos.z = mix(p.z, pAc.z, damping);
    finalPos.y = mix(p.y, pAc.y, damping);
    
    vWaveElevation = finalPos.y - p.y;
    
    vec4 viewPosition = viewMatrix * vec4(finalPos, 1.0);
    vViewPosition = -viewPosition.xyz;
    vWorldPosition = finalPos;
    
    gl_Position = projectionMatrix * viewPosition;
  }
`

const fragmentShader = `
  uniform float uTime;
  varying vec3 vWorldPosition;
  varying vec3 vViewPosition;
  varying float vWaveElevation;
  
  // Shared procedural terrain noise for matching depth mathematically
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
    vec4 p = permute( permute( permute( i.z + vec4(0.0, i1.z, i2.z, 1.0 )) + i.y + vec4(0.0, i1.y, i2.y, 1.0 )) + i.x + vec4(0.0, i1.x, i2.x, 1.0 ));
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
    p0 *= norm.x; p1 *= norm.y; p2 *= norm.z; p3 *= norm.w;
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

  // To simulate optical depth affordably, we mathematically approximate the island's terrain height below the fragment
  float getOpticalDepth(vec3 pos) {
      // The island was centered at 0,0,0 with scale up to ~300. We just evaluate fbm terrain at world pos
      // Notice this matches IslandTerrain but we don't know the exact base sphere geometry Y here.
      // We'll estimate the floor using distance from origin. (Assuming 1 large central island for optics)
      float dist = length(pos.xz);
      float baseSphereY = sqrt(max(0.0, 250000.0 - dist*dist)) - 500.0; // very rough estimate of ground beneath
      
      float noiseVal = fbm(pos * 0.02);
      float ridge = pow(1.0 - abs(snoise(pos * 0.05)), 4.0);
      float displacement = (noiseVal * 10.0 + ridge * 15.0);
      
      float groundY = baseSphereY + displacement;
      // Actual depth is the water surface (pos.y initially 0) minus ground height
      return max(0.0, pos.y - groundY);
  }

  void main() {
    float estimatedDepth = getOpticalDepth(vWorldPosition);
    
    // Depth Zoning logic
    vec3 shoreColor = vec3(0.5, 0.9, 0.85); // 0-2m transparent turquoise
    vec3 midColor = vec3(0.1, 0.6, 0.8);    // 2-10m light blue
    vec3 deepColor = vec3(0.0, 0.1, 0.3);   // 10m+ deep dark blue
    
    vec3 waterColor = deepColor;
    float alpha = 0.9;
    
    if (estimatedDepth < 2.0) {
        float mixVal = estimatedDepth / 2.0;
        waterColor = mix(shoreColor, midColor, mixVal);
        alpha = mix(0.1, 0.6, mixVal); // Shoreline transparency
    } else if (estimatedDepth < 10.0) {
        float mixVal = (estimatedDepth - 2.0) / 8.0;
        waterColor = mix(midColor, deepColor, mixVal);
        alpha = mix(0.6, 0.95, mixVal);
    } else {
        waterColor = deepColor;
        alpha = 0.95;
    }
    
    // Procedural foam on peaks
    float foamNoise = fbm(vWorldPosition * 2.0 + uTime * 0.5);
    float foam = smoothstep(0.8, 1.5, vWaveElevation + foamNoise);
    waterColor = mix(waterColor, vec3(1.0), foam);
    
    // Fresnel Reflection Approximation
    vec3 viewDir = normalize(vViewPosition);
    vec3 normal = vec3(0.0, 1.0, 0.0); // Rough default normal since gerstner normals require expensive derivation
    float fresnel = pow(1.0 - max(dot(viewDir, normal), 0.0), 3.0);
    // Reflect sky color based on fresnel
    vec3 skyReflect = vec3(0.6, 0.8, 1.0);
    waterColor = mix(waterColor, skyReflect, fresnel * 0.5);
    
    gl_FragColor = vec4(waterColor, alpha);
    
    #include <tonemapping_fragment>
    #include <colorspace_fragment>
  }
`

export function WaterShader() {
  const materialRef = useRef()

  const uniforms = useMemo(() => ({
    uTime: { value: 0 },
    // Driven dynamically by global wind logic below
    uWaveA: { value: new THREE.Vector4() },
    uWaveB: { value: new THREE.Vector4() },
    uWaveC: { value: new THREE.Vector4() },
    uWaveD: { value: new THREE.Vector4() }
  }), [])

  useFrame((state) => {
    if (materialRef.current) {
      const time = state.clock.getElapsedTime()
      materialRef.current.uniforms.uTime.value = time
      
      // Dynamic Wind & Season generation over time
      // Simulating a shift from calm -> storm -> calm based on slow sine waves
      const windForce = Math.sin(time * 0.01) * 0.5 + 0.5; // 0 to 1
      const windDirX = Math.cos(time * 0.005);
      const windDirZ = Math.sin(time * 0.005);
      
      // Scale wave intensity based on windForce
      const steepnessBase = 0.05 + windForce * 0.2;
      
      materialRef.current.uniforms.uWaveA.value.set(windDirX, windDirZ, steepnessBase, 120.0)
      materialRef.current.uniforms.uWaveB.value.set(windDirX * 0.6, windDirZ * 1.2, steepnessBase * 0.8, 60.0)
      materialRef.current.uniforms.uWaveC.value.set(windingMix(windDirX, 1.3), windingMix(windDirZ, 0.1), steepnessBase * 0.5, 40.0)
      materialRef.current.uniforms.uWaveD.value.set(-windDirX * 0.2, -windDirZ * 0.2, steepnessBase * 0.3, 20.0)
    }
  })

  // Helper for chaotic cross-winds
  const windingMix = (dir, chaos) => dir * Math.cos(chaos) - dir * Math.sin(chaos);

  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -2, 0]} receiveShadow>
      {/* Increased subdivisions to support finer shore-interaction physics masking */}
      <planeGeometry args={[8000, 8000, 512, 512]} />
      <shaderMaterial
        ref={materialRef}
        vertexShader={vertexShader}
        fragmentShader={fragmentShader}
        uniforms={uniforms}
        transparent={true}
        depthWrite={false}
      />
    </mesh>
  )
}
