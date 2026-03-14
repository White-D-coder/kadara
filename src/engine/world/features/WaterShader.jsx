import { useRef, useMemo } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'

const vertexShader = `
  uniform float uTime;
  varying vec3 vWorldPosition;
  varying vec3 vViewPosition;
  varying float vWaveElevation;
  varying vec3 vNormal;
  varying float vFoamMask;
  
  uniform vec4 uWaveA;
  uniform vec4 uWaveB;
  uniform vec4 uWaveC;
  uniform vec4 uWaveD;

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
    
    vec3 finalPos = pAc;
    vWaveElevation = finalPos.y - p.y;
    
    vec4 viewPosition = viewMatrix * vec4(finalPos, 1.0);
    vViewPosition = -viewPosition.xyz;
    vWorldPosition = finalPos;
    
    vNormal = normalize(cross(binormalAc, tangentAc));
    vFoamMask = max(0.0, vWaveElevation / 2.0);
    
    gl_Position = projectionMatrix * viewPosition;
  }
`

const fragmentShader = `
  uniform float uTime;
  uniform vec3 uSunDirection;
  uniform vec3 uIslandPositions[13];
  uniform float uIslandScales[13];
  
  varying vec3 vWorldPosition;
  varying vec3 vViewPosition;
  varying float vWaveElevation;
  varying vec3 vNormal;
  varying float vFoamMask;

  void main() {
    float shoreProximity = 0.0;
    
    // Multi-island shoreline loop with exponential falloff
    for (int i = 0; i < 13; i++) {
        vec3 islandPos = uIslandPositions[i];
        float islandScale = uIslandScales[i];
        float d = length(vWorldPosition.xz - islandPos.xz);
        float p = exp(-pow(d / (48.0 * islandScale), 4.0));
        shoreProximity = max(shoreProximity, p);
    }
    
    vec3 shallowColor = vec3(0.05, 0.85, 0.95);
    vec3 midColor     = vec3(0.02, 0.12, 0.35);
    vec3 deepColor    = vec3(0.002, 0.005, 0.015);
    
    vec3 waterColor;
    float alpha;
    
    if (shoreProximity > 0.3) {
      float t = smoothstep(0.3, 0.85, shoreProximity);
      waterColor = mix(midColor, shallowColor, t);
      alpha = mix(0.96, 0.55, t);
    } else {
      float t = shoreProximity / 0.3;
      waterColor = mix(deepColor, midColor, t);
      alpha = mix(0.99, 0.96, t);
    }
    
    vec3 lightDir = normalize(uSunDirection);
    vec3 viewDir = normalize(vViewPosition);
    vec3 halfDir = normalize(lightDir + viewDir);
    float spec = pow(max(0.0, dot(vNormal, halfDir)), 128.0) * 2.0;
    
    float foam = smoothstep(0.4, 0.75, vFoamMask) * shoreProximity * 0.6;
    waterColor = mix(waterColor, vec3(0.95), foam);
    
    float fresnel = pow(1.0 - max(dot(viewDir, vNormal), 0.0), 5.0);
    vec3 skyReflect = vec3(0.65, 0.85, 1.0);
    waterColor = mix(waterColor, skyReflect, fresnel * 0.4);
    
    gl_FragColor = vec4(waterColor + spec, alpha);
    #include <tonemapping_fragment>
    #include <colorspace_fragment>
  }
`

export function WaterShader({ islandPositions, islandScales }) {
  const meshRef = useRef()

  const uniforms = useMemo(() => ({
    uTime: { value: 0 },
    uWaveA: { value: new THREE.Vector4() },
    uWaveB: { value: new THREE.Vector4() },
    uWaveC: { value: new THREE.Vector4() },
    uWaveD: { value: new THREE.Vector4() },
    uSunDirection: { value: new THREE.Vector3(0.5, 1.0, 0.2).normalize() },
    uIslandPositions: { value: islandPositions || new Float32Array(13 * 3) },
    uIslandScales: { value: islandScales || new Float32Array(13) }
  }), [islandPositions, islandScales])

  useFrame((state) => {
    if (meshRef.current && meshRef.current.material) {
      const time = state.clock.getElapsedTime()
      meshRef.current.material.uniforms.uTime.value = time
      
      const steepnessBase = 0.12
      meshRef.current.material.uniforms.uWaveA.value.set(0.5, 0.8, steepnessBase, 150.0)
      meshRef.current.material.uniforms.uWaveB.value.set(0.4, 0.9, steepnessBase * 0.7, 80.0)
      meshRef.current.material.uniforms.uWaveC.value.set(-0.6, 0.4, steepnessBase * 0.4, 45.0)
      meshRef.current.material.uniforms.uWaveD.value.set(0.2, -0.5, steepnessBase * 0.2, 25.0)
    }
  })

  return (
    <mesh ref={meshRef} rotation-x={-Math.PI / 2} position={[0, 0, 0]} receiveShadow>
      <planeGeometry args={[10000, 10000, 256, 256]} />
      <shaderMaterial
        vertexShader={vertexShader}
        fragmentShader={fragmentShader}
        uniforms={uniforms}
        transparent={true}
        depthWrite={false}
        side={THREE.DoubleSide}
      />
    </mesh>
  )
}
