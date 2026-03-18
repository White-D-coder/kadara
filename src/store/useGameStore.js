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
  cameraMode: CAMERA_MODES.PLANNER,
  graphicsTier: GRAPHICS_TIERS.MEDIUM,
  
  // Simulation State
  isSimulationRunning: true,
  worldTime: 0,
  
  // Interaction State
  hoveredPlot: null,
  placedBuildings: [],
  
  // Actions
  setCameraMode: (mode) => set({ cameraMode: mode }),
  setGraphicsTier: (tier) => set({ graphicsTier: tier }),
  toggleSimulation: () => set((state) => ({ isSimulationRunning: !state.isSimulationRunning })),
  setWorldTime: (time) => set({ worldTime: time }),
  setSeed: (seed) => set({ seed }),
  setHoveredPlot: (plot) => set({ hoveredPlot: plot }),
  
  addBuilding: (building) => set((state) => ({ 
    placedBuildings: [...state.placedBuildings, { ...building, id: `build_${Date.now()}` }] 
  })),
  removeBuilding: (id) => set((state) => ({
    placedBuildings: state.placedBuildings.filter((b) => b.id !== id)
  }))
}))

export default useGameStore
