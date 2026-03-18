import React, { useMemo } from 'react'
import { useGLTF, Instances, Instance } from '@react-three/drei'
import * as THREE from 'three'
import { generateArchipelago } from '../terrain/IslandGenerator'
import { getTerrainHeight, getTerrainNormal } from '../terrain/terrainUtils'
import useGameStore from '../../store/useGameStore'

// Simple deterministic noise for JS placement
const pseudoNoise = (x, z) => {
  const n = Math.sin(x * 12.9898 + z * 78.233) * 43758.5453123
  return n - Math.floor(n)
}

const Vegetation = () => {
  const seed = useGameStore((state) => state.seed)
  const islands = useMemo(() => generateArchipelago(seed), [seed])

  // Load Tree Assets
  const birchGLTF = useGLTF('/static/birchTrees/birchTreesVisual.glb')
  const oakGLTF = useGLTF('/static/oakTrees/oakTreesVisual.glb')
  const cherryGLTF = useGLTF('/static/cherryTrees/cherryTreesVisual.glb')
  const sceneryGLTF = useGLTF('/static/scenery/scenery.glb')

  const instanceData = useMemo(() => {
    const birch = []
    const oak = []
    const cherry = []
    const props = []

    islands.forEach((island) => {
      const isMain = island.type === 'main'
      // Much more trees on the single large main island
      const count = isMain ? 3500 : 40

      for (let i = 0; i < count; i++) {
        const angle = pseudoNoise(island.seed, i) * Math.PI * 2
        const distRatio = Math.sqrt(pseudoNoise(i, island.seed))
        const dist = distRatio * (island.radius - 15)

        const x = island.position.x + Math.cos(angle) * dist
        const z = island.position.z + Math.sin(angle) * dist

        // Height sampling
        const groundHeight = getTerrainHeight(x, z, 0, isMain)

        // Clustering — denser in forest band
        const cluster = pseudoNoise(x * 0.08, z * 0.08)
        if (cluster < 0.25) continue

        // Valid planting zone: above beach (5), below rock line (55)
        if (groundHeight < 5.0 || groundHeight > 58.0) continue

        // Slope check — no trees on steep cliffs
        const normal = getTerrainNormal(x, z, 0, isMain)
        const slope = 1.0 - normal.y
        if (slope > 0.40) continue

        const treeType = pseudoNoise(x, z)
        // Scale varies by elevation — smaller near treeline
        const elevFactor = 1.0 - Math.min(groundHeight / 60.0, 0.5)
        const scale = (0.7 + pseudoNoise(z, x) * 0.6) * elevFactor
        const rotation = [0, pseudoNoise(x + z, i) * Math.PI * 2, 0]

        const treeData = {
          position: [x, groundHeight, z],
          scale: [scale, scale, scale],
          rotation: rotation
        }

        // Distribute by biome band
        if (groundHeight < 18.0) {
          // Lower elevation — more cherry and birch
          if (treeType < 0.45) cherry.push(treeData)
          else if (treeType < 0.75) birch.push(treeData)
          else oak.push(treeData)
        } else {
          // Higher elevation forest — mostly oak and birch
          if (treeType < 0.5) oak.push(treeData)
          else if (treeType < 0.8) birch.push(treeData)
          else cherry.push(treeData)
        }

        // Prop scattering at beach/rock transitions
        if ((groundHeight < 7.0 || groundHeight > 50.0) && pseudoNoise(i, x) > 0.90) {
          props.push({
            ...treeData,
            position: [x, groundHeight - 0.2, z],
            type: Math.floor(pseudoNoise(x, i) * 3)
          })
        }
      }
    })

    return { birch, oak, cherry, props }
  }, [islands])

  // Extract geometries and materials
  const birchMesh = birchGLTF.nodes.tree_birch || Object.values(birchGLTF.nodes).find(n => n.isMesh)
  const oakMesh = oakGLTF.nodes.tree_oak || Object.values(oakGLTF.nodes).find(n => n.isMesh)
  const cherryMesh = cherryGLTF.nodes.tree_cherry || Object.values(cherryGLTF.nodes).find(n => n.isMesh)
  const sceneryMeshes = Object.values(sceneryGLTF.nodes).filter(n => n.isMesh)

  return (
    <group>
      {/* Oak Instances */}
      <Instances range={instanceData.oak.length} geometry={oakMesh.geometry} material={oakMesh.material}>
        {instanceData.oak.slice(0, 1500).map((tree, i) => (
          <Instance key={i} position={tree.position} scale={tree.scale} rotation={tree.rotation} />
        ))}
      </Instances>

      {/* Birch Instances */}
      <Instances range={instanceData.birch.length} geometry={birchMesh.geometry} material={birchMesh.material}>
        {instanceData.birch.slice(0, 1000).map((tree, i) => (
          <Instance key={i} position={tree.position} scale={tree.scale} rotation={tree.rotation} />
        ))}
      </Instances>

      {/* Cherry Instances */}
      <Instances range={instanceData.cherry.length} geometry={cherryMesh.geometry} material={cherryMesh.material}>
        {instanceData.cherry.slice(0, 600).map((tree, i) => (
          <Instance key={i} position={tree.position} scale={tree.scale} rotation={tree.rotation} />
        ))}
      </Instances>

      {/* Scenery Props (Rocks, Logs) */}
      {sceneryMeshes.slice(0, 3).map((mesh, idx) => (
        <Instances key={idx} range={instanceData.props.length} geometry={mesh.geometry} material={mesh.material}>
          {instanceData.props.filter(p => p.type === idx).map((prop, i) => (
            <Instance key={i} position={prop.position} scale={prop.scale} rotation={prop.rotation} />
          ))}
        </Instances>
      ))}
    </group>
  )
}

export default Vegetation
