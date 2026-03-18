import React, { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'

const riverVertexShader = `
  varying vec2 vUv;
  varying vec3 vWorldPosition;
  uniform float uTime;

  void main() {
    vUv = uv;
    // UV scrolls in flow direction
    vUv.x += uTime * 0.4;
    
    vec4 worldPosition = modelMatrix * vec4(position, 1.0);
    vWorldPosition = worldPosition.xyz;
    gl_Position = projectionMatrix * viewMatrix * worldPosition;
  }
`;

const riverFragmentShader = `
  varying vec2 vUv;
  uniform float uTime;

  float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453123); }
  float noise(vec2 p) {
    vec2 i = floor(p); vec2 f = fract(p);
    vec2 u = f*f*(3.0-2.0*f);
    return mix(mix(hash(i + vec2(0,0)), hash(i + vec2(1,0)), u.x),
               mix(hash(i + vec2(0,1)), hash(i + vec2(1,1)), u.x), u.y);
  }

  void main() {
    vec3 riverColor = vec3(0.23, 0.71, 0.75); // #3ab5c0
    vec3 foamColor = vec3(1.0);
    
    float foamMask = step(0.68, noise(vUv * 4.0 + uTime * 0.3));
    vec3 finalColor = mix(riverColor, foamColor, foamMask * 0.4);
    
    gl_FragColor = vec4(finalColor, 0.9);
  }
`;

const Rivers = () => {
  const meshRef = useRef()

  const curves = useMemo(() => {
    // River A: Mountain to SE split
    const curveA = new THREE.CatmullRomCurve3([
      new THREE.Vector3(0, 50, 0),
      new THREE.Vector3(100, 30, 100),
      new THREE.Vector3(200, 15, 300),
      new THREE.Vector3(350, 0, 450)
    ])

    // River B: Flow west
    const curveB = new THREE.CatmullRomCurve3([
      new THREE.Vector3(-50, 40, -50),
      new THREE.Vector3(-150, 20, -100),
      new THREE.Vector3(-300, 0, -200)
    ])

    return [curveA, curveB]
  }, [])

  const geometries = useMemo(() => {
    return curves.map(curve => new THREE.TubeGeometry(curve, 120, 1.5, 8, false))
  }, [curves])

  useFrame((state) => {
    if (meshRef.current) {
      meshRef.current.children.forEach(child => {
        child.material.uniforms.uTime.value = state.clock.getElapsedTime()
      })
    }
  })

  return (
    <group ref={meshRef}>
      {geometries.map((geo, i) => (
        <mesh key={i} geometry={geo}>
          <shaderMaterial
            transparent
            uniforms={{ uTime: { value: 0 } }}
            vertexShader={riverVertexShader}
            fragmentShader={riverFragmentShader}
          />
        </mesh>
      ))}
    </group>
  )
}

export default Rivers
