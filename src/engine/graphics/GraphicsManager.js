import { useEffect } from 'react'
import { getGPUTier } from 'detect-gpu'
import { useGameStore, GPU_TIERS } from '../../store/useGameStore'

export function GraphicsManager() {
  const setGpuTier = useGameStore((state) => state.setGpuTier)

  useEffect(() => {
    async function detectTier() {
      try {
        const gpuData = await getGPUTier()
        let tierLabel = GPU_TIERS.UNKNOWN
        
        if (gpuData.tier >= 3) {
          tierLabel = GPU_TIERS.HIGH
        } else if (gpuData.tier === 2) {
          tierLabel = gpuData.isMobile ? GPU_TIERS.LOW : GPU_TIERS.MEDIUM
        } else {
          tierLabel = GPU_TIERS.LOW
        }
        
        console.log(`[GraphicsManager] Detected GPU: ${gpuData.gpu}, Tier: ${tierLabel}`)
        setGpuTier(tierLabel)
      } catch (err) {
        console.error("[GraphicsManager] Failed to detect GPU, defaulting to Low Tier.", err)
        setGpuTier(GPU_TIERS.LOW)
      }
    }
    
    detectTier()
  }, [setGpuTier])
  
  return null // This is a logic-only component
}
