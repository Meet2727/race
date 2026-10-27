import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { OBJLoader } from 'three/addons/loaders/OBJLoader.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { OBJExporter } from 'three/addons/exporters/OBJExporter.js';

const container = document.getElementById('canvas-container');
const loadingBanner = document.getElementById('loading-banner');

const scene = new THREE.Scene();

const camera = new THREE.PerspectiveCamera(38, container.clientWidth / container.clientHeight, 0.05, 100);
camera.position.set(0, 1.25, 2.55);

const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'high-performance' });
renderer.setSize(container.clientWidth, container.clientHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.2;
container.appendChild(renderer.domElement);

const controls = new OrbitControls(camera, renderer.domElement);
controls.target.set(0, 1.12, 0);
controls.enableDamping = true;
controls.dampingFactor = 0.05;
controls.minDistance = 0.45;
controls.maxDistance = 6.0;
controls.maxPolarAngle = Math.PI / 2 + 0.08;

// Realistic 4-Point Studio PBR Lighting
const hemiLight = new THREE.HemisphereLight(0xfff5e8, 0x1c2235, 0.85);
scene.add(hemiLight);

const keyLight = new THREE.DirectionalLight(0xfff4e0, 2.1);
keyLight.position.set(2.2, 3.2, 2.8);
keyLight.castShadow = true;
keyLight.shadow.mapSize.set(2048, 2048);
keyLight.shadow.bias = -0.0005;
scene.add(keyLight);

const fillLight = new THREE.DirectionalLight(0xaaccff, 0.95);
fillLight.position.set(-2.4, 1.8, 1.5);
scene.add(fillLight);

const rimLight = new THREE.SpotLight(0xffdf9e, 2.6);
rimLight.position.set(0, 2.8, -2.5);
scene.add(rimLight);

// Studio Luxury Pedestal
const pedestalGroup = new THREE.Group();
const baseGeo = new THREE.CylinderGeometry(0.85, 0.98, 0.06, 64);
const baseMat = new THREE.MeshStandardMaterial({ color: 0x12151f, metalness: 0.75, roughness: 0.25 });
const baseMesh = new THREE.Mesh(baseGeo, baseMat);
baseMesh.position.y = -0.03;
baseMesh.receiveShadow = true;
pedestalGroup.add(baseMesh);

const goldRingGeo = new THREE.TorusGeometry(0.86, 0.012, 16, 128);
const goldRingMat = new THREE.MeshStandardMaterial({ color: 0xd4af37, metalness: 0.95, roughness: 0.15 });
const goldRing = new THREE.Mesh(goldRingGeo, goldRingMat);
goldRing.rotation.x = Math.PI / 2;
pedestalGroup.add(goldRing);
scene.add(pedestalGroup);

// Loaders
const texLoader = new THREE.TextureLoader();
const objLoader = new OBJLoader();
const gltfLoader = new GLTFLoader();

// Character Presets with Generated Depth & Normal PBR Maps + Pre-built .OBJ 3D Meshes
const presets = {
    1: {
        name: 'Warrior (Green Eyes)',
        diffuse: 'assets/character1.jpg',
        depth: 'assets/character1_depth.jpg',
        normal: 'assets/character1_normal.jpg',
        obj3d: 'assets/character1_3d.obj',
        skin: '#f0d0c2',
        hair: '#221d1a',
        outfit: '#1c1f1b',
        trim: '#e2b83e'
    },
    2: {
        name: 'Royal (Gold / Blonde)',
        diffuse: 'assets/character2.jpg',
        depth: 'assets/character2_depth.jpg',
        normal: 'assets/character2_normal.jpg',
        obj3d: 'assets/character2_3d.obj',
        skin: '#f6ddd2',
        hair: '#cab296',
        outfit: '#141115',
        trim: '#cfa132'
    }
};

let currentPresetId = 1;

// Shared Realistic PBR Materials
const skinMaterial = new THREE.MeshPhysicalMaterial({
    color: 0xf0d0c2,
    roughness: 0.38,
    metalness: 0.02,
    reflectivity: 0.35,
    clearcoat: 0.08,
    clearcoatRoughness: 0.4,
    sheen: 0.35,
    sheenColor: new THREE.Color(0xffd5c2)
});

const corsetMaterial = new THREE.MeshStandardMaterial({
    color: 0x1c1f1b,
    roughness: 0.28,
    metalness: 0.85,
    side: THREE.DoubleSide
});

const goldTrimMaterial = new THREE.MeshStandardMaterial({
    color: 0xe2b83e,
    roughness: 0.18,
    metalness: 0.94
});

const hairVolumeMaterial = new THREE.MeshStandardMaterial({
    color: 0x221d1a,
    roughness: 0.45,
    metalness: 0.15
});

const characterSculptMaterial = new THREE.MeshStandardMaterial({
    roughness: 0.28,
    metalness: 0.08,
    normalScale: new THREE.Vector2(1.2, 1.2),
    side: THREE.DoubleSide
});

// Root 3D Character Container
const rootCharacter = new THREE.Group();
scene.add(rootCharacter);

let anatomicalBodyMesh = null;
let sculptedBustMesh = null;
let externalMixer = null;

function setLoading(isLoading, text = 'Loading 3D Mesh...') {
    loadingBanner.textContent = text;
    if (isLoading) loadingBanner.classList.remove('hidden');
    else loadingBanner.classList.add('hidden');
}

// Load Texture Maps for a Preset
function loadPresetTextures(preset) {
    const diffTex = texLoader.load(preset.diffuse);
    diffTex.colorSpace = THREE.SRGBColorSpace;

    const depthTex = texLoader.load(preset.depth);
    const normTex = texLoader.load(preset.normal);

    characterSculptMaterial.map = diffTex;
    characterSculptMaterial.normalMap = normTex;
    characterSculptMaterial.displacementMap = depthTex;
    characterSculptMaterial.displacementScale = parseFloat(document.getElementById('depth-scale').value);
    characterSculptMaterial.displacementBias = -0.06;
    characterSculptMaterial.needsUpdate = true;

    skinMaterial.color.set(preset.skin);
    hairVolumeMaterial.color.set(preset.hair);
    corsetMaterial.color.set(preset.outfit);
    goldTrimMaterial.color.set(preset.trim);

    document.getElementById('skin-color').value = preset.skin;
    document.getElementById('hair-color').value = preset.hair;
    document.getElementById('outfit-color').value = preset.outfit;
    document.getElementById('trim-color').value = preset.trim;
}

// Build Royal Armor & Hair Back Volume onto the Anatomical Female Body
function createArmorAndHairAccents() {
    const accentsGroup = new THREE.Group();

    // 1. Fitted Hourglass Royal Corset / Bodice over Torso
    const corsetGeo = new THREE.CylinderGeometry(0.165, 0.132, 0.34, 48, 24, true);
    const pos = corsetGeo.attributes.position;
    for (let i = 0; i < pos.count; i++) {
        const y = pos.getY(i);
        const x = pos.getX(i);
        const z = pos.getZ(i);
        // Hourglass waist pinch + bust curve
        const normY = (y + 0.17) / 0.34; // 0 to 1
        const waistCurve = 0.85 + 0.25 * Math.pow(normY - 0.35, 2) * 2.2;
        pos.setX(i, x * waistCurve * 1.06);
        pos.setZ(i, z * waistCurve * 0.82 + (normY > 0.6 ? 0.025 : 0));
    }
    corsetGeo.computeVertexNormals();
    const corsetMesh = new THREE.Mesh(corsetGeo, corsetMaterial);
    corsetMesh.position.set(0, 1.06, 0.01);
    corsetMesh.castShadow = true;
    accentsGroup.add(corsetMesh);

    // 2. Royal Skirt / Hip Armor Flanges
    const skirtGeo = new THREE.CylinderGeometry(0.138, 0.23, 0.26, 48, 12, true);
    const skirtMesh = new THREE.Mesh(skirtGeo, corsetMaterial);
    skirtMesh.scale.set(1.08, 1, 0.82);
    skirtMesh.position.set(0, 0.78, 0.0);
    skirtMesh.castShadow = true;
    accentsGroup.add(skirtMesh);

    // 3. Ornate Gold Waist Belt & Necklace Collar
    const beltGeo = new THREE.TorusGeometry(0.142, 0.014, 16, 64);
    const beltMesh = new THREE.Mesh(beltGeo, goldTrimMaterial);
    beltMesh.rotation.x = Math.PI / 2;
    beltMesh.scale.set(1.08, 0.82, 1);
    beltMesh.position.set(0, 0.90, 0.01);
    accentsGroup.add(beltMesh);

    // 4. Knee-High Royal Boots
    for (let side of [-1, 1]) {
        const bootGeo = new THREE.CylinderGeometry(0.068, 0.045, 0.44, 32);
        const bootMesh = new THREE.Mesh(bootGeo, corsetMaterial);
        bootMesh.position.set(side * 0.094, 0.22, 0);
        bootMesh.castShadow = true;
        accentsGroup.add(bootMesh);

        const kneeTrim = new THREE.Mesh(new THREE.TorusGeometry(0.068, 0.009, 12, 32), goldTrimMaterial);
        kneeTrim.rotation.x = Math.PI / 2;
        kneeTrim.position.set(side * 0.094, 0.44, 0);
        accentsGroup.add(kneeTrim);
    }

    // 5. 3D Volumetric Back Hair & Cranium Dome (so rotating 360° behind the character looks complete and 3D)
    const craniumGeo = new THREE.SphereGeometry(0.24, 48, 48);
    craniumGeo.scale(1.05, 1.35, 0.85);
    const craniumMesh = new THREE.Mesh(craniumGeo, hairVolumeMaterial);
    craniumMesh.position.set(0, 1.44, -0.04);
    craniumMesh.castShadow = true;
    accentsGroup.add(craniumMesh);

    return accentsGroup;
}

// Build Scene According to Selected Mode
function buildCharacterScene() {
    setLoading(true, 'Building 3D Character Mesh & PBR Shaders...');
    externalMixer = null;

    while (rootCharacter.children.length > 0) {
        rootCharacter.remove(rootCharacter.children[0]);
    }

    const mode = document.getElementById('model-mode').value;
    const preset = presets[currentPresetId];
    loadPresetTextures(preset);

    if (mode === 'hybrid_fullbody') {
        // Load Anatomical Female Full-Body .OBJ + High-Res 3D Sculpted Character Bust/Head
        objLoader.load('assets/female_fullbody.obj', (bodyObj) => {
            bodyObj.traverse((child) => {
                if (child.isMesh) {
                    child.geometry.computeVertexNormals();
                    child.material = skinMaterial;
                    child.castShadow = true;
                    child.receiveShadow = true;
                }
            });
            anatomicalBodyMesh = bodyObj;
            rootCharacter.add(bodyObj);

            // Add Royal Corset, Boots, Gold Filigree & 3D Back Hair
            const armorAccents = createArmorAndHairAccents();
            rootCharacter.add(armorAccents);

            // Create High-Density Curved 3D Sculpted Mesh from the Character Image + Depth + Normal Map
            const sculptGeo = new THREE.PlaneGeometry(0.56, 0.68, 256, 256);
            // Wrap vertices cylindrically in 3D space so it forms a true 3D bust/head volume
            const pos = sculptGeo.attributes.position;
            const uv = sculptGeo.attributes.uv;
            for (let i = 0; i < pos.count; i++) {
                const u = uv.getX(i) - 0.5;
                const v = uv.getY(i) - 0.5;
                // Smooth elliptical wrap + edge taper
                const wrapZ = -(u * u) * 0.42 - (v * v) * 0.18;
                pos.setZ(i, wrapZ);
            }
            sculptGeo.computeVertexNormals();

            sculptedBustMesh = new THREE.Mesh(sculptGeo, characterSculptMaterial);
            sculptedBustMesh.position.set(0, 1.40, 0.08);
            sculptedBustMesh.castShadow = true;
            sculptedBustMesh.receiveShadow = true;
            rootCharacter.add(sculptedBustMesh);

            setLoading(false);
        });
    } else if (mode === 'sculpt_only') {
        // Load Pre-converted .OBJ 3D Mesh directly generated from the uploaded image
        objLoader.load(preset.obj3d, (sculptObj) => {
            sculptObj.traverse((child) => {
                if (child.isMesh) {
                    child.geometry.computeVertexNormals();
                    child.material = characterSculptMaterial;
                    child.castShadow = true;
                    child.receiveShadow = true;
                }
            });
            sculptObj.scale.setScalar(1.55);
            sculptObj.position.set(0, -0.75, 0);
            rootCharacter.add(sculptObj);

            // Add back volume support
            const backHair = new THREE.Mesh(new THREE.SphereGeometry(0.38, 32, 32), hairVolumeMaterial);
            backHair.scale.set(1.1, 1.35, 0.6);
            backHair.position.set(0, 1.38, -0.08);
            rootCharacter.add(backHair);

            setLoading(false);
        });
    } else if (mode === 'external_rigged') {
        // Load an External Full-Body Rigged 3D Character Model from Three.js Official CDN (with fallback)
        setLoading(true, 'Fetching External Rigged 3D Model (.GLB)...');
        gltfLoader.load(
            'https://raw.githubusercontent.com/mrdoob/three.js/master/examples/models/gltf/Xbot.glb',
            (gltf) => {
                const model = gltf.scene;
                model.traverse((child) => {
                    if (child.isMesh) {
                        child.castShadow = true;
                        child.receiveShadow = true;
                        if (child.name.includes('Beta_Surface')) {
                            child.material = corsetMaterial;
                        } else if (child.name.includes('Beta_Joints')) {
                            child.material = goldTrimMaterial;
                        }
                    }
                });
                rootCharacter.add(model);

                // Attach 3D Sculpted Face/Portrait onto the rigged character's head region
                const headSculptGeo = new THREE.PlaneGeometry(0.38, 0.46, 180, 180);
                const headSculpt = new THREE.Mesh(headSculptGeo, characterSculptMaterial);
                headSculpt.position.set(0, 1.56, 0.14);
                rootCharacter.add(headSculpt);

                if (gltf.animations && gltf.animations.length > 0) {
                    externalMixer = new THREE.AnimationMixer(model);
                    const idleAction = externalMixer.clipAction(gltf.animations[0]);
                    idleAction.play();
                }
                setLoading(false);
            },
            undefined,
            () => {
                // Offline fallback to anatomical fullbody
                document.getElementById('model-mode').value = 'hybrid_fullbody';
                buildCharacterScene();
            }
        );
    }
}

buildCharacterScene();

// Preset Switching
document.querySelectorAll('.preset-card').forEach((card) => {
    card.addEventListener('click', () => {
        document.querySelectorAll('.preset-card').forEach((c) => c.classList.remove('active'));
        card.classList.add('active');
        currentPresetId = parseInt(card.dataset.preset, 10);
        buildCharacterScene();
    });
});

document.getElementById('model-mode').addEventListener('change', () => {
    buildCharacterScene();
});

// Real-time Customization Controls
document.getElementById('skin-color').addEventListener('input', (e) => skinMaterial.color.set(e.target.value));
document.getElementById('hair-color').addEventListener('input', (e) => hairVolumeMaterial.color.set(e.target.value));
document.getElementById('outfit-color').addEventListener('input', (e) => corsetMaterial.color.set(e.target.value));
document.getElementById('trim-color').addEventListener('input', (e) => goldTrimMaterial.color.set(e.target.value));

document.getElementById('depth-scale').addEventListener('input', (e) => {
    characterSculptMaterial.displacementScale = parseFloat(e.target.value);
});

document.getElementById('normal-scale').addEventListener('input', (e) => {
    const val = parseFloat(e.target.value);
    characterSculptMaterial.normalScale.set(val, val);
});

document.getElementById('body-height').addEventListener('input', (e) => {
    rootCharacter.scale.y = parseFloat(e.target.value);
});

document.getElementById('body-width').addEventListener('input', (e) => {
    const w = parseFloat(e.target.value);
    rootCharacter.scale.x = w;
    rootCharacter.scale.z = w;
});

document.getElementById('metalness').addEventListener('input', (e) => {
    corsetMaterial.metalness = parseFloat(e.target.value);
});

document.getElementById('roughness').addEventListener('input', (e) => {
    const r = parseFloat(e.target.value);
    corsetMaterial.roughness = r;
    characterSculptMaterial.roughness = r;
});

// Convert Any Uploaded Photo into a 3D Normal + Depth Mapped Model in Real-Time Browser Canvas
document.getElementById('img-upload').addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setLoading(true, 'Converting Uploaded Image to 3D Depth & Normal Maps...');

    const img = new Image();
    img.onload = () => {
        const w = 512, h = 512;
        const canvas = document.createElement('canvas');
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, w, h);
        const imgData = ctx.getImageData(0, 0, w, h);
        const data = imgData.data;

        // Synthesize Smooth Ellipsoid 3D Depth Map in JS
        const depthCanvas = document.createElement('canvas');
        depthCanvas.width = w;
        depthCanvas.height = h;
        const dCtx = depthCanvas.getContext('2d');
        const dImgData = dCtx.createImageData(w, h);
        const dData = dImgData.data;

        for (let y = 0; y < h; y++) {
            const ny = (y - h / 2) / (h / 2);
            for (let x = 0; x < w; x++) {
                const nx = (x - w / 2) / (w / 2);
                const idx = (y * w + x) * 4;
                const lum = (data[idx] * 0.299 + data[idx + 1] * 0.587 + data[idx + 2] * 0.114) / 255;
                const dome = Math.max(0, 1 - (nx * nx * 0.85 + ny * ny * 0.55));
                const mask = Math.min(1, Math.max(0, (lum - 0.06) / 0.15));
                const dVal = Math.floor((Math.sqrt(dome) * 0.68 + lum * 0.32) * mask * 255);
                dData[idx] = dData[idx + 1] = dData[idx + 2] = dVal;
                dData[idx + 3] = 255;
            }
        }
        dCtx.putImageData(dImgData, 0, 0);

        const newDiffTex = new THREE.CanvasTexture(canvas);
        newDiffTex.colorSpace = THREE.SRGBColorSpace;
        const newDepthTex = new THREE.CanvasTexture(depthCanvas);

        characterSculptMaterial.map = newDiffTex;
        characterSculptMaterial.displacementMap = newDepthTex;
        characterSculptMaterial.needsUpdate = true;
        setLoading(false);
    };
    img.src = URL.createObjectURL(file);
});

