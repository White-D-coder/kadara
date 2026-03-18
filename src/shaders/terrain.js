// ─────────────────────────────────────────────────────────────────────────────
// shaders/terrain.js
// GLSL terrain vertex + fragment shaders.
//
// SYNC CONTRACT:  The noise math here is an exact port of terrainUtils.js.
// If you change one, change the other.
// ─────────────────────────────────────────────────────────────────────────────

export const terrainVertexShader = `
  varying vec2 vUv;
  varying vec3 vWorldPosition;
  varying vec3 vNormal;
  varying float vElevation;
  varying float vDist;         // normalised distance from island centre

  // Per-instance attributes
  attribute float aIslandSeed;
  attribute float aIslandType;
  attribute float aIslandRadius;
  attribute float aPeakHeight;

  // ── Noise primitives (must match terrainUtils.js exactly) ──────────────────

  float gradNoise(float x, float z) {
    return sin(x * 1.9 + cos(z * 0.8)) * cos(z * 1.7 + sin(x * 0.6));
  }

  float ridgedNoise(float x, float z) {
    return 1.0 - abs(gradNoise(x, z));
  }

  float fbm(float x, float z, int octaves) {
    float value = 0.0, amplitude = 1.0, frequency = 1.0, maxVal = 0.0;
    for (int i = 0; i < 5; i++) {
      if (i >= octaves) break;
      value    += gradNoise(x * frequency, z * frequency) * amplitude;
      maxVal   += amplitude;
      amplitude *= 0.48;
      frequency *= 2.1;
    }
    return value / maxVal;
  }

  float ridgedFBM(float x, float z, int octaves) {
    float value = 0.0, amplitude = 1.0, frequency = 1.0, maxVal = 0.0;
    for (int i = 0; i < 5; i++) {
      if (i >= octaves) break;
      float r = ridgedNoise(x * frequency, z * frequency);
      value    += pow(r, 2.2) * amplitude;
      maxVal   += amplitude;
      amplitude *= 0.5;
      frequency *= 2.2;
    }
    return value / maxVal;
  }

  // ── Coastline mask ─────────────────────────────────────────────────────────

  float coastlineMask(float lx, float lz, float s) {
    float wAmp = 0.22;
    float wx = lx + sin(lz * 3.1 + s) * wAmp + sin(lz * 7.5 + s * 1.3) * wAmp * 0.3;
    float wz = lz + cos(lx * 2.7 + s * 0.7) * wAmp + cos(lx * 6.3 + s * 1.1) * wAmp * 0.3;
    float d = sqrt(wx * wx + wz * wz);
    float t = clamp((d - 0.68) / 0.32, 0.0, 1.0);
    return 1.0 - t * t * (3.0 - 2.0 * t);
  }

  // ── Height profiles ────────────────────────────────────────────────────────

  float mainHeight(float lx, float lz, float s) {
    float dist = sqrt(lx * lx + lz * lz);
    float mask = coastlineMask(lx, lz, s);

    // Central peak
    float peakMask = max(0.0, 1.0 - pow(dist / 0.35, 1.8));
    float peakNoise = ridgedFBM(lx * 4.0 + s * 1.1, lz * 4.0 + s * 0.9, 5);
    float peak = peakMask * peakNoise * 140.0;

    // Radial ridges
    float angle = atan(lz, lx);
    float ridgePattern = pow(max(0.0, sin(angle * 6.0 + s * 2.0) * 0.5 + 0.5), 1.5);
    float ridgeMask = max(0.0, 1.0 - pow(dist / 0.70, 2.0));
    float ridgeNoise = ridgedFBM(lx * 3.0 + s * 0.5, lz * 3.0 + s * 1.2, 4);
    float ridges = ridgeMask * ridgePattern * ridgeNoise * 70.0;

    // Rolling hills
    float hillMask = max(0.0, 1.0 - pow(dist / 0.85, 2.5));
    float hills = (fbm(lx * 2.0 + s * 0.5, lz * 2.0 + s * 0.4, 4) * 0.5 + 0.5) * 30.0 * hillMask;

    // Detail
    float detail = fbm(lx * 8.0 + s * 2.1, lz * 8.0 + s * 1.9, 3) * 5.0;

    // Beach shelf
    float beachBand = max(0.0, 1.0 - pow(dist / 0.90, 6.0)) * 3.0;

    float raw = peak + ridges + hills + detail + beachBand;
    return mask * max(0.0, raw);
  }

  float rockyHeight(float lx, float lz, float s) {
    float dist = sqrt(lx * lx + lz * lz);
    float mask = coastlineMask(lx, lz, s);
    float spikes = ridgedFBM(lx * 5.5 + s * 1.3, lz * 5.5 + s, 5) * 50.0;
    float cone = max(0.0, 1.0 - dist * 1.3) * 12.0;
    return mask * max(0.0, spikes + cone);
  }

  // ── Elevation dispatcher ───────────────────────────────────────────────────

  float getElevation(vec3 localPos, float seedVal, float islandType) {
    float lx = localPos.x;
    float lz = localPos.z;
    float s = seedVal * 13.7;

    if (islandType < 0.5) {
      return mainHeight(lx, lz, s);   // type 0 = main
    } else {
      return rockyHeight(lx, lz, s);  // type 1 = rocky
    }
  }

  void main() {
    vUv = uv;

    // Instance matrix transforms the unit plane to world position+scale
    vec4 worldPosBase = instanceMatrix * vec4(position, 1.0);

    // Convert world pos to island-local normalised coords (radius = 1)
    // The instanceMatrix scales by diameter, so local = (worldPos - center) / radius
    // But since the plane is already unit and instanceMatrix handles positioning,
    // we can use the position attribute directly (it's in [-0.5, 0.5] range)
    float lx = position.x;   // already in normalised island space
    float lz = position.z;

    float h = getElevation(vec3(lx, 0.0, lz), aIslandSeed, aIslandType);

    // Compute normal via central differences in local space
    float eps = 1.0 / 384.0;  // matches subdivision
    float hL = getElevation(vec3(lx - eps, 0.0, lz), aIslandSeed, aIslandType);
    float hR = getElevation(vec3(lx + eps, 0.0, lz), aIslandSeed, aIslandType);
    float hD = getElevation(vec3(lx, 0.0, lz - eps), aIslandSeed, aIslandType);
    float hU = getElevation(vec3(lx, 0.0, lz + eps), aIslandSeed, aIslandType);

    vElevation = h;
    vDist = sqrt(lx * lx + lz * lz);
    vWorldPosition = worldPosBase.xyz + vec3(0.0, h, 0.0);

    // Normal in world space
    vNormal = normalize(vec3(hL - hR, 2.0 * eps * aIslandRadius, hD - hU));

    gl_Position = projectionMatrix * viewMatrix * vec4(vWorldPosition, 1.0);
  }
`;

