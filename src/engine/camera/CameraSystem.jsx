import React, { useRef, useState, useEffect } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import { OrbitControls, PointerLockControls } from '@react-three/drei'
import * as THREE from 'three'
import useGameStore, { CAMERA_MODES } from '../../store/useGameStore'

const CameraSystem = () => {
  const mode = useGameStore((state) => state.cameraMode)
  const { camera, scene } = useThree()
  const [velocity] = useState(() => new THREE.Vector3())
  const [direction] = useState(() => new THREE.Vector3())
  
  const moveState = useRef({
    forward: false,
    backward: false,
    left: false,
    right: false,
    jump: false
  })

  // Controls mapping
  useEffect(() => {
    const handleKeyDown = (e) => {
      switch (e.code) {
        case 'KeyW': moveState.current.forward = true; break;
        case 'KeyA': moveState.current.left = true; break;
        case 'KeyS': moveState.current.backward = true; break;
        case 'KeyD': moveState.current.right = true; break;
        case 'Space': moveState.current.jump = true; break;
      }
    }
    const handleKeyUp = (e) => {
      switch (e.code) {
        case 'KeyW': moveState.current.forward = false; break;
        case 'KeyA': moveState.current.left = false; break;
        case 'KeyS': moveState.current.backward = false; break;
        case 'KeyD': moveState.current.right = false; break;
        case 'Space': moveState.current.jump = false; break;
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    window.addEventListener('keyup', handleKeyUp)
    return () => {
      window.removeEventListener('keydown', handleKeyDown)
      window.removeEventListener('keyup', handleKeyUp)
    }
  }, [])

  useFrame((state, delta) => {
    if (mode === CAMERA_MODES.FPV) {
      // 1. Calculate movement direction
      direction.z = Number(moveState.current.forward) - Number(moveState.current.backward)
      direction.x = Number(moveState.current.right) - Number(moveState.current.left)
      direction.normalize()

      // 2. Apply movement velocity
      if (moveState.current.forward || moveState.current.backward) velocity.z -= direction.z * 400.0 * delta
      if (moveState.current.left || moveState.current.right) velocity.x -= direction.x * 400.0 * delta

      // 3. Simple damping
      velocity.z -= velocity.z * 10.0 * delta
      velocity.x -= velocity.x * 10.0 * delta

      // 4. Apply to camera (using PointerLockControls logic)
      // This is simplified; normally we'd move a ref object and have the camera follow
      camera.translateX(-velocity.x * delta)
      camera.translateZ(-velocity.z * delta)

      // 5. Gravity Raycasting
      const raycaster = new THREE.Raycaster(camera.position, new THREE.Vector3(0, -1, 0))
      const intersects = raycaster.intersectObjects(scene.children, true)
      
      const terrainIntersect = intersects.find(i => i.object.type === 'Mesh' || i.object.type === 'InstancedMesh')
      
      if (terrainIntersect) {
        const targetY = terrainIntersect.point.y + 1.7 // Eye height
        if (targetY < -0.3) {
           // Prevent walking on water (simple check)
           camera.position.y = Math.max(camera.position.y, 1.7)
        } else {
           camera.position.y = THREE.MathUtils.lerp(camera.position.y, targetY, 0.1)
        }
      } else {
        // Fall to "sea level" height
        camera.position.y = Math.max(camera.position.y - 9.8 * delta, 1.7)
      }
    }
  })

  return (
    <>
      {mode === CAMERA_MODES.FPV ? (
        <PointerLockControls />
      ) : (
        <OrbitControls makeDefault enableDamping dampingFactor={0.05} />
      )}
    </>
  )
}

export default CameraSystem