// Import Custom .GLB / .GLTF / .OBJ Model
document.getElementById('glb-upload').addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const url = URL.createObjectURL(file);
    const ext = file.name.split('.').pop().toLowerCase();

    setLoading(true, 'Loading Custom 3D Model File...');
    while (rootCharacter.children.length > 0) {
        rootCharacter.remove(rootCharacter.children[0]);
    }

    if (ext === 'obj') {
        objLoader.load(url, (obj) => {
            const box = new THREE.Box3().setFromObject(obj);
            const size = box.getSize(new THREE.Vector3());
            const scale = 1.75 / Math.max(size.x, size.y, size.z);
            obj.scale.setScalar(scale);
            rootCharacter.add(obj);
            setLoading(false);
        });
    } else {
        gltfLoader.load(url, (gltf) => {
            const model = gltf.scene;
            const box = new THREE.Box3().setFromObject(model);
            const size = box.getSize(new THREE.Vector3());
            const scale = 1.75 / Math.max(size.x, size.y, size.z);
            model.scale.setScalar(scale);
            rootCharacter.add(model);
            setLoading(false);
        });
    }
});

// Camera Angle Presets
document.querySelectorAll('.camera-presets button').forEach((btn) => {
    btn.addEventListener('click', () => {
        const mode = btn.dataset.cam;
        if (mode === 'full') {
            camera.position.set(0, 1.15, 2.65);
            controls.target.set(0, 1.0, 0);
        } else if (mode === 'portrait') {
            camera.position.set(0, 1.42, 0.92);
            controls.target.set(0, 1.40, 0);
        } else if (mode === 'side') {
            camera.position.set(0.75, 1.42, 0.78);
            controls.target.set(0, 1.40, 0);
        }
    });
});

