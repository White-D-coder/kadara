export const gridVertexShader = `
  varying vec2 vUv;
  varying vec3 vWorldPosition;
  varying float vElevation;

  float getElevation(vec3 worldPos) {
    float px = worldPos.x;
    float pz = worldPos.z;
    float s = 0.0; // seedVal 0 for sync

    float dist = length(worldPos.xz);
    float mask = 1.0 - smoothstep(420.0, 520.0, dist);

    float n1 = sin(px * 0.01 + s) * cos(pz * 0.01 + s);
    float ridge = 1.0 - abs(n1);
    
    float n2 = sin(px * 0.03 + s * 1.2) * cos(pz * 0.025 + s * 1.3);
    float n3 = sin(px * 0.08 + s * 1.5) * sin(pz * 0.07 + s * 1.7);
    
    float h = mask * (pow(ridge, 3.0) * 80.0 + n2 * 12.0 + n3 * 2.0);
    return h;
  }

  void main() {
    vUv = uv;
    vec4 worldPosBase = modelMatrix * vec4(position, 1.0);
    float h = getElevation(worldPosBase.xyz);
    vElevation = h;
    vWorldPosition = worldPosBase.xyz + vec3(0.0, h + 0.1, 0.0);
    
    gl_Position = projectionMatrix * viewMatrix * vec4(vWorldPosition, 1.0);
  }
`;

export const gridFragmentShader = `
  varying vec2 vUv;
  varying vec3 vWorldPosition;
  varying float vElevation;
  
  uniform vec2 uHoveredPlot;
  uniform float uTime;
  uniform float uOpacity;

  void main() {
    vec2 gridPos = vUv * 50.0; // Coarser grid for plots (50x50)
    vec2 localUv = fract(gridPos);
    
    float lineThickness = 0.05;
    float gridLine = step(1.0 - lineThickness, localUv.x) + step(1.0 - lineThickness, localUv.y);
    gridLine = clamp(gridLine, 0.0, 1.0);
    
    // Buildable Check: Flat-ish areas above sea level and below high peaks
    bool buildable = vElevation > 1.0 && vElevation < 35.0;
    
    vec3 gridBaseColor = buildable ? vec3(0.0, 0.8, 0.4) : vec3(0.8, 0.2, 0.1);
    
    vec2 plotCoord = floor(gridPos);
    float isHovered = step(length(plotCoord - (uHoveredPlot * 0.5)), 0.1);
    
    float pulse = (sin(uTime * 6.0) * 0.5 + 0.5) * isHovered;
    vec3 finalColor = mix(gridBaseColor, vec3(1.0), pulse);
    
    float alpha = (isHovered * 0.6 + gridLine * 0.2) * uOpacity;
    
    // Distance falloff
    float dist = length(vWorldPosition.xz);
    alpha *= smoothstep(600.0, 200.0, dist);
    
    if (alpha < 0.001) discard;
    
    gl_FragColor = vec4(finalColor, alpha);
  }
`;
