// --- Game Engine Variables Setup ---
let scene, camera, renderer;
let gameState = 'MENU';
let score = 0;
let speed = 0.8;
const LANE_WIDTH = 4.0; // Slightly widened for cleaner tracking clearance
const LANES = [-LANE_WIDTH, 0, LANE_WIDTH];

let playerCar;
let playerLane = 1; // Center Lane
let targetX = LANES[playerLane];
let selectedCarType = 0; // 0: Sedan, 1: F1, 2: Truck

let obstacles = [];
let roadSegments = [];
let clock = new THREE.Clock();
let spawnTimer = 0;

// DOM Target Selectors
const menuOverlay = document.getElementById('menu-overlay');
const gameoverOverlay = document.getElementById('gameover-overlay');
const hud = document.getElementById('hud');
const scoreVal = document.getElementById('score-val');
const speedVal = document.getElementById('speed-val');

// --- 3D Model Factory Engine ---
function createSedan(color) {
    const group = new THREE.Group();
    const bodyGeom = new THREE.BoxGeometry(1.8, 0.7, 3.8);
    const bodyMat = new THREE.MeshStandardMaterial({ color: color, roughness: 0.1, metalness: 0.2 });
    const body = new THREE.Mesh(bodyGeom, bodyMat);
    body.position.y = 0.4;
    group.add(body);

    const cabinGeom = new THREE.BoxGeometry(1.4, 0.6, 2.0);
    const cabinMat = new THREE.MeshStandardMaterial({ color: 0x050505, roughness: 0.0 });
    const cabin = new THREE.Mesh(cabinGeom, cabinMat);
    cabin.position.set(0, 0.95, -0.2);
    group.add(cabin);

    addWheels(group);
    return group;
}

function createF1(color) {
    const group = new THREE.Group();
    const chassisGeom = new THREE.BoxGeometry(1.0, 0.4, 4.2);
    const chassisMat = new THREE.MeshStandardMaterial({ color: color, roughness: 0.2 });
    const chassis = new THREE.Mesh(chassisGeom, chassisMat);
    chassis.position.y = 0.2;
    group.add(chassis);

    const frontWingGeom = new THREE.BoxGeometry(2.4, 0.1, 0.6);
    const wingMat = new THREE.MeshStandardMaterial({ color: 0x111111 });
    const frontWing = new THREE.Mesh(frontWingGeom, wingMat);
    frontWing.position.set(0, 0.15, -2.0);
    group.add(frontWing);

    const rearWingGeom = new THREE.BoxGeometry(2.0, 0.5, 0.5);
    const rearWing = new THREE.Mesh(rearWingGeom, wingMat);
    rearWing.position.set(0, 0.7, 1.9);
    group.add(rearWing);

    addWheels(group, 0.4, 0.45);
    return group;
}

function createTruck(color) {
    const group = new THREE.Group();
    const bedGeom = new THREE.BoxGeometry(2.0, 1.6, 4.5);
    const bedMat = new THREE.MeshStandardMaterial({ color: color, roughness: 0.4 });
    const bed = new THREE.Mesh(bedGeom, bedMat);
    bed.position.y = 1.0;
    group.add(bed);

    const cabGeom = new THREE.BoxGeometry(2.0, 1.7, 1.4);
    const cabMat = new THREE.MeshStandardMaterial({ color: 0x1a1a1a });
    const cab = new THREE.Mesh(cabGeom, cabMat);
    cab.position.set(0, 1.05, -2.2);
    group.add(cab);

    addWheels(group, 0.5, 0.55);
    return group;
}

function addWheels(group, width = 0.35, radius = 0.4) {
    const wheelGeom = new THREE.CylinderGeometry(radius, radius, width, 16);
    const wheelMat = new THREE.MeshStandardMaterial({ color: 0x0a0a0a, roughness: 0.9 });
    
    const positions = [
        [-1.0, radius, -1.2], [1.0, radius, -1.2],
        [-1.0, radius, 1.2],  [1.0, radius, 1.2]
    ];
    positions.forEach(pos => {
        const wheel = new THREE.Mesh(wheelGeom, wheelMat);
        wheel.rotation.z = Math.PI / 2;
        wheel.position.set(pos[0], pos[1], pos[2]);
        group.add(wheel);
    });
}

// --- Environment Initialization System ---
function init() {
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x020617); 
    scene.fog = new THREE.FogExp2(0x020617, 0.012); // Slightly backed out fog for better long-range tracking

    camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 1000);
    // Locked perspective coordinates placed behind driving zone plane
    camera.position.set(0, 5.0, 9.0);
    camera.lookAt(0, 1.0, -5.0);

    renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    document.body.appendChild(renderer.domElement);

    // Blasted environmental setups to ensure full asset visibility lighting rules
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.8);
    scene.add(ambientLight);

    const dirLight = new THREE.DirectionLight(0xffffff, 1.2);
    dirLight.position.set(5, 20, 15);
    scene.add(dirLight);

    for (let i = 0; i < 6; i++) {
        createRoadSegment(-i * 50);
    }
}

