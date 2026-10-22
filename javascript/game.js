/**
 * Subway Runner 3D - Advanced Edition
 * Fully optimized Three.js Endless Runner with Lanes, Trains, Powerups, and Smooth Physics.
 */

// --- GAME STATE ---
const STATE = {
    MENU: 0,
    PLAYING: 1,
    PAUSED: 2,
    GAMEOVER: 3,
    SHOP: 4,
    INSTRUCTIONS: 5
};
let currentState = STATE.MENU;

// --- CONFIG & CONSTANTS ---
const LANES = [-2.5, 0, 2.5];
const LANE_SWITCH_SPEED = 15;
const GRAVITY = 35;
const JUMP_FORCE = 13;
let gameSpeed = 22;
let score = 0;
let coins = 0;
let bestScore = localStorage.getItem('subway_best_score') || 0;
let totalCoins = parseInt(localStorage.getItem('subway_coins') || '0');

// --- THREE.JS GLOBALS ---
let scene, camera, renderer;
let player, playerGroup;
let worldObjects = [];
let particles = [];
let clock = new THREE.Clock();

// --- PLAYER CONTROLLER STATE ---
let playerLane = 1; // 0: left, 1: center, 2: right
let targetX = 0;
let playerY = 0;
let verticalVelocity = 0;
let isJumping = false;
let isRolling = false;
let rollTimer = 0;

// --- POWERUPS STATE ---
let powerups = {
    jetpack: { active: false, time: 0, duration: 6 },
    magnet: { active: false, time: 0, duration: 8 },
    multiplier: { active: false, time: 0, duration: 10 }
};

// --- SPAWN TIMERS ---
let obstacleSpawnTimer = 0;
let coinSpawnTimer = 0;
let environmentSpawnTimer = 0;
let trackZLength = 200;

// --- INITIALIZATION ---
function init() {
    setupGraphics();
    setupLights();
    setupPlayer();
    setupEventListeners();
    setupUI();
    
    // Start animation loop
    animate();
}

function setupGraphics() {
    const container = document.getElementById('canvas-container');
    
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x87ceeb); // Sky blue
    scene.fog = new THREE.FogExp2(0x87ceeb, 0.015);

    camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 1000);
    camera.position.set(0, 4, 8);
    camera.lookAt(0, 1, -5);

    renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: "high-performance" });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    container.appendChild(renderer.domElement);

    // Initial Track Generation
    createTrackEnvironment();

    window.addEventListener('resize', onWindowResize);
}

function setupLights() {
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
    scene.add(ambientLight);

    const dirLight = new THREE.DirectionalLight(0xfffaed, 0.9);
    dirLight.position.set(20, 40, 20);
    dirLight.castShadow = true;
    dirLight.shadow.mapSize.width = 2048;
    dirLight.shadow.mapSize.height = 2048;
    dirLight.shadow.camera.near = 0.5;
    dirLight.shadow.camera.far = 150;
    const d = 30;
    dirLight.shadow.camera.left = -d;
    dirLight.shadow.camera.right = d;
    dirLight.shadow.camera.top = d;
    dirLight.shadow.camera.bottom = -d;
    scene.add(dirLight);

    // Hemisphere light for realistic ground/sky shading
    const hemiLight = new THREE.HemisphereLight(0xffffff, 0x444444, 0.4);
    hemiLight.position.set(0, 50, 0);
    scene.add(hemiLight);
}

// --- ENVIRONMENT & TRACK ---
function createTrackEnvironment() {
    // Ground / Railway floor
    const groundGeo = new THREE.PlaneGeometry(30, 400);
    const groundMat = new THREE.MeshStandardMaterial({ color: 0x333333, roughness: 0.8 });
    const ground = new THREE.Mesh(groundGeo, groundMat);
    ground.rotation.x = -Math.PI / 2;
    ground.position.set(0, 0, -150);
    ground.receiveShadow = true;
    scene.add(ground);
    worldObjects.push(ground);

    // Track Rails & Sleepers
    for (let z = 0; z > -300; z -= 4) {
        // Wooden sleepers across lanes
        const sleeperGeo = new THREE.BoxGeometry(9, 0.2, 0.8);
        const sleeperMat = new THREE.MeshStandardMaterial({ color: 0x5c4033 });
        const sleeper = new THREE.Mesh(sleeperGeo, sleeperMat);
        sleeper.position.set(0, 0.05, z);
        scene.add(sleeper);
        worldObjects.push(sleeper);
    }

    // Side walls / Subway environment details (Buildings / Fences)
    for (let z = 0; z > -300; z -= 30) {
        createBuilding(-12, z);
        createBuilding(12, z);
    }
}

