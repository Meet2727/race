/* ==========================================================================
   MV — Real 3D Model Engine (Default: Model 1 - Royal Gold)
   ========================================================================== */

const state = {
  activeModel: 1, // Model 1 set as DEFAULT
  animMode: 'idle',
  voiceEnabled: true,
  Speaking: false,
  presets: {
    1: {
      name: 'Model 1 (Royal Gold)',
      photo: 'assets/mv-avatar-1.jpg',
      glb: 'assets/mv-model-1.glb',
      armorColor: '#d4af37',
      suitColor: '#17151c',
      hairColor: '#e6ccb2',
      glowColor: '#ff2a55',
      skinColor: '#f7d8c4'
    },
    2: {
      name: 'Model 2 (Shadow Tactician)',
      photo: 'assets/mv-avatar-2.jpg',
      glb: 'assets/mv-model-2.glb',
      armorColor: '#eab308',
      suitColor: '#111827',
      hairColor: '#1f1b18',
      glowColor: '#10b981',
      skinColor: '#f5dccb'
    }
  }
};

let scene, camera, renderer, controls, clock;
let characterRoot, headGroup, leftArm, rightArm, parts = {};
let keyLight, textureLoader, gltfLoader;

function init3DStage() {
  const container = document.getElementById('canvasContainer');
  scene = new THREE.Scene();
  clock = new THREE.Clock();
  textureLoader = new THREE.TextureLoader();
  gltfLoader = new THREE.GLTFLoader();

  camera = new THREE.PerspectiveCamera(40, container.clientWidth / container.clientHeight, 0.1, 100);
  camera.position.set(0, 1.35, 3.8);

  renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
  renderer.setSize(container.clientWidth, container.clientHeight);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.shadowMap.enabled = true;
  container.appendChild(renderer.domElement);

  controls = new THREE.OrbitControls(camera, renderer.domElement);
  controls.target.set(0, 1.1, 0);
  controls.enableDamping = true;
  controls.minDistance = 1.2;
  controls.maxDistance = 6;

  scene.add(new THREE.AmbientLight(0xffffff, 0.75));
  keyLight = new THREE.DirectionalLight(0xfff5e6, 1.4);
  keyLight.position.set(2.5, 4, 3);
  scene.add(keyLight);

  const rimLight = new THREE.PointLight(0xd4af37, 1.2, 8);
  rimLight.position.set(-2, 2.5, -2);
  scene.add(rimLight);

  const baseGeo = new THREE.CylinderGeometry(0.95, 1.1, 0.08, 48);
  const baseMat = new THREE.MeshStandardMaterial({ color: 0x121622, metalness: 0.8, roughness: 0.25 });
  const platform = new THREE.Mesh(baseGeo, baseMat);
  platform.position.y = -0.04;
  scene.add(platform);

  loadMVModel(1);

  window.addEventListener('resize', () => {
    camera.aspect = container.clientWidth / container.clientHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(container.clientWidth, container.clientHeight);
  });

  animate();
}

function loadMVModel(modelId) {
  state.activeModel = modelId;
  const cfg = state.presets[modelId];

  document.getElementById('armorColorPicker').value = cfg.armorColor;
  document.getElementById('hairColorPicker').value = cfg.hairColor;
  document.getElementById('glowColorPicker').value = cfg.glowColor;
  document.getElementById('activeModelBadge').textContent =
    modelId === 1 ? 'DEFAULT: MODEL 1 (ROYAL GOLD)' : 'ACTIVE: MODEL 2 (SHADOW)';

  if (characterRoot) scene.remove(characterRoot);

  gltfLoader.load(
    cfg.glb,
    gltf => {
      characterRoot = gltf.scene;
      characterRoot.scale.set(1, 1, 1);
      scene.add(characterRoot);
    },
    undefined,
    () => {
      buildPhotoMappedFullBody(cfg);
    }
  );
}

