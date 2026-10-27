/* ==========================================================================
   MV 3D — Full-Body Customizable AI Character & Assistant Engine (script.js)
   Features:
   - Articulated 3D Full-Body Female Models (Royal Gold & Shadow Tactician)
   - Real-Time Customization (Hair, Outfit, Colors, Gear, Proportions, Poses)
   - Interactive Camera Controls (Full Body, Upper Body, Face Close-up)
   - Voice Input / Output + Chat Assistant
   ========================================================================== */

const PRESETS = {
  royal: {
    name: 'Model 1: Royal Gold',
    avatar: 'assets/mv-avatar-1.jpg',
    hairStyle: 'long',
    hairColor: '#d8c3a5',
    eyeColor: '#60a5fa',
    skinColor: '#f5d6c6',
    outfitStyle: 'royal',
    suitColor: '#17171f',
    trimColor: '#d4af37',
    gemColor: '#e11d48',
    crown: true,
    pauldrons: true,
    wings: false,
    skirt: true,
    halo: true,
    weapon: false,
    heightScale: 1.0,
    auraIntensity: 1.25
  },
  shadow: {
    name: 'Model 2: Shadow Tactician',
    avatar: 'assets/mv-avatar-2.jpg',
    hairStyle: 'long',
    hairColor: '#232023',
    eyeColor: '#34d399',
    skinColor: '#f2d2c4',
    outfitStyle: 'tactical',
    suitColor: '#1e242b',
    trimColor: '#eab308',
    gemColor: '#10b981',
    crown: false,
    pauldrons: true,
    wings: false,
    skirt: false,
    halo: true,
    weapon: true,
    heightScale: 1.0,
    auraIntensity: 1.25
  }
};

const state = {
  activePreset: 'royal',
  config: JSON.parse(localStorage.getItem('mv_3d_custom_config')) || { ...PRESETS.royal },
  pose: 'idle',
  voiceEnabled: true,
  isSpeaking: false,
  userName: localStorage.getItem('mv_user_name') || 'Boss',
  geminiApiKey: localStorage.getItem('mv_gemini_api_key') || ''
};

// ============================================================================
// THREE.JS 3D FULL-BODY CHARACTER BUILDER
// ============================================================================
let scene, camera, renderer, controls, clock;
let characterGroup, headGroup, hairGroup, torsoGroup;
let leftArmPivot, rightArmPivot, leftForearmPivot, rightForearmPivot;
let leftLegPivot, rightLegPivot;
let crownMesh, pauldronsGroup, wingsGroup, skirtGroup, haloMesh, weaponGroup, coreGemMesh;
let auraLight, stageRingMesh, particlesMesh;
let materials = {};
let targetCamPos = new THREE.Vector3(0, 1.35, 3.6);
let targetLookAt = new THREE.Vector3(0, 1.05, 0);

function init3DStage() {
  const container = document.getElementById('canvasContainer');
  clock = new THREE.Clock();

  scene = new THREE.Scene();
  scene.fog = new THREE.FogExp2(0x07090e, 0.08);

  camera = new THREE.PerspectiveCamera(40, container.clientWidth / container.clientHeight, 0.1, 100);
  camera.position.copy(targetCamPos);

  renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
  renderer.setSize(container.clientWidth, container.clientHeight);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.shadowMap.enabled = true;
  container.appendChild(renderer.domElement);

  controls = new THREE.OrbitControls(camera, renderer.domElement);
  controls.target.copy(targetLookAt);
  controls.enableDamping = true;
  controls.dampingFactor = 0.06;
  controls.minDistance = 1.1;
  controls.maxDistance = 6.0;
  controls.maxPolarAngle = Math.PI / 2 + 0.08;

  // Lights
  const ambientLight = new THREE.AmbientLight(0xffffff, 0.65);
  scene.add(ambientLight);

  const keyLight = new THREE.DirectionalLight(0xfff5e6, 1.25);
  keyLight.position.set(2.5, 4.5, 3.5);
  keyLight.castShadow = true;
  scene.add(keyLight);

  const rimLight = new THREE.DirectionalLight(0x60a5fa, 0.8);
  rimLight.position.set(-3, 3, -2.5);
  scene.add(rimLight);

  auraLight = new THREE.PointLight(0xd4af37, 1.25, 6);
  auraLight.position.set(0, 1.2, 0.6);
  scene.add(auraLight);

  buildPedestalAndParticles();
  buildFullBodyCharacter();
  applyCustomizationTo3D();

  window.addEventListener('resize', onWindowResize);
  animate3D();
}

