import { useEffect } from 'react'
import { useThree } from '@react-three/fiber'
import { Game } from '../../Game.js'
import { Terrain } from '../Terrain.js'
import { Water } from '../water.js'
import { Grass } from '../grass.js'
import { Wind } from '../wind.js'
import { Weather } from '../weather.js'

export function ArchipelagoGenerator() {
    const { scene, camera, gl } = useThree()

    useEffect(() => {
        // Initialize Game singleton with scene and renderer
        const game = Game.getInstance()
        game.scene = scene
        game.camera = camera
        game.gl = gl

        // Create world systems in order
        const weather = new Weather()
        game.weather = weather

        const wind = new Wind()
        game.wind = wind

        const terrain = new Terrain()
        game.terrain = terrain

        const water = new Water()
        game.water = water

        const grass = new Grass()
        game.grass = grass

        return () => {
            // Cleanup: remove objects from scene on unmount
            if (terrain.mesh) scene.remove(terrain.mesh)
            if (water.mesh) scene.remove(water.mesh)
            if (grass.mesh) scene.remove(grass.mesh)
            
            // Dispose geometries and materials
            if (terrain.geometry) terrain.geometry.dispose()
            if (terrain.material) terrain.material.dispose()
            if (water.geometry) water.geometry.dispose()
            if (water.material) water.material.dispose()
            if (grass.geometry) grass.geometry.dispose()
            if (grass.material) grass.material.dispose()
        }
    }, [scene, camera, gl])

    return null
}
