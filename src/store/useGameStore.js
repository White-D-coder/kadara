import { create } from 'zustand'

export const GPU_TIERS = {
  UNKNOWN: 'Detecting...',
  LOW: 'Tier 1 (Low)',
  MEDIUM: 'Tier 2 (Mid)',
  HIGH: 'Tier 3 (High)'
}

export const CAMERA_MODES = {
  PLANNER: 'PLANNER',
  FPV: 'FPV'
}

export const useGameStore = create((set) => ({
  seed: 0.123456,
  gpuTier: GPU_TIERS.UNKNOWN,
  cameraMode: CAMERA_MODES.PLANNER,
  fps: 0,
  sunTime: 12, // 0-24h cycle
  
  setSeed: (seed) => set({ seed }),
  setGpuTier: (tier) => set({ gpuTier: tier }),
  setCameraMode: (mode) => set({ cameraMode: mode }),
  setFps: (fps) => set({ fps }),
  setSunTime: (time) => set({ sunTime: time })
}))
