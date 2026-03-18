import React from 'react'
import useGameStore from '../../store/useGameStore'
import Building from './Building'

const CitySystem = () => {
  const placedBuildings = useGameStore((state) => state.placedBuildings)

  return (
    <group>
      {placedBuildings.map((building) => (
        <Building 
          key={building.id}
          position={building.position}
          rotation={building.rotation || [0, Math.random() * Math.PI * 2, 0]}
          type={building.type}
          scale={building.scale || 0.15}
        />
      ))}
    </group>
  )
}

export default CitySystem
