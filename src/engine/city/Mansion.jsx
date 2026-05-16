import React from 'react'
import * as THREE from 'three'

const Mansion = ({ position = [0, 0, 0], rotation = [0, 0, 0], scale = 1 }) => {
  return (
    <group position={position} rotation={rotation} scale={scale}>
      {/* Main Base */}
      <mesh position={[0, 4, 0]} castShadow receiveShadow>
        <boxGeometry args={[20, 8, 15]} />
        <meshStandardMaterial color="#ffffff" roughness={0.1} metalness={0.2} />
      </mesh>

      {/* Second Floor - Offset and Cantilevered */}
      <mesh position={[5, 12, 2]} castShadow receiveShadow>
        <boxGeometry args={[12, 4, 10]} />
        <meshStandardMaterial color="#f0f0f0" roughness={0.1} metalness={0.1} />
      </mesh>

      {/* Large Glass Windows */}
      <mesh position={[-4, 10, 7.6]} castShadow>
        <boxGeometry args={[8, 6, 0.2]} />
        <meshStandardMaterial 
          color="#88ccff" 
          transparent 
          opacity={0.4} 
          roughness={0} 
          metalness={0.9} 
          envMapIntensity={2}
        />
      </mesh>

      {/* Balcony Railing */}
      <mesh position={[5, 14.5, 7.2]} castShadow>
        <boxGeometry args={[12, 0.2, 0.2]} />
        <meshStandardMaterial color="#333333" />
      </mesh>
      <mesh position={[5, 14.1, 7.2]} castShadow>
        <boxGeometry args={[12, 1, 0.1]} />
        <meshStandardMaterial color="#88ccff" transparent opacity={0.3} />
      </mesh>

      {/* Entrance Pillar (Marble-like) */}
      <mesh position={[-8, 4, 8]} castShadow receiveShadow>
        <boxGeometry args={[1.5, 8, 1.5]} />
        <meshStandardMaterial color="#ffffff" roughness={0.05} />
      </mesh>

      {/* Infinity Pool Area */}
      <group position={[12, 0.1, -2]}>
        <mesh receiveShadow>
          <boxGeometry args={[10, 0.5, 12]} />
          <meshStandardMaterial color="#eeeeee" />
        </mesh>
        <mesh position={[0, 0.3, 0]}>
          <boxGeometry args={[8, 0.1, 10]} />
          <meshStandardMaterial color="#00ffff" transparent opacity={0.6} metalness={0.8} />
        </mesh>
      </group>

      {/* Decorative Lights */}
      {[[-9, 8, 7.8], [9, 8, 7.8], [-9, 8, -7.8]].map((pos, i) => (
        <mesh key={i} position={pos}>
          <sphereGeometry args={[0.3, 16, 16]} />
          <meshStandardMaterial emissive="#ffddaa" emissiveIntensity={2} color="#ffffff" />
          <pointLight intensity={10} distance={15} color="#ffaa55" />
        </mesh>
      ))}

      {/* Roof Garden/Solar Panels */}
      <mesh position={[0, 14.1, -2]} rotation={[-Math.PI / 10, 0, 0]}>
        <boxGeometry args={[10, 0.2, 8]} />
        <meshStandardMaterial color="#112233" roughness={0.1} metalness={0.8} />
      </mesh>
    </group>
  )
}

export default Mansion
