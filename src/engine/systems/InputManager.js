import { useEffect } from 'react'

export const COMMANDS = {
  MOVE_FORWARD: 'MOVE_FORWARD',
  MOVE_BACKWARD: 'MOVE_BACKWARD',
  MOVE_LEFT: 'MOVE_LEFT',
  MOVE_RIGHT: 'MOVE_RIGHT',
  JUMP: 'JUMP',
  TOGGLE_PLANNER_MODE: 'TOGGLE_PLANNER_MODE'
}

export const keyMap = {
  'KeyW': COMMANDS.MOVE_FORWARD,
  'KeyS': COMMANDS.MOVE_BACKWARD,
  'KeyA': COMMANDS.MOVE_LEFT,
  'KeyD': COMMANDS.MOVE_RIGHT,
  'Space': COMMANDS.JUMP,
  'KeyP': COMMANDS.TOGGLE_PLANNER_MODE
}

export const activeCommands = new Set()

export function InputManager() {
  useEffect(() => {
    const handleKeyDown = (e) => {
      const command = keyMap[e.code]
      if (command) {
        activeCommands.add(command)
      }
    }

    const handleKeyUp = (e) => {
      const command = keyMap[e.code]
      if (command) {
        activeCommands.delete(command)
        
        // Emit custom event for decoupling if P is pressed
        if (command === COMMANDS.TOGGLE_PLANNER_MODE) {
          window.dispatchEvent(new CustomEvent('toggle_planner_mode'))
        }
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    window.addEventListener('keyup', handleKeyUp)

    return () => {
      window.removeEventListener('keydown', handleKeyDown)
      window.removeEventListener('keyup', handleKeyUp)
    }
  }, [])

  return null
}
