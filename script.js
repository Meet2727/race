import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

const container = document.getElementById('canvas-container');
const scene = new THREE.Scene();

const camera = new THREE.PerspectiveCamera(42, container.clientWidth / container.clientHeight, 0.1, 100);
camera.position.set(0, 1.35, 3.4);

const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
renderer.setSize(container.clientWidth, container.clientHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.15;
container.appendChild(renderer.domElement);

const controls = new OrbitControls(camera, renderer.domElement);
controls.target.set(0, 1.05, 0);
controls.enableDamping = true;
controls.dampingFactor = 0.06;
controls.maxPolarAngle = Math.PI / 2 + 0.1;
controls.minDistance = 0.8;
controls.maxDistance = 8;

// Studio Lighting
const ambientLight = new THREE.AmbientLight(0xffffff, 0.65);
scene.add(ambientLight);

const keyLight = new THREE.DirectionalLight(0xfff6e5, 1.6);
keyLight.position.set(2.5, 3.8, 3.0);
keyLight.castShadow = true;
keyLight.shadow.mapSize.width = 2048;
keyLight.shadow.mapSize.height = 2048;
scene.add(keyLight);

const rimLight = new THREE.SpotLight(0x88b4ff, 2.2);
rimLight.position.set(-2.5, 3.0, -2.5);
scene.add(rimLight);

const fillLight = new THREE.PointLight(0xffd494, 0.9);
fillLight.position.set(-2.0, 1.5, 2.0);
scene.add(fillLight);

// Pedestal Floor
const floorGeo = new THREE.CylinderGeometry(1.1, 1.25, 0.08, 64);
const floorMat = new THREE.MeshStandardMaterial({
    color: 0x161922,
    metalness: 0.7,
    roughness: 0.3
});
const pedestal = new THREE.Mesh(floorGeo, floorMat);
pedestal.position.y = -0.04;
pedestal.receiveShadow = true;
scene.add(pedestal);

const ringGeo = new THREE.TorusGeometry(1.12, 0.015, 16, 100);
const ringMat = new THREE.MeshStandardMaterial({ color: 0xd4af37, emissive: 0x443205, metalness: 0.9, roughness: 0.2 });
const ring = new THREE.Mesh(ringGeo, ringMat);
ring.rotation.x = Math.PI / 2;
ring.position.y = 0.0;
scene.add(ring);

// Materials for Full Body Character
const textureLoader = new THREE.TextureLoader();
let currentTexture = textureLoader.load('assets/character1.jpg');
currentTexture.colorSpace = THREE.SRGBColorSpace;

const skinMat = new THREE.MeshPhysicalMaterial({
    color: 0xf3d6c6,
    roughness: 0.45,
    metalness: 0.02,
    clearcoat: 0.1,
    sheen: 0.25
});

const faceMappedMat = new THREE.MeshStandardMaterial({
    map: currentTexture,
    roughness: 0.35,
    metalness: 0.05
});

const hairMat = new THREE.MeshStandardMaterial({
    color: 0x2a2421,
    roughness: 0.5,
    metalness: 0.15
});

const eyeMat = new THREE.MeshStandardMaterial({
    color: 0x4a7c59,
    roughness: 0.1,
    metalness: 0.1
});

const outfitMat = new THREE.MeshStandardMaterial({
    color: 0x1f1f24,
    roughness: 0.25,
    metalness: 0.8
});

const trimMat = new THREE.MeshStandardMaterial({
    color: 0xd4af37,
    roughness: 0.2,
    metalness: 0.9
});

// Root Character Group
const characterGroup = new THREE.Group();
scene.add(characterGroup);

// Build Articulated Stylized/Realistic Mannequin Full Body + Textured Portrait Plane/Head
const bodyParts = {};

function buildFullBodyCharacter() {
    while (characterGroup.children.length > 0) {
        characterGroup.remove(characterGroup.children[0]);
    }

    // Torso / Corset Armor
    const upperTorsoGeo = new THREE.CylinderGeometry(0.18, 0.13, 0.36, 32);
    const upperTorso = new THREE.Mesh(upperTorsoGeo, outfitMat);
    upperTorso.position.y = 1.18;
    upperTorso.scale.set(1.1, 1, 0.78);
    upperTorso.castShadow = true;
    characterGroup.add(upperTorso);

    // Golden Chest Trim / Necklace
    const collarGeo = new THREE.TorusGeometry(0.15, 0.022, 16, 48);
    const collar = new THREE.Mesh(collarGeo, trimMat);
    collar.rotation.x = Math.PI / 2 + 0.15;
    collar.position.set(0, 1.36, 0.02);
    characterGroup.add(collar);

    // Belt & Buckle
    const beltGeo = new THREE.CylinderGeometry(0.136, 0.142, 0.05, 32);
    const belt = new THREE.Mesh(beltGeo, trimMat);
    belt.position.y = 1.0;
    belt.scale.set(1.1, 1, 0.8);
    characterGroup.add(belt);

    // Hips / Skirt Armor
    const hipsGeo = new THREE.CylinderGeometry(0.14, 0.22, 0.28, 32);
    const hips = new THREE.Mesh(hipsGeo, outfitMat);
    hips.position.y = 0.86;
    hips.scale.set(1.08, 1, 0.82);
    hips.castShadow = true;
    characterGroup.add(hips);

    // Neck
    const neckGeo = new THREE.CylinderGeometry(0.065, 0.075, 0.14, 24);
    const neck = new THREE.Mesh(neckGeo, skinMat);
    neck.position.y = 1.42;
    characterGroup.add(neck);

    // Head Group
    const headGroup = new THREE.Group();
    headGroup.position.set(0, 1.57, 0);
    characterGroup.add(headGroup);
    bodyParts.head = headGroup;

    // 3D Sculpted Head Base
    const headGeo = new THREE.SphereGeometry(0.135, 36, 36);
    headGeo.scale(0.88, 1.08, 0.92);
    const headMesh = new THREE.Mesh(headGeo, skinMat);
    headMesh.castShadow = true;
    headGroup.add(headMesh);

    // Textured Face Projection Card ( seamlessly blends the reference portrait on the front of the head )
    const facePlaneGeo = new THREE.PlaneGeometry(0.26, 0.28, 64, 64);
    // Curve the plane slightly to wrap around face
    const pos = facePlaneGeo.attributes.position;
    for (let i = 0; i < pos.count; i++) {
        const x = pos.getX(i);
        const y = pos.getY(i);
        const z = -Math.pow(x * 2.2, 2) * 0.08 - Math.pow(y * 1.5, 2) * 0.04;
        pos.setZ(i, z);
    }
    facePlaneGeo.computeVertexNormals();
    const faceCard = new THREE.Mesh(facePlaneGeo, faceMappedMat);
    faceCard.position.set(0, 0.01, 0.126);
    headGroup.add(faceCard);

    // Eyes
    const eyeGeo = new THREE.SphereGeometry(0.016, 16, 16);
    const leftEye = new THREE.Mesh(eyeGeo, eyeMat);
    leftEye.position.set(-0.042, 0.015, 0.115);
    const rightEye = new THREE.Mesh(eyeGeo, eyeMat);
    rightEye.position.set(0.042, 0.015, 0.115);
    headGroup.add(leftEye, rightEye);

    // Hair Volume Back & Sides
    const hairBackGeo = new THREE.SphereGeometry(0.148, 32, 32);
    hairBackGeo.scale(0.95, 1.25, 0.95);
    const hairBack = new THREE.Mesh(hairBackGeo, hairMat);
    hairBack.position.set(0, -0.02, -0.025);
    headGroup.add(hairBack);

    // Shoulder Pauldrons (Armor)
    const pauldronGeo = new THREE.SphereGeometry(0.095, 24, 24, 0, Math.PI * 2, 0, Math.PI * 0.6);
    const leftPauldron = new THREE.Mesh(pauldronGeo, trimMat);
    leftPauldron.position.set(-0.24, 1.33, 0);
    leftPauldron.rotation.z = 0.45;
    const rightPauldron = new THREE.Mesh(pauldronGeo, trimMat);
    rightPauldron.position.set(0.24, 1.33, 0);
    rightPauldron.rotation.z = -0.45;
    characterGroup.add(leftPauldron, rightPauldron);

    // Arms
    function createArm(isLeft) {
        const side = isLeft ? -1 : 1;
        const armGroup = new THREE.Group();
        armGroup.position.set(side * 0.23, 1.31, 0);

        const upperArm = new THREE.Mesh(new THREE.CylinderGeometry(0.052, 0.044, 0.28, 20), skinMat);
        upperArm.position.y = -0.14;
        armGroup.add(upperArm);

        const forearm = new THREE.Mesh(new THREE.CylinderGeometry(0.044, 0.036, 0.27, 20), outfitMat);
        forearm.position.y = -0.40;
        armGroup.add(forearm);

        const cuff = new THREE.Mesh(new THREE.CylinderGeometry(0.046, 0.042, 0.06, 20), trimMat);
        cuff.position.y = -0.48;
        armGroup.add(cuff);

        const hand = new THREE.Mesh(new THREE.SphereGeometry(0.04, 16, 16), skinMat);
        hand.scale.set(0.8, 1.25, 0.5);
        hand.position.y = -0.56;
        armGroup.add(hand);

        armGroup.rotation.z = side * -0.12;
        characterGroup.add(armGroup);
        return armGroup;
    }

    bodyParts.leftArm = createArm(true);
    bodyParts.rightArm = createArm(false);

    // Legs & Boots
    function createLeg(isLeft) {
        const side = isLeft ? -1 : 1;
        const legGroup = new THREE.Group();
        legGroup.position.set(side * 0.105, 0.74, 0);

        const thigh = new THREE.Mesh(new THREE.CylinderGeometry(0.082, 0.062, 0.38, 24), skinMat);
        thigh.position.y = -0.18;
        thigh.castShadow = true;
        legGroup.add(thigh);

        const boot = new THREE.Mesh(new THREE.CylinderGeometry(0.064, 0.048, 0.38, 24), outfitMat);
        boot.position.y = -0.54;
        boot.castShadow = true;
        legGroup.add(boot);

        const kneeGuard = new THREE.Mesh(new THREE.SphereGeometry(0.066, 16, 16), trimMat);
        kneeGuard.scale.set(0.8, 1.1, 0.6);
        kneeGuard.position.set(0, -0.36, 0.03);
        legGroup.add(kneeGuard);

        characterGroup.add(legGroup);
        return legGroup;
    }

    bodyParts.leftLeg = createLeg(true);
    bodyParts.rightLeg = createLeg(false);
}

// 3D Depth Relief Mesh Mode (Direct Image-to-3D Displacement)
let reliefMesh = null;
function buildReliefMesh() {
    while (characterGroup.children.length > 0) {
        characterGroup.remove(characterGroup.children[0]);
    }
    const geo = new THREE.PlaneGeometry(1.35, 1.65, 256, 256);
    const mat = new THREE.MeshStandardMaterial({
        map: currentTexture,
        displacementMap: currentTexture,
        displacementScale: parseFloat(document.getElementById('depth-scale').value),
        roughness: 0.35,
        metalness: 0.1,
        side: THREE.DoubleSide
    });
    reliefMesh = new THREE.Mesh(geo, mat);
    reliefMesh.position.set(0, 1.15, 0);
    reliefMesh.castShadow = true;
    characterGroup.add(reliefMesh);

    // Gold Ornate Frame around 3D Relief
    const frameGeo = new THREE.BoxGeometry(1.42, 1.72, 0.06);
    const frameMesh = new THREE.Mesh(frameGeo, trimMat);
    frameMesh.position.set(0, 1.15, -0.04);
    characterGroup.add(frameMesh);
}

buildFullBodyCharacter();

// Preset Configuration Switching
const presets = {
    1: {
        img: 'assets/character1.jpg',
        skin: '#f3d6c6',
        hair: '#2a2421',
        eye: '#4a7c59',
        outfit: '#232622',
        trim: '#e0b841'
    },
    2: {
        img: 'assets/character2.jpg',
        skin: '#f7dfd4',
        hair: '#cbb59d',
        eye: '#5b7a8c',
        outfit: '#141214',
        trim: '#c99e32'
    }
};

function applyPreset(id) {
    const p = presets[id];
    textureLoader.load(p.img, (tex) => {
        tex.colorSpace = THREE.SRGBColorSpace;
        currentTexture = tex;
        faceMappedMat.map = tex;
        faceMappedMat.needsUpdate = true;
        if (reliefMesh) {
            reliefMesh.material.map = tex;
            reliefMesh.material.displacementMap = tex;
            reliefMesh.material.needsUpdate = true;
        }
    });

    document.getElementById('skin-color').value = p.skin;
    document.getElementById('hair-color').value = p.hair;
    document.getElementById('eye-color').value = p.eye;
    document.getElementById('outfit-color').value = p.outfit;
    document.getElementById('trim-color').value = p.trim;

    skinMat.color.set(p.skin);
    hairMat.color.set(p.hair);
    eyeMat.color.set(p.eye);
    outfitMat.color.set(p.outfit);
    trimMat.color.set(p.trim);
}

document.querySelectorAll('.preset-card').forEach(card => {
    card.addEventListener('click', () => {
        document.querySelectorAll('.preset-card').forEach(c => c.classList.remove('active'));
        card.classList.add('active');
        applyPreset(card.dataset.preset);
    });
});

// UI Customization Listeners
document.getElementById('render-mode').addEventListener('change', (e) => {
    if (e.target.value === 'relief') {
        buildReliefMesh();
    } else {
        buildFullBodyCharacter();
    }
});

document.getElementById('skin-color').addEventListener('input', (e) => skinMat.color.set(e.target.value));
document.getElementById('hair-color').addEventListener('input', (e) => hairMat.color.set(e.target.value));
document.getElementById('eye-color').addEventListener('input', (e) => eyeMat.color.set(e.target.value));
document.getElementById('outfit-color').addEventListener('input', (e) => outfitMat.color.set(e.target.value));
document.getElementById('trim-color').addEventListener('input', (e) => trimMat.color.set(e.target.value));

document.getElementById('metalness').addEventListener('input', (e) => {
    outfitMat.metalness = parseFloat(e.target.value);
});
document.getElementById('roughness').addEventListener('input', (e) => {
    outfitMat.roughness = parseFloat(e.target.value);
});
document.getElementById('depth-scale').addEventListener('input', (e) => {
    if (reliefMesh) {
        reliefMesh.material.displacementScale = parseFloat(e.target.value);
    }
});
document.getElementById('light-intensity').addEventListener('input', (e) => {
    keyLight.intensity = parseFloat(e.target.value);
});

// Upload Custom Image Texture
document.getElementById('tex-upload').addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const url = URL.createObjectURL(file);
    textureLoader.load(url, (tex) => {
        tex.colorSpace = THREE.SRGBColorSpace;
        currentTexture = tex;
        faceMappedMat.map = tex;
        faceMappedMat.needsUpdate = true;
        if (reliefMesh) {
            reliefMesh.material.map = tex;
            reliefMesh.material.displacementMap = tex;
            reliefMesh.material.needsUpdate = true;
        }
    });
});