function createBuilding(x, z) {
    const height = 15 + Math.random() * 15;
    const geo = new THREE.BoxGeometry(6, height, 25);
    const mat = new THREE.MeshStandardMaterial({ 
        color: new THREE.Color().setHSL(Math.random(), 0.3, 0.4),
        roughness: 0.7 
    });
    const building = new THREE.Mesh(geo, mat);
    building.position.set(x, height / 2, z);
    building.castShadow = true;
    building.receiveShadow = true;
    scene.add(building);
    worldObjects.push(building);
}

// --- PLAYER SETUP ---
function setupPlayer() {
    playerGroup = new THREE.Group();

    // Body
    const bodyGeo = new THREE.BoxGeometry(0.8, 1.2, 0.5);
    const bodyMat = new THREE.MeshStandardMaterial({ color: 0xe74c3c, roughness: 0.3 });
    const body = new THREE.Mesh(bodyGeo, bodyMat);
    body.position.y = 0.6;
    body.castShadow = true;
    playerGroup.add(body);

    // Head
    const headGeo = new THREE.SphereGeometry(0.4, 16, 16);
    const headMat = new THREE.MeshStandardMaterial({ color: 0xffdbac, roughness: 0.5 });
    const head = new THREE.Mesh(headGeo, headMat);
    head.position.y = 1.4;
    head.castShadow = true;
    playerGroup.add(head);

    // Cap
    const capGeo = new THREE.CylinderGeometry(0.42, 0.42, 0.15, 16);
    const capMat = new THREE.MeshStandardMaterial({ color: 0x3498db });
    const cap = new THREE.Mesh(capGeo, capMat);
    cap.position.y = 1.65;
    playerGroup.add(cap);

    player = playerGroup;
    player.position.set(LANES[playerLane], 0, 0);
    scene.add(player);
}

// --- GAME LOOP & PHYSICS ---
function animate() {
    requestAnimationFrame(animate);

    const dt = clock.getDelta();

    if (currentState === STATE.PLAYING) {
        updateGame(dt);
    }

    renderer.render(scene, camera);
}

function updateGame(dt) {
    // Increase score and speed gradually
    score += dt * gameSpeed * (powerups.multiplier.active ? 2 : 1);
    gameSpeed += dt * 0.05; // Gradual acceleration
    document.getElementById('score-val').innerText = Math.floor(score);

    // Smooth lane switching
    targetX = LANES[playerLane];
    player.position.x += (targetX - player.position.x) * LANE_SWITCH_SPEED * dt;

    // Jump & Gravity Physics
    if (isJumping || player.position.y > 0) {
        verticalVelocity -= GRAVITY * dt;
        player.position.y += verticalVelocity * dt;

        if (player.position.y <= 0) {
            player.position.y = 0;
            isJumping = false;
            verticalVelocity = 0;
        }
    }

    // Roll Timer
    if (isRolling) {
        rollTimer -= dt;
        player.scale.y = 0.6;
        if (rollTimer <= 0) {
            isRolling = false;
            player.scale.y = 1;
        }
    }

    // Powerup Timers
    updatePowerups(dt);

    // Obstacle & Collectible Spawning
    handleSpawning(dt);

    // Move world objects towards player to simulate running
    moveWorld(dt);

    // Collision Detection
    checkCollisions();
}

