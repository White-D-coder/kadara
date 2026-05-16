import React, { Suspense } from 'react'
import { Canvas } from '@react-three/fiber'
import { Perf } from 'r3f-perf'
import { Sky, Environment } from '@react-three/drei'
import * as THREE from 'three'
import useGameStore, { GRAPHICS_TIERS, CAMERA_MODES } from './store/useGameStore'
import useGraphicsManager from './hooks/useGraphicsManager'

import Terrain from './engine/terrain/Terrain'
import Water from './engine/water/Water'
import Vegetation from './engine/vegetation/Vegetation'
import CameraSystem from './engine/camera/CameraSystem'
import PlotGrid from './engine/terrain/PlotGrid'
import Rivers from './engine/water/Rivers'
import Weather from './engine/weather/Weather'
import CityArchitect from './engine/city/CityArchitect'

// Phase 5: CAD Systems
import CADUploader from './engine/cad/CADUploader'
import PlacementSystem from './engine/cad/PlacementSystem'
import CADModel from './engine/cad/CADModel'
import { EffectComposer, Bloom, Vignette, Noise } from '@react-three/postprocessing'

const World = () => {
  const placedCADModels = useGameStore((state) => state.placedCADModels)
  
  return (
    <>
      <CameraSystem />

      {/* Step 8: Cinematic Lighting */}
      <directionalLight
        position={[150, 250, 100]}
        color="#fff5d6"
        intensity={1.4}
        castShadow
        shadow-mapSize={[2048, 2048]}
        shadow-camera-near={1}
        shadow-camera-far={5000}
        shadow-camera-left={-2000}
        shadow-camera-right={2000}
        shadow-camera-top={2000}
        shadow-camera-bottom={-2000}
        shadow-bias={-0.0005} // Adjusted for 2000m scale
      />
      <hemisphereLight skyColor="#87ceeb" groundColor="#3a6e2a" intensity={0.45} />
      <ambientLight color="#c0e4f5" intensity={0.30} />

      <Terrain />
      <Water />
      <Rivers />
      <Vegetation />
      <Weather />
      <PlotGrid />
      <CityArchitect />

      {/* Phase 5: CAD Infrastructure */}
      <PlacementSystem />
      {placedCADModels.map((model) => (
        <CADModel key={model.id} {...model} />
      ))}
    </>
  )
}