// Upload Custom GLB/GLTF Full Body Model
const gltfLoader = new GLTFLoader();
document.getElementById('model-upload').addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const url = URL.createObjectURL(file);
    gltfLoader.load(url, (gltf) => {
        while (characterGroup.children.length > 0) {
            characterGroup.remove(characterGroup.children[0]);
        }
        const model = gltf.scene;
        const box = new THREE.Box3().setFromObject(model);
        const size = box.getSize(new THREE.Vector3());
        const scale = 1.7 / Math.max(size.x, size.y, size.z);
        model.scale.setScalar(scale);
        characterGroup.add(model);
    });
});

document.getElementById('reset-cam').addEventListener('click', () => {
    camera.position.set(0, 1.35, 3.4);
    controls.target.set(0, 1.05, 0);
});

document.getElementById('export-config').addEventListener('click', () => {
    const config = {
        skinColor: document.getElementById('skin-color').value,
        hairColor: document.getElementById('hair-color').value,
        eyeColor: document.getElementById('eye-color').value,
        outfitColor: document.getElementById('outfit-color').value,
        trimColor: document.getElementById('trim-color').value,
        metalness: document.getElementById('metalness').value,
        roughness: document.getElementById('roughness').value
    };
    const blob = new Blob([JSON.stringify(config, null, 2)], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'character-config.json';
    a.click();
});

// Animation Loop
const clock = new THREE.Clock();
function animate() {
    requestAnimationFrame(animate);
    const t = clock.getElapsedTime();
    const pose = document.getElementById('pose-select').value;

    if (pose === 'idle') {
        characterGroup.rotation.y = Math.sin(t * 0.5) * 0.12;
        characterGroup.position.y = Math.sin(t * 2.0) * 0.008;
        if (bodyParts.leftArm && bodyParts.rightArm) {
            bodyParts.leftArm.rotation.z = -0.12 + Math.sin(t * 1.8) * 0.03;
            bodyParts.rightArm.rotation.z = 0.12 - Math.sin(t * 1.8) * 0.03;
        }
    } else if (pose === 'heroic') {
        characterGroup.rotation.y = 0.25;
        if (bodyParts.leftArm && bodyParts.rightArm) {
            bodyParts.leftArm.rotation.z = -0.35;
            bodyParts.leftArm.rotation.x = -0.25;
            bodyParts.rightArm.rotation.z = 0.28;
            bodyParts.rightArm.rotation.x = 0.15;
        }
    } else if (pose === 'turn') {
        characterGroup.rotation.y = t * 0.65;
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
