/**
 * Vegetation.jsx — Fully custom procedural tree system.
 * No GLB / external assets — everything built from Three.js primitives.
 * Three species:  Oak (round crown), Pine (cone), Cherry (pink sphere).
 * Uses instanced meshes for trunk + crown separately for performance.
 */
import React, { useMemo } from 'react'
import * as THREE from 'three'
import useGameStore from '../../store/useGameStore'
import { generateArchipelago } from '../terrain/IslandGenerator'
import { getTerrainHeight, getTerrainNormal } from '../terrain/terrainUtils'

// ─── Seeded noise helpers ─────────────────────────────────────────────────────
const srand = (s) => {
  const n = Math.sin(s * 9301.0 + 49297.0) * 233280.0
  return n - Math.floor(n)
}

const pseudoCluster = (x, z) => {
  const n = Math.sin(x * 12.9898 + z * 78.233) * 43758.5453
  return n - Math.floor(n)
}

// ─── Materials (defined once) ─────────────────────────────────────────────────
const TRUNK_MAT   = new THREE.MeshStandardMaterial({ color: '#5c3d1e', roughness: 0.9 })
const OAK_MAT     = new THREE.MeshStandardMaterial({ color: '#2d6a2d', roughness: 0.85 })
const PINE_MAT    = new THREE.MeshStandardMaterial({ color: '#1a4a1a', roughness: 0.85 })
const CHERRY_MAT  = new THREE.MeshStandardMaterial({ color: '#e8a0c0', roughness: 0.8 })

// ─── Geometries (defined once) ────────────────────────────────────────────────
const TRUNK_GEO   = new THREE.CylinderGeometry(0.18, 0.28, 1.6, 7)
const OAK_GEO     = new THREE.SphereGeometry(1.6, 8, 6)
const PINE_GEO    = new THREE.ConeGeometry(1.4, 3.5, 7)
const CHERRY_GEO  = new THREE.SphereGeometry(1.3, 8, 6)

// ─── Tree placement data builder ─────────────────────────────────────────────
function buildTreeData(islands) {
  const oaks    = []
  const pines   = []
  const cherries = []

  for (const island of islands) {
    const isMain = island.type === 'main'
    const count  = isMain ? 4000 : 60

    for (let i = 0; i < count; i++) {
      const angle     = srand(island.seed + i * 0.371) * Math.PI * 2
      const distRatio = Math.sqrt(srand(i * 0.613 + island.seed * 3.7))
      const dist      = distRatio * (island.radius - 12)
      const wx        = island.position.x + Math.cos(angle) * dist
      const wz        = island.position.z + Math.sin(angle) * dist

      const h = getTerrainHeight(wx, wz, 0, isMain)
      if (h < 5.5 || h > 56.0) continue

      const normal = getTerrainNormal(wx, wz, 0, isMain)
      if (1.0 - normal.y > 0.42) continue

      const cluster = pseudoCluster(wx * 0.07, wz * 0.07)
      if (cluster < 0.22) continue

      const elevFactor = 1.0 - Math.min(h / 58.0, 0.45)
      const scale      = (0.6 + srand(wx + wz) * 0.9) * elevFactor
      const rotY       = srand(i + wx) * Math.PI * 2

      const entry = { wx, wy: h, wz, scale, rotY }
      const species = srand(i * 1.37 + island.seed)

      if (h < 20.0) {
        cherries.push(entry)
      } else if (species < 0.55) {
        oaks.push(entry)
      } else {
        pines.push(entry)
      }
    }
  }
  return { oaks, pines, cherries }
}

// ─── Single-species instanced renderer ───────────────────────────────────────
const TreeInstances = ({ entries, trunkGeo, crownGeo, crownMat, crownOffsetY }) => {
  const count = Math.min(entries.length, 2000)

  const { trunkMatrices, crownMatrices } = useMemo(() => {
    const tm = [], cm = []
    const mat = new THREE.Matrix4()
    const pos = new THREE.Vector3()
    const quat = new THREE.Quaternion()
    const scl  = new THREE.Vector3()

    for (let i = 0; i < count; i++) {
      const { wx, wy, wz, scale, rotY } = entries[i]
      quat.setFromEuler(new THREE.Euler(0, rotY, 0))

      // Trunk
      pos.set(wx, wy + 0.8 * scale, wz)
      scl.set(scale, scale * 1.2, scale)
      mat.compose(pos, quat, scl)
      tm.push(mat.clone())

      // Crown
      pos.set(wx, wy + (1.6 + crownOffsetY) * scale, wz)
      scl.set(scale, scale, scale)
      mat.compose(pos, quat, scl)
      cm.push(mat.clone())
    }
    return { trunkMatrices: tm, crownMatrices: cm }
  }, [entries, count, crownOffsetY])

  return (
    <>
      <instancedMesh args={[trunkGeo, TRUNK_MAT, count]} castShadow receiveShadow
        ref={(ref) => { if (ref) trunkMatrices.forEach((m, i) => ref.setMatrixAt(i, m)) && (ref.instanceMatrix.needsUpdate = true) }}
      />
      <instancedMesh args={[crownGeo, crownMat, count]} castShadow receiveShadow
        ref={(ref) => { if (ref) crownMatrices.forEach((m, i) => ref.setMatrixAt(i, m)) && (ref.instanceMatrix.needsUpdate = true) }}
      />
    </>
  )
}

// ─── Main exported component ──────────────────────────────────────────────────
const Vegetation = () => {
  const seed    = useGameStore((state) => state.seed)
  const islands = useMemo(() => generateArchipelago(seed), [seed])
  const { oaks, pines, cherries } = useMemo(() => buildTreeData(islands), [islands])

  return (
    <group>
      <TreeInstances
        entries={oaks}
        trunkGeo={TRUNK_GEO}
        crownGeo={OAK_GEO}
        crownMat={OAK_MAT}
        crownOffsetY={1.0}
      />
      <TreeInstances
        entries={pines}
        trunkGeo={TRUNK_GEO}
        crownGeo={PINE_GEO}
        crownMat={PINE_MAT}
        crownOffsetY={1.6}
      />
      <TreeInstances
        entries={cherries}
        trunkGeo={TRUNK_GEO}
        crownGeo={CHERRY_GEO}
        crownMat={CHERRY_MAT}
        crownOffsetY={0.9}
      />
    </group>
  )
}

export default Vegetation
