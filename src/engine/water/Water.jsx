import React, { useMemo, useRef } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'
import { waterVertexShader, waterFragmentShader } from '../../shaders/water'

const Water = () => {
  const meshRef = useRef()
  const { camera } = useThree()
  
  const geometry = useMemo(() => new THREE.PlaneGeometry(2000, 2000, 1, 1).rotateX(-Math.PI / 2), [])
  
  const uniforms = useMemo(() => ({
    uTime: { value: 0 },
    uCameraPosition: { value: new THREE.Vector3() }
  }), [])

  useFrame((state) => {
    if (meshRef.current) {
      meshRef.current.material.uniforms.uTime.value = state.clock.getElapsedTime()
      meshRef.current.material.uniforms.uCameraPosition.value.copy(camera.position)
    }
  })

  return (
    <mesh ref={meshRef} geometry={geometry} position={[0, -0.5, 0]}>
      <shaderMaterial
        vertexShader={waterVertexShader}
        fragmentShader={waterFragmentShader}
        uniforms={uniforms}
        transparent
      />
    </mesh>
  )
}

export default Water