function buildPedestalAndParticles() {
  // Glowing Cyber/Royal Pedestal
  const baseGeo = new THREE.CylinderGeometry(0.95, 1.1, 0.12, 48);
  const baseMat = new THREE.MeshStandardMaterial({
    color: 0x111520,
    metalness: 0.7,
    roughness: 0.25
  });
  const baseMesh = new THREE.Mesh(baseGeo, baseMat);
  baseMesh.position.y = -0.06;
  baseMesh.receiveShadow = true;
  scene.add(baseMesh);

  const ringGeo = new THREE.TorusGeometry(0.98, 0.02, 16, 64);
  materials.stageRing = new THREE.MeshBasicMaterial({ color: state.config.trimColor });
  stageRingMesh = new THREE.Mesh(ringGeo, materials.stageRing);
  stageRingMesh.rotation.x = Math.PI / 2;
  stageRingMesh.position.y = 0.01;
  scene.add(stageRingMesh);

  // Floating particles
  const pCount = 90;
  const pGeo = new THREE.BufferGeometry();
  const positions = new Float32Array(pCount * 3);
  for (let i = 0; i < pCount; i++) {
    positions[i * 3] = (Math.random() - 0.5) * 2.6;
    positions[i * 3 + 1] = Math.random() * 2.5;
    positions[i * 3 + 2] = (Math.random() - 0.5) * 2.6;
  }
  pGeo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  materials.particles = new THREE.PointsMaterial({
    color: state.config.trimColor,
    size: 0.035,
    transparent: true,
    opacity: 0.75
  });
  particlesMesh = new THREE.Points(pGeo, materials.particles);
  scene.add(particlesMesh);
}

