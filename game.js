const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

// DOM Selection Anchors
const menuOverlay = document.getElementById('menu-overlay');
const gameoverOverlay = document.getElementById('gameover-overlay');
const hud = document.getElementById('hud');
const mobileControls = document.getElementById('mobile-controls');
const distanceVal = document.getElementById('distance-val');
const coinsVal = document.getElementById('coins-val');
const fuelBar = document.getElementById('fuel-bar');
const fuelTxt = document.getElementById('fuel-txt');

// --- Hardware Blueprints Options Profiles ---
const VEHICLES = [
    { name: "Cyber Beetle", mass: 1.0, torque: 0.22, length: 60, height: 20, wheelRad: 11, color: "#06b6d4" },
    { name: "Plasma Truck", mass: 1.4, torque: 0.32, length: 70, height: 26, wheelRad: 15, color: "#a855f7" },
    { name: "Grid Bike",    mass: 0.7, torque: 0.18, length: 45, height: 16, wheelRad: 9,  color: "#f43f5e" }
];

const BIOMES = [
    { name: "City Highway", gravity: 0.20, smoothness: 0.002, amplitude: 50,  lineColor: "#06b6d4", groundFill: "#1e293b" },
    { name: "Neon Dunes",   gravity: 0.22, smoothness: 0.005, amplitude: 100, lineColor: "#f59e0b", groundFill: "#1c1917" },
    { name: "Lunar Crates", gravity: 0.09, smoothness: 0.008, amplitude: 130, lineColor: "#a855f7", groundFill: "#1e1b4b" }
];

// App Configurations Indices
let selectedCarIdx = 0;
let selectedMapIdx = 0;

let gameState = 'MENU';
let coins = 0;
let fuel = 100;
let cameraX = 0;

// Central Rigid Body Configuration Object Structure
let vehicle = {
    x: 200, y: 150,
    vx: 0, vy: 0,
    angle: 0, angularVelocity: 0
};

let inputs = { forward: false, backward: false };
let tokenAssets = [];
let chunkMarkerX = 2000;

// --- Smooth Procedural Map Terrain Math Pipeline ---
function getTerrainHeight(x) {
    if (x < 300) return 300; // Flat safety initialization launchpad

    const biome = BIOMES[selectedMapIdx];
    
    // Layered harmonic curves generate perfectly rolling, smooth terrain
    let layer1 = Math.sin(x * biome.smoothness) * biome.amplitude;
    let layer2 = Math.cos(x * biome.smoothness * 0.4) * (biome.amplitude * 0.5);
    let layer3 = Math.sin(x * biome.smoothness * 2.5) * 8; 

    return 350 - (layer1 + layer2 + layer3);
}

// Extract surface slope angle to project directional motion vectors along the ground tangent
function getTerrainSlopeAngle(x) {
    let step = 2;
    let y1 = getTerrainHeight(x - step);
    let y2 = getTerrainHeight(x + step);
    return Math.atan2(y2 - y1, step * 2);
}

function generateTokens(start, length) {
    for (let x = start; x < start + length; x += 150) {
        let groundY = getTerrainHeight(x);
        if (Math.random() < 0.40) {
            tokenAssets.push({ type: 'COIN', x: x, y: groundY - 35, collected: false });
        } else if (Math.random() < 0.08) {
            tokenAssets.push({ type: 'FUEL', x: x, y: groundY - 45, collected: false });
        }
    }
}

