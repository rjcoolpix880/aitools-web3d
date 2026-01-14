/**
 * Centralized Lighting and Shader Configuration
 * Shared between index.html and gltf-viewer.html
 */

import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.168.0/build/three.module.js';

export function setupLighting(scene) {
    /**
     * STANDARD BASELINE LIGHTING SETTINGS
     * HemisphereLight: Standard intensity 1.0 (bright scenes: 1.5-2.0)
     * - Has NO distance bounds - illuminates entire scene uniformly
     * - Sky color (top): white, Ground color (bottom): light gray
     */
    console.log('[Lighting] setupLighting called');
    
    const hemiLight = new THREE.HemisphereLight(0xffffff, 0xcccccc, 1.0); // Increased significantly for visibility
    hemiLight.position.set(0, 200, 0);
    
    // Ensure light is visible/enabled
    hemiLight.visible = true;
    
    scene.add(hemiLight);
    
    // Debug: Verify light is in scene - check multiple ways
    console.log('[Lighting] HemisphereLight added:', {
        intensity: hemiLight.intensity,
        color: hemiLight.color.getHexString(),
        groundColor: hemiLight.groundColor.getHexString(),
        position: hemiLight.position,
        visible: hemiLight.visible,
        inScene: scene.children.includes(hemiLight),
        sceneChildrenCount: scene.children.length,
        sceneLights: scene.children.filter(child => child.isLight).length
    });
    
    // Also check scene's internal light tracking
    console.log('[Lighting] Scene lights array:', scene.children.filter(child => child.isLight));
    
    // Primary DirectionalLight for shadows and definition
    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.4);
    directionalLight.position.set(100, 200, 100);
    
    // Enable shadow casting
    directionalLight.castShadow = true;
    
    // Configure shadow map for soft shadows
    directionalLight.shadow.mapSize.width = 2048;
    directionalLight.shadow.mapSize.height = 2048;
    directionalLight.shadow.camera.near = 0.5;
    directionalLight.shadow.camera.far = 1000;
    directionalLight.shadow.camera.left = -200;
    directionalLight.shadow.camera.right = 200;
    directionalLight.shadow.camera.top = 200;
    directionalLight.shadow.camera.bottom = -200;
    
    // Soft shadow configuration
    directionalLight.shadow.radius = 4; // Soft shadow blur radius
    directionalLight.shadow.bias = -0.0001; // Reduce shadow acne
    
    scene.add(directionalLight);
    
    console.log('[Lighting] DirectionalLight added with shadows');
    
    return {
        hemiLight,
        directionalLight
    };
}

export function setupRenderer(container) {
    const renderer = new THREE.WebGLRenderer({ 
        antialias: true,
        powerPreference: "high-performance"
    });
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.setSize(window.innerWidth, window.innerHeight);
    
    // Enable shadow mapping for directional light shadows
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap; // Soft shadow edges
    
    /**
     * DEFAULT RENDERER SETTINGS
     * Tone Mapping: NoToneMapping (default) - fastest, no compression, works for typical lighting
     * - This is Three.js default - renders raw light values directly
     * - No exposure needed with NoToneMapping
     */
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.NoToneMapping; // Default - fastest, no compression
    
    container.appendChild(renderer.domElement);
    return renderer;
}

/**
 * Create a global base material for all GLTF models
 * Simple, consistent material that responds well to lighting
 */
export function createBaseMaterial() {
    const baseMaterial = new THREE.MeshStandardMaterial({
        color: 0xD3D3D3, // Light gray
        roughness: 0.3,  // Slightly reflective (not too matte, not too shiny)
        metalness: 0.0,  // Non-metallic
        side: THREE.DoubleSide, // Visible from both sides
        transparent: false,
        opacity: 1.0
    });
    
    // Explicitly remove emissive properties
    baseMaterial.emissive.set(0x000000);
    baseMaterial.emissiveIntensity = 0.0;
    
    return baseMaterial;
}