function buildFullBodyCharacter() {
  characterGroup = new THREE.Group();
  scene.add(characterGroup);

  // Shared Dynamic Materials
  materials.skin = new THREE.MeshStandardMaterial({
    color: state.config.skinColor,
    roughness: 0.45,
    metalness: 0.05
  });
  materials.hair = new THREE.MeshStandardMaterial({
    color: state.config.hairColor,
    roughness: 0.38,
    metalness: 0.15
  });
  materials.eye = new THREE.MeshBasicMaterial({
    color: state.config.eyeColor
  });
  materials.suit = new THREE.MeshStandardMaterial({
    color: state.config.suitColor,
    roughness: 0.32,
    metalness: 0.45
  });
  materials.trim = new THREE.MeshStandardMaterial({
    color: state.config.trimColor,
    roughness: 0.2,
    metalness: 0.88
  });
  materials.gem = new THREE.MeshStandardMaterial({
    color: state.config.gemColor,
    emissive: state.config.gemColor,
    emissiveIntensity: 0.8,
    roughness: 0.1,
    metalness: 0.5
  });

  // 1. TORSO & WAIST & HIPS
  torsoGroup = new THREE.Group();
  torsoGroup.position.y = 1.05;
  characterGroup.add(torsoGroup);

  // Upper Chest (Corset / Armor)
  const chestGeo = new THREE.CylinderGeometry(0.18, 0.13, 0.34, 24);
  const chestMesh = new THREE.Mesh(chestGeo, materials.suit);
  chestMesh.position.y = 0.22;
  chestMesh.scale.set(1.05, 1, 0.78);
  torsoGroup.add(chestMesh);

  // Bust / Chest Armor Plates
  const bustGeo = new THREE.SphereGeometry(0.095, 20, 20);
  const leftBust = new THREE.Mesh(bustGeo, materials.suit);
  leftBust.position.set(-0.075, 0.26, 0.085);
  leftBust.scale.set(1, 0.95, 0.85);
  const rightBust = leftBust.clone();
  rightBust.position.x = 0.075;
  torsoGroup.add(leftBust, rightBust);

  // Golden / Trim Chest Necklace & Core Gem
  const collarRingGeo = new THREE.TorusGeometry(0.11, 0.012, 12, 32);
  const collarRing = new THREE.Mesh(collarRingGeo, materials.trim);
  collarRing.rotation.x = Math.PI / 2 - 0.2;
  collarRing.position.set(0, 0.39, 0.02);
  torsoGroup.add(collarRing);

  const gemGeo = new THREE.OctahedronGeometry(0.038, 1);
  coreGemMesh = new THREE.Mesh(gemGeo, materials.gem);
  coreGemMesh.position.set(0, 0.31, 0.145);
  torsoGroup.add(coreGemMesh);

  // Trim Belt at Waist
  const waistGeo = new THREE.CylinderGeometry(0.13, 0.165, 0.16, 24);
  const waistMesh = new THREE.Mesh(waistGeo, materials.suit);
  waistMesh.position.y = 0.01;
  waistMesh.scale.set(1, 1, 0.76);
  torsoGroup.add(waistMesh);

  const beltGeo = new THREE.TorusGeometry(0.148, 0.014, 12, 32);
  const beltMesh = new THREE.Mesh(beltGeo, materials.trim);
  beltMesh.rotation.x = Math.PI / 2;
  beltMesh.scale.set(1, 0.78, 1);
  beltMesh.position.y = -0.02;
  torsoGroup.add(beltMesh);

  // Neck & Upper Chest Skin
  const neckGeo = new THREE.CylinderGeometry(0.055, 0.068, 0.14, 20);
  const neckMesh = new THREE.Mesh(neckGeo, materials.skin);
  neckMesh.position.y = 0.44;
  torsoGroup.add(neckMesh);

  // Choker
  const chokerGeo = new THREE.CylinderGeometry(0.06, 0.062, 0.025, 20);
  const chokerMesh = new THREE.Mesh(chokerGeo, materials.trim);
  chokerMesh.position.y = 0.43;
  torsoGroup.add(chokerMesh);

  // 2. HEAD, FACE & HAIR
  headGroup = new THREE.Group();
  headGroup.position.set(0, 0.58, 0);
  torsoGroup.add(headGroup);

  const headGeo = new THREE.SphereGeometry(0.145, 32, 32);
  const headMesh = new THREE.Mesh(headGeo, materials.skin);
  headMesh.scale.set(0.92, 1.08, 0.95);
  headGroup.add(headMesh);

  // Eyes
  const eyeGeo = new THREE.SphereGeometry(0.02, 16, 16);
  const leftEye = new THREE.Mesh(eyeGeo, materials.eye);
  leftEye.position.set(-0.048, 0.015, 0.125);
  leftEye.scale.set(1.2, 0.75, 0.5);
  const rightEye = leftEye.clone();
  rightEye.position.x = 0.048;
  headGroup.add(leftEye, rightEye);

  // Lips
  const lipMat = new THREE.MeshStandardMaterial({ color: 0xd96b6b, roughness: 0.35 });
  const lipGeo = new THREE.BoxGeometry(0.042, 0.012, 0.015);
  const lips = new THREE.Mesh(lipGeo, lipMat);
  lips.position.set(0, -0.052, 0.132);
  headGroup.add(lips);

  // Earrings
  const earRingGeo = new THREE.TorusGeometry(0.022, 0.004, 8, 20);
  const leftEarring = new THREE.Mesh(earRingGeo, materials.trim);
  leftEarring.position.set(-0.14, -0.03, 0);
  const rightEarring = leftEarring.clone();
  rightEarring.position.x = 0.14;
  headGroup.add(leftEarring, rightEarring);

  // Hair Group (Dynamic styles)
  hairGroup = new THREE.Group();
  headGroup.add(hairGroup);
  rebuildHairGeometry();

  // Crown / Tiara
  crownMesh = new THREE.Group();
  const tiaraRing = new THREE.Mesh(
    new THREE.TorusGeometry(0.11, 0.01, 10, 28, Math.PI),
    materials.trim
  );
  tiaraRing.rotation.x = -Math.PI / 2.4;
  tiaraRing.position.set(0, 0.14, 0.03);
  const centerPeak = new THREE.Mesh(new THREE.ConeGeometry(0.025, 0.08, 6), materials.trim);
  centerPeak.position.set(0, 0.18, 0.12);
  const crownGem = new THREE.Mesh(new THREE.OctahedronGeometry(0.018), materials.gem);
  crownGem.position.set(0, 0.17, 0.135);
  crownMesh.add(tiaraRing, centerPeak, crownGem);
  headGroup.add(crownMesh);

  // 3. SHOULDER PAULDRONS, WINGS, HALO & SKIRT
  pauldronsGroup = new THREE.Group();
  const pauldronGeo = new THREE.SphereGeometry(0.085, 16, 16, 0, Math.PI * 2, 0, Math.PI / 1.8);
  const leftPauldron = new THREE.Mesh(pauldronGeo, materials.trim);
  leftPauldron.position.set(-0.23, 0.34, 0);
  leftPauldron.rotation.z = 0.45;
  const rightPauldron = leftPauldron.clone();
  rightPauldron.position.x = 0.23;
  rightPauldron.rotation.z = -0.45;
  pauldronsGroup.add(leftPauldron, rightPauldron);
  torsoGroup.add(pauldronsGroup);

  // Energy Wings
  wingsGroup = new THREE.Group();
  const wingGeo = new THREE.ConeGeometry(0.18, 0.75, 4);
  for (let side of [-1, 1]) {
    for (let i = 0; i < 3; i++) {
      const w = new THREE.Mesh(wingGeo, materials.gem);
      w.position.set(side * (0.25 + i * 0.12), 0.28 - i * 0.08, -0.14);
      w.rotation.z = side * (-0.7 - i * 0.22);
      w.scale.set(0.35, 1 - i * 0.18, 0.12);
      wingsGroup.add(w);
    }
  }
  torsoGroup.add(wingsGroup);

  // Cyber Halo Ring behind back
  haloMesh = new THREE.Mesh(
    new THREE.TorusGeometry(0.42, 0.01, 12, 48),
    materials.trim
  );
  haloMesh.position.set(0, 0.35, -0.22);
  torsoGroup.add(haloMesh);

  // Battle Skirt / Armored Flaps
  skirtGroup = new THREE.Group();
  const skirtGeo = new THREE.CylinderGeometry(0.16, 0.29, 0.36, 24, 1, true, 0, Math.PI * 1.45);
  const skirtMesh = new THREE.Mesh(skirtGeo, materials.suit);
  skirtMesh.rotation.y = Math.PI * 0.28;
  skirtMesh.position.y = -0.22;
  const skirtTrim = new THREE.Mesh(
    new THREE.TorusGeometry(0.28, 0.009, 10, 32),
    materials.trim
  );
  skirtTrim.rotation.x = Math.PI / 2;
  skirtTrim.position.y = -0.39;
  skirtGroup.add(skirtMesh, skirtTrim);
  torsoGroup.add(skirtGroup);

  // 4. ARMS, FOREARMS & HANDS (Articulated)
  leftArmPivot = new THREE.Group();
  leftArmPivot.position.set(-0.22, 0.33, 0);
  torsoGroup.add(leftArmPivot);

  rightArmPivot = new THREE.Group();
  rightArmPivot.position.set(0.22, 0.33, 0);
  torsoGroup.add(rightArmPivot);

  const upperArmGeo = new THREE.CylinderGeometry(0.044, 0.038, 0.28, 16);
  const leftUpperArm = new THREE.Mesh(upperArmGeo, materials.skin);
  leftUpperArm.position.y = -0.13;
  leftArmPivot.add(leftUpperArm);

  const rightUpperArm = leftUpperArm.clone();
  rightArmPivot.add(rightUpperArm);

  leftForearmPivot = new THREE.Group();
  leftForearmPivot.position.y = -0.27;
  leftArmPivot.add(leftForearmPivot);

  rightForearmPivot = new THREE.Group();
  rightForearmPivot.position.y = -0.27;
  rightArmPivot.add(rightForearmPivot);

  const forearmGeo = new THREE.CylinderGeometry(0.038, 0.032, 0.26, 16);
  const leftForearm = new THREE.Mesh(forearmGeo, materials.suit);
  leftForearm.position.y = -0.12;
  const leftCuff = new THREE.Mesh(new THREE.CylinderGeometry(0.041, 0.036, 0.06, 16), materials.trim);
  leftCuff.position.y = -0.21;
  const leftHand = new THREE.Mesh(new THREE.SphereGeometry(0.038, 14, 14), materials.skin);
  leftHand.position.y = -0.26;
  leftForearmPivot.add(leftForearm, leftCuff, leftHand);

  const rightForearm = leftForearm.clone();
  const rightCuff = leftCuff.clone();
  const rightHand = leftHand.clone();
  rightForearmPivot.add(rightForearm, rightCuff, rightHand);

  // Energy Blade in Right Hand
  weaponGroup = new THREE.Group();
  weaponGroup.position.set(0, -0.27, 0.04);
  const hilt = new THREE.Mesh(new THREE.CylinderGeometry(0.016, 0.016, 0.18, 12), materials.trim);
  hilt.rotation.x = Math.PI / 2;
  const blade = new THREE.Mesh(new THREE.BoxGeometry(0.015, 0.045, 0.68), materials.gem);
  blade.position.z = 0.4;
  weaponGroup.add(hilt, blade);
  rightForearmPivot.add(weaponGroup);

  // 5. FULL-BODY LEGS & ARMORED BOOTS
  leftLegPivot = new THREE.Group();
  leftLegPivot.position.set(-0.088, 0.98, 0);
  characterGroup.add(leftLegPivot);

  rightLegPivot = new THREE.Group();
  rightLegPivot.position.set(0.088, 0.98, 0);
  characterGroup.add(rightLegPivot);

  const thighGeo = new THREE.CylinderGeometry(0.072, 0.055, 0.46, 20);
  const calfGeo = new THREE.CylinderGeometry(0.054, 0.04, 0.48, 20);
  const kneeGemGeo = new THREE.OctahedronGeometry(0.025);
  const bootFootGeo = new THREE.BoxGeometry(0.085, 0.07, 0.19);

  function populateLeg(legPivot) {
    const thigh = new THREE.Mesh(thighGeo, materials.skin);
    thigh.position.y = -0.23;

    const thighBand = new THREE.Mesh(new THREE.TorusGeometry(0.065, 0.008, 10, 24), materials.trim);
    thighBand.rotation.x = Math.PI / 2;
    thighBand.position.y = -0.32;

    const calfBoot = new THREE.Mesh(calfGeo, materials.suit);
    calfBoot.position.y = -0.68;

    const kneeArmor = new THREE.Mesh(kneeGemGeo, materials.trim);
    kneeArmor.position.set(0, -0.46, 0.055);

    const foot = new THREE.Mesh(bootFootGeo, materials.suit);
    foot.position.set(0, -0.94, 0.035);

    const heelTrim = new THREE.Mesh(new THREE.BoxGeometry(0.088, 0.02, 0.195), materials.trim);
    heelTrim.position.set(0, -0.97, 0.035);

    legPivot.add(thigh, thighBand, calfBoot, kneeArmor, foot, heelTrim);
  }

  populateLeg(leftLegPivot);
  populateLeg(rightLegPivot);
}