document.getElementById('reset-cam-btn').addEventListener('click', () => {
    camera.position.set(0, 1.25, 2.55);
    controls.target.set(0, 1.12, 0);
});

// Export Complete 3D Character Scene as a Downloadable .OBJ File
document.getElementById('export-obj-btn').addEventListener('click', () => {
    const exporter = new OBJExporter();
    const objString = exporter.parse(rootCharacter);
    const blob = new Blob([objString], { type: 'text/plain' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `realistic_character_${currentPresetId}_fullbody.obj`;
    a.click();
});

// Animation Loop
const clock = new THREE.Clock();
function animate() {
    requestAnimationFrame(animate);
    const delta = clock.getDelta();
    const elapsed = clock.getElapsedTime();

    if (externalMixer) {
        externalMixer.update(delta);
    }

    const animMode = document.getElementById('anim-mode').value;
    if (animMode === 'breath') {
        rootCharacter.rotation.y = Math.sin(elapsed * 0.55) * 0.18;
        rootCharacter.position.y = Math.sin(elapsed * 2.1) * 0.006;
    } else if (animMode === 'turntable') {
        rootCharacter.rotation.y = elapsed * 0.65;
    } else {
        rootCharacter.rotation.y = 0;
        rootCharacter.position.y = 0;
    }

    controls.update();
    renderer.render(scene, camera);
}
animate();

window.addEventListener('resize', () => {
    camera.aspect = container.clientWidth / container.clientHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(container.clientWidth, container.clientHeight);
});
