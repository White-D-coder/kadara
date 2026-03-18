export const waterVertexShader = `
  varying vec2 vUv;
  varying vec3 vWorldPosition;
  uniform float uTime;

  void main() {
    vUv = uv;
    vec3 pos = position;

    // 3-Layer Wave Frequencies
    float w1 = sin(pos.x * 0.07 + uTime * 1.1) * 0.35;
    float w2 = sin(pos.z * 0.11 + uTime * 0.85) * 0.25;
    float w3 = sin((pos.x - pos.z) * 0.045 + uTime * 0.6) * 0.45;
    float waveY = w1 + w2 + w3;
    pos.y += waveY;

    vec4 worldPosition = modelMatrix * vec4(pos, 1.0);
    vWorldPosition = worldPosition.xyz;
    gl_Position = projectionMatrix * viewMatrix * worldPosition;
  }
`;

export const waterFragmentShader = `
  varying vec2 vUv;
  varying vec3 vWorldPosition;
  uniform float uTime;
  uniform vec3 uCameraPosition;

  // Simple noise for foam
  float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453123); }
  float noise(vec2 p) {
    vec2 i = floor(p); vec2 f = fract(p);
    vec2 u = f*f*(3.0-2.0*f);
    return mix(mix(hash(i + vec2(0,0)), hash(i + vec2(1,0)), u.x),
               mix(hash(i + vec2(0,1)), hash(i + vec2(1,1)), u.x), u.y);
  }

  void main() {
    float x = vWorldPosition.x;
    float z = vWorldPosition.z;

    // Wave reconstruction for foam
    float w1 = sin(x * 0.07 + uTime * 1.1) * 0.35;
    float w2 = sin(z * 0.11 + uTime * 0.85) * 0.25;
    float w3 = sin((x - z) * 0.045 + uTime * 0.6) * 0.45;
    float waveY = w1 + w2 + w3;

    // Foam crest where wave peak is high
    float foamMask = step(0.28, waveY) * noise(vUv * 12.0 + uTime * 0.5);
    vec3 foamColor = vec3(1.0, 1.0, 1.0);

    // Distance-based shore blend (matches island radius 400)
    float distFromIsland = length(vWorldPosition.xz);
    float shoreBlend = 1.0 - smoothstep(50.0, 600.0, distFromIsland);

    // Shoreline foam ring at island edge
    float shoreFoam = smoothstep(320.0, 400.0, distFromIsland) * (1.0 - smoothstep(400.0, 450.0, distFromIsland));
    shoreFoam *= noise(vWorldPosition.xz * 0.15 + uTime * 0.3) * 0.8;

    // Color palette matching ref images
    vec3 deepColor    = vec3(0.04, 0.24, 0.37);   // deep navy  #0a3d5f
    vec3 midColor     = vec3(0.10, 0.47, 0.53);   // mid teal   #1a7887
    vec3 shallowColor = vec3(0.25, 0.77, 0.75);   // teal shore  #40c4c0

    vec3 waterColor = mix(deepColor, midColor, smoothstep(0.0, 0.4, shoreBlend));
    waterColor = mix(waterColor, shallowColor, smoothstep(0.4, 1.0, shoreBlend));

    // Apply foam
    waterColor = mix(waterColor, foamColor, foamMask * 0.5);
    waterColor = mix(waterColor, foamColor, shoreFoam);

    // Fresnel effect
    vec3 worldNormal = vec3(0.0, 1.0, 0.0);
    vec3 viewDir = normalize(uCameraPosition - vWorldPosition);
    float fresnel = pow(1.0 - max(dot(worldNormal, viewDir), 0.0), 4.0);

    vec3 skyColor = vec3(0.55, 0.72, 0.92);
    waterColor = mix(waterColor, skyColor, fresnel * 0.35);

    // Subtle darkening at distance
    float distFog = smoothstep(800.0, 2000.0, distFromIsland);
    waterColor = mix(waterColor, deepColor * 0.8, distFog * 0.3);

    gl_FragColor = vec4(waterColor, 0.88);
  }
`;