function rebuildHairGeometry() {
  while (hairGroup.children.length > 0) {
    hairGroup.remove(hairGroup.children[0]);
  }

  // Top Hair Cap
  const capGeo = new THREE.SphereGeometry(0.154, 28, 28, 0, Math.PI * 2, 0, Math.PI * 0.58);
  const capMesh = new THREE.Mesh(capGeo, materials.hair);
  capMesh.scale.set(0.95, 1.08, 0.98);
  hairGroup.add(capMesh);

  // Side Bangs framing face
  const bangGeo = new THREE.ConeGeometry(0.045, 0.28, 12);
  const leftBang = new THREE.Mesh(bangGeo, materials.hair);
  leftBang.position.set(-0.11, -0.02, 0.08);
  leftBang.rotation.z = 0.18;
  leftBang.rotation.x = 0.2;
  const rightBang = leftBang.clone();
  rightBang.position.x = 0.11;
  rightBang.rotation.z = -0.18;
  hairGroup.add(leftBang, rightBang);

  const style = state.config.hairStyle;
  if (style === 'long') {
    const backHairGeo = new THREE.CylinderGeometry(0.13, 0.19, 0.55, 20);
    const backHair = new THREE.Mesh(backHairGeo, materials.hair);
    backHair.position.set(0, -0.22, -0.08);
    backHair.scale.set(1, 1, 0.55);
    hairGroup.add(backHair);
  } else if (style === 'ponytail') {
    const tailGeo = new THREE.ConeGeometry(0.085, 0.58, 16);
    const tail = new THREE.Mesh(tailGeo, materials.hair);
    tail.position.set(0, -0.12, -0.22);
    tail.rotation.x = 2.65;
    hairGroup.add(tail);
  } else if (style === 'twintails') {
    const twinGeo = new THREE.ConeGeometry(0.065, 0.56, 16);
    const leftTwin = new THREE.Mesh(twinGeo, materials.hair);
    leftTwin.position.set(-0.18, -0.18, -0.05);
    leftTwin.rotation.z = 2.85;
    const rightTwin = leftTwin.clone();
    rightTwin.position.x = 0.18;
    rightTwin.rotation.z = -2.85;
    hairGroup.add(leftTwin, rightTwin);
  }
}

