import { useEffect, useCallback } from 'react'
import { getGPUTier } from 'detect-gpu'
import useGameStore, { GRAPHICS_TIERS } from '../store/useGameStore'

const useGraphicsManager = () => {
  const setGraphicsTier = useGameStore((state) => state.setGraphicsTier)
  const currentTier = useGameStore((state) => state.graphicsTier)

  // Initialize GPU detection
  useEffect(() => {
    const detect = async () => {
      const gpuTier = await getGPUTier()
      
      let tier = GRAPHICS_TIERS.LOW
      if (gpuTier.tier >= 3) tier = GRAPHICS_TIERS.HIGH
      else if (gpuTier.tier >= 2) tier = GRAPHICS_TIERS.MEDIUM
      
      setGraphicsTier(tier)
      console.log(`Graphics Tier Estimated: ${tier} (GPU Tier: ${gpuTier.tier})`)
    }
    detect()
  }, [setGraphicsTier])

  // Adaptive auto-downscale logic
  const handlePerformanceDrop = useCallback((fps) => {
    if (fps < 40) {
      if (currentTier === GRAPHICS_TIERS.HIGH) {
        setGraphicsTier(GRAPHICS_TIERS.MEDIUM)
      } else if (currentTier === GRAPHICS_TIERS.MEDIUM) {
        setGraphicsTier(GRAPHICS_TIERS.LOW)
      }
    }
  }, [currentTier, setGraphicsTier])

  return {
    tier: currentTier,
    handlePerformanceDrop,
    isLow: currentTier === GRAPHICS_TIERS.LOW,
    isMedium: currentTier === GRAPHICS_TIERS.MEDIUM,
    isHigh: currentTier === GRAPHICS_TIERS.HIGH,
  }
}

export default useGraphicsManager
