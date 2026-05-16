import fs from 'fs';
import { generateArchipelago } from './src/engine/terrain/IslandGenerator.js';
import { getTerrainHeight } from './src/engine/terrain/terrainUtils.js';

// Setup
const WORLD_SEED = "Kadara-World"; 
const SIZE = 1000; // Total width/depth in meters (-500 to 500)
const RESOLUTION = 2; // Meters per vertex (lower is more detailed)

const islands = generateArchipelago(WORLD_SEED);

console.log(`Generating island OBJ file (${SIZE}x${SIZE}m, step: ${RESOLUTION}m)...`);

const steps = Math.floor(SIZE / RESOLUTION);
const offset = SIZE / 2;

let objContent = `# Kadara Island Terrain\n`;
let vertexCount = 0;

// 1. Generate Vertices
for (let j = 0; j <= steps; j++) {
    for (let i = 0; i <= steps; i++) {
        const x = (i * RESOLUTION) - offset;
        const z = (j * RESOLUTION) - offset;
        
        // Ensure accurate height using game's generator
        const y = getTerrainHeight(x, z, 0, true, islands);
        
        objContent += `v ${x.toFixed(3)} ${y.toFixed(3)} ${z.toFixed(3)}\n`;
        vertexCount++;
    }
}

console.log(`Generated ${vertexCount} vertices. Generating faces...`);

// 2. Generate Faces
const vertsPerRow = steps + 1;
for (let j = 0; j < steps; j++) {
    for (let i = 0; i < steps; i++) {
        const v1 = (j * vertsPerRow) + i + 1;
        const v2 = (j * vertsPerRow) + (i + 1) + 1;
        const v3 = ((j + 1) * vertsPerRow) + (i + 1) + 1;
        const v4 = ((j + 1) * vertsPerRow) + i + 1;
        
        objContent += `f ${v1} ${v2} ${v3} ${v4}\n`;
    }
}

// 3. Write to file
const outputPath = './island_terrain.obj';
fs.writeFileSync(outputPath, objContent);

console.log(`Successfully exported pure island mesh to ${outputPath}.`);
console.log(`You can now import this file directly into Blender!`);
