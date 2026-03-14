import { useEffect, useRef, useState } from 'react'
import { useThree, useFrame } from '@react-three/fiber'
import { MapControls, PointerLockControls } from '@react-three/drei'
import { useGameStore, CAMERA_MODES } from '../store/useGameStore'
import { activeCommands, COMMANDS } from '../engine/systems/InputManager'
import * as THREE from 'three'

export function CameraController() {
  const cameraMode = useGameStore(state => state.cameraMode)
  const setCameraMode = useGameStore(state => state.setCameraMode)
  const { camera } = useThree()
  const controlsRef = useRef()
  const [transitioning, setTransitioning] = useState(false)
  
  const targetPosition = useRef(new THREE.Vector3(0, 300, 0))
  const targetQuaternion = useRef(new THREE.Quaternion().setFromEuler(new THREE.Euler(-Math.PI / 2, 0, 0)))

  useEffect(() => {
    camera.position.set(200, 150, 400)
    camera.lookAt(0, 10, 0)
  }, [])

  useEffect(() => {
    const handleToggle = () => {
      const currentMode = useGameStore.getState().cameraMode
      setCameraMode(currentMode === CAMERA_MODES.FPV ? CAMERA_MODES.PLANNER : CAMERA_MODES.FPV)
    }
    window.addEventListener('toggle_planner_mode', handleToggle)
    return () => window.removeEventListener('toggle_planner_mode', handleToggle)
  }, [setCameraMode])

  useEffect(() => {
    setTransitioning(true)
    if (cameraMode === CAMERA_MODES.PLANNER) {
      targetPosition.current.set(camera.position.x, 120, camera.position.z + 200)
      targetQuaternion.current.setFromEuler(new THREE.Euler(-Math.PI / 3, 0, 0))
    } else {
      targetPosition.current.set(camera.position.x, 50, camera.position.z - 100)
      targetQuaternion.current.setFromEuler(new THREE.Euler(0, 0, 0))
    }
  }, [cameraMode, camera])

  useFrame((state, delta) => {
    if (transitioning) {
      camera.position.lerp(targetPosition.current, delta * 4)
      camera.quaternion.slerp(targetQuaternion.current, delta * 4)

      if (camera.position.distanceTo(targetPosition.current) < 5.0) {
        setTransitioning(false)
        if (controlsRef.current && cameraMode === CAMERA_MODES.PLANNER) {
          controlsRef.current.target.set(camera.position.x, 0, camera.position.z - 100)
          controlsRef.current.update()
        }
      }
    } else if (cameraMode === CAMERA_MODES.FPV) {
      const speed = 150 * delta; // Faster drone for giga-scale
      const dir = new THREE.Vector3();
      
      if (activeCommands.has(COMMANDS.MOVE_FORWARD)) dir.z -= 1;
      if (activeCommands.has(COMMANDS.MOVE_BACKWARD)) dir.z += 1;
      if (activeCommands.has(COMMANDS.MOVE_LEFT)) dir.x -= 1;
      if (activeCommands.has(COMMANDS.MOVE_RIGHT)) dir.x += 1;
      if (activeCommands.has(COMMANDS.JUMP)) dir.y += 1;
      
      if (dir.lengthSq() > 0) {
        dir.normalize().multiplyScalar(speed);
        dir.applyQuaternion(camera.quaternion);
        camera.position.add(dir);
      }
      
      if (camera.position.y < 3) camera.position.y = 3;
    }
  })

  return (
    <>
      {cameraMode === CAMERA_MODES.PLANNER && !transitioning && (
        <MapControls 
          ref={controlsRef}
          makeDefault 
          maxPolarAngle={Math.PI / 2 - 0.05}
          minDistance={10}
          maxDistance={5000}
        />
      )}
      {cameraMode === CAMERA_MODES.FPV && !transitioning && (
        <PointerLockControls makeDefault />
      )}
    </>
  )
}