// --- Dynamic Physics Vector Execution Engine Loop ---
function updateSimulationTick() {
    const carConfig = VEHICLES[selectedCarIdx];
    const mapConfig = BIOMES[selectedMapIdx];

    // Core Acceleration and Fuel Management Systems
    if (inputs.forward && fuel > 0) {
        fuel -= 0.15;
    } else if (inputs.backward && fuel > 0) {
        fuel -= 0.10;
    } else {
        fuel -= 0.02; // Baseline depletion
    }
    if (fuel <= 0) fuel = 0;

    // Apply Standard Gravity Forces
    vehicle.vy += mapConfig.gravity * carConfig.mass;

    let groundY = getTerrainHeight(vehicle.x);
    let surfaceSlope = getTerrainSlopeAngle(vehicle.x);
    let isGrounded = vehicle.y >= groundY - carConfig.height;

    if (isGrounded) {
        // Safe lock on ground surface profile point boundaries
        vehicle.y = groundY - carConfig.height;
        vehicle.vy = 0;

        // Match chassis rotation to the road normal profile tangent
        let targetAngle = surfaceSlope;
        let deltaAngle = targetAngle - vehicle.angle;
        deltaAngle = Math.atan2(Math.sin(deltaAngle), Math.cos(deltaAngle)); 
        vehicle.angle += deltaAngle * 0.25;
        vehicle.angularVelocity = 0;

        // --- Linear Surface Projections Pipeline (Fixes rotation lock) ---
        if (fuel > 0) {
            if (inputs.forward) {
                vehicle.vx += Math.cos(surfaceSlope) * carConfig.torque;
                vehicle.vy += Math.sin(surfaceSlope) * carConfig.torque;
            }
            if (inputs.backward) {
                vehicle.vx -= Math.cos(surfaceSlope) * (carConfig.torque * 0.6); 
                vehicle.vy -= Math.sin(surfaceSlope) * (carConfig.torque * 0.6);
            }
        }
        
        // Dynamic Surface Friction Apply
        vehicle.vx *= 0.975;
    } else {
        // Airborne Free Space Control Mechanics (Flips and pitch adjustments)
        if (inputs.forward) vehicle.angularVelocity += 0.006;
        if (inputs.backward) vehicle.angularVelocity -= 0.006;

        vehicle.angle += vehicle.angularVelocity;
        vehicle.angularVelocity *= 0.98;

        // Air drag application
        vehicle.vx *= 0.992;
        vehicle.vy *= 0.992;
    }

    // Step current system velocity values onward
    vehicle.x += vehicle.vx;
    vehicle.y += vehicle.vy;

    if (vehicle.x < 50) {
        vehicle.x = 50;
        vehicle.vx = 0;
    }

    // Camera follow track pipeline lock
    cameraX = vehicle.x - 200;

    // --- Token Intersection Math Pipeline ---
    tokenAssets.forEach(token => {
        if (token.collected) return;
        let dx = vehicle.x - token.x;
        let dy = (vehicle.y + carConfig.height/2) - token.y;
        let d = Math.sqrt(dx * dx + dy * dy);

        if (d < carConfig.length * 0.6) {
            token.collected = true;
            if (token.type === 'COIN') {
                coins += 1;
                coinsVal.innerText = coins.toString();
            } else if (token.type === 'FUEL') {
                fuel = Math.min(100, fuel + 40);
            }
        }
    });

    // --- Death and Flipped Verification Loops System ---
    let normalizedRot = Math.abs(vehicle.angle) % (Math.PI * 2);
    if (isGrounded && (normalizedRot > Math.PI * 0.40 && normalizedRot < Math.PI * 1.60)) {
        triggerEndscreen("DRIVER TRAUMA DETECTED");
    }
    if (fuel <= 0 && Math.abs(vehicle.vx) < 0.05 && isGrounded) {
        triggerEndscreen("FUEL STORES EXHAUSTED");
    }
}

// --- Graphical Render Engine Module ---
function drawCanvasScene() {
    const carConfig = VEHICLES[selectedCarIdx];
    const mapConfig = BIOMES[selectedMapIdx];

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Sky Background Panels
    let bgGrad = ctx.createLinearGradient(0, 0, 0, canvas.height);
    bgGrad.addColorStop(0, '#020617');
    bgGrad.addColorStop(1, '#0b0f19');
    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.save();
    ctx.translate(-cameraX, 0);

    // Dynamic track profile line drawing sequence
    ctx.beginPath();
    ctx.moveTo(cameraX, canvas.height);
    for (let sx = cameraX; sx <= cameraX + canvas.width + 20; sx += 4) {
        ctx.lineTo(sx, getTerrainHeight(sx));
    }
    ctx.lineTo(cameraX + canvas.width + 20, canvas.height);
    ctx.closePath();
    ctx.fillStyle = mapConfig.groundFill;
    ctx.fill();

    ctx.beginPath();
    for (let sx = cameraX; sx <= cameraX + canvas.width + 20; sx += 4) {
        if (sx === cameraX) ctx.moveTo(sx, getTerrainHeight(sx));
        else ctx.lineTo(sx, getTerrainHeight(sx));
    }
    ctx.strokeStyle = mapConfig.lineColor;
    ctx.lineWidth = 3;
    ctx.stroke();

    // Render pickup items array
    tokenAssets.forEach(token => {
        if (token.collected) return;
        if (token.x < cameraX - 50 || token.x > cameraX + canvas.width + 50) return;

        if (token.type === 'COIN') {
            ctx.beginPath();
            ctx.arc(token.x, token.y, 8, 0, Math.PI * 2);
            ctx.fillStyle = '#fbbf24';
            ctx.fill();
        } else {
            ctx.fillStyle = '#ef4444';
            ctx.fillRect(token.x - 7, token.y - 10, 14, 20);
        }
    });

    // --- Render Custom Vehicle Models ---
    ctx.save();
    ctx.translate(vehicle.x, vehicle.y);
    ctx.rotate(vehicle.angle);

    ctx.fillStyle = carConfig.color;
    ctx.fillRect(-carConfig.length / 2, -carConfig.height, carConfig.length, carConfig.height);

    ctx.fillStyle = "#ffffff";
    ctx.fillRect(-4, -carConfig.height - 6, 16, 6);

    ctx.restore();
    drawWheelAsset(vehicle.x - carConfig.length/3, vehicle.y, carConfig.wheelRad);
    drawWheelAsset(vehicle.x + carConfig.length/3, vehicle.y, carConfig.wheelRad);

    ctx.restore();
}