function updatePowerups(dt) {
    for (let key in powerups) {
        if (powerups[key].active) {
            powerups[key].time -= dt;
            const fillElem = document.getElementById(`${key}-fill`);
            if (fillElem) {
                const percent = (powerups[key].time / powerups[key].duration) * 100;
                fillElem.style.width = `${percent}%`;
            }

            if (powerups[key].time <= 0) {
                powerups[key].active = false;
                document.getElementById(`${key}-timer`)?.classList.add('hidden');
                if (key === 'multiplier') {
                    document.getElementById('multiplier-badge').classList.add('hidden');
                }
            }
        }
    }
}

// --- SPAWNING SYSTEM ---
let obstacles = [];
let coinsArray = [];
let powerupItems = [];

function handleSpawning(dt) {
    obstacleSpawnTimer += dt * (gameSpeed / 20);
    if (obstacleSpawnTimer > 1.8) {
        obstacleSpawnTimer = 0;
        spawnObstacleSet();
    }

    coinSpawnTimer += dt * 10;
    if (coinSpawnTimer > 3) {
        coinSpawnTimer = 0;
        spawnCoinLine();
    }
}

function spawnObstacleSet() {
    const lane = Math.floor(Math.random() * 3);
    const type = Math.random();
    
    let mesh;
    if (type < 0.4) {
        // Barrier box
        const geo = new THREE.BoxGeometry(2, 1.2, 0.6);
        const mat = new THREE.MeshStandardMaterial({ color: 0x95a5a6, roughness: 0.4 });
        mesh = new THREE.Mesh(geo, mat);
        mesh.position.set(LANES[lane], 0.6, -120);
        mesh.userData = { type: 'barrier', height: 'high' };
    } else if (type < 0.7) {
        // Low barrier (Jump over)
        const geo = new THREE.BoxGeometry(2, 0.5, 0.4);
        const mat = new THREE.MeshStandardMaterial({ color: 0xe67e22 });
        mesh = new THREE.Mesh(geo, mat);
        mesh.position.set(LANES[lane], 0.25, -120);
        mesh.userData = { type: 'low_barrier', height: 'low' };
    } else {
        // Train Obstacle
        const geo = new THREE.BoxGeometry(2.2, 3.5, 12);
        const mat = new THREE.MeshStandardMaterial({ color: 0x2c3e50, metalness: 0.5 });
        mesh = new THREE.Mesh(geo, mat);
        mesh.position.set(LANES[lane], 1.75, -130);
        mesh.userData = { type: 'train', height: 'massive' };
    }

    mesh.castShadow = true;
    mesh.receiveShadow = true;
    scene.add(mesh);
    obstacles.push(mesh);

    // Random powerup spawn chance
    if (Math.random() < 0.15) {
        spawnPowerup(-120);
    }
}

function spawnCoinLine() {
    const lane = Math.floor(Math.random() * 3);
    for (let i = 0; i < 5; i++) {
        const coinGeo = new THREE.CylinderGeometry(0.4, 0.4, 0.1, 16);
        const coinMat = new THREE.MeshStandardMaterial({ color: 0xf1c40f, metalness: 0.8, roughness: 0.2 });
        const coin = new THREE.Mesh(coinGeo, coinMat);
        coin.rotation.z = Math.PI / 2;
        coin.position.set(LANES[lane], 1, -100 - (i * 2));
        scene.add(coin);
        coinsArray.push(coin);
    }
}

function spawnPowerup(zPos) {
    const lane = Math.floor(Math.random() * 3);
    const types = ['jetpack', 'magnet', 'multiplier'];
    const chosenType = types[Math.floor(Math.random() * types.length)];
    
    const geo = new THREE.BoxGeometry(1, 1, 1);
    const colorMap = { jetpack: 0xe74c3c, magnet: 0x9b59b6, multiplier: 0xf1c40f };
    const mat = new THREE.MeshStandardMaterial({ color: colorMap[chosenType], emissive: colorMap[chosenType], emissiveIntensity: 0.5 });
    const pMesh = new THREE.Mesh(geo, mat);
    pMesh.position.set(LANES[lane], 1, zPos);
    scene.add(pMesh);
    powerupItems.push({ mesh: pMesh, type: chosenType });
}

