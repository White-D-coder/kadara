import { useRef, useMemo } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'

const vertexShader = `
uniform float uTime;
varying vec3 vWorldPos;
varying float vElev;

vec3 getGerstner(vec4 wave, vec3 p) {
  float k = 6.28318 / wave.w;
  float f = k * (dot(normalize(wave.xy), p.xz) - sqrt(9.8 / k) * uTime);
  float a = wave.z / k;
  vec2 d = normalize(wave.xy);
  return vec3(d.x * (a * cos(f)), a * sin(f), d.y * (a * cos(f)));
}

void main() {
  vec3 p = (modelMatrix * vec4(position, 1.0)).xyz;
  vec3 displaced = p;
  displaced += getGerstner(vec4(0.4, 0.7, 0.15, 140.0), p);
  displaced += getGerstner(vec4(-0.7, 0.2, 0.1, 70.0), p);
  
  vWorldPos = displaced;
  vElev = displaced.y - p.y;
  gl_Position = projectionMatrix * viewMatrix * vec4(displaced, 1.0);
}
`

const fragmentShader = `
uniform float uTime;
varying vec3 vWorldPos;
varying float vElev;

void main() {
  vec3 baseCol = mix(vec3(0.01, 0.1, 0.25), vec3(0.1, 0.6, 0.7), smoothstep(-1.5, 3.0, vElev));
  vec3 foam = vec3(0.95, 1.0, 1.0) * smoothstep(1.8, 3.8, vElev);
  gl_FragColor = vec4(mix(baseCol, foam, 0.3 * smoothstep(1.5, 3.5, vElev)), 0.8);
}
`

export function WaterShader() {
  const meshRef = useRef()
  const uniforms = useMemo(() => ({ uTime: { value: 0 } }), [])

  useFrame((state) => {
    if (meshRef.current) meshRef.current.material.uniforms.uTime.value = state.clock.elapsedTime
  })

  return (
    <mesh ref={meshRef} rotation-x={-Math.PI / 2}>
      <planeGeometry args={[10000, 10000, 128, 128]} />
      <shaderMaterial vertexShader={vertexShader} fragmentShader={fragmentShader} uniforms={uniforms} transparent />
    </mesh>
  )
}