function App() {
  const { tier, handlePerformanceDrop } = useGraphicsManager()
  const cameraMode = useGameStore((state) => state.cameraMode)
  const setCameraMode = useGameStore((state) => state.setCameraMode)
  const hoveredPlot = useGameStore((state) => state.hoveredPlot)
  const uploadedModels = useGameStore((state) => state.uploadedModels)
  const [locked, setLocked] = React.useState(false)

  // Listen for pointer lock changes
  React.useEffect(() => {
    const onChange = () => setLocked(!!document.pointerLockElement)
    document.addEventListener('pointerlockchange', onChange)
    return () => document.removeEventListener('pointerlockchange', onChange)
  }, [])

  return (
    <div style={{ width: '100vw', height: '100vh' }}>
      <Canvas
        shadows
        onCreated={({ gl }) => {
          gl.shadowMap.type = 1 // PCFShadowMap
        }}
        dpr={tier === GRAPHICS_TIERS.HIGH ? window.devicePixelRatio : tier === GRAPHICS_TIERS.MEDIUM ? 1.5 : 1}
        camera={{ position: [0, 200, 100], fov: 45, far: 20000 }}
      >
        <Perf
          position="bottom-left"
          onReport={({ fps }) => handlePerformanceDrop(fps)}
        />

        <Suspense fallback={null}>
          <Sky distance={450000} sunPosition={[0, 1, 0]} inclination={0} azimuth={0.25} />
          <Environment preset="city" />
          <World />
          
          <EffectComposer disableNormalPass>
            <Bloom 
              intensity={1.0} 
              luminanceThreshold={1.0} 
              luminanceSmoothing={0.9} 
              height={300} 
            />
            <Noise opacity={0.02} />
            <Vignette eskil={false} offset={0.1} darkness={1.1} />
          </EffectComposer>
        </Suspense>
      </Canvas>

      {/* Click-to-play overlay (FPV only when pointer not locked) */}
      {cameraMode === CAMERA_MODES.FPV && !locked && (
        <div
          onClick={() => document.querySelector('canvas')?.requestPointerLock()}
          style={{
            position: 'absolute', inset: 0,
            display: 'flex', flexDirection: 'column',
            alignItems: 'center', justifyContent: 'center',
            background: 'rgba(0,0,0,0.45)',
            backdropFilter: 'blur(4px)',
            cursor: 'pointer',
            zIndex: 10
          }}
        >
          <div style={{
            border: '2px solid rgba(255,255,255,0.5)',
            padding: '32px 48px',
            borderRadius: 16,
            textAlign: 'center',
            color: 'white',
            textShadow: '0 2px 8px rgba(0,0,0,0.8)'
          }}>
            <div style={{ fontSize: 48, marginBottom: 12 }}>🏙️</div>
            <h2 style={{ margin: '0 0 8px', fontSize: 26, letterSpacing: 2 }}>KADARA CITY</h2>
            <p style={{ margin: '0 0 20px', opacity: 0.75, fontSize: 14 }}>Click anywhere to enter first-person view</p>
            <div style={{ fontSize: 12, opacity: 0.6, lineHeight: 2 }}>
              <b>W A S D</b> — Move &nbsp;|&nbsp; <b>Shift</b> — Sprint &nbsp;|&nbsp; <b>Space</b> — Jump<br/>
              Mouse — Look around &nbsp;|&nbsp; <b>ESC</b> — Release cursor
            </div>
          </div>
        </div>
      )}

      {/* FPV hint when locked */}
      {cameraMode === CAMERA_MODES.FPV && locked && (
        <div style={{
          position: 'absolute', bottom: 20, left: '50%', transform: 'translateX(-50%)',
          color: 'rgba(255,255,255,0.5)', fontSize: 11, pointerEvents: 'none',
          textShadow: '0 1px 3px black'
        }}>
          ESC to release cursor
        </div>
      )}

      {/* Mode/status info */}
      <div style={{ position: 'absolute', top: 20, left: 20, color: 'white', pointerEvents: 'none', textShadow: '0 0 5px black' }}>
        <h1 style={{ margin: 0, fontSize: '24px' }}>CAD CITY</h1>
        <p style={{ margin: '5px 0' }}>Graphics: {tier}</p>
        <p style={{ margin: '5px 0' }}>Mode: {cameraMode}</p>
        {hoveredPlot && <p style={{ margin: '5px 0', color: '#00ccff' }}>Plot: {hoveredPlot.x}, {hoveredPlot.z}</p>}
      </div>

      <div style={{ position: 'absolute', top: 20, right: 20 }}>
        <button
          onClick={() => setCameraMode(cameraMode === CAMERA_MODES.PLANNER ? CAMERA_MODES.FPV : CAMERA_MODES.PLANNER)}
          style={{
            padding: '10px 20px',
            background: 'rgba(0,0,0,0.5)',
            color: 'white',
            border: '1px solid white',
            cursor: 'pointer',
            backdropFilter: 'blur(5px)'
          }}
        >
          {cameraMode === CAMERA_MODES.PLANNER ? 'Switch to Explorer' : 'Switch to Planner'}
        </button>

        {/* CAD Upload Button */}
        <div style={{ marginTop: 10 }}>
          <button
            onClick={() => document.getElementById('cad-uploader-input').click()}
            style={{
              padding: '10px 20px',
              width: '100%',
              background: 'rgba(0,180,255,0.6)',
              color: 'white',
              border: '1px solid #00ccff',
              cursor: 'pointer',
              backdropFilter: 'blur(5px)',
              fontWeight: 'bold'
            }}
          >
            UPLOAD CAD
          </button>
        </div>

        {/* CAD Selection UI */}
        <div style={{ marginTop: 10, background: 'rgba(0,0,0,0.4)', padding: 10, border: '1px solid rgba(255,255,255,0.2)' }}>
          <h3 style={{ margin: '0 0 5px 0', fontSize: '12px', color: '#00ccff' }}>RECENT UPLOADS</h3>
          {uploadedModels.length === 0 && <p style={{ fontSize: '10px', opacity: 0.7 }}>No models uploaded</p>}
          {uploadedModels.slice(-3).map((model) => (
            <div 
              key={model.id} 
              onClick={() => {
                // Bridge to placement system
                const event = new CustomEvent('cad-place-trigger', { detail: model.id })
                document.dispatchEvent(event)
                alert(`Placement mode active for: ${model.name}. Click on a grid plot to place.`)
              }}
              style={{ 
                fontSize: '11px', 
                padding: '4px', 
                borderBottom: '1px solid rgba(255,255,255,0.1)', 
                cursor: 'pointer',
                color: '#fff'
              }}
            >
              📄 {model.name}
            </div>
          ))}
        </div>
      </div>

      <CADUploader />
      <input 
        id="cad-uploader-input" 
        type="file" 
        style={{ display: 'none' }} 
        onChange={(e) => {
          const file = e.target.files[0]
          if (file) {
            document.dispatchEvent(new CustomEvent('cad-upload-trigger', { detail: file }))
          }
        }}
      />
    </div>
  )
}

export default App