function buildPhotoMappedFullBody(cfg) {
  characterRoot = new THREE.Group();
  const portraitTex = textureLoader.load(cfg.photo);

  const skinMat = new THREE.MeshStandardMaterial({ color: cfg.skinColor, roughness: 0.45 });
  const suitMat = new THREE.MeshStandardMaterial({ color: cfg.suitColor, metalness: 0.45, roughness: 0.35 });
  const armorMat = new THREE.MeshStandardMaterial({ color: cfg.armorColor, metalness: 0.85, roughness: 0.2 });
  const hairMat = new THREE.MeshStandardMaterial({ color: cfg.hairColor, roughness: 0.55 });
  const glowMat = new THREE.MeshStandardMaterial({
    color: cfg.glowColor,
    emissive: cfg.glowColor,
    emissiveIntensity: 1.5
  });

  parts = { armorMat, hairMat, glowMat };

  headGroup = new THREE.Group();
  headGroup.position.set(0, 1.72, 0);

  const headMesh = new THREE.Mesh(new THREE.SphereGeometry(0.16, 36, 36), skinMat);
  headMesh.scale.set(0.92, 1.08, 0.95);
  headGroup.add(headMesh);

  const faceGeo = new THREE.SphereGeometry(0.163, 32, 32, -Math.PI * 0.32, Math.PI * 0.64, Math.PI * 0.22, Math.PI * 0.55);
  const faceMat = new THREE.MeshBasicMaterial({ map: portraitTex });
  const faceProjection = new THREE.Mesh(faceGeo, faceMat);
  faceProjection.rotation.y = -Math.PI / 2;
  headGroup.add(faceProjection);

  const hairBack = new THREE.Mesh(new THREE.SphereGeometry(0.175, 28, 28), hairMat);
  hairBack.position.set(0, 0.02, -0.03);
  hairBack.scale.set(1.05, 1.15, 1.05);
  headGroup.add(hairBack);

  const hairFlow = new THREE.Mesh(new THREE.ConeGeometry(0.22, 0.65, 24), hairMat);
  hairFlow.position.set(0, -0.25, -0.08);
  headGroup.add(hairFlow);

  const crown = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.1, 0.07, 16, 1, true), armorMat);
  crown.position.set(0, 0.19, 0);
  headGroup.add(crown);
  parts.crown = crown;

  characterRoot.add(headGroup);

  const neck = new THREE.Mesh(new THREE.CylinderGeometry(0.055, 0.065, 0.12, 20), skinMat);
  neck.position.set(0, 1.54, 0);
  characterRoot.add(neck);

  const torso = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.13, 0.44, 28), suitMat);
  torso.position.set(0, 1.28, 0);
  torso.scale.set(1.05, 1, 0.74);
  characterRoot.add(torso);

  const chestTrim = new THREE.Mesh(new THREE.TorusGeometry(0.15, 0.018, 16, 32), armorMat);
  chestTrim.position.set(0, 1.38, 0.06);
  chestTrim.rotation.x = Math.PI / 2.3;
  characterRoot.add(chestTrim);

  const coreGem = new THREE.Mesh(new THREE.OctahedronGeometry(0.038, 1), glowMat);
  coreGem.position.set(0, 1.35, 0.15);
  characterRoot.add(coreGem);

  const hips = new THREE.Mesh(new THREE.CylinderGeometry(0.135, 0.19, 0.22, 28), armorMat);
  hips.position.set(0, 0.96, 0);
  hips.scale.set(1.05, 1, 0.78);
  characterRoot.add(hips);

  leftArm = new THREE.Group();
  leftArm.position.set(-0.23, 1.44, 0);
  const lUpper = new THREE.Mesh(new THREE.CylinderGeometry(0.048, 0.04, 0.48, 18), skinMat);
  lUpper.position.y = -0.22;
  leftArm.add(lUpper);
  characterRoot.add(leftArm);

  rightArm = new THREE.Group();
  rightArm.position.set(0.23, 1.44, 0);
  const rUpper = new THREE.Mesh(new THREE.CylinderGeometry(0.048, 0.04, 0.48, 18), skinMat);
  rUpper.position.y = -0.22;
  rightArm.add(rUpper);

  const blade = new THREE.Mesh(new THREE.BoxGeometry(0.025, 0.75, 0.06), glowMat);
  blade.position.set(0, -0.55, 0.18);
  blade.rotation.x = Math.PI / 3;
  rightArm.add(blade);
  parts.weapon = blade;

  characterRoot.add(rightArm);

  [-0.1, 0.1].forEach(xOffset => {
    const thigh = new THREE.Mesh(new THREE.CylinderGeometry(0.078, 0.058, 0.46, 20), skinMat);
    thigh.position.set(xOffset, 0.65, 0);
    characterRoot.add(thigh);

    const boot = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.05, 0.46, 20), suitMat);
    boot.position.set(xOffset, 0.23, 0);
    characterRoot.add(boot);

    const kneeGuard = new THREE.Mesh(new THREE.SphereGeometry(0.055, 16, 16), armorMat);
    kneeGuard.position.set(xOffset, 0.44, 0.04);
    characterRoot.add(kneeGuard);
  });

  const wings = new THREE.Group();
  [-1, 1].forEach(dir => {
    const wing = new THREE.Mesh(new THREE.ConeGeometry(0.28, 0.85, 4), armorMat);
    wing.position.set(dir * 0.35, 1.32, -0.18);
    wing.rotation.z = dir * -0.55;
    wings.add(wing);
  });
  characterRoot.add(wings);
  parts.wings = wings;

  const aura = new THREE.Mesh(new THREE.TorusGeometry(0.65, 0.012, 16, 64), glowMat);
  aura.position.set(0, 1.25, -0.22);
  characterRoot.add(aura);
  parts.aura = aura;

  scene.add(characterRoot);
}

