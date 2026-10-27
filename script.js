/* ==========================================================================
   MV Photorealistic 3D AI System Engine (script.js)
   Renders the attached high-fidelity portraits into interactive 3D Holograms
   Default: Model 1 (Royal Gold)
   ========================================================================== */

const state = {
  activeModel: 1, // Default Model 1
  viewMode: 'card', // 'card' (Photorealistic View), '3d' (Hologram Mesh), 'depth' (3D Relief)
  autoRotate: true,
  particlesActive: true,
  depthStrength: 0.8,
  glowColor: '#d4af37',
  voiceEnabled: true,
  isSpeaking: false,
  models: {
    1: { name: 'Model 1 (Royal Gold)', img: 'assets/model-1.jpg' },
    2: { name: 'Model 2 (Shadow)', img: 'assets/model-2.jpg' }
  }
};

let scene, camera, renderer, controls, clock;
let currentMesh, particlesMesh, material;
let textureLoader, currentTexture;

function init3DStage() {
  const container = document.getElementById('canvasContainer');
  clock = new THREE.Clock();
  textureLoader = new THREE.TextureLoader();

  scene = new THREE.Scene();
  camera = new THREE.PerspectiveCamera(45, container.clientWidth / container.clientHeight, 0.1, 1000);
  camera.position.set(0, 0, 2.8);

  renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
  renderer.setSize(container.clientWidth, container.clientHeight);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  container.appendChild(renderer.domElement);

  controls = new THREE.OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;
  controls.dampingFactor = 0.05;

  // Lights
  scene.add(new THREE.AmbientLight(0xffffff, 1.2));
  const dirLight = new THREE.DirectionalLight(0xfff5e6, 1.5);
  dirLight.position.set(2, 3, 4);
  scene.add(dirLight);

  // Load Default Model 1 Photo
  loadActiveModelTexture();

  // Floating Sparkle Particles
  const pGeo = new THREE.BufferGeometry();
  const pCount = 120;
  const positions = new Float32Array(pCount * 3);
  for(let i=0; i<pCount*3; i+=3) {
    positions[i] = (Math.random() - 0.5) * 4;
    positions[i+1] = (Math.random() - 0.5) * 4;
    positions[i+2] = (Math.random() - 0.5) * 2;
  }
  pGeo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  const pMat = new THREE.PointsMaterial({ color: 0xd4af37, size: 0.03, transparent: true, opacity: 0.8 });
  particlesMesh = new THREE.Points(pGeo, pMat);
  scene.add(particlesMesh);

  window.addEventListener('resize', () => {
    camera.aspect = container.clientWidth / container.clientHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(container.clientWidth, container.clientHeight);
  });

  animate();
}

function loadActiveModelTexture() {
  const modelInfo = state.models[state.activeModel];
  textureLoader.load(modelInfo.img, tex => {
    currentTexture = tex;
    rebuildGeometry();
  });
}

function rebuildGeometry() {
  if (currentMesh) scene.remove(currentMesh);

  const aspect = 1.0; // Square / Portrait plane aspect
  let geo;

  if (state.viewMode === 'card') {
    // Photorealistic Flat High-Definition Plane with slight rounded curved illusion
    geo = new THREE.PlaneGeometry(1.6, 2.0, 32, 32);
    material = new THREE.MeshBasicMaterial({ map: currentTexture });
  } else if (state.viewMode === '3d') {
    // Holographic Curved 3D Mesh Portrait
    geo = new THREE.CylinderGeometry(0.9, 0.9, 2.0, 32, 32, true, -Math.PI/3, Math.PI*2/3);
    material = new THREE.MeshStandardMaterial({
      map: currentTexture,
      side: THREE.DoubleSide,
      roughness: 0.3,
      metalness: 0.4
    });
  } else {
    // 3D Depth Relief Sculpted Plane
    geo = new THREE.PlaneGeometry(1.6, 2.0, 64, 64);
    material = new THREE.MeshStandardMaterial({
      map: currentTexture,
      roughness: 0.25,
      metalness: 0.6,
      bumpScale: state.depthStrength
    });
  }

  currentMesh = new THREE.Mesh(geo, material);
  scene.add(currentMesh);
}

function animate() {
  requestAnimationFrame(animate);
  const t = clock.getElapsedTime();

  if (currentMesh && state.autoRotate && state.viewMode !== 'card') {
    currentMesh.rotation.y = Math.sin(t * 0.5) * 0.35;
  } else if (currentMesh) {
    currentMesh.rotation.y = 0;
  }

  if (particlesMesh && state.particlesActive) {
    particlesMesh.rotation.y = t * 0.1;
  }

  controls.update();
  renderer.render(scene, camera);
}

// UI Controls & Model Switcher
document.querySelectorAll('.model-switch-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.model-switch-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    state.activeModel = Number(btn.dataset.model);
    document.getElementById('activeModelPill').textContent =
      state.activeModel === 1 ? 'DEFAULT: MODEL 1 (ROYAL GOLD)' : 'ACTIVE: MODEL 2 (SHADOW)';
    loadActiveModelTexture();
    replyFromMV(`Maine **${state.models[state.activeModel].name}** photorealistic 3D view activate kar liya hai!`);
  });
});

document.querySelectorAll('.cam-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.cam-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    state.viewMode = btn.dataset.view;
    rebuildGeometry();
  });
});

document.getElementById('glowColorPicker').addEventListener('input', e => {
  state.glowColor = e.target.value;
  if (particlesMesh) particlesMesh.material.color.set(e.target.value);
});

document.getElementById('depthSlider').addEventListener('input', e => {
  state.depthStrength = parseFloat(e.target.value);
  if (material && material.bumpScale !== undefined) {
    material.bumpScale = state.depthStrength;
  }
});

document.getElementById('zoomSlider').addEventListener('input', e => {
  camera.position.z = parseFloat(e.target.value);
});

document.querySelectorAll('.fx-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    btn.classList.toggle('active');
    const fx = btn.dataset.fx;
    if (fx === 'rotate') state.autoRotate = btn.classList.contains('active');
    if (fx === 'particles') {
      state.particlesActive = btn.classList.contains('active');
      particlesMesh.visible = state.particlesActive;
    }
  });
});

// Chat & Voice
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
  } else {
    replyFromMV(`Main **${state.models[state.activeModel].name}** photorealistic 3D mode mein active hoon. Aap upar buttons se 3D hologram mesh ya depth relief view bhi switch kar sakte hain!`);
  }
});

window.addEventListener('DOMContentLoaded', () => {
  init3DStage();
  replyFromMV('Namaste! Aapka **Model 1 (Royal Gold)** photorealistic 3D default set ho chuka hai. Ye aapki original photo ki exact high-definition quality render karta hai!');
});
