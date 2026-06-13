// --- Game Engine Variables Setup ---
let scene, camera, renderer;
let gameState = 'MENU';
let score = 0;
let speed = 0.8;
const LANE_WIDTH = 3.5;
const LANES = [-LANE_WIDTH, 0, LANE_WIDTH];

let playerCar;
let playerLane = 1; // Start in Center Lane
let targetX = LANES[playerLane];
let selectedCarType = 0; // 0: Sedan, 1: F1, 2: Truck

let obstacles = [];
let roadSegments = [];
let clock = new THREE.Clock();
let spawnTimer = 0;

// DOM View Targets References
const menuOverlay = document.getElementById('menu-overlay');
const gameoverOverlay = document.getElementById('gameover-overlay');
const hud = document.getElementById('hud');
const scoreVal = document.getElementById('score-val');
const speedVal = document.getElementById('speed-val');

// --- 3D Procedural Model Factory Builders ---
function createSedan(color) {
    const group = new THREE.Group();
    const bodyGeom = new THREE.BoxGeometry(1.6, 0.6, 3.5);
    const bodyMat = new THREE.MeshStandardMaterial({ color: color, roughness: 0.2 });
    const body = new THREE.Mesh(bodyGeom, bodyMat);
    body.position.y = 0.4;
    group.add(body);

    const cabinGeom = new THREE.BoxGeometry(1.3, 0.5, 1.8);
    const cabinMat = new THREE.MeshStandardMaterial({ color: 0x0a0a0a, metalness: 0.9, roughness: 0.1 });
    const cabin = new THREE.Mesh(cabinGeom, cabinMat);
    cabin.position.set(0, 0.85, -0.2);
    group.add(cabin);

    addWheels(group);
    return group;
}

function createF1(color) {
    const group = new THREE.Group();
    const chassisGeom = new THREE.BoxGeometry(0.8, 0.3, 4.0);
    const chassisMat = new THREE.MeshStandardMaterial({ color: color, roughness: 0.3 });
    const chassis = new THREE.Mesh(chassisGeom, chassisMat);
    chassis.position.y = 0.2;
    group.add(chassis);

    const frontWingGeom = new THREE.BoxGeometry(2.2, 0.1, 0.5);
    const wingMat = new THREE.MeshStandardMaterial({ color: 0x111111 });
    const frontWing = new THREE.Mesh(frontWingGeom, wingMat);
    frontWing.position.set(0, 0.15, -1.9);
    group.add(frontWing);

    const rearWingGeom = new THREE.BoxGeometry(1.8, 0.4, 0.4);
    const rearWing = new THREE.Mesh(rearWingGeom, wingMat);
    rearWing.position.set(0, 0.6, 1.8);
    group.add(rearWing);

    addWheels(group, 0.4, 0.4);
    return group;
}

function createTruck(color) {
    const group = new THREE.Group();
    const bedGeom = new THREE.BoxGeometry(1.8, 1.4, 4.2);
    const bedMat = new THREE.MeshStandardMaterial({ color: color, roughness: 0.5 });
    const bed = new THREE.Mesh(bedGeom, bedMat);
    bed.position.y = 0.9;
    group.add(bed);

    const cabGeom = new THREE.BoxGeometry(1.8, 1.5, 1.2);
    const cabMat = new THREE.MeshStandardMaterial({ color: 0x222222 });
    const cab = new THREE.Mesh(cabGeom, cabMat);
    cab.position.set(0, 0.95, -2.1);
    group.add(cab);

    addWheels(group, 0.5, 0.5);
    return group;
}

