import { useRef, useMemo } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'
import { useGameStore, GPU_TIERS } from '../../../store/useGameStore'

/*
──────────────────────────────────────────────
  WaterShader — Cinematic Ocean
  
  Target: Image 2 — deep navy-blue rolling waves
  with white foam crests, layered wave colors
  
  Target: Image 4 — turquoise-to-cyan shore gradient
  with white foam wash
──────────────────────────────────────────────
*/

const vertexShader = `
uniform float uTime;

uniform vec4 uWaveA;
uniform vec4 uWaveB;
uniform vec4 uWaveC;
uniform vec4 uWaveD;
uniform vec2 uWindDir;

varying vec3 vWorldPosition;
varying vec3 vViewPosition;
varying vec3 vNormal;
varying float vWaveElevation;
varying float vFoamMask;

vec3 gerstnerWave(vec4 wave, vec3 p, inout vec3 tangent, inout vec3 binormal) {
  float steepness  = wave.z;
  float wavelength = wave.w;
  float k = 6.28318 / wavelength;
  float c = sqrt(9.8 / k);
  vec2  d = normalize(wave.xy);
  float f = k * (dot(d, p.xz) - c * uTime);
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

  vec3 tangent  = vec3(1.0, 0.0, 0.0);
  vec3 binormal = vec3(0.0, 0.0, 1.0);

  vec3 displaced = p;
  displaced += gerstnerWave(uWaveA, p, tangent, binormal);
  displaced += gerstnerWave(uWaveB, p, tangent, binormal);
  displaced += gerstnerWave(uWaveC, p, tangent, binormal);
  displaced += gerstnerWave(uWaveD, p, tangent, binormal);

  vWaveElevation = displaced.y - p.y;

  vec4 viewPosition = viewMatrix * vec4(displaced, 1.0);

  vWorldPosition = displaced;
  vViewPosition  = -viewPosition.xyz;
  vNormal        = normalize(cross(binormal, tangent));
  vFoamMask      = max(0.0, vWaveElevation / 2.0);

  gl_Position = projectionMatrix * viewPosition;
}
`

const fragmentShader = (isLowTier, isMidTier, isHighTier) => `
uniform float uTime;
uniform vec4  uWaveA, uWaveB, uWaveC, uWaveD;
uniform vec2  uWindDir;
uniform vec3  uSunDirection;
uniform vec3  uIslandPositions[16];
uniform float uIslandScales[16];

varying vec3  vWorldPosition;
varying vec3  vNormal;
varying vec3  vViewPosition;
varying float vWaveElevation;

float noise(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  f = f * f * (3.0 - 2.0 * f);
  float a = fract(sin(dot(i, vec2(12.9898, 78.233))) * 43758.5453);
  float b = fract(sin(dot(i + vec2(1, 0), vec2(12.9898, 78.233))) * 43758.5453);
  float c = fract(sin(dot(i + vec2(0, 1), vec2(12.9898, 78.233))) * 43758.5453);
  float d = fract(sin(dot(i + vec2(1, 1), vec2(12.9898, 78.233))) * 43758.5453);
  return mix(a, b, f.x) + (c - a) * f.y * (1.0 - f.x) + (d - b) * f.x * f.y;
}

float fbm(vec2 p) {
  float v = 0.0, a = 0.5;
  int oct = 4;
  ${isLowTier ? 'oct = 1;' : (isMidTier ? 'oct = 2;' : '')}
  for (int i = 0; i < 4; i++) {
    if (i >= oct) break;
    v += a * noise(p);
    p = p * 2.1;
    a *= 0.5;
  }
  return v;
}

float shoreProximity() {
  float sp = 0.0;
  int checks = 16;
  ${isLowTier ? 'checks = 4;' : (isMidTier ? 'checks = 8;' : '')}
  for (int i = 0; i < 16; i++) {
    if (i >= checks) break;
    float d = length(vWorldPosition.xz - uIslandPositions[i].xz);
    float s = uIslandScales[i];
    sp = max(sp, 1.0 - smoothstep(35.0 * s, 85.0 * s, d));
  }
  return sp;
}

void main() {
  vec3  viewDir = normalize(vViewPosition);
  vec3  lightDir = normalize(uSunDirection);
  float sp = shoreProximity();
  
  // Tropical Palette
  vec3 deepBlue  = vec3(0.005, 0.08, 0.22);
  vec3 oceanBlue = vec3(0.01, 0.35, 0.65);
  vec3 teal      = vec3(0.05, 0.72, 0.78);
  vec3 cyan      = vec3(0.12, 0.88, 0.92);

  float lagoonMask = smoothstep(0.4, 0.85, sp);
  vec3 waterColor = mix(deepBlue, oceanBlue, smoothstep(0.0, 0.3, sp));
  waterColor = mix(waterColor, teal, lagoonMask);
  waterColor = mix(waterColor, cyan, smoothstep(0.85, 0.98, sp));

  // Ripples
  float r1 = noise(vWorldPosition.xz * 0.15 + uTime * 0.2);
  float r2 = noise(vWorldPosition.xz * 0.25 - uTime * 0.15);
  vec3 normal = normalize(vNormal + vec3(r1 - 0.5, 0.0, r2 - 0.5) * 0.1);

  // Lighting
  float ndotv = max(dot(viewDir, vec3(0,1,0)), 0.0);
  float fresnel = pow(1.0 - ndotv, 4.0);
  
  // Specular Sun
  vec3 halfV = normalize(lightDir + viewDir);
  float spec = pow(max(dot(normal, halfV), 0.0), 128.0) * 1.5;
  
  // Final composite
  vec3 finalColor = waterColor + fresnel * 0.3 + spec * vec3(1.0, 0.95, 0.8);
  
  gl_FragColor = vec4(finalColor, mix(0.92, 0.7, lagoonMask));
}
`