function createRoadSegment(zOffset) {
    const segment = new THREE.Group();
    const roadGeom = new THREE.PlaneGeometry(14, 50);
    const roadMat = new THREE.MeshStandardMaterial({ color: 0x0f172a, roughness: 0.6 });
    const road = new THREE.Mesh(roadGeom, roadMat);
    road.rotation.x = -Math.PI / 2;
    segment.add(road);

    // Built-in structural grids layout markers lines
    const lineGeom = new THREE.PlaneGeometry(0.2, 5);
    const lineMat = new THREE.MeshBasicMaterial({ color: 0x334155 });
    
    for (let z = -20; z <= 20; z += 10) {
        const line1 = new THREE.Mesh(lineGeom, lineMat);
        line1.rotation.x = -Math.PI / 2;
        line1.position.set(-LANE_WIDTH/2, 0.02, z);
        segment.add(line1);

        const line2 = new THREE.Mesh(lineGeom, lineMat);
        line2.rotation.x = -Math.PI / 2;
        line2.position.set(LANE_WIDTH/2, 0.02, z);
        segment.add(line2);
    }

    segment.position.z = zOffset;
    scene.add(segment);
    roadSegments.push(segment);
}

// --- Runtime Execution Logic Pipeline ---
function buildPlayerCar() {
    if (playerCar) scene.remove(playerCar);
    
    if (selectedCarType === 0) playerCar = createSedan(0x06b6d4);      // Neon Cyan
    else if (selectedCarType === 1) playerCar = createF1(0xf59e0b);     // Amber Orange
    else if (selectedCarType === 2) playerCar = createTruck(0xa855f7);  // Cyber Violet
    
    playerLane = 1; // Force Center Lane reset setup rules
    targetX = LANES[playerLane];
    playerCar.position.set(targetX, 0, 0); // Position explicitly set at start line context
    scene.add(playerCar);
}

function spawnObstacle() {
    const lane = Math.floor(Math.random() * 3);
    const models = ['sedan', 'f1', 'truck'];
    const chosenModel = models[Math.floor(Math.random() * models.length)];
    const colors = [0xe11d48, 0x10b981, 0xf43f5e, 0xeab308];
    const chosenColor = colors[Math.floor(Math.random() * colors.length)];
    
    let obsMesh;
    if (chosenModel === 'sedan') obsMesh = createSedan(chosenColor);
    else if (chosenModel === 'f1') obsMesh = createF1(chosenColor);
    else obsMesh = createTruck(chosenColor);

    obsMesh.position.set(LANES[lane], 0, -150); // Set far down grid line pathway entry boundaries
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

// --- Direct Coordinate Mobile Click Interceptor ---
window.addEventListener('touchstart', (e) => {
    if (gameState !== 'PLAYING') return;
    
    // Ignore execution clicks passing over interactive layout action overlay elements
    if (e.target.tagName === 'BUTTON') return;

    const clickX = e.touches[0].clientX;
    const midpoint = window.innerWidth / 2;

    if (clickX < midpoint) {
        moveLeft();
    } else {
        moveRight();
    }
}, { passive: false });

function check3DCollision(box1, box2) {
    return (
        Math.abs(box1.position.x - box2.position.x) < 1.4 &&
        Math.abs(box1.position.z - box2.position.z) < 3.5
    );
}

function animate() {
    requestAnimationFrame(animate);
    const delta = clock.getDelta();

    if (gameState === 'PLAYING') {
        if (playerCar) {
            // Apply high speed spatial interpolation transformations matrices smoothly
            playerCar.position.x += (targetX - playerCar.position.x) * 0.20;
            playerCar.rotation.z = -(playerCar.position.x - targetX) * 0.12;
        }

        speed += 0.00015; // Moderate speed ramp scale factors values
        score += 15 * delta;
        scoreVal.innerText = Math.floor(score);
        speedVal.innerText = `${Math.floor(speed * 125)} MPH`;

        // Continuous modular loop translation sequence on highway road tiles arrays
        roadSegments.forEach(segment => {
            segment.position.z += speed * 65 * delta;
            if (segment.position.z > 50) {
                segment.position.z -= 300; // Throw directly backward out of bounds view path queues
            }
        });

        // Spawn Cycle Execution Logic Steps
        spawnTimer += delta;
        if (spawnTimer > Math.max(0.5, 1.6 - speed * 0.7)) {
            spawnObstacle();
            spawnTimer = 0;
        }

        // Oncoming Objects Loop Array Pipeline Updates
        for (let i = obstacles.length - 1; i >= 0; i--) {
            let obs = obstacles[i];
            obs.position.z += (speed * 65 + 12) * delta;

            if (playerCar && check3DCollision(playerCar, obs)) {
                gameState = 'GAMEOVER';
                document.getElementById('final-score').innerText = Math.floor(score);
                hud.classList.add('hidden');
                gameoverOverlay.classList.remove('hidden');
            }

            if (obs.position.z > 20) {
                scene.remove(obs);
                obstacles.splice(i, 1);
            }
        }
    }
    renderer.render(scene, camera);
}

// --- Menu Infrastructure Interaction Handlers ---
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
    
    obstacles.forEach(obs => scene.remove(obs));
    obstacles = [];
    
    if (playerCar) {
        scene.remove(playerCar);
        playerCar = null;
    }
}

document.getElementById('start-btn').addEventListener('click', () => {
    menuOverlay.classList.add('hidden');
    hud.classList.remove('hidden');
    buildPlayerCar(); // Explicit generation of car matrix directly here on start execution action bounds
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