function addWheels(group, width = 0.3, radius = 0.35) {
    const wheelGeom = new THREE.CylinderGeometry(radius, radius, width, 16);
    const wheelMat = new THREE.MeshStandardMaterial({ color: 0x111111, roughness: 0.8 });
    
    const positions = [
        [-0.9, radius, -1], [0.9, radius, -1],
        [-0.9, radius, 1],  [0.9, radius, 1]
    ];
    positions.forEach(pos => {
        const wheel = new THREE.Mesh(wheelGeom, wheelMat);
        wheel.rotation.z = Math.PI / 2;
        wheel.position.set(pos[0], pos[1], pos[2]);
        group.add(wheel);
    });
}

// --- Scene Initialization Environment Pipeline ---
function init() {
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x020617); 
    scene.fog = new THREE.FogExp2(0x020617, 0.015);

    camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 1000);
    camera.position.set(0, 4.5, 7);
    camera.rotation.x = -0.35;

    renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    document.body.appendChild(renderer.domElement);

    const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
    scene.add(ambientLight);

    const dirLight = new THREE.DirectionLight(0x06b6d4, 1.2);
    dirLight.position.set(10, 20, 10);
    scene.add(dirLight);

    for (let i = 0; i < 5; i++) {
        createRoadSegment(-i * 50);
    }
}

function createRoadSegment(zOffset) {
    const segment = new THREE.Group();
    const roadGeom = new THREE.PlaneGeometry(12, 50);
    const roadMat = new THREE.MeshStandardMaterial({ color: 0x0f172a, roughness: 0.7 });
    const road = new THREE.Mesh(roadGeom, roadMat);
    road.rotation.x = -Math.PI / 2;
    segment.add(road);

    const lineGeom = new THREE.PlaneGeometry(0.15, 4);
    const lineMat = new THREE.MeshBasicMaterial({ color: 0x334155 });
    
    for (let z = -20; z <= 20; z += 8) {
        const line1 = new THREE.Mesh(lineGeom, lineMat);
        line1.rotation.x = -Math.PI / 2;
        line1.position.set(-LANE_WIDTH/2, 0.01, z);
        segment.add(line1);

        const line2 = new THREE.Mesh(lineGeom, lineMat);
        line2.rotation.x = -Math.PI / 2;
        line2.position.set(LANE_WIDTH/2, 0.01, z);
        segment.add(line2);
    }

    segment.position.z = zOffset;
    scene.add(segment);
    roadSegments.push(segment);
}

// --- Runtime Logic Engine Core Loops ---
function buildPlayerCar() {
    if (playerCar) scene.remove(playerCar);
    
    if (selectedCarType === 0) playerCar = createSedan(0x06b6d4);
    else if (selectedCarType === 1) playerCar = createF1(0xf59e0b);
    else if (selectedCarType === 2) playerCar = createTruck(0xa855f7);
    
    playerLane = 1;
    targetX = LANES[playerLane];
    playerCar.position.set(targetX, 0, 0);
    scene.add(playerCar);
}

function spawnObstacle() {
    const lane = Math.floor(Math.random() * 3);
    const types = ['sedan', 'f1', 'truck'];
    const chosenType = types[Math.floor(Math.random() * types.length)];
    const colors = [0xe11d48, 0x10b981, 0xdb2777, 0xeab308];
    const randomColor = colors[Math.floor(Math.random() * colors.length)];
    
    let obsMesh;
    if (chosenType === 'sedan') obsMesh = createSedan(randomColor);
    else if (chosenType === 'f1') obsMesh = createF1(randomColor);
    else obsMesh = createTruck(randomColor);

    obsMesh.position.set(LANES[lane], 0, -120);
    obsMesh.rotation.y = Math.PI; 
    
    scene.add(obsMesh);
    obstacles.push(obsMesh);
}

function moveLeft() {
    if (playerLane > 0) playerLane--;
    targetX = LANES[playerLane];
}

function moveRight() {
    if (playerLane < 2) playerLane++;
    targetX = LANES[playerLane];
}

function handleInput(e) {
    if (gameState !== 'PLAYING') return;
    if (e.key === 'ArrowLeft' || e.key.toLowerCase() === 'a') moveLeft();
    if (e.key === 'ArrowRight' || e.key.toLowerCase() === 'd') moveRight();
}