function animate() {
  requestAnimationFrame(animate);
  const t = clock.getElapsedTime();

  if (characterRoot) {
    characterRoot.position.y = Math.sin(t * 2) * 0.02;

    if (state.animMode === 'spin') {
      characterRoot.rotation.y += 0.025;
    } else if (state.animMode === 'wave' && rightArm) {
      rightArm.rotation.z = Math.PI * 0.65 + Math.sin(t * 8) * 0.25;
    } else if (state.animMode === 'combat' && rightArm && leftArm) {
      rightArm.rotation.x = -0.8 + Math.sin(t * 4) * 0.15;
      leftArm.rotation.x = -0.4;
    } else if (rightArm && leftArm) {
      rightArm.rotation.set(0, 0, -0.08);
      leftArm.rotation.set(0, 0, 0.08);
    }

    if (headGroup && state.Speaking) {
      headGroup.rotation.y = Math.sin(t * 10) * 0.08;
      headGroup.rotation.x = Math.sin(t * 14) * 0.04;
    }
  }

  controls.update();
  renderer.render(scene, camera);
}

document.querySelectorAll('.model-switch-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.model-switch-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    const id = Number(btn.dataset.model);
    loadMVModel(id);
    replyFromMV(`Maine **${state.presets[id].name}** 3D avatar load kar liya hai!`);
  });
});

document.getElementById('glbUploadInput').addEventListener('change', e => {
  const file = e.target.files[0];
  if (!file) return;
  const url = URL.createObjectURL(file);
  if (characterRoot) scene.remove(characterRoot);
  gltfLoader.load(url, gltf => {
    characterRoot = gltf.scene;
    scene.add(characterRoot);
    replyFromMV(`Aapki custom 3D file **${file.name}** successfully stage par load ho gayi hai!`);
  });
});

document.getElementById('armorColorPicker').addEventListener('input', e => {
  if (parts.armorMat) parts.armorMat.color.set(e.target.value);
});
document.getElementById('hairColorPicker').addEventListener('input', e => {
  if (parts.hairMat) parts.hairMat.color.set(e.target.value);
});
document.getElementById('glowColorPicker').addEventListener('input', e => {
  if (parts.glowMat) {
    parts.glowMat.color.set(e.target.value);
    parts.glowMat.emissive.set(e.target.value);
  }
});
document.getElementById('scaleSlider').addEventListener('input', e => {
  if (characterRoot) {
    const s = parseFloat(e.target.value);
    characterRoot.scale.set(s, s, s);
  }
});
document.getElementById('lightSlider').addEventListener('input', e => {
  if (keyLight) keyLight.intensity = parseFloat(e.target.value);
});

document.querySelectorAll('.acc-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    btn.classList.toggle('active');
    const part = parts[btn.dataset.part];
    if (part) part.visible = btn.classList.contains('active');
  });
});

document.querySelectorAll('.anim-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.anim-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    state.animMode = btn.dataset.anim;
  });
});

document.querySelectorAll('.cam-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.cam-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    const view = btn.dataset.cam;
    if (view === 'full') {
      camera.position.set(0, 1.35, 3.8);
      controls.target.set(0, 1.1, 0);
    } else if (view === 'upper') {
      camera.position.set(0, 1.5, 2.2);
      controls.target.set(0, 1.35, 0);
    } else {
      camera.position.set(0, 1.72, 1.15);
      controls.target.set(0, 1.7, 0);
    }
  });
});

const chatMessages = document.getElementById('chatMessages');
function appendMsg(role, text) {
  const div = document.createElement('div');
  div.className = `msg ${role}`;
  div.innerHTML = text.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
  chatMessages.appendChild(div);
  chatMessages.scrollTop = chatMessages.scrollHeight;
}

function replyFromMV(text) {
  appendMsg('mv', text);
  if (state.voiceEnabled && 'speechSynthesis' in window) {
    window.speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text.replace(/\*\*/g, ''));
    u.lang = 'hi-IN';
    u.pitch = 1.1;
    u.onstart = () => (state.Speaking = true);
    u.onend = () => (state.Speaking = false);
    window.speechSynthesis.speak(u);
  }
}

document.getElementById('chatForm').addEventListener('submit', e => {
  e.preventDefault();
  const input = document.getElementById('userInput');
  const text = input.value.trim();
  if (!text) return;
  appendMsg('user', text);
  input.value = '';

  const q = text.toLowerCase();
  if (q.includes('model 2') || q.includes('shadow')) {
    document.getElementById('btnModel2').click();
  } else if (q.includes('model 1') || q.includes('default') || q.includes('royal')) {
    document.getElementById('btnModel1').click();
  } else if (q.includes('spin') || q.includes('ghumo')) {
    state.animMode = 'spin';
    replyFromMV('Ye lijiye mera 360 degree full-body 3D view!');
  } else {
    replyFromMV(`Main **${state.presets[state.activeModel].name}** 3D mode mein active hoon. Aap mujhe customize kar sakte hain ya upar **Load .GLB** button se koi bhi external 3D mesh file import kar sakte hain!`);
  }
});

window.addEventListener('DOMContentLoaded', () => {
  init3DStage();
  replyFromMV('Namaste! Mera **Model 1 (Royal Gold)** default 3D avatar set ho chuka hai. Aap mujhe 360° ghuma sakte hain, customize kar sakte hain, ya Model 2 par switch kar sakte hain.');
});
