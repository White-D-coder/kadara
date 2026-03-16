// import { Suspense } from 'react'
// import { Canvas } from '@react-three/fiber'
// import { GraphicsManager } from './engine/graphics/GraphicsManager'
// import { KadaraPostProcessing } from './engine/graphics/PostProcessing'
// import { InputManager } from './engine/systems/InputManager'
// import { CameraController } from './hooks/useCameraTransition.jsx'
// import { AdaptiveQualityManager } from './hooks/useAdaptiveQuality'
// import { useGameStore } from './store/useGameStore'
// import { ArchipelagoGenerator } from './engine/world/features/ArchipelagoGenerator'
// import './index.css'

// function UIOverlay() {
//   const gpuTier = useGameStore(state => state.gpuTier)
//   const cameraMode = useGameStore(state => state.cameraMode)
//   const fps = useGameStore(state => state.fps)
  
//   const handleToggle = () => {
//     window.dispatchEvent(new CustomEvent('toggle_planner_mode'))
//   }
  
//   return (
//     <div className="ui-overlay">
//       <div className="ui-header">
//         <div className="mac-buttons">
//           <span className="mac-close"></span>
//           <span className="mac-min"></span>
//           <span className="mac-max"></span>
//         </div>
//         <h1>CAD CITY Engine</h1>
//       </div>
      
//       <div className="status-grid">
//         <div className="status-item">
//           <span className="label">Hardware</span>
//           <span className="value">{gpuTier}</span>
//         </div>
//         <div className="status-item">
//           <span className="label">Performance</span>
//           <span className="value">{fps > 0 ? `${fps} FPS` : 'Calculating...'}</span>
//         </div>
//         <div className="status-item">
//           <span className="label">Camera Mode</span>
//           <span className="value">{cameraMode}</span>
//         </div>
//       </div>

//       <button className="glass-btn" onClick={handleToggle}>
//         Toggle {cameraMode === 'FPV' ? 'Planner' : 'FPV'} Mode (P)
//       </button>
//     </div>
//   )
// }

// function Scene() {
//   return (
//     <>
//       <GraphicsManager />
//       <AdaptiveQualityManager />
//       <InputManager />
//       <CameraController />
//       <ArchipelagoGenerator />
//       <KadaraPostProcessing />
//     </>
//   )
// }

// import * as THREE from 'three'

// export default function App() {
//   return (
//     <div className="app-container">
//       <Canvas 
//         shadows={{ type: THREE.PCFShadowMap }} 
//         camera={{ fov: 60, near: 0.5, far: 45000 }}
//         gl={{ alpha: false, antialias: true }}
//         onCreated={({ scene }) => { }}
//       >
//         <Suspense fallback={null}>
//           <Scene />
//         </Suspense>
//       </Canvas>
//       <UIOverlay />
//       <div className="version-tag">CAD CITY — Cinematic Archipelago</div>
//     </div>
//   )
// }
import { Suspense } from 'react'
import { Canvas } from '@react-three/fiber'
import * as THREE from 'three'
import { GraphicsManager } from './engine/graphics/GraphicsManager'
import { KadaraPostProcessing } from './engine/graphics/PostProcessing'
import { InputManager } from './engine/systems/InputManager'
import { CameraController } from './hooks/useCameraTransition.jsx'
import { AdaptiveQualityManager } from './hooks/useAdaptiveQuality'
import { useGameStore } from './store/useGameStore'
import { ArchipelagoGenerator } from './engine/world/features/ArchipelagoGenerator'
import './index.css'

function UIOverlay() {
  const gpuTier    = useGameStore(state => state.gpuTier)
  const cameraMode = useGameStore(state => state.cameraMode)
  const fps        = useGameStore(state => state.fps)

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
        <h1>CAD CITY Engine</h1>
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
      <GraphicsManager />
      <AdaptiveQualityManager />
      <InputManager />
      <CameraController />
      <ArchipelagoGenerator />
      {/* <KadaraPostProcessing /> */}
    </>
  )
}

export default function App() {
  return (
    <div className="app-container">
      <Canvas
        shadows={{ type: THREE.PCFShadowMap }}
        camera={{ fov: 60, near: 0.5, far: 45000 }}
        gl={{
          alpha: false,
          antialias: true,
          // NOTE: EffectComposer will override these at runtime.
          // ToneMappingFix inside PostProcessing.jsx re-applies
          // them after the composer mounts. Both are needed.
          toneMapping: THREE.ACESFilmicToneMapping,
          toneMappingExposure: 0.85,
          outputColorSpace: THREE.SRGBColorSpace,
          powerPreference: 'high-performance',
        }}
        onCreated={({ gl }) => {
          // Force-set immediately on canvas creation
          // before any components mount
          gl.toneMapping         = THREE.ACESFilmicToneMapping
          gl.toneMappingExposure = 0.85
          gl.outputColorSpace    = THREE.SRGBColorSpace
        }}
      >
        <Suspense fallback={null}>
          <Scene />
        </Suspense>
      </Canvas>
      <UIOverlay />
      <div className="version-tag">CAD CITY — Cinematic Archipelago</div>
    </div>
  )
}