// Apply state.config to Three.js Materials, Meshes, and UI Controls
function applyCustomizationTo3D() {
  const c = state.config;
  materials.skin.color.set(c.skinColor);
  materials.hair.color.set(c.hairColor);
  materials.eye.color.set(c.eyeColor);
  materials.suit.color.set(c.suitColor);
  materials.trim.color.set(c.trimColor);
  materials.gem.color.set(c.gemColor);
  materials.gem.emissive.set(c.gemColor);
  materials.stageRing.color.set(c.trimColor);
  materials.particles.color.set(c.trimColor);

  auraLight.color.set(c.trimColor);
  auraLight.intensity = parseFloat(c.auraIntensity);

  crownMesh.visible = !!c.crown;
  pauldronsGroup.visible = !!c.pauldrons;
  wingsGroup.visible = !!c.wings;
  skirtGroup.visible = !!c.skirt;
  haloMesh.visible = !!c.halo;
  weaponGroup.visible = !!c.weapon;

  characterGroup.scale.set(1, parseFloat(c.heightScale), 1);
  rebuildHairGeometry();

  // Sync PIP & Theme
  document.getElementById('pipImg').src = c.avatar;
  document.getElementById('pipLabel').textContent = c.name;
  document.body.classList.toggle('theme-shadow', state.activePreset === 'shadow');

  // Sync UI Form Inputs
  document.getElementById('hairStyleSelect').value = c.hairStyle;
  document.getElementById('hairColorPicker').value = c.hairColor;
  document.getElementById('eyeColorPicker').value = c.eyeColor;
  document.getElementById('skinColorPicker').value = c.skinColor;
  document.getElementById('outfitStyleSelect').value = c.outfitStyle;
  document.getElementById('suitColorPicker').value = c.suitColor;
  document.getElementById('trimColorPicker').value = c.trimColor;
  document.getElementById('gemColorPicker').value = c.gemColor;
  document.getElementById('toggleCrown').checked = c.crown;
  document.getElementById('togglePauldrons').checked = c.pauldrons;
  document.getElementById('toggleWings').checked = c.wings;
  document.getElementById('toggleSkirt').checked = c.skirt;
  document.getElementById('toggleHalo').checked = c.halo;
  document.getElementById('toggleWeapon').checked = c.weapon;
  document.getElementById('heightSlider').value = c.heightScale;
  document.getElementById('auraSlider').value = c.auraIntensity;
}

