import React, { Suspense } from 'react'
import { Canvas } from '@react-three/fiber'
import { Perf } from 'r3f-perf'
import { Sky, Environment } from '@react-three/drei'
import useGameStore, { GRAPHICS_TIERS, CAMERA_MODES } from './store/useGameStore'
import useGraphicsManager from './hooks/useGraphicsManager'

import Terrain from './engine/terrain/Terrain'
import Water from './engine/water/Water'
import Vegetation from './engine/vegetation/Vegetation'
import CameraSystem from './engine/camera/CameraSystem'
import PlotGrid from './engine/terrain/PlotGrid'
import Rivers from './engine/water/Rivers'
import Weather from './engine/weather/Weather'
import CitySystem from './engine/city/CitySystem'

const World = () => {
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
        shadow-camera-far={1000}
        shadow-camera-left={-600}
        shadow-camera-right={600}
        shadow-camera-top={600}
        shadow-camera-bottom={-600}
      />
      <hemisphereLight skyColor="#87ceeb" groundColor="#3a6e2a" intensity={0.45} />
      <ambientLight color="#c0e4f5" intensity={0.30} />

      <Terrain />
      <Water />
      <Rivers />
      <Vegetation />
      <Weather />
      <PlotGrid />
      <CitySystem />
    </>
  )
}

function App() {
  const { tier, handlePerformanceDrop } = useGraphicsManager()
  const cameraMode = useGameStore((state) => state.cameraMode)
  const setCameraMode = useGameStore((state) => state.setCameraMode)
  const hoveredPlot = useGameStore((state) => state.hoveredPlot)
  
  return (
    <div style={{ width: '100vw', height: '100vh' }}>
      <Canvas
        shadows={tier !== GRAPHICS_TIERS.LOW}
        dpr={tier === GRAPHICS_TIERS.HIGH ? window.devicePixelRatio : tier === GRAPHICS_TIERS.MEDIUM ? 1.5 : 1}
        camera={{ position: [50, 50, 50], fov: 45 }}
      >
        <Perf 
          position="bottom-left" 
          onReport={({ fps }) => handlePerformanceDrop(fps)} 
        />

        <Suspense fallback={null}>
          <Sky distance={450000} sunPosition={[0, 1, 0]} inclination={0} azimuth={0.25} />
          <Environment preset="city" />
          <World />
        </Suspense>
      </Canvas>
      
      {/* UI Overlay */}
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
      </div>
    </div>
  )
}

export default App
