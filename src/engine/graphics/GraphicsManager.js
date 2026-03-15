import { useEffect } from 'react'
import { getGPUTier } from 'detect-gpu'
import { useGameStore, GPU_TIERS } from '../../store/useGameStore'

// Known high-performance GPU patterns (detect-gpu often mis-classifies these)
const HIGH_TIER_GPU_PATTERNS = [
  /apple m[1-9]/i,       // Apple M1, M2, M3, M4...
  /rtx\s*[2-9]/i,        // NVIDIA RTX 2000+
  /gtx\s*1[0-9]{2,3}/i,  // NVIDIA GTX 1060+
  /radeon\s*rx\s*[5-7]/i, // AMD RX 5000/6000/7000
  /arc\s*a[5-9]/i,        // Intel Arc A5/A7
]

const MID_TIER_GPU_PATTERNS = [
  /gtx\s*(9[5-9]|1[0-5])/i, // NVIDIA GTX 950-1050
  /radeon\s*rx\s*[4]/i,      // AMD RX 400 series
  /iris\s*xe/i,              // Intel Iris Xe
]

function classifyByGpuName(gpuName) {
  if (!gpuName) return null
  for (const pattern of HIGH_TIER_GPU_PATTERNS) {
    if (pattern.test(gpuName)) return GPU_TIERS.HIGH
  }
  for (const pattern of MID_TIER_GPU_PATTERNS) {
    if (pattern.test(gpuName)) return GPU_TIERS.MEDIUM
  }
  return null
}

export function GraphicsManager() {
  const gpuTier = useGameStore((state) => state.gpuTier)
  const setGpuTier = useGameStore((state) => state.setGpuTier)

  useEffect(() => {
    // Only detect if it hasn't been detected yet
    if (gpuTier !== GPU_TIERS.UNKNOWN && gpuTier !== 'Detecting...') return

    async function detectTier() {
      try {
        const gpuData = await getGPUTier()
        const gpuName = gpuData.gpu || ''
        
        // First: check GPU name against known patterns (more reliable than detect-gpu tier)
        let tierLabel = classifyByGpuName(gpuName)
        
        if (!tierLabel) {
          // Fallback: use detect-gpu's tier
          if (gpuData.tier >= 3) {
            tierLabel = GPU_TIERS.HIGH
          } else if (gpuData.tier === 2) {
            tierLabel = gpuData.isMobile ? GPU_TIERS.LOW : GPU_TIERS.MEDIUM
          } else {
            tierLabel = GPU_TIERS.LOW
          }
        }
        
        console.log(`[GraphicsManager] Detected GPU: ${gpuName}, detect-gpu tier: ${gpuData.tier}, Final: ${tierLabel}`)
        setGpuTier(tierLabel)
      } catch (err) {
        console.error("[GraphicsManager] Failed to detect GPU, defaulting to Medium Tier.", err)
        setGpuTier(GPU_TIERS.MEDIUM) // Default to Medium instead of Low on error
      }
    }
    
    detectTier()
  }, [setGpuTier, gpuTier])
  
  return null
}
