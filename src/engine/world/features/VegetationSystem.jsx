import { useRef, useEffect, useMemo } from 'react'
import * as THREE from 'three'
import { useGameStore } from '../../../store/useGameStore'

// Deterministic PRNG
function mulberry32(a) {
  return function() {
    let t = a += 0x6D2B79F5;
    t = Math.imul(t ^ t >>> 15, t | 1);
    t ^= t + Math.imul(t ^ t >>> 7, t | 61);
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  }
}

// Real-scale palm tree geometry (12m tall)
const trunkGeo = new THREE.CylinderGeometry(0.15, 0.35, 12, 5)
trunkGeo.translate(0, 6, 0)

const palmLeavesGeo = new THREE.ConeGeometry(5, 6, 6)
palmLeavesGeo.translate(0, 15, 0)

export function VegetationSystem({ islands }) {
  const meshRefTrunks = useRef()
  const meshRefLeaves = useRef()
  const seed = useGameStore(state => state.seed)

  const trees = useMemo(() => {
    if (!islands) return { count: 0 }
    
    const random = mulberry32(Math.floor(seed * 10000))
    const matrices = []
    const dummy = new THREE.Object3D()
    
    islands.forEach((is) => {
      const islandRadiusLocal = 45 
      const treeCount = is.isMain ? 800 : Math.floor(is.scale[0] * 40)
      
      for (let i = 0; i < treeCount; i++) {
        const localR = Math.sqrt(random()) * islandRadiusLocal
        const localAngle = random() * Math.PI * 2
        const localX = Math.cos(localAngle) * localR
        const localZ = Math.sin(localAngle) * localR
        
        const dist = Math.sqrt(localX * localX + localZ * localZ)
        const normDist = Math.min(dist / 48, 1.0)
        const profile = Math.pow(0.5 + 0.5 * Math.cos(Math.PI * normDist), 1.0)
        const localHeight = profile * (0.6 + random() * 0.3) * 25.0
        
        const cosR = Math.cos(is.rotation)
        const sinR = Math.sin(is.rotation)
        const worldX = is.position[0] + (cosR * localX - sinR * localZ) * is.scale[0]
        const worldY = is.position[1] + localHeight * is.scale[1]
        const worldZ = is.position[2] + (sinR * localX + cosR * localZ) * is.scale[2]
        
        if (worldY < 3 || worldY > 65) continue
        
        const treeScale = (0.6 + random() * 1.5) * (is.isMain ? 1.0 : 0.8)
        
        dummy.position.set(worldX, worldY, worldZ)
        dummy.scale.set(treeScale, treeScale, treeScale)
        dummy.rotation.set(0, random() * Math.PI * 2, 0)
        dummy.updateMatrix()
        
        matrices.push(dummy.matrix.clone())
      }
    })
    
    return {
      count: matrices.length,
      matrices: matrices
    }
  }, [islands, seed])

  useEffect(() => {
    if (!meshRefTrunks.current || !meshRefLeaves.current || trees.count === 0) return
    
    trees.matrices.forEach((mat, i) => {
      meshRefTrunks.current.setMatrixAt(i, mat)
      meshRefLeaves.current.setMatrixAt(i, mat)
    })
    
    meshRefTrunks.current.instanceMatrix.needsUpdate = true
    meshRefLeaves.current.instanceMatrix.needsUpdate = true
  }, [trees])

  if (trees.count === 0) return null

  return (
    <group name="vegetation">
      <instancedMesh ref={meshRefTrunks} args={[trunkGeo, null, trees.count]} receiveShadow castShadow>
        <meshStandardMaterial color="#5a4030" roughness={0.9} />
      </instancedMesh>
      <instancedMesh ref={meshRefLeaves} args={[palmLeavesGeo, null, trees.count]} receiveShadow castShadow>
        <meshStandardMaterial color="#228B22" roughness={0.7} />
      </instancedMesh>
    </group>
  )
}
