import { useEffect, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { useGameStore, GPU_TIERS } from '../store/useGameStore'

export function AdaptiveQualityManager() {
  const setFps = useGameStore(state => state.setFps)
  const gpuTier = useGameStore(state => state.gpuTier)
  const setGpuTier = useGameStore(state => state.setGpuTier)
  
  const frameTimes = useRef([])
  const lastTime = useRef(performance.now())

  useFrame(() => {
    const now = performance.now()
    const dt = now - lastTime.current
    lastTime.current = now

    frameTimes.current.push(dt)
    if (frameTimes.current.length > 60) {
      frameTimes.current.shift()
      const avgDt = frameTimes.current.reduce((a, b) => a + b) / 60
      const fps = Math.round(1000 / avgDt)
      setFps(fps)

      // Downscale if performance is poor (under 25 FPS for 2 seconds)
      if (fps < 25 && gpuTier !== GPU_TIERS.LOW) {
        // Simple smoothing: check if it stays low
        console.warn(`[AdaptiveQuality] Low performance detected (${fps} FPS). Downscaling quality...`)
        setGpuTier(GPU_TIERS.LOW)
      }
    }
  })

  return null
}
