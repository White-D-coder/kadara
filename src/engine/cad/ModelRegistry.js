/**
 * ModelRegistry handles the metadata and optimization status of CAD assets.
 * 
 * Responsibilities:
 * 1. Tracking polygon counts
 * 2. Managing LOD file paths
 * 3. Storing specific bounding boxes for collision
 */
export class ModelRegistry {
  static models = new Map()

  /**
   * Register a new model with its stats
   */
  static register(modelId, metadata) {
    const entry = {
      id: modelId,
      polygonCount: metadata.polygonCount || 0,
      boundingSize: metadata.boundingSize || [1, 1, 1],
      lods: {
        LOD0: metadata.path, // Full
        LOD1: metadata.pathSimplified || null, 
        LOD2: metadata.pathBillboard || null
      },
      isOptimized: metadata.polygonCount < 50000,
      timestamp: Date.now()
    }
    
    this.models.set(modelId, entry)
    console.log(`Model registered: ${modelId} (${entry.polygonCount} polys)`)
    
    return entry
  }

  static getModel(modelId) {
    return this.models.get(modelId)
  }

  /**
   * Get the correct LOD path based on distance
   */
  static getLODPath(modelId, distance) {
    const model = this.models.get(modelId)
    if (!model) return null

    if (distance > 150 && model.lods.LOD2) return model.lods.LOD2
    if (distance > 50 && model.lods.LOD1) return model.lods.LOD1
    return model.lods.LOD0
  }
}

export default ModelRegistry
