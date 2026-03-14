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
      <EffectComposer disableNormalPass stencilBuffer={false}>
        <SMAA />
        <Bloom luminanceThreshold={0.9} intensity={0.5} mipmapBlur />
      </EffectComposer>
    )
  }

  // High tier: SMAA + Bloom for sun starburst (Image 1) and water glints
  return (
    <EffectComposer disableNormalPass multisampling={0} stencilBuffer={false}>
      <SMAA />
      <Bloom luminanceThreshold={0.6} intensity={1.2} mipmapBlur levels={5} />
    </EffectComposer>
  )
}
