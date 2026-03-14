// import { useRef } from 'react'
// import { useFrame } from '@react-three/fiber'
// import * as THREE from 'three'

// const vertexShader = `
//   uniform float uTime;
//   varying float vElevation;

//   void main() {
//     vec4 modelPosition = modelMatrix * vec4(position, 1.0);
    
//     // Simple Gerstner-like wave
//     float elevation = sin(modelPosition.x * 0.05 + uTime) * sin(modelPosition.z * 0.05 + uTime) * 2.0;
//     modelPosition.y += elevation;
    
//     vElevation = elevation;
    
//     vec4 viewPosition = viewMatrix * modelPosition;
//     vec4 projectedPosition = projectionMatrix * viewPosition;
    
//     gl_Position = projectedPosition;
//   }
// `

// const fragmentShader = `
//   uniform vec3 uColorDeep;
//   uniform vec3 uColorShallow;
//   varying float vElevation;

//   void main() {
//     float mixStrength = (vElevation + 2.0) / 4.0;
//     vec3 color = mix(uColorDeep, uColorShallow, mixStrength);
//     gl_FragColor = vec4(color, 0.9);
    
//     #include <tonemapping_fragment>
//     #include <colorspace_fragment>
//   }
// `

// export function Ocean() {
//   const materialRef = useRef()

//   useFrame((state) => {
//     if (materialRef.current) {
//       materialRef.current.uniforms.uTime.value = state.clock.getElapsedTime()
//     }
//   })

//   // Using rawShaderMaterial or ShaderMaterial
//   return (
//     <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -2, 0]} receiveShadow>
//       <planeGeometry args={[2000, 2000, 128, 128]} />
//       <shaderMaterial
//         ref={materialRef}
//         vertexShader={vertexShader}
//         fragmentShader={fragmentShader}
//         uniforms={{
//           uTime: { value: 0 },
//           uColorDeep: { value: new THREE.Color('#002244') },
//           uColorShallow: { value: new THREE.Color('#0088ff') }
//         }}
//         transparent={true}
//       />
//     </mesh>
//   )
// }
