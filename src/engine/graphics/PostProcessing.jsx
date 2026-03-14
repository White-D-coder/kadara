import { EffectComposer, Bloom, SMAA } from '@react-three/postprocessing'
import { useGameStore, GPU_TIERS } from '../../store/useGameStore'

export function KadaraPostProcessing() {
  const gpuTier = useGameStore(state => state.gpuTier)

  if (gpuTier === GPU_TIERS.UNKNOWN) return null

  if (gpuTier === GPU_TIERS.LOW) {
    return null
  }

  if (gpuTier === GPU_TIERS.MEDIUM) {
    return (
      <EffectComposer disableNormalPass>
        <SMAA />
        <Bloom luminanceThreshold={0.9} intensity={0.5} mipmapBlur />
      </EffectComposer>
    )
  }

  // High tier: SMAA + Bloom for sun glints on water
  return (
    <EffectComposer disableNormalPass>
      <SMAA />
      <Bloom luminanceThreshold={0.8} intensity={0.7} mipmapBlur />
    </EffectComposer>
  )
}
