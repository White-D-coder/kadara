import React, { useMemo, useRef, useEffect } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { generateArchipelago } from './IslandGenerator'
import { terrainVertexShader, terrainFragmentShader } from '../../shaders/terrain'
import useGameStore from '../../store/useGameStore'

// ─── Island type → float encoding for the shader ─────────────────────────────
const TYPE_MAP = { main: 0.0, rocky: 1.0 }

const Terrain = () => {
  const seed    = useGameStore((state) => state.seed)
  const islands = useMemo(() => generateArchipelago(seed), [seed])

  const meshRef = useRef()

  // ─── Shared tile geometry ────────────────────────────────────────────────
  // 384 subdivisions for high-detail mountain peaks
  const geometry = useMemo(
    () => new THREE.PlaneGeometry(1, 1, 384, 384).rotateX(-Math.PI / 2),
    []
  )

  // ─── Per-instance attributes ──────────────────────────────────────────────
  useEffect(() => {
    if (!meshRef.current) return

    const matrix    = new THREE.Matrix4()
    const pos       = new THREE.Vector3()
    const rot       = new THREE.Euler()
    const scl       = new THREE.Vector3()
    const quat      = new THREE.Quaternion()

    const seeds     = new Float32Array(islands.length)
    const types     = new Float32Array(islands.length)
    const radii     = new Float32Array(islands.length)
    const peakH     = new Float32Array(islands.length)

    islands.forEach((island, i) => {
      const diameter = island.radius * 2.0
      pos.set(island.position.x, island.position.y, island.position.z)
      scl.set(diameter, diameter, diameter)
      quat.setFromEuler(rot)
      matrix.compose(pos, quat, scl)
      meshRef.current.setMatrixAt(i, matrix)

      seeds[i] = (island.seed || 0)
      types[i] = TYPE_MAP[island.type] ?? 1.0
      radii[i] = island.radius
      peakH[i] = island.peakHeight ?? 80.0
    })

    meshRef.current.instanceMatrix.needsUpdate = true

    const geo = meshRef.current.geometry
    geo.setAttribute('aIslandSeed', new THREE.InstancedBufferAttribute(seeds, 1))
    geo.setAttribute('aIslandType', new THREE.InstancedBufferAttribute(types, 1))
    geo.setAttribute('aIslandRadius', new THREE.InstancedBufferAttribute(radii, 1))
    geo.setAttribute('aPeakHeight',  new THREE.InstancedBufferAttribute(peakH, 1))

  }, [islands])

  // ─── Shared uniforms ──────────────────────────────────────────────────────
  const uniforms = useMemo(() => ({
    uTime: { value: 0 },
  }), [])

  // ─── Per-frame updates ────────────────────────────────────────────────────
  useFrame((state) => {
    if (!meshRef.current) return
    meshRef.current.material.uniforms.uTime.value = state.clock.getElapsedTime()
  })

  // ─── Render ───────────────────────────────────────────────────────────────
  return (
    <instancedMesh
      ref={meshRef}
      args={[geometry, null, islands.length]}
      receiveShadow
      castShadow
      frustumCulled={false}
    >
      <shaderMaterial
        vertexShader={terrainVertexShader}
        fragmentShader={terrainFragmentShader}
        uniforms={uniforms}
        side={THREE.FrontSide}
        wireframe={false}
      />
    </instancedMesh>
  )
}

export default Terrain