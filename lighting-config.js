/**
 * Centralized Lighting and Shader Configuration
 * Shared between index.html and gltf-viewer.html
 */

import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.168.0/build/three.module.js';

export function setupLighting(scene) {
    // Ambient light - base illumination (increased for better visibility)
    const ambientLight = new THREE.AmbientLight(0xffffff, 1.2);
    scene.add(ambientLight);
    
    // Directional light for visibility (MeshStandardMaterial needs this)
    // Increased intensity to match Speckle-style brightness
    const directionalLight = new THREE.DirectionalLight(0xffffff, 1.2);
    directionalLight.position.set(100, 200, 100); // Higher position like Speckle sun
    scene.add(directionalLight);
    
    // Hemisphere light for ambient occlusion effect (like Speckle)
    const hemiLight = new THREE.HemisphereLight(0xffffff, 0xcccccc, 0.8);
    hemiLight.position.set(0, 200, 0);
    scene.add(hemiLight);
    
    // Additional fill light for better visibility
    const fillLight = new THREE.DirectionalLight(0xffffff, 0.4);
    fillLight.position.set(-50, 100, -50);
    scene.add(fillLight);
    
    return {
        ambientLight,
        directionalLight,
        hemiLight,
        fillLight
    };
}

export function setupRenderer(container) {
    const renderer = new THREE.WebGLRenderer({ 
        antialias: true,
        powerPreference: "high-performance"
    });
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.setSize(window.innerWidth, window.innerHeight);
    // Shadows disabled - using SSAO instead
    renderer.shadowMap.enabled = false;
    // Add tone mapping for better brightness (like Speckle)
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.5; // Increased exposure for brightness
    container.appendChild(renderer.domElement);
    return renderer;
}

export function setupMaterialDoubleSide(mesh) {
    /**
     * Configure materials to render both sides (double-sided)
     * Handles both single materials and material arrays
     */
    if (mesh.isMesh && mesh.material) {
        const materials = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
        materials.forEach(material => {
            material.side = THREE.DoubleSide; // Render both sides
            material.needsUpdate = true;
        });
    }
}

export function configureModelForRendering(model) {
    /**
     * Configure a loaded GLTF model for rendering with double-sided materials
     * Shadows disabled - using SSAO instead
     * Also adds emissive to materials for better visibility (consistent across viewer and main)
     */
    model.traverse((child) => {
        if (child.isMesh) {
            // No shadows - SSAO handles shading
            child.castShadow = false;
            child.receiveShadow = false;
            setupMaterialDoubleSide(child);
            
            // Add emissive to materials for better visibility (consistent across all files)
            if (child.material) {
                const materials = Array.isArray(child.material) ? child.material : [child.material];
                materials.forEach(material => {
                    if (material.type === 'MeshStandardMaterial') {
                        // Add slight emissive to help visibility with ambient-only lighting
                        if (!material.emissive || material.emissive.r === 0) {
                            material.emissive.copy(material.color);
                            material.emissiveIntensity = 0.3; // 30% emissive to help visibility
                        }
                    }
                });
            }
        }
    });
}

export function setupSSAO(scene, camera, renderer, SSAOPass, EffectComposer, RenderPass, OutputPass) {
    /**
     * Set up post-processing (SSAO removed for testing)
     * Returns the EffectComposer for use in render loop
     * Note: SSAOPass, EffectComposer, RenderPass, OutputPass must be imported in the calling file
     */
    const composer = new EffectComposer(renderer);
    const renderPass = new RenderPass(scene, camera);
    composer.addPass(renderPass);
    
    // SSAO pass removed for testing
    // const ssaoPass = new SSAOPass(scene, camera, window.innerWidth, window.innerHeight);
    // ssaoPass.kernelRadius = 16;
    // ssaoPass.kernelSize = 32;
    // ssaoPass.minDistance = 0.005;
    // ssaoPass.maxDistance = 0.1;
    // ssaoPass.output = SSAOPass.OUTPUT.Default;
    // ssaoPass.intensity = 0.5;
    // composer.addPass(ssaoPass);
    
    const outputPass = new OutputPass();
    composer.addPass(outputPass);
    
    return composer;
}

export const sceneConfig = {
    background: new THREE.Color(0xffffff), // White background
};

