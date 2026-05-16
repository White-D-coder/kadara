import { useEffect } from 'react'
import useGameStore from '../../store/useGameStore'
import ModelOptimizer from './ModelOptimizer'
import ModelRegistry from './ModelRegistry'

/**
 * CADUploader Handles:
 * 1. Listening for 'cad-upload-trigger' events from the UI
 * 2. File validation (extension, size < 50MB)
 * 3. Simulating conversion/processing pipeline
 * 4. Storing local blob URLs for instant feedback
 */
export const CADUploader = () => {
  const addUploadedModel = useGameStore((state) => state.addUploadedModel)

  useEffect(() => {
    const handleTrigger = (e) => {
      const file = e.detail
      if (file) {
        processFile(file)
      }
    }
    
    document.addEventListener('cad-upload-trigger', handleTrigger)
    return () => document.removeEventListener('cad-upload-trigger', handleTrigger)
  }, [addUploadedModel])

  const processFile = async (file) => {
    // 1. Validation
    const validExtensions = ['.glb', '.gltf', '.obj', '.stl']
    const fileName = file.name || 'uploaded_model'
    const extension = fileName.substring(fileName.lastIndexOf('.')).toLowerCase()
    
    if (!validExtensions.includes(extension)) {
      alert(`Invalid file format: ${extension}. Supported: .glb, .gltf, .obj, .stl`)
      return
    }

    if (file.size > 50 * 1024 * 1024) {
      alert('File too large (>50MB). Optimization required before upload.')
      return
    }

    console.log(`Processing model: ${fileName} (${(file.size / 1024 / 1024).toFixed(2)} MB)`)

    // 2. Simulate Optimization & Registry (Step 4, 5, 8)
    const simulatedPolyCount = Math.floor(20000 + Math.random() * 100000)
    const optimization = ModelOptimizer.optimize(fileName, simulatedPolyCount)
    
    const modelId = `model_${Date.now()}`
    const blobUrl = URL.createObjectURL(file)

    ModelRegistry.register(modelId, {
      name: fileName,
      path: blobUrl,
      polygonCount: optimization.finalTris
    })

    addUploadedModel({
      id: modelId,
      name: fileName,
      url: blobUrl,
      type: extension === '.glb' || extension === '.gltf' ? 'gltf' : 'raw',
      stats: optimization,
      timestamp: Date.now()
    })
    
    console.log(`Model successfully processed and added to store: ${modelId}`)
  }

  return null 
}

export default CADUploader
