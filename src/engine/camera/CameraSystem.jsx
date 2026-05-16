import React, { useRef, useState, useEffect, useCallback } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import { OrbitControls, PointerLockControls } from '@react-three/drei'
import * as THREE from 'three'
import useGameStore, { CAMERA_MODES } from '../../store/useGameStore'
import { generateArchipelago } from '../terrain/IslandGenerator'
import { getTerrainHeight } from '../terrain/terrainUtils'

const MOVE_SPEED  = 25   // m/s comfortable walking / running speed
const SPRINT_MULT = 3.0  // hold Shift to sprint
const EYE_HEIGHT  = 1.75 // metres above ground
const GRAVITY     = 18   // m/s²
const DAMP        = 12   // horizontal friction

const CameraSystem = () => {
  const mode    = useGameStore((state) => state.cameraMode)
  const seed    = useGameStore((state) => state.seed)
  const cityBuildings = useGameStore((state) => state.cityBuildings)
  const { camera, gl } = useThree()
  const plcRef  = useRef()          // PointerLockControls ref

  // compute islands once from seed for terrain height sampling
  const islands = React.useMemo(() => generateArchipelago(seed), [seed])

  // FPV state
  const vel       = useRef(new THREE.Vector3())
  const yVel      = useRef(0)
  const grounded  = useRef(false)
  const spawned   = useRef(false)

  // Key map
  const keys = useRef({
    w: false, a: false, s: false, d: false,
    shift: false, space: false
  })

  // ── Extend far plane ─────────────────────────────────────────────────────
  useEffect(() => {
    camera.far = 20000
    camera.updateProjectionMatrix()
  }, [camera])

  // ── Keyboard listeners ───────────────────────────────────────────────────
  useEffect(() => {
    const down = (e) => {
      if (e.code === 'KeyW')     keys.current.w     = true
      if (e.code === 'KeyA')     keys.current.a     = true
      if (e.code === 'KeyS')     keys.current.s     = true
      if (e.code === 'KeyD')     keys.current.d     = true
      if (e.code === 'ShiftLeft' || e.code === 'ShiftRight') keys.current.shift = true
      if (e.code === 'Space')    keys.current.space = true
    }
    const up = (e) => {
      if (e.code === 'KeyW')     keys.current.w     = false
      if (e.code === 'KeyA')     keys.current.a     = false
      if (e.code === 'KeyS')     keys.current.s     = false
      if (e.code === 'KeyD')     keys.current.d     = false
      if (e.code === 'ShiftLeft' || e.code === 'ShiftRight') keys.current.shift = false
      if (e.code === 'Space')    keys.current.space = false
    }
    window.addEventListener('keydown', down)
    window.addEventListener('keyup',   up)
    return () => {
      window.removeEventListener('keydown', down)
      window.removeEventListener('keyup',   up)
    }
  }, [])

  // ── One-time spawn at start position ─────────────────────────────────────
  const startPosition = useGameStore((state) => state.startPosition)
  useEffect(() => {
    if (mode === CAMERA_MODES.FPV && startPosition && !spawned.current) {
      camera.position.set(...startPosition)
      spawned.current = true
    }
  }, [mode, startPosition, camera])

  // ── Raycaster for gravity (kept for building collision only) ─────────────
  const downRay = useRef(new THREE.Raycaster())

  // ── Per-frame FPV logic ───────────────────────────────────────────────────
  useFrame((_, delta) => {
    if (mode !== CAMERA_MODES.FPV) return

    const dt     = Math.min(delta, 0.05)
    const locked = plcRef.current?.isLocked

    // ── Horizontal movement ───────────────────────────────────────────────
    if (locked) {
      const speed = MOVE_SPEED * (keys.current.shift ? SPRINT_MULT : 1.0)
      const forward = new THREE.Vector3()
      camera.getWorldDirection(forward)
      forward.y = 0
      forward.normalize()
      const right = new THREE.Vector3()
      right.crossVectors(forward, camera.up).normalize()

      const move = new THREE.Vector3()
      if (keys.current.w) move.addScaledVector(forward,  1)
      if (keys.current.s) move.addScaledVector(forward, -1)
      if (keys.current.d) move.addScaledVector(right,    1)
      if (keys.current.a) move.addScaledVector(right,   -1)
      if (move.lengthSq() > 0) move.normalize()

      vel.current.addScaledVector(move, speed * dt * 8)
      vel.current.x -= vel.current.x * DAMP * dt
      vel.current.z -= vel.current.z * DAMP * dt

      const checkCollision = (px, pz) => {
        if (!cityBuildings || cityBuildings.length === 0) return false;
        for (let i = 0; i < cityBuildings.length; i++) {
          const b = cityBuildings[i];
          const margin = 1.0; // wall spacing margin
          const bBase = b.by !== undefined ? b.by : 18.0;
          const heightLimit = bBase + (b.h || 1000); // 1000 for mansion if h missing
          
          if (Math.abs(px - b.bx) < (b.w / 2 + margin) && 
              Math.abs(pz - b.bz) < (b.d / 2 + margin)) {
            // Check if camera is below the roof
            if (camera.position.y - 1.5 < heightLimit) {
              return true;
            }
          }
        }
        return false;
      };

      const tryMove = (dx, dz) => {
        if (dx === 0 && dz === 0) return;
        
        const nextX = camera.position.x + dx;
        const nextZ = camera.position.z + dz;
        
        const currentlyStuck = checkCollision(camera.position.x, camera.position.z);
        const willCollide = checkCollision(nextX, nextZ);
        
        if (!willCollide || currentlyStuck) {
          camera.position.x = nextX;
          camera.position.z = nextZ;
        } else {
          // Cancel velocity on this axis if collided
          if (dx !== 0) vel.current.x = 0;
          if (dz !== 0) vel.current.z = 0;
        }
      }

      // Move X and Z independently to allow sliding along walls
      tryMove(vel.current.x * dt, 0)
      tryMove(0, vel.current.z * dt)
    }

    // ── Gravity using CPU terrain height (accurate, no raycasting) ────────
    const terrainY   = getTerrainHeight(camera.position.x, camera.position.z, 0, true, islands)
    const targetEyeY = terrainY + EYE_HEIGHT

    if (camera.position.y > targetEyeY + 0.3) {
      // Airborne — apply gravity
      yVel.current -= GRAVITY * dt
      camera.position.y += yVel.current * dt
      grounded.current = false
    } else {
      // On ground — snap smoothly
      camera.position.y = THREE.MathUtils.lerp(camera.position.y, targetEyeY, 0.3)
      yVel.current = 0
      grounded.current = true
    }

    // ── Jump ─────────────────────────────────────────────────────────────
    if (keys.current.space && grounded.current) {
      yVel.current = 8
      grounded.current = false
    }
  })

  // ── Click to lock (FPV mode) ──────────────────────────────────────────────
  const handleCanvasClick = useCallback(() => {
    if (mode === CAMERA_MODES.FPV && plcRef.current && !plcRef.current.isLocked) {
      plcRef.current.lock()
    }
  }, [mode])

  useEffect(() => {
    const canvas = gl.domElement
    canvas.addEventListener('click', handleCanvasClick)
    return () => canvas.removeEventListener('click', handleCanvasClick)
  }, [gl, handleCanvasClick])

  return (
    <>
      {mode === CAMERA_MODES.FPV ? (
        <PointerLockControls ref={plcRef} />
      ) : (
        <OrbitControls makeDefault enableDamping dampingFactor={0.05} />
      )}
    </>
  )
}

export default CameraSystem
