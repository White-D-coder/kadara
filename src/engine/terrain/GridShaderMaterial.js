import { shaderMaterial } from '@react-three/drei'
import * as THREE from 'three'

// This shader draws a 20x20m grid based on world coordinates without extra geometry
export const GridShaderMaterial = shaderMaterial(
  {
    uBaseColor: new THREE.Color('#2e632b'), // Grass green
    uLineColor: new THREE.Color('#ffffff'), // White lines
    uHoverColor: new THREE.Color('#00ffff'), // Holographic blue
    uHoveredPlot: new THREE.Vector2(-9999, -9999), // out of bounds default
    uGridSize: 20.0,
    uLineWidth: 0.03, // Thinner lines for cyberpunk look
    uTime: 0.0
  },
  // vertex shader
  `
    varying vec3 vWorldPosition;
    
    void main() {
      // Calculate real world position across all instanced meshes
      #ifdef USE_INSTANCING
      vec4 worldPosition = modelMatrix * instanceMatrix * vec4(position, 1.0);
      #else
      vec4 worldPosition = modelMatrix * vec4(position, 1.0);
      #endif
      
      vWorldPosition = worldPosition.xyz;
      
      gl_Position = projectionMatrix * viewMatrix * worldPosition;
    }
  `,
  // fragment shader
  `
    uniform vec3 uBaseColor;
    uniform vec3 uLineColor;
    uniform vec3 uHoverColor;
    uniform vec2 uHoveredPlot;
    uniform float uGridSize;
    uniform float uLineWidth;
    uniform float uTime;
    
    varying vec3 vWorldPosition;

    void main() {
      // Find the plot X and Z coordinate
      float plotX = floor(vWorldPosition.x / uGridSize);
      float plotZ = floor(vWorldPosition.z / uGridSize);
      
      // Calculate smooth distance to edges using fract
      vec2 coord = vWorldPosition.xz / uGridSize;
      vec2 grid = fract(coord);
      vec2 dist = min(grid, 1.0 - grid);
      
      // sharp smoothstep borders
      float edgeX = 1.0 - smoothstep(0.0, uLineWidth, dist.x);
      float edgeZ = 1.0 - smoothstep(0.0, uLineWidth, dist.y);
      float isLine = max(edgeX, edgeZ);
      
      // Check if mouse is hovering this specific plot
      bool isHovered = (plotX == uHoveredPlot.x && plotZ == uHoveredPlot.y);
      
      vec3 finalColor = uBaseColor;
      
      if (isHovered) {
        // Holographic sine-wave pulse effect
        float pulse = sin(uTime * 4.0) * 0.5 + 0.5;
        finalColor = mix(finalColor, uHoverColor, 0.4 + pulse * 0.3);
        
        if (isLine > 0.1) {
          finalColor = mix(uHoverColor, vec3(1.0), pulse); // borders fully glow white/cyan
        }
      } else {
        if (isLine > 0.1) {
          finalColor = mix(uBaseColor, uLineColor, isLine * 0.4); // Sharp neon-like grid lines
        }
      }
      
      gl_FragColor = vec4(finalColor, 1.0);
      
      #include <tonemapping_fragment>
      #include <colorspace_fragment>
    }
  `
)
