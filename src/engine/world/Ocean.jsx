import { useRef, useMemo } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'

const vertexShader = `
  uniform float uTime;
  varying float vElevation;
  varying vec2 vUv;
  
  // Wave parameters: direction.x, direction.y, steepness, wavelength
  uniform vec4 uWaveA;
  uniform vec4 uWaveB;
  uniform vec4 uWaveC;
  uniform vec4 uWaveD;

  vec3 gerstnerWave(vec4 wave, vec3 p, inout vec3 tangent, inout vec3 binormal) {
      float steepness = wave.z;
      float wavelength = wave.w;
      float k = 2.0 * 3.14159 / wavelength;
      float c = sqrt(9.8 / k);
      vec2 d = normalize(wave.xy);
      float f = k * (dot(d, p.xz) - c * uTime * 0.5);
      float a = steepness / k;
      
      tangent += vec3(
          -d.x * d.x * (steepness * sin(f)),
          d.x * (steepness * cos(f)),
          -d.x * d.y * (steepness * sin(f))
      );
      binormal += vec3(
          -d.x * d.y * (steepness * sin(f)),
          d.y * (steepness * cos(f)),
          -d.y * d.y * (steepness * sin(f))
      );
      return vec3(
          d.x * (a * cos(f)),
          a * sin(f),
          d.y * (a * cos(f))
      );
  }

  void main() {
    vUv = uv;
    
    // Initial position
    vec4 modelPosition = modelMatrix * vec4(position, 1.0);
    vec3 p = modelPosition.xyz;

    vec3 tangentAc = vec3(1.0, 0.0, 0.0);
    vec3 binormalAc = vec3(0.0, 0.0, 1.0);

    vec3 pAc = p;
    pAc += gerstnerWave(uWaveA, p, tangentAc, binormalAc);
    pAc += gerstnerWave(uWaveB, p, tangentAc, binormalAc);
    pAc += gerstnerWave(uWaveC, p, tangentAc, binormalAc);
    pAc += gerstnerWave(uWaveD, p, tangentAc, binormalAc);
    
    vElevation = pAc.y - p.y;
    
    vec4 viewPosition = viewMatrix * vec4(pAc, 1.0);
    gl_Position = projectionMatrix * viewPosition;
  }
`

const fragmentShader = `
  uniform vec3 uColorDeep;
  uniform vec3 uColorShallow;
  uniform float uTime;
  
  varying float vElevation;
  varying vec2 vUv;

  float random(in vec2 st) {
      return fract(sin(dot(st.xy, vec2(12.9898,78.233))) * 43758.5453123);
  }

  float noise(in vec2 st) {
      vec2 i = floor(st);
      vec2 f = fract(st);

      float a = random(i);
      float b = random(i + vec2(1.0, 0.0));
      float c = random(i + vec2(0.0, 1.0));
      float d = random(i + vec2(1.0, 1.0));

      vec2 u = f*f*(3.0-2.0*f);

      return mix(a, b, u.x) +
              (c - a)* u.y * (1.0 - u.x) +
              (d - b) * u.x * u.y;
  }

  void main() {
    // Determine depth base color
    float depthMix = smoothstep(-2.0, 2.0, vElevation);
    vec3 waterColor = mix(uColorDeep, uColorShallow, depthMix);
    
    // Foam logic based on height and noise
    float foamNoise = noise(vUv * 500.0 + uTime);
    float foamAmount = smoothstep(0.8, 1.5, vElevation + foamNoise * 0.8);
    
    vec3 finalColor = mix(waterColor, vec3(1.0, 1.0, 1.0), foamAmount);
    
    // Simple specular highlight off the sun
    float lightMix = smoothstep(1.5, 2.0, vElevation) * 0.2;
    if (foamAmount < 0.1) finalColor += vec3(1.0)*lightMix;
    
    gl_FragColor = vec4(finalColor, 0.9);
    
    #include <tonemapping_fragment>
    #include <colorspace_fragment>
  }
`

export function Ocean() {
  const materialRef = useRef()

  const uniforms = useMemo(() => ({
    uTime: { value: 0 },
    uColorDeep: { value: new THREE.Color('#008fa0') }, // Vibrant deep cyan/teal from the image
    uColorShallow: { value: new THREE.Color('#38e0d6') }, // Bright turquoise shallow water
    // wave parameter: dirX, dirY, steepness, wavelength
    // Increased wavelength and adjusted steepness for wider, more realistic rolling waves
    uWaveA: { value: new THREE.Vector4(1.0, 1.0, 0.25, 80.0) },
    uWaveB: { value: new THREE.Vector4(1.0, 0.6, 0.25, 45.0) },
    uWaveC: { value: new THREE.Vector4(1.0, 1.3, 0.2, 30.0) },
    uWaveD: { value: new THREE.Vector4(0.8, -0.2, 0.1, 15.0) }
  }), [])

  useFrame((state) => {
    if (materialRef.current) {
      materialRef.current.uniforms.uTime.value = state.clock.getElapsedTime()
    }
  })

  // Using rawShaderMaterial or ShaderMaterial
  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -2, 0]} receiveShadow>
      <planeGeometry args={[2000, 2000, 256, 256]} />
      <shaderMaterial
        ref={materialRef}
        vertexShader={vertexShader}
        fragmentShader={fragmentShader}
        uniforms={uniforms}
        transparent={true}
        wireframe={false}
      />
    </mesh>
  )
}