export function WaterShader({ islandPositions, islandScales, sunDirection }) {
  const meshRef = useRef()
  const gpuTier = useGameStore(state => state.gpuTier)
  const isHighTier = gpuTier === GPU_TIERS.HIGH
  const isMidTier  = gpuTier === GPU_TIERS.MEDIUM
  const isLowTier  = !isHighTier && !isMidTier

  const uniforms = useMemo(() => ({
    uTime:            { value: 0 },
    uWaveA:           { value: new THREE.Vector4() },
    uWaveB:           { value: new THREE.Vector4() },
    uWaveC:           { value: new THREE.Vector4() },
    uWaveD:           { value: new THREE.Vector4() },
    uWindDir:         { value: new THREE.Vector2(1.0, 0.5).normalize() },
    uSunDirection:    { value: sunDirection || new THREE.Vector3(0.5, 1.0, 0.2).normalize() },
    uIslandPositions: { value: islandPositions || new Float32Array(16 * 3) },
    uIslandScales:    { value: islandScales    || new Float32Array(16) }
  }), [islandPositions, islandScales, sunDirection])

  const fragShader = useMemo(() => fragmentShader(isLowTier, isMidTier, isHighTier), [isLowTier, isMidTier, isHighTier])

  useFrame((state) => {
    if (!meshRef.current) return

    const time = state.clock.getElapsedTime()
    const mat  = meshRef.current.material

    mat.uniforms.uTime.value = time

    if (sunDirection) {
      mat.uniforms.uSunDirection.value.copy(sunDirection)
    }

    const steep = 0.12
    mat.uniforms.uWaveA.value.set( 0.5,  0.8,  steep,        150.0)
    mat.uniforms.uWaveB.value.set( 0.4,  0.9,  steep * 0.7,   80.0)
    mat.uniforms.uWaveC.value.set(-0.6,  0.4,  steep * 0.4,   45.0)
    mat.uniforms.uWaveD.value.set( 0.2, -0.5,  steep * 0.2,   25.0)
  })

  return (
    <mesh ref={meshRef} rotation-x={-Math.PI / 2} receiveShadow>
      <planeGeometry args={[10000, 10000, 256, 256]} />
      <shaderMaterial
        vertexShader={vertexShader}
        fragmentShader={fragShader}
        uniforms={uniforms}
        transparent
        depthWrite={false}
        side={THREE.DoubleSide}
      />
    </mesh>
  )
}
