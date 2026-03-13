import { EffectComposer, Bloom, SSAO, SMAA } from '@react-three/postprocessing'
import { useGameStore, GPU_TIERS } from '../../store/useGameStore'

export function KadaraPostProcessing() {
  const gpuTier = useGameStore(state => state.gpuTier)

  if (gpuTier === GPU_TIERS.UNKNOWN) return null

  // Low Tier: No effects to ensure 60fps
  if (gpuTier === GPU_TIERS.LOW) {
    return null
  }

  // Medium Tier: Basic Anti-Aliasing and Bloom
  if (gpuTier === GPU_TIERS.MEDIUM) {
    return (
      <EffectComposer disableNormalPass>
        <SMAA />
        <Bloom luminanceThreshold={1.0} intensity={0.5} mipmapBlur />
      </EffectComposer>
    )
  }

  // High Tier: Everything enabled
  return (
    <EffectComposer disableNormalPass={false}>
      <SSAO samples={21} radius={10} intensity={15} luminanceInfluence={0.6} />
      <SMAA />
      <Bloom luminanceThreshold={1.0} intensity={0.8} mipmapBlur />
    </EffectComposer>
  )
}
