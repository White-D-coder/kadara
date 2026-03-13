import { Suspense } from 'react'
import { Canvas } from '@react-three/fiber'
import { GraphicsManager } from './engine/graphics/GraphicsManager'
import { KadaraPostProcessing } from './engine/graphics/PostProcessing'
import { Archipelago } from './engine/world/Archipelago'
import { Ocean } from './engine/world/Ocean'
import { Atmosphere } from './engine/world/Atmosphere'
import { InputManager } from './engine/systems/InputManager'
import { CameraController } from './hooks/useCameraTransition.jsx'
import { AdaptiveQualityManager } from './hooks/useAdaptiveQuality'
import { useGameStore } from './store/useGameStore'
import './index.css'

function UIOverlay() {
  const gpuTier = useGameStore(state => state.gpuTier)
  const cameraMode = useGameStore(state => state.cameraMode)
  const fps = useGameStore(state => state.fps)
  
  const handleToggle = () => {
    window.dispatchEvent(new CustomEvent('toggle_planner_mode'))
  }
  
  return (
    <div className="ui-overlay">
      <div className="ui-header">
        <div className="mac-buttons">
          <span className="mac-close"></span>
          <span className="mac-min"></span>
          <span className="mac-max"></span>
        </div>
        <h1>Kadara Engine</h1>
      </div>
      
      <div className="status-grid">
        <div className="status-item">
          <span className="label">Hardware</span>
          <span className="value">{gpuTier}</span>
        </div>
        <div className="status-item">
          <span className="label">Performance</span>
          <span className="value">{fps > 0 ? `${fps} FPS` : 'Calculating...'}</span>
        </div>
        <div className="status-item">
          <span className="label">Camera Mode</span>
          <span className="value">{cameraMode}</span>
        </div>
      </div>

      <button className="glass-btn" onClick={handleToggle}>
        Toggle {cameraMode === 'FPV' ? 'Planner' : 'FPV'} Mode (P)
      </button>
    </div>
  )
}

function Scene() {
  return (
    <>
      {/* Managers & Systems */}
      <GraphicsManager />
      <AdaptiveQualityManager />
      <InputManager />
      <CameraController />

      {/* Environment */}
      <Atmosphere />
      <Ocean />
      <Archipelago />
      
      {/* Visuals */}
      <KadaraPostProcessing />
    </>
  )
}

export default function App() {
  return (
    <div className="app-container">
      <Canvas shadows camera={{ fov: 60 }}>
        <Suspense fallback={null}>
          <Scene />
        </Suspense>
      </Canvas>
      <UIOverlay />
      <div className="version-tag">Kadara Phase v0.2.0 (High Fidelity)</div>
    </div>
  )
}
