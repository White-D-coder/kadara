import { useRef, useEffect, useMemo } from 'react'
import * as THREE from 'three'
import { useGameStore } from '../../../store/useGameStore'

// Deterministic PRNG
function mulberry32(a) {
  return function() {
    let _seedState = a += 0x6D2B79F5;
    _seedState = Math.imul(_seedState ^ _seedState >>> 15, _seedState | 1);
    _seedState ^= _seedState + Math.imul(_seedState ^ _seedState >>> 7, _seedState | 61);
    return ((_seedState ^ _seedState >>> 14) >>> 0) / 4294967296;
  }
}

// Tree Geometries
const palmTrunk = new THREE.CylinderGeometry(0.15, 0.3, 10, 5); palmTrunk.translate(0, 5, 0)
const palmLeaves = new THREE.ConeGeometry(4, 5, 5); palmLeaves.translate(0, 12, 0)

const pineTrunk = new THREE.CylinderGeometry(0.2, 0.4, 15, 6); pineTrunk.translate(0, 7.5, 0)
const pineLeaves = new THREE.ConeGeometry(3.5, 12, 6); pineLeaves.translate(0, 16, 0)

const jungleTrunk = new THREE.CylinderGeometry(0.6, 1.2, 20, 8); jungleTrunk.translate(0, 10, 0)
const jungleLeaves = new THREE.OctahedronGeometry(12, 1); jungleLeaves.translate(0, 25, 0)

export function VegetationSystem({ islands }) {
  const meshRefs = useRef({
    tropical: [useRef(), useRef()],
    alpine: [useRef(), useRef()],
    jungle: [useRef(), useRef()]
  })
  const seed = useGameStore(state => state.seed)
  const gpuTier = useGameStore(state => state.gpuTier)
  
  const isHighTier = gpuTier === 'Tier 3 (High)'
  const isMidTier = gpuTier === 'Tier 2 (Mid)'
  const isLowTier = !isHighTier && !isMidTier
  const maxInstances = isHighTier ? 10000 : (isMidTier ? 5000 : 2000)

  const treeGroups = useMemo(() => {
    if (!islands) return []
    const random = mulberry32(Math.floor(seed * 10000))
    const groups = { 0: [], 1: [], 2: [] } // Tropical, Alpine, Jungle
    const dummy = new THREE.Object3D()


    islands.forEach((is) => {
      const treeCount = is.isMain ? (isHighTier ? 1500 : 800) : Math.floor(is.scale[0] * (isHighTier ? 50 : 25)) 
      const islandRadius = is.isMain ? 50 : 40

      for (let i = 0; i < treeCount; i++) {
        const r = Math.sqrt(random()) * islandRadius
        const theta = random() * Math.PI * 2
        const lx = Math.cos(theta) * r
        const lz = Math.sin(theta) * r

        // Placement checks (avoid cliffs and lagoon)
        const dist = r / 45.0
        const profile = Math.pow(1.0 - dist, 1.6)
        const h = profile * 40.0 // Approximate height for slope check
        
        // Pseudo-slope check: if it's too far from center it's likely a cliff
        if (dist > 0.85 && !is.isMain) continue

        const worldX = is.position[0] + lx * is.scale[0]
        const worldZ = is.position[2] + lz * is.scale[2]
        const worldY = is.position[1] + (h * is.scale[1])

        if (worldY < 4.0 || worldY > 75.0) continue

        dummy.position.set(worldX, worldY, worldZ)
        const s = (0.5 + random() * 1.5) * (is.isMain ? 1.0 : 0.8)
        dummy.scale.set(s, s, s)
        dummy.rotation.set(0, random() * Math.PI * 2, 0)
        dummy.updateMatrix()
        if (groups[is.floraType].length < maxInstances) {
          groups[is.floraType].push(dummy.matrix.clone())
        }
      }
    })

    return groups
  }, [islands, seed])

  useEffect(() => {
    const refs = meshRefs.current
    Object.keys(treeGroups).forEach((type) => {
      const matrices = treeGroups[type]
      const g = type === '0' ? refs.tropical : (type === '1' ? refs.alpine : refs.jungle)
      if (g[0].current && g[1].current) {
        matrices.forEach((mat, i) => {
          g[0].current.setMatrixAt(i, mat)
          g[1].current.setMatrixAt(i, mat)
        })
        g[0].current.instanceMatrix.needsUpdate = true
        g[1].current.instanceMatrix.needsUpdate = true
      }
    })
  }, [treeGroups])

    const Material = isLowTier ? 'meshLambertMaterial' : 'meshStandardMaterial'

    return (
      <group name="vegetation-optimized">
        {/* Tropical Palms */}
        <instancedMesh ref={meshRefs.current.tropical[0]} args={[palmTrunk, null, maxInstances]} castShadow={!isLowTier}>
          <Material color="#3d2a1d" {...(isLowTier ? {} : { roughness: 0.9 })} />
        </instancedMesh>
        <instancedMesh ref={meshRefs.current.tropical[1]} args={[palmLeaves, null, maxInstances]} castShadow={!isLowTier}>
          <Material color="#2d5a27" {...(isLowTier ? {} : { roughness: 0.6, emissive: "#051a05", emissiveIntensity: 0.2 })} />
        </instancedMesh>
  
        {/* Alpine Pines */}
        <instancedMesh ref={meshRefs.current.alpine[0]} args={[pineTrunk, null, maxInstances]} castShadow={!isLowTier}>
          <Material color="#2a1a10" {...(isLowTier ? {} : { roughness: 1.0 })} />
        </instancedMesh>
        <instancedMesh ref={meshRefs.current.alpine[1]} args={[pineLeaves, null, maxInstances]} castShadow={!isLowTier}>
          <Material color="#1a2d1a" {...(isLowTier ? {} : { roughness: 0.8 })} />
        </instancedMesh>
  
        {/* Jungle Giants */}
        <instancedMesh ref={meshRefs.current.jungle[0]} args={[jungleTrunk, null, maxInstances]} castShadow={!isLowTier}>
          <Material color="#4a3a2a" {...(isLowTier ? {} : { roughness: 0.9 })} />
        </instancedMesh>
        <instancedMesh ref={meshRefs.current.jungle[1]} args={[jungleLeaves, null, maxInstances]} castShadow={!isLowTier}>
          <Material color="#0a3a0a" {...(isLowTier ? {} : { roughness: 0.5, opacity: 0.9, transparent: true })} />
        </instancedMesh>
      </group>
    )
  }