// --- High-Performance Mobile Touch Architecture ---
window.addEventListener('touchstart', (e) => {
    if (gameState !== 'PLAYING') return;
    
    // Ignore direct clicks interacting with interactive UI Buttons
    if (e.target.tagName === 'BUTTON') return;

    const touchX = e.touches[0].clientX;
    const screenWidth = window.innerWidth;

    if (touchX < screenWidth / 2) {
        moveLeft();
    } else {
        moveRight();
    }
}, { passive: false });

function check3DCollision(box1, box2) {
    return (
        Math.abs(box1.position.x - box2.position.x) < 1.3 &&
        Math.abs(box1.position.z - box2.position.z) < 3.2
    );
}

function animate() {
    requestAnimationFrame(animate);
    const delta = clock.getDelta();

    if (gameState === 'PLAYING') {
        playerCar.position.x += (targetX - playerCar.position.x) * 0.15;
        playerCar.rotation.z = -(playerCar.position.x - targetX) * 0.15;

        speed += 0.0001;
        score += 10 * delta;
        scoreVal.innerText = Math.floor(score);
        speedVal.innerText = `${Math.floor(speed * 120)} MPH`;

        roadSegments.forEach(segment => {
            segment.position.z += speed * 60 * delta;
            if (segment.position.z > 50) {
                segment.position.z -= 250;
            }
        });

        spawnTimer += delta;
        if (spawnTimer > Math.max(0.6, 1.8 - speed * 0.8)) {
            spawnObstacle();
            spawnTimer = 0;
        }

        for (let i = obstacles.length - 1; i >= 0; i--) {
            let obs = obstacles[i];
            obs.position.z += (speed * 60 + 10) * delta;

            if (check3DCollision(playerCar, obs)) {
                gameState = 'GAMEOVER';
                document.getElementById('final-score').innerText = Math.floor(score);
                hud.classList.add('hidden');
                gameoverOverlay.classList.remove('hidden');
            }

            if (obs.position.z > 15) {
                scene.remove(obs);
                obstacles.splice(i, 1);
            }
        }
    }
    renderer.render(scene, camera);
}

// --- Menu Interaction Routing Management ---
const setupCarSelection = () => {
    const buttons = document.querySelectorAll('.car-select-btn');
    buttons.forEach((btn, index) => {
        btn.addEventListener('click', () => {
            buttons.forEach(b => b.classList.remove('border-cyan-500', 'active'));
            btn.classList.add('border-cyan-500', 'active');
            selectedCarType = index;
        });
    });
};

function exitToMenu() {
    gameState = 'MENU';
    hud.classList.add('hidden');
    gameoverOverlay.classList.add('hidden');
    menuOverlay.classList.remove('hidden');
    
    // Clear obstacles
    obstacles.forEach(obs => scene.remove(obs));
    obstacles = [];
    
    if (playerCar) scene.remove(playerCar);
}

document.getElementById('start-btn').addEventListener('click', () => {
    menuOverlay.classList.add('hidden');
    hud.classList.remove('hidden');
    buildPlayerCar();
    score = 0;
    speed = 0.8;
    gameState = 'PLAYING';
});

document.getElementById('restart-btn').addEventListener('click', () => {
    gameoverOverlay.classList.add('hidden');
    hud.classList.remove('hidden');
    obstacles.forEach(obs => scene.remove(obs));
    obstacles = [];
    buildPlayerCar();
    score = 0;
    speed = 0.8;
    gameState = 'PLAYING';
});

// Back to menu event routing binds
document.getElementById('hud-back-btn').addEventListener('click', exitToMenu);
document.getElementById('go-back-menu-btn').addEventListener('click', exitToMenu);

window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
});

window.addEventListener('keydown', handleInput);
setupCarSelection();
init();
animate();