export function setupMaterialDoubleSide(mesh) {
    /**
     * Configure materials to render both sides (double-sided)
     * Handles both single materials and material arrays
     * TESTING: Temporarily using FrontSide to test if double-sided is the issue
     */
    if (mesh.isMesh && mesh.material) {
        const materials = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
        materials.forEach(material => {
            // TEST: Try FrontSide instead of DoubleSide to see if that's the issue
            material.side = THREE.FrontSide; // Changed from DoubleSide for testing
            material.needsUpdate = true;
        });
    }
}

export function configureModelForRendering(model, preserveColors = false) {
    /**
     * Configure a loaded GLTF model for rendering
     * Replaces all materials with a global base material for consistency
     * Preserves opacity settings for animations
     * 
     * @param {THREE.Object3D} model - The GLTF scene to configure
     * @param {boolean} preserveColors - If true, keeps original colors from GLTF, only updates other properties
     */
    let meshCount = 0;
    
    model.traverse((child) => {
        if (child.isMesh) {
            meshCount++;
            // Enable shadows for definition
            child.castShadow = true;
            child.receiveShadow = true;
            
            // Replace all materials with the global base material
            if (child.material) {
                // Store original properties before replacing material
                let originalOpacity = 1.0;
                let wasTransparent = false;
                let originalColors = [];
                
                if (Array.isArray(child.material)) {
                    originalOpacity = child.material[0]?.opacity ?? 1.0;
                    wasTransparent = child.material[0]?.transparent ?? false;
                    originalColors = child.material.map(mat => mat.color ? mat.color.clone() : null);
                } else {
                    originalOpacity = child.material.opacity ?? 1.0;
                    wasTransparent = child.material.transparent ?? false;
                    originalColors = [child.material.color ? child.material.color.clone() : null];
                }
                
                // Create base material and preserve opacity
                const newMaterial = createBaseMaterial();
                newMaterial.opacity = originalOpacity;
                newMaterial.transparent = wasTransparent;
                
                // If preserveColors is true, keep the original colors
                if (preserveColors && originalColors.length > 0 && originalColors[0]) {
                    if (Array.isArray(child.material)) {
                        // Multiple materials - preserve each original color
                        child.material = child.material.map((mat, idx) => {
                            const newMat = newMaterial.clone();
                            newMat.opacity = originalOpacity;
                            newMat.transparent = wasTransparent;
                            if (originalColors[idx]) {
                                newMat.color.copy(originalColors[idx]);
                            }
                            return newMat;
                        });
                    } else {
                        // Single material - preserve original color
                        newMaterial.color.copy(originalColors[0]);
                        child.material = newMaterial;
                    }
                } else {
                    // Use base material color (gray)
                    if (Array.isArray(child.material)) {
                        // Multiple materials - replace each with base material
                        child.material = child.material.map(() => {
                            const mat = newMaterial.clone();
                            mat.opacity = originalOpacity;
                            mat.transparent = wasTransparent;
                            return mat;
                        });
                    } else {
                        // Single material - replace with base material
                        child.material = newMaterial;
                    }
                }
                
                // Ensure material updates
                if (Array.isArray(child.material)) {
                    child.material.forEach(mat => mat.needsUpdate = true);
                } else {
                    child.material.needsUpdate = true;
                }
            }
        }
    });
    
    const colorInfo = preserveColors ? 'preserving GLTF colors' : '#D3D3D3';
    console.log(`[Material] Applied global base material (${colorInfo}, roughness 0.3) to ${meshCount} meshes`);
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
    
    // Debug: Check OutputPass settings (might affect brightness)
    console.log('[PostProcessing] OutputPass created:', {
        toneMapping: outputPass.toneMapping,
        hasToneMapping: 'toneMapping' in outputPass
    });
    
    composer.addPass(outputPass);
    
    return composer;
}

export const sceneConfig = {
    background: new THREE.Color(0xffffff), // White background
};