// Animation Loop
function animate3D() {
  requestAnimationFrame(animate3D);
  const t = clock.getElapsedTime();

  // Subtle breathing and halo rotation
  if (torsoGroup) {
    torsoGroup.position.y = 1.05 + Math.sin(t * 2.2) * 0.012;
  }
  if (haloMesh && haloMesh.visible) {
    haloMesh.rotation.z = t * 0.6;
  }
  if (coreGemMesh) {
    coreGemMesh.rotation.y = t * 1.5;
  }
  if (particlesMesh) {
    particlesMesh.rotation.y = t * 0.15;
  }

  // Pose-specific animations
  if (state.pose === 'idle') {
    characterGroup.rotation.y = Math.sin(t * 0.6) * 0.12;
    headGroup.rotation.y = Math.sin(t * 0.9) * 0.15;
    leftArmPivot.rotation.set(0, 0, 0.18 + Math.sin(t * 1.5) * 0.04);
    rightArmPivot.rotation.set(0, 0, -0.18 - Math.sin(t * 1.5) * 0.04);
    leftForearmPivot.rotation.set(-0.25, 0, 0);
    rightForearmPivot.rotation.set(-0.25, 0, 0);
    leftLegPivot.rotation.set(0, 0, -0.03);
    rightLegPivot.rotation.set(0, 0, 0.03);
  } else if (state.pose === 'wave') {
    leftArmPivot.rotation.set(0, 0, 0.2);
    rightArmPivot.rotation.set(-0.4, 0, -2.2);
    rightForearmPivot.rotation.set(0, 0, Math.sin(t * 8) * 0.35);
    headGroup.rotation.z = 0.08;
  } else if (state.pose === 'combat') {
    characterGroup.rotation.y = -0.35;
    leftArmPivot.rotation.set(-0.6, 0.3, 0.45);
    leftForearmPivot.rotation.set(-0.9, 0, 0);
    rightArmPivot.rotation.set(-0.85, -0.2, -0.55);
    rightForearmPivot.rotation.set(-0.4, 0, 0);
    leftLegPivot.rotation.set(-0.18, 0, -0.08);
    rightLegPivot.rotation.set(0.18, 0, 0.08);
  } else if (state.pose === 'dance') {
    characterGroup.position.y = Math.abs(Math.sin(t * 5)) * 0.06;
    characterGroup.rotation.y = Math.sin(t * 2.5) * 0.45;
    leftArmPivot.rotation.set(0, 0, 0.8 + Math.sin(t * 5) * 0.5);
    rightArmPivot.rotation.set(0, 0, -0.8 + Math.cos(t * 5) * 0.5);
    leftForearmPivot.rotation.set(-0.6, 0, 0);
    rightForearmPivot.rotation.set(-0.6, 0, 0);
  } else if (state.pose === 'spin') {
    characterGroup.rotation.y += 0.035;
  }

  // Speaking gesture boost
  if (state.isSpeaking) {
    headGroup.rotation.x = Math.sin(t * 12) * 0.06;
    if (state.pose === 'idle') {
      rightForearmPivot.rotation.x = -0.55 + Math.sin(t * 7) * 0.2;
    }
  }

  controls.update();
  renderer.render(scene, camera);
}

function onWindowResize() {
  const container = document.getElementById('canvasContainer');
  if (!container || !renderer) return;
  camera.aspect = container.clientWidth / container.clientHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(container.clientWidth, container.clientHeight);
}

