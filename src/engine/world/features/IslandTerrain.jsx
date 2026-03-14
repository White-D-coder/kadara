import { useRef, useEffect, useMemo } from 'react'
import * as THREE from 'three'

// Standard island geometry
const islandGeometry = new THREE.PlaneGeometry(100, 100, 128, 128)
islandGeometry.rotateX(-Math.PI / 2)

export function IslandTerrain({ islands }) {
  const meshRef = useRef()
  const count = islands ? islands.length : 0

  useEffect(() => {
    if (!meshRef.current || !islands) return
    const dummy = new THREE.Object3D()

    islands.forEach((is, i) => {
      dummy.position.set(...is.position)
      dummy.scale.set(...is.scale)
      dummy.rotation.set(0, is.rotation, 0)
      dummy.updateMatrix()
      meshRef.current.setMatrixAt(i, dummy.matrix)
    })

    meshRef.current.instanceMatrix.needsUpdate = true
  }, [islands])

  const onBeforeCompile = useMemo(() => (shader) => {
    shader.vertexShader = shader.vertexShader.replace(
      'void main() {',
      `
      varying float vKElevation;
      varying float vKSlope;
      varying vec3 vKNormal;

      float hash(vec3 p) {
        p = fract(p * 0.3183099 + 0.1);
        p *= 17.0;
        return fract(p.x * p.y * p.z * (p.x + p.y + p.z));
      }

      float noise(vec3 x) {
        vec3 i = floor(x);
        vec3 f = fract(x);
        f = f * f * (3.0 - 2.0 * f);
        return mix(mix(mix(hash(i + vec3(0, 0, 0)), hash(i + vec3(1, 0, 0)), f.x),
                       mix(hash(i + vec3(0, 1, 0)), hash(i + vec3(1, 1, 0)), f.x), f.y),
                   mix(mix(hash(i + vec3(0, 0, 1)), hash(i + vec3(1, 0, 1)), f.x),
                       mix(hash(i + vec3(0, 1, 1)), hash(i + vec3(1, 1, 1)), f.x), f.y), f.z);
      }

      float fbm(vec3 p) {
        float v = 0.0; float a = 0.5;
        for (int i = 0; i < 4; i++) {
          v += a * noise(p); p *= 2.0; a *= 0.5;
        }
        return v;
      }

      float getTerrainHeight(vec3 lp) {
        float d = length(lp.xz);
        float nd = clamp(d / 48.0, 0.0, 1.0);
        float profile = pow(0.5 + 0.5 * cos(3.14159 * nd), 1.0); // Sharper base
        
        // High-frequency Ridge Noise for Karst look
        float n1 = noise(lp * 0.15);
        float n2 = noise(lp * 0.3);
        float ridge = 1.0 - abs(n1 * 1.5 - 0.75);
        float jagged = ridge * (0.6 + 0.4 * n2);
        
        return profile * jagged * 25.0; // Increased scale for Giga-islands
      }

      void main() {
      `
    ).replace(
      '#include <begin_vertex>',
      `
      #include <begin_vertex>
      float h = getTerrainHeight(position);
      transformed.y += h;
      vKElevation = h;
      
      float eps = 0.5;
      float hR = getTerrainHeight(position + vec3(eps, 0.0, 0.0));
      float hF = getTerrainHeight(position + vec3(0.0, 0.0, eps));
      vec3 localNml = normalize(vec3(h - hR, eps, h - hF));
      
      vKNormal = normalize((modelMatrix * instanceMatrix * vec4(localNml, 0.0)).xyz);
      vKSlope = 1.0 - abs(vKNormal.y);
      `
    );

    shader.fragmentShader = shader.fragmentShader.replace(
      'void main() {',
      `
      varying float vKElevation;
      varying float vKSlope;
      varying vec3 vKNormal;
      void main() {
      `
    ).replace(
      '#include <map_fragment>',
      `
      #include <map_fragment>
      vec3 sand = vec3(0.9, 0.85, 0.75);
      vec3 jungle = vec3(0.05, 0.35, 0.02);
      vec3 rock = vec3(0.35, 0.35, 0.38);
      
      vec3 color = mix(sand, jungle, smoothstep(1.0, 5.0, vKElevation));
      float rockMask = smoothstep(0.40, 0.60, vKSlope);
      color = mix(color, rock, rockMask);
      
      diffuseColor.rgb = color;
      `
    );
  }, [])

  if (count === 0) return null

  return (
    <instancedMesh ref={meshRef} args={[islandGeometry, null, count]} receiveShadow castShadow>
      <meshStandardMaterial color="#ffffff" roughness={0.9} onBeforeCompile={onBeforeCompile} />
    </instancedMesh>
  )
}