export const terrainFragmentShader = `
  varying vec2 vUv;
  varying vec3 vWorldPosition;
  varying vec3 vNormal;
  varying float vElevation;
  varying float vDist;

  uniform float uTime;

  void main() {
    float h = vElevation;
    vec3 N = normalize(vNormal);
    float slope = 1.0 - N.y;  // 0 = flat, 1 = vertical

    // ── Biome colors ─────────────────────────────────────────────────────────
    vec3 colBeach  = vec3(0.83, 0.66, 0.38);  // warm sand  #d4a862
    vec3 colGrass  = vec3(0.36, 0.62, 0.23);  // bright grass #5c9e3a
    vec3 colForest = vec3(0.18, 0.43, 0.18);  // dark forest #2d6e2d
    vec3 colRock   = vec3(0.42, 0.35, 0.29);  // cliff rock  #6a5a4a
    vec3 colSnow   = vec3(0.94, 0.96, 0.98);  // snow/ice

    // ── Height-based blending ────────────────────────────────────────────────
    float beachBlend  = smoothstep(2.0, 6.0, h);
    float grassBlend  = smoothstep(5.0, 12.0, h);
    float forestBlend = smoothstep(18.0, 30.0, h);
    float rockBlend   = smoothstep(55.0, 70.0, h);
    float snowBlend   = smoothstep(110.0, 130.0, h);

    vec3 baseColor = colBeach;
    baseColor = mix(baseColor, colGrass,  beachBlend);
    baseColor = mix(baseColor, colForest, forestBlend);
    baseColor = mix(baseColor, colRock,   rockBlend);
    baseColor = mix(baseColor, colSnow,   snowBlend);

    // Steep slope → rock regardless of height
    float slopeRock = smoothstep(0.40, 0.60, slope);
    baseColor = mix(baseColor, colRock, slopeRock);

    // ── Lighting ─────────────────────────────────────────────────────────────
    vec3 sunDir = normalize(vec3(0.4, 0.8, 0.3));
    float diff = max(dot(N, sunDir), 0.0);

    // Hemisphere ambient (sky blue above, ground green below)
    vec3 skyAmbient    = vec3(0.45, 0.60, 0.75);
    vec3 groundAmbient = vec3(0.18, 0.30, 0.12);
    vec3 ambient = mix(groundAmbient, skyAmbient, N.y * 0.5 + 0.5) * 0.45;

    vec3 sunColor = vec3(1.0, 0.95, 0.85);
    vec3 lit = ambient + sunColor * diff * 0.75;

    vec3 shaded = baseColor * lit;

    // ── Atmospheric fog ──────────────────────────────────────────────────────
    float worldDist = length(vWorldPosition.xz);
    float fog = smoothstep(500.0, 1800.0, worldDist);
    vec3 fogColor = vec3(0.62, 0.78, 0.95);

    // ── Tone mapping + gamma ─────────────────────────────────────────────────
    shaded = shaded / (shaded + vec3(1.0));
    shaded = pow(shaded, vec3(1.0 / 1.8));

    gl_FragColor = vec4(mix(shaded, fogColor, fog), 1.0);
  }
`;
