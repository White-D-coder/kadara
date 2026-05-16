import { useEffect, useState } from 'react'
import useGameStore from '../../store/useGameStore'
import { isPlotBuildable } from '../terrain/terrainUtils'

/**
 * PlacementSystem handles:
 * 1. Snapping positions to the 100x100 grid.
 * 2. Creating the placement object and saving it to the store.
 * 3. Future hook for collision pre-checks.
 */
const PlacementSystem = () => {
  const placeCADModel = useGameStore((state) => state.placeCADModel)
  const hoveredPlot = useGameStore((state) => state.hoveredPlot)
  const [activeModelId, setActiveModelId] = useState(null)

  useEffect(() => {
    const handlePlaceTrigger = (e) => {
      const modelId = e.detail
      setActiveModelId(modelId)
    }

    document.addEventListener('cad-place-trigger', handlePlaceTrigger)
    return () => document.removeEventListener('cad-place-trigger', handlePlaceTrigger)
  }, [])

  useEffect(() => {
    const handleInput = (e) => {
      // If we have an active model and click the grid
      if (activeModelId && hoveredPlot && e.type === 'click') {
        const position = hoveredPlot.position
        
        // Final buildability check
        if (!isPlotBuildable(position[0], position[2])) {
          console.warn('Cannot place model: Area is not buildable (check slope/elevation)')
          return
        }

        placeCADModel({
          modelId: activeModelId,
          position: position,
          rotation: [0, 0, 0],
          scale: [1, 1, 1],
          plotId: hoveredPlot.id
        })

        console.log(`Placed model ${activeModelId} at plot ${hoveredPlot.id}`)
        
        // Reset active model after placement
        setActiveModelId(null)
      }
    }

    window.addEventListener('click', handleInput)
    return () => window.removeEventListener('click', handleInput)
  }, [activeModelId, hoveredPlot, placeCADModel])

  return null
}

export default PlacementSystem