// ============================================================================
// UI CUSTOMIZER & CAMERA CONTROLS
// ============================================================================
function bindCustomizerEvents() {
  // Preset Switcher Buttons
  document.getElementById('presetRoyalBtn').addEventListener('click', () => switchModelPreset('royal'));
  document.getElementById('presetShadowBtn').addEventListener('click', () => switchModelPreset('shadow'));

  // Camera View Buttons
  document.querySelectorAll('.cam-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.cam-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      const camMode = btn.dataset.cam;
      if (camMode === 'full') {
        camera.position.set(0, 1.35, 3.6);
        controls.target.set(0, 1.05, 0);
      } else if (camMode === 'upper') {
        camera.position.set(0, 1.42, 2.0);
        controls.target.set(0, 1.32, 0);
      } else if (camMode === 'face') {
        camera.position.set(0, 1.62, 1.25);
        controls.target.set(0, 1.6, 0);
      }
      controls.update();
    });
  });

  // Pose Buttons
  document.querySelectorAll('.pose-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      setPose(btn.dataset.pose);
    });
  });

  // Customizer Inputs
  const bindInput = (id, key, isCheckbox = false) => {
    const el = document.getElementById(id);
    el.addEventListener('input', () => {
      state.config[key] = isCheckbox ? el.checked : el.value;
      applyCustomizationTo3D();
    });
  };

  bindInput('hairStyleSelect', 'hairStyle');
  bindInput('hairColorPicker', 'hairColor');
  bindInput('eyeColorPicker', 'eyeColor');
  bindInput('skinColorPicker', 'skinColor');
  bindInput('suitColorPicker', 'suitColor');
  bindInput('trimColorPicker', 'trimColor');
  bindInput('gemColorPicker', 'gemColor');
  bindInput('toggleCrown', 'crown', true);
  bindInput('togglePauldrons', 'pauldrons', true);
  bindInput('toggleWings', 'wings', true);
  bindInput('toggleSkirt', 'skirt', true);
  bindInput('toggleHalo', 'halo', true);
  bindInput('toggleWeapon', 'weapon', true);
  bindInput('heightSlider', 'heightScale');
  bindInput('auraSlider', 'auraIntensity');

  document.getElementById('outfitStyleSelect').addEventListener('change', e => {
    const val = e.target.value;
    state.config.outfitStyle = val;
    if (val === 'royal') {
      state.config.suitColor = '#17171f';
      state.config.trimColor = '#d4af37';
      state.config.skirt = true;
    } else if (val === 'tactical') {
      state.config.suitColor = '#1e242b';
      state.config.trimColor = '#eab308';
      state.config.skirt = false;
    } else if (val === 'cyber') {
      state.config.suitColor = '#0f172a';
      state.config.trimColor = '#38bdf8';
      state.config.wings = true;
    }
    applyCustomizationTo3D();
  });

  document.getElementById('resetLookBtn').addEventListener('click', () => {
    state.config = { ...PRESETS[state.activePreset] };
    localStorage.removeItem('mv_3d_custom_config');
    applyCustomizationTo3D();
    appendMessage('mv', `Maine apna 3D full-body look default **${state.config.name}** par reset kar diya hai!`);
  });

  document.getElementById('saveCustomPresetBtn').addEventListener('click', () => {
    localStorage.setItem('mv_3d_custom_config', JSON.stringify(state.config));
    appendMessage('mv', `Aapka custom 3D full-body design save ho gaya hai, **${state.userName}**!`);
  });

  document.getElementById('toggleCustomizeBtn').addEventListener('click', e => {
    const ws = document.getElementById('workspace');
    ws.classList.toggle('hide-customizer');
    e.currentTarget.classList.toggle('active');
    setTimeout(onWindowResize, 60);
  });
}

function setPose(poseName) {
  state.pose = poseName;
  characterGroup.position.y = 0;
  document.querySelectorAll('.pose-btn').forEach(b => {
    b.classList.toggle('active', b.dataset.pose === poseName);
  });
}

function switchModelPreset(presetKey) {
  state.activePreset = presetKey;
  state.config = { ...PRESETS[presetKey] };
  document.getElementById('presetRoyalBtn').classList.toggle('active', presetKey === 'royal');
  document.getElementById('presetShadowBtn').classList.toggle('active', presetKey === 'shadow');
  applyCustomizationTo3D();
  const msg = `Maine apna 3D full-body model **${state.config.name}** par switch kar liya hai! Aap mouse drag karke mujhe 360° dekh sakte hain aur customize bhi kar sakte hain.`;
  appendMessage('mv', msg);
  speakText(msg);
}

// ============================================================================
// CHAT & VOICE ASSISTANT LOGIC
// ============================================================================
const chatMessages = document.getElementById('chatMessages');
const chatForm = document.getElementById('chatForm');
const userInput = document.getElementById('userInput');
const voiceBars = document.getElementById('voiceBars');
const statusText = document.getElementById('statusText');

function formatText(text) {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
    .replace(/\n/g, '<br>');
}

function appendMessage(sender, text) {
  const row = document.createElement('div');
  row.className = `msg-row ${sender}`;
  const timeStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

  if (sender === 'mv') {
    row.innerHTML = `
      <img src="${state.config.avatar}" alt="MV" class="msg-avatar" />
      <div class="msg-bubble">
        <div>${formatText(text)}</div>
        <span class="msg-meta">MV 3D (${state.config.name}) &bull; ${timeStr}</span>
      </div>
    `;
  } else {
    row.innerHTML = `
      <div class="msg-bubble">
        <div>${formatText(text)}</div>
        <span class="msg-meta">${state.userName} &bull; ${timeStr}</span>
      </div>
    `;
  }
  chatMessages.appendChild(row);
  chatMessages.scrollTop = chatMessages.scrollHeight;
}

function setSpeakingState(active) {
  state.isSpeaking = active;
  voiceBars.classList.toggle('active', active);
  statusText.textContent = active
    ? 'MV 3D is speaking & animating...'
    : '3D Engine Active • Drag to Rotate, Scroll to Zoom';
}

