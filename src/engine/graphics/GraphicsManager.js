import { useEffect } from 'react'
import { getGPUTier } from 'detect-gpu'
import { useGameStore, GPU_TIERS } from '../../store/useGameStore'

export function GraphicsManager() {
  const gpuTier = useGameStore((state) => state.gpuTier)
  const setGpuTier = useGameStore((state) => state.setGpuTier)

  useEffect(() => {
    // Only detect if it hasn't been detected yet
    if (gpuTier !== GPU_TIERS.UNKNOWN) return

    async function detectTier() {
      try {
        const gpuData = await getGPUTier()
        let tierLabel = GPU_TIERS.LOW
        
        if (gpuData.tier >= 3) {
          tierLabel = GPU_TIERS.HIGH
        } else if (gpuData.tier === 2) {
          tierLabel = gpuData.isMobile ? GPU_TIERS.LOW : GPU_TIERS.MEDIUM
        }
        
        console.log(`[GraphicsManager] Detected GPU: ${gpuData.gpu}, Tier: ${tierLabel}`)
        setGpuTier(tierLabel)
      } catch (err) {
        console.error("[GraphicsManager] Failed to detect GPU, defaulting to Low Tier.", err)
        setGpuTier(GPU_TIERS.LOW)
      }
    }
    
    detectTier()
  }, [setGpuTier, gpuTier])
  
  return null
}