function moveWorld(dt) {
    const moveDist = gameSpeed * dt;

    // Move obstacles
    for (let i = obstacles.length - 1; i >= 0; i--) {
        obstacles[i].position.z += moveDist;
        if (obstacles[i].position.z > 10) {
            scene.remove(obstacles[i]);
            obstacles.splice(i, 1);
        }
    }

    // Move coins
    for (let i = coinsArray.length - 1; i >= 0; i--) {
        coinsArray[i].position.z += moveDist;
        coinsArray[i].rotation.x += dt * 3;
        if (coinsArray[i].position.z > 10) {
            scene.remove(coinsArray[i]);
            coinsArray.splice(i, 1);
        }
    }

    // Move powerups
    for (let i = powerupItems.length - 1; i >= 0; i--) {
        powerupItems[i].mesh.position.z += moveDist;
        powerupItems[i].mesh.rotation.y += dt * 2;
        if (powerupItems[i].mesh.position.z > 10) {
            scene.remove(powerupItems[i].mesh);
            powerupItems.splice(i, 1);
        }
    }
}

// --- COLLISION DETECTION ---
function checkCollisions() {
    const playerBox = new THREE.Box3().setFromObject(player);

    // Coins collection
    for (let i = coinsArray.length - 1; i >= 0; i--) {
        const coin = coinsArray[i];
        
        // Magnet effect pull
        if (powerups.magnet.active && Math.abs(coin.position.z - player.position.z) < 15 && Math.abs(coin.position.x - player.position.x) < 3) {
            coin.position.x += (player.position.x - coin.position.x) * 10 * 0.016;
            coin.position.z += (player.position.z - coin.position.z) * 15 * 0.016;
        }

        const coinBox = new THREE.Box3().setFromObject(coin);
        if (playerBox.intersectsBox(coinBox)) {
            scene.remove(coin);
            coinsArray.splice(i, 1);
            coins += (powerups.multiplier.active ? 2 : 1);
            document.getElementById('coin-val').innerText = coins;
        }
    }

    // Powerup collection
    for (let i = powerupItems.length - 1; i >= 0; i--) {
        const pItem = powerupItems[i];
        const pBox = new THREE.Box3().setFromObject(pItem.mesh);
        if (playerBox.intersectsBox(pBox)) {
            activatePowerup(pItem.type);
            scene.remove(pItem.mesh);
            powerupItems.splice(i, 1);
        }
    }

    // Obstacles collision (Ignore if jetpack is active)
    if (powerups.jetpack.active) return;

    for (let obs of obstacles) {
        const obsBox = new THREE.Box3().setFromObject(obs);
        if (playerBox.intersectsBox(obsBox)) {
            triggerGameOver();
        }
    }
}

function activatePowerup(type) {
    powerups[type].active = true;
    powerups[type].time = powerups[type].duration;
    document.getElementById(`${type}-timer`)?.classList.remove('hidden');

    if (type === 'multiplier') {
        document.getElementById('multiplier-badge').classList.remove('hidden');
    }
}

// --- CONTROLS & INPUT ---
function setupEventListeners() {
    window.addEventListener('keydown', (e) => {
        if (currentState !== STATE.PLAYING) return;

        switch(e.code) {
            case 'ArrowLeft':
            case 'KeyA':
                if (playerLane > 0) playerLane--;
                break;
            case 'ArrowRight':
            case 'KeyD':
                if (playerLane < 2) playerLane++;
                break;
            case 'ArrowUp':
            case 'KeyW':
                if (!isJumping && player.position.y === 0) {
                    verticalVelocity = JUMP_FORCE;
                    isJumping = true;
                }
                break;
            case 'ArrowDown':
            case 'KeyS':
                if (!isRolling && player.position.y === 0) {
                    isRolling = true;
                    rollTimer = 0.6;
                }
                break;
            case 'Escape':
                pauseGame();
                break;
        }
    });

    // Touch / Swipe Controls for Mobile
    let touchStartX = 0;
    let touchStartY = 0;
    window.addEventListener('touchstart', (e) => {
        touchStartX = e.touches[0].clientX;
        touchStartY = e.touches[0].clientY;
    });

    window.addEventListener('touchend', (e) => {
        if (currentState !== STATE.PLAYING) return;
        const diffX = e.changedTouches[0].clientX - touchStartX;
        const diffY = e.changedTouches[0].clientY - touchStartY;

        if (Math.abs(diffX) > Math.abs(diffY)) {
            if (diffX > 50 && playerLane < 2) playerLane++;
            else if (diffX < -50 && playerLane > 0) playerLane--;
        } else {
            if (diffY < -50 && !isJumping && player.position.y === 0) {
                verticalVelocity = JUMP_FORCE;
                isJumping = true;
            } else if (diffY > 50 && !isRolling && player.position.y === 0) {
                isRolling = true;
                rollTimer = 0.6;
            }
        }
    });
}