function drawWheelAsset(wx, wy, rad) {
    ctx.beginPath();
    ctx.arc(wx, wy, rad, 0, Math.PI * 2);
    ctx.fillStyle = '#334155';
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 2;
    ctx.fill();
    ctx.stroke();
    
    ctx.beginPath();
    ctx.moveTo(wx, wy);
    let rotationAngle = vehicle.x / 15;
    ctx.lineTo(wx + Math.cos(rotationAngle) * rad, wy + Math.sin(rotationAngle) * rad);
    ctx.strokeStyle = '#020617';
    ctx.stroke();
}

// --- View Lifecycle Handlers Binds ---
function triggerEndscreen(msg) {
    gameState = 'GAMEOVER';
    document.getElementById('fail-reason').innerText = msg;
    document.getElementById('final-distance').innerText = `${Math.floor(vehicle.x / 10)}m`;
    document.getElementById('final-coins').innerText = coins.toString();

    hud.classList.add('hidden');
    mobileControls.classList.add('hidden');
    gameoverOverlay.classList.remove('hidden');
}

function fullResetParameters() {
    vehicle.x = 150; vehicle.y = 150;
    vehicle.vx = 0; vehicle.vy = 0;
    vehicle.angle = 0; vehicle.angularVelocity = 0;
    fuel = 100; coins = 0; cameraX = 0; chunkMarkerX = 2000;
    tokenAssets = [];
    generateTokens(0, 3000);
    
    coinsVal.innerText = "0";
    distanceVal.innerText = "0m";
    fuelBar.style.width = "100%";
}

function loop() {
    if (gameState === 'PLAYING') {
        updateSimulationTick();
        
        // Infinite pipeline terrain procedural loader trigger
        if (vehicle.x > chunkMarkerX - 1500) {
            generateTokens(chunkMarkerX, 2000);
            chunkMarkerX += 2000;
        }

        distanceVal.innerText = `${Math.floor(vehicle.x / 10)}m`;
        fuelBar.style.width = `${fuel}%`;
        fuelTxt.innerText = `${Math.floor(fuel)}%`;
    }
    drawCanvasScene();
    requestAnimationFrame(loop);
}

// --- Menu UI Selection Button Event Binds ---
function setupSelectionCarousels() {
    document.querySelectorAll('.car-opt').forEach((btn, idx) => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.car-opt').forEach(b => b.classList.remove('border-cyan-500', 'active'));
            btn.classList.add('border-cyan-500', 'active');
            selectedCarIdx = idx;
        });
    });

    document.querySelectorAll('.map-opt').forEach((btn, idx) => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.map-opt').forEach(b => b.classList.remove('border-indigo-500', 'active'));
            btn.classList.add('border-indigo-500', 'active');
            selectedMapIdx = idx;
        });
    });
}

function exitToMenu() {
    gameState = 'MENU';
    hud.classList.add('hidden');
    mobileControls.classList.add('hidden');
    gameoverOverlay.classList.add('hidden');
    menuOverlay.classList.remove('hidden');
}

// --- Global Input Mappings Binds ---
window.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowRight' || e.key.toLowerCase() === 'd') inputs.forward = true;
    if (e.key === 'ArrowLeft' || e.key.toLowerCase() === 'a') inputs.backward = true;
});
window.addEventListener('keyup', (e) => {
    if (e.key === 'ArrowRight' || e.key.toLowerCase() === 'd') inputs.forward = false;
    if (e.key === 'ArrowLeft' || e.key.toLowerCase() === 'a') inputs.backward = false;
});

// Touch control hardware routing overrides
document.getElementById('ctrl-gas').addEventListener('touchstart', (e) => { e.preventDefault(); inputs.forward = true; });
document.getElementById('ctrl-gas').addEventListener('touchend', (e) => { e.preventDefault(); inputs.forward = false; });
document.getElementById('ctrl-brake').addEventListener('touchstart', (e) => { e.preventDefault(); inputs.backward = true; });
document.getElementById('ctrl-brake').addEventListener('touchend', (e) => { e.preventDefault(); inputs.backward = false; });

document.getElementById('start-btn').addEventListener('click', () => {
    menuOverlay.classList.add('hidden');
    hud.classList.remove('hidden');
    if (window.innerWidth < 768) mobileControls.classList.remove('hidden');
    fullResetParameters();
    gameState = 'PLAYING';
});

document.getElementById('restart-btn').addEventListener('click', () => {
    gameoverOverlay.classList.add('hidden');
    hud.classList.remove('hidden');
    if (window.innerWidth < 768) mobileControls.classList.remove('hidden');
    fullResetParameters();
    gameState = 'PLAYING';
});

document.getElementById('hud-back-btn').addEventListener('click', exitToMenu);
document.getElementById('menu-back-btn').addEventListener('click', exitToMenu);

setupSelectionCarousels();
requestAnimationFrame(loop);
