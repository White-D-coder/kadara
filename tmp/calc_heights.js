
import * as THREE from 'three';
import { generateArchipelago } from './src/engine/terrain/IslandGenerator.js';
import { getTerrainHeight } from './src/engine/terrain/terrainUtils.js';

const seed = 'CAD_CITY_2026';
const islands = generateArchipelago(seed);

console.log('Central Island Height at (0,0):', getTerrainHeight(0, 0, 0, true, islands));

// Find a flat area around center for the city
for (let x = -50; x <= 50; x += 10) {
    for (let z = -50; z <= 50; z += 10) {
        const h = getTerrainHeight(x, z, 0, true, islands);
        console.log(`Height at (${x}, ${z}): ${h.toFixed(2)}`);
    }
}
