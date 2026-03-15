import { useEffect, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { useGameStore, GPU_TIERS } from '../store/useGameStore'

export function AdaptiveQualityManager() {
  const setFps = useGameStore(state => state.setFps)
  const gpuTier = useGameStore(state => state.gpuTier)
  const setGpuTier = useGameStore(state => state.setGpuTier)
  
  const frameTimes = useRef([])
  const lastTime = useRef(performance.now())
  const startTime = useRef(performance.now())
  const lowFpsCounter = useRef(0)
  const highFpsCounter = useRef(0)

  useFrame(() => {
    const now = performance.now()
    const uptime = (now - startTime.current) / 1000
    const dt = now - lastTime.current
    lastTime.current = now

    frameTimes.current.push(dt)
    if (frameTimes.current.length > 60) {
      frameTimes.current.shift()
      const avgDt = frameTimes.current.reduce((a, b) => a + b) / 60
      const fps = Math.round(1000 / avgDt)
      setFps(fps)

      // Grace period: No downscaling within first 10 seconds
      if (uptime < 10) return

      // Downscale if performance is poor (under 25 FPS for 5 seconds)
      if (fps < 25 && gpuTier !== GPU_TIERS.LOW) {
        lowFpsCounter.current++
        if (lowFpsCounter.current > 300) { // Approx 5 seconds at 60Hz
          console.warn(`[AdaptiveQuality] Sustained low performance detected (${fps} FPS). Downscaling quality...`)
          setGpuTier(GPU_TIERS.LOW)
          lowFpsCounter.current = 0
        }
      } else {
        lowFpsCounter.current = 0
      }

      // Upscale if performance is great (over 55 FPS for 10 seconds)
      if (fps > 55 && gpuTier === GPU_TIERS.LOW) {
        highFpsCounter.current++
        if (highFpsCounter.current > 600) {
          console.log(`[AdaptiveQuality] Performance recovered (${fps} FPS). Checking if we can upscale...`)
          // We can't easily jump back with full confidence, but we can try MID
          setGpuTier(GPU_TIERS.MEDIUM)
          highFpsCounter.current = 0
        }
      } else {
        highFpsCounter.current = 0
      }
    }
  })

  return null
}
