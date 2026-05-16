import { create } from 'zustand'

export const CAMERA_MODES = {
  FPV: 'FPV',
  PLANNER: 'PLANNER'
}

export const GRAPHICS_TIERS = {
  LOW: 'LOW',
  MEDIUM: 'MEDIUM',
  HIGH: 'HIGH'
}

const useGameStore = create((set) => ({
  // Core State
  seed: 'CAD_CITY_2026',
  cameraMode: CAMERA_MODES.FPV,
  graphicsTier: GRAPHICS_TIERS.HIGH,
  
  // Simulation State
  isSimulationRunning: true,
  worldTime: 0,
  
  // Interaction State
  hoveredPlot: null,
  placedBuildings: [],
  
  // Phase 5: CAD Integration State
  uploadedModels: [], 
  placedCADModels: [],

  // City & Starting Point
  startPosition: [0, 150, 0], // Default high center
  cityCreated: false,
  cityBuildings: [],

  // Actions
  setCameraMode: (mode) => set({ cameraMode: mode }),
  setGraphicsTier: (tier) => set({ graphicsTier: tier }),
  toggleSimulation: () => set((state) => ({ isSimulationRunning: !state.isSimulationRunning })),
  setWorldTime: (time) => set({ worldTime: time }),
  setSeed: (seed) => set({ seed }),
  setHoveredPlot: (plot) => set({ hoveredPlot: plot }),
  
  // CAD Actions
  addUploadedModel: (model) => set((state) => ({
    uploadedModels: [...state.uploadedModels, model]
  })),

  placeCADModel: (model) => set((state) => ({
    placedCADModels: [...state.placedCADModels, { ...model, id: `cad_${Date.now()}` }]
  })),

  removeCADModel: (id) => set((state) => ({
    placedCADModels: state.placedCADModels.filter((m) => m.id !== id)
  })),

  addBuilding: (building) => set((state) => ({ 
    placedBuildings: [...state.placedBuildings, { ...building, id: `build_${Date.now()}` }] 
  })),
  removeBuilding: (id) => set((state) => ({
    placedBuildings: state.placedBuildings.filter((b) => b.id !== id)
  })),

  setStartPosition: (pos) => set({ startPosition: pos }),
  setCityCreated: (val) => set({ cityCreated: val }),
  setCityBuildings: (buildings) => set({ cityBuildings: buildings })
}))

export default useGameStore