// --- UI & SCREEN MANAGEMENT ---
function setupUI() {
    document.getElementById('start-btn').addEventListener('click', startGame);
    document.getElementById('shop-btn').addEventListener('click', () => switchScreen('shop-screen'));
    document.getElementById('instructions-btn').addEventListener('click', () => switchScreen('instructions-screen'));
    document.getElementById('back-shop-btn').addEventListener('click', () => switchScreen('main-menu'));
    document.getElementById('back-instructions-btn').addEventListener('click', () => switchScreen('main-menu'));
    document.getElementById('retry-btn').addEventListener('click', startGame);
    document.getElementById('menu-btn').addEventListener('click', () => switchScreen('main-menu'));
    document.getElementById('resume-btn').addEventListener('click', resumeGame);
    document.getElementById('restart-btn').addEventListener('click', startGame);
    document.getElementById('quit-btn').addEventListener('click', () => switchScreen('main-menu'));
}

function switchScreen(screenId) {
    document.querySelectorAll('.screen').forEach(s => s.classList.add('hidden'));
    document.getElementById(screenId)?.classList.remove('hidden');

    if (screenId === 'main-menu') currentState = STATE.MENU;
    if (screenId === 'shop-screen') currentState = STATE.SHOP;
    if (screenId === 'instructions-screen') currentState = STATE.INSTRUCTIONS;
}

function startGame() {
    // Reset variables
    score = 0;
    coins = 0;
    gameSpeed = 22;
    playerLane = 1;
    player.position.set(LANES[playerLane], 0, 0);
    verticalVelocity = 0;
    isJumping = false;
    isRolling = false;

    // Clear old obstacles & coins
    obstacles.forEach(o => scene.remove(o));
    coinsArray.forEach(c => scene.remove(c));
    powerupItems.forEach(p => scene.remove(p.mesh));
    obstacles = [];
    coinsArray = [];
    powerupItems = [];

    document.getElementById('score-val').innerText = '0';
    document.getElementById('coin-val').innerText = '0';

    document.querySelectorAll('.screen').forEach(s => s.classList.add('hidden'));
    document.getElementById('hud').classList.remove('hidden');

    currentState = STATE.PLAYING;
    clock.start();
}

function pauseGame() {
    if (currentState !== STATE.PLAYING) return;
    currentState = STATE.PAUSED;
    document.getElementById('pause-screen').classList.remove('hidden');
}

function resumeGame() {
    if (currentState !== STATE.PAUSED) return;
    document.getElementById('pause-screen').classList.add('hidden');
    currentState = STATE.PLAYING;
    clock.start();
}

function triggerGameOver() {
    currentState = STATE.GAMEOVER;
    totalCoins += coins;
    if (score > bestScore) {
        bestScore = Math.floor(score);
        localStorage.setItem('subway_best_score', bestScore);
    }
    localStorage.setItem('subway_coins', totalCoins);

    document.getElementById('final-score').innerText = Math.floor(score);
    document.getElementById('final-coins').innerText = coins;
    document.getElementById('best-score').innerText = bestScore;

    document.getElementById('hud').classList.add('hidden');
    document.getElementById('game-over-screen').classList.remove('hidden');
}

function onWindowResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
}

window.onload = init;