function speakText(rawText) {
  if (!state.voiceEnabled || !('speechSynthesis' in window)) {
    setSpeakingState(true);
    setTimeout(() => setSpeakingState(false), 1400);
    return;
  }
  window.speechSynthesis.cancel();
  const cleanText = rawText.replace(/\*\*/g, '').replace(/[#_`]/g, '');
  const utterance = new SpeechSynthesisUtterance(cleanText);
  const voices = window.speechSynthesis.getVoices();
  const femaleVoice = voices.find(v =>
    /female|zira|google hindi|samantha|victoria|veena|lekha/i.test(v.name)
  ) || voices.find(v => v.lang.includes('hi') || v.lang.includes('en'));

  if (femaleVoice) utterance.voice = femaleVoice;
  utterance.pitch = 1.08;
  utterance.rate = 1.02;
  utterance.onstart = () => setSpeakingState(true);
  utterance.onend = () => setSpeakingState(false);
  utterance.onerror = () => setSpeakingState(false);
  window.speechSynthesis.speak(utterance);
}

function generateSmart3DResponse(input) {
  const q = input.toLowerCase();

  if (q.includes('shadow')) {
    switchModelPreset('shadow');
    return `Maine **Shadow Tactician** 3D full-body model activate kar liya hai!`;
  }
  if (q.includes('royal')) {
    switchModelPreset('royal');
    return `Maine **Royal Gold** 3D full-body model activate kar liya hai!`;
  }
  if (q.includes('spin') || q.includes('360')) {
    setPose('spin');
    return `Ye lijiye ${state.userName}, mera 360° full-body 3D view! Aap mouse se zoom aur rotate bhi kar sakte hain.`;
  }
  if (q.includes('dance')) {
    setPose('dance');
    return `Dance mode activated! Kaisa laga mera 3D animation, ${state.userName}?`;
  }
  if (q.includes('wave') || q.includes('hello') || q.includes('hi') || q.includes('namaste')) {
    setPose('wave');
    setTimeout(() => setPose('idle'), 3500);
    return `Namaste ${state.userName}! Main **MV 3D** hoon. Aap beech wale **3D Customizer** panel se mere baal, armor, colors, wings, aur accessories pura customize kar sakte hain!`;
  }
  if (q.includes('wing') || q.includes('blade') || q.includes('battle')) {
    state.config.wings = true;
    state.config.weapon = true;
    applyCustomizationTo3D();
    setPose('combat');
    return `Energy Wings aur Cyber Blade activate ho gaye hain, ${state.userName}!`;
  }

  return `Samajh gayi ${state.userName}! Aapne kaha: **"${input}"**. Mera 3D full-body model aapke har command aur customization ke liye ready hai!`;
}

async function handleUserMessage(text) {
  if (!text.trim()) return;
  appendMessage('user', text);
  userInput.value = '';

  let reply = '';
  if (state.geminiApiKey) {
    try {
      const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${state.geminiApiKey}`;
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ role: 'user', parts: [{ text: `You are MV, a 3D full-body customizable AI companion created by ${state.userName}. Reply in friendly Hinglish.\nUser: ${text}` }] }]
        })
      });
      const data = await res.json();
      reply = data?.candidates?.[0]?.content?.parts?.[0]?.text || generateSmart3DResponse(text);
    } catch (e) {
      reply = generateSmart3DResponse(text);
    }
  } else {
    reply = generateSmart3DResponse(text);
  }

  appendMessage('mv', reply);
  speakText(reply);
}

// Initialize App
window.addEventListener('DOMContentLoaded', () => {
  init3DStage();
  bindCustomizerEvents();

  appendMessage(
    'mv',
    `Welcome ${state.userName}! Ab mere dono models (**Royal Gold** aur **Shadow Tactician**) **3D Full-Body** mein available hain! Aap mujhe 360° ghuma sakte hain, poses badal sakte hain, aur **3D Customizer** se mera hairstyle, outfit, colors, wings, aur crown fully customize kar sakte hain.`
  );

  chatForm.addEventListener('submit', e => {
    e.preventDefault();
    handleUserMessage(userInput.value);
  });

  document.getElementById('quickChips').addEventListener('click', e => {
    const chip = e.target.closest('.chip');
    if (chip) handleUserMessage(chip.dataset.prompt);
  });

  document.getElementById('voiceToggleBtn').addEventListener('click', () => {
    state.voiceEnabled = !state.voiceEnabled;
    document.getElementById('voiceIcon').textContent = state.voiceEnabled ? '🔊' : '🔇';
    if (!state.voiceEnabled && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      setSpeakingState(false);
    }
  });

  // Settings Modal
  const modal = document.getElementById('settingsModal');
  document.getElementById('settingsBtn').addEventListener('click', () => modal.classList.remove('hidden'));
  document.getElementById('closeSettingsBtn').addEventListener('click', () => modal.classList.add('hidden'));
  document.getElementById('saveSettingsBtn').addEventListener('click', () => {
    state.geminiApiKey = document.getElementById('apiKeyInput').value.trim();
    state.userName = document.getElementById('userNameInput').value.trim() || 'Boss';
    localStorage.setItem('mv_gemini_api_key', state.geminiApiKey);
    localStorage.setItem('mv_user_name', state.userName);
    modal.classList.add('hidden');
  });

  // Speech Recognition
  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (SpeechRecognition) {
    const rec = new SpeechRecognition();
    rec.lang = 'hi-IN';
    document.getElementById('micBtn').addEventListener('click', () => {
      try { rec.start(); } catch (e) { rec.stop(); }
    });
    rec.onresult = e => handleUserMessage(e.results[0][0].transcript);
  }
});
