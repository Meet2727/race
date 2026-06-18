const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

// Element UI Selectors Binds
const menuOverlay = document.getElementById('menu-overlay');
const gameoverOverlay = document.getElementById('gameover-overlay');
const hud = document.getElementById('hud');
const mobileControls = document.getElementById('mobile-controls');

const distanceVal = document.getElementById('distance-val');
const coinsVal = document.getElementById('coins-val');
const fuelBar = document.getElementById('fuel-bar');
const fuelTxt = document.getElementById('fuel-txt');

// Core Simulation Parameters Configuration
const PHYSICS = {
    gravity: 0.18,
    friction: 0.985,
    airResistance: 0.995,
    engineTorque: 0.12,
    brakingPower: 0.08,
    rotationSpeed: 0.035,
    maxFuel: 100
};

// Application Global Matrices States
let gameState = 'MENU';
let coinsCollected = 0;
let currentFuel = 100;
let worldOffset = 0; // Visual map offset parameter

// Primary Rigid Body Structural Coordinates Setup
let car = {
    x: 180,
    y: 200,
    vx: 0,
    vy: 0,
    angle: 0,
    angularVelocity: 0,
    width: 65,
    height: 25,
    frontWheelOffset: 24,
    backWheelOffset: -24,
    wheelRadius: 10
};

let wheels = {
    back: { x: 0, y: 0, grounded: false, contactY: 0 },
    front: { x: 0, y: 0, grounded: false, contactY: 0 }
};

// Collective tracking collections
let trackPoints = [];
let pickupAssets = [];

// Input Matrix Map Tracking Flags
let inputs = { gas: false, brake: false };

// --- Procedural Generation Math Formulas ---
function getTerrainHeight(worldX) {
    // Overlapping sine mathematical waves generate endless rolling vector ridges 
    let baseHill = Math.sin(worldX * 0.003) * 110;
    let steepRidge = Math.cos(worldX * 0.008) * Math.sin(worldX * 0.001) * 60;
    let smallBumps = Math.sin(worldX * 0.04) * 5;
    
    // Flat launchpad zone constraint logic sequence for start zone safety
    if (worldX < 300) return 320; 

    return 340 - (baseHill + steepRidge + smallBumps);
}

// Map Item Generator Pipeline
function generateWorldAssetsForRange(startLineX, endLineX) {
    for (let x = startLineX; x < endLineX; x += 120) {
        if (x < 500) continue; // Skip items in start zone
        
        let roadY = getTerrainHeight(x);
        
        if (Math.random() < 0.35) {
            pickupAssets.push({ type: 'COIN', x: x, y: roadY - 30, radius: 8, collected: false });
        } else if (Math.random() < 0.08) {
            pickupAssets.push({ type: 'FUEL', x: x, y: roadY - 40, w: 16, h: 22, collected: false });
        }
    }
}

// --- Physics Engine Execution Loop ---
function updatePhysics() {
    // Deduct standard fuel limits progressively over drive state durations
    if (inputs.gas) {
        currentFuel -= 0.12;
    } else {
        currentFuel -= 0.02; // Minor drainage when idling
    }
    
    if (currentFuel <= 0) {
        currentFuel = 0;
        inputs.gas = false; // System engine cutoff starvation logic flags
    }

    // Apply standard systemic forces
    car.vy += PHYSICS.gravity;
    car.vx *= PHYSICS.airResistance;
    car.angle += car.angularVelocity;
    car.angularVelocity *= PHYSICS.friction;

    // Translate global coordinate offsets back onto wheels structures orientations
    let cosA = Math.cos(car.angle);
    let sinA = Math.sin(car.angle);

    wheels.back.x = car.x + car.backWheelOffset * cosA;
    wheels.back.y = car.y + car.backWheelOffset * sinA + 12;
    
    wheels.front.x = car.x + car.frontWheelOffset * cosA;
    wheels.front.y = car.y + car.frontWheelOffset * sinA + 12;

    // Check collision hooks directly against ground profile vectors formulas
    let backGroundY = getTerrainHeight(wheels.back.x + worldOffset);
    let frontGroundY = getTerrainHeight(wheels.front.x + worldOffset);

    wheels.back.grounded = wheels.back.y >= backGroundY - car.wheelRadius;
    wheels.front.grounded = wheels.front.y >= frontGroundY - car.wheelRadius;

    // Handle Ground Snap Interceptors Math Pipeline
    if (wheels.back.grounded) {
        wheels.back.y = backGroundY - car.wheelRadius;
        car.vy += (wheels.back.y - (car.y + car.backWheelOffset * sinA + 12)) * 0.15; // Suspension contraction force
    }
    if (wheels.front.grounded) {
        wheels.front.y = frontGroundY - car.wheelRadius;
        car.vy += (wheels.front.y - (car.y + car.frontWheelOffset * sinA + 12)) * 0.15;
    }

    // Input Execution Vectors Handling
    if (inputs.gas) {
        if (wheels.back.grounded || wheels.front.grounded) {
            // Apply forward velocity vectors along relative pitch profiles orientations
            let pushAngle = car.angle;
            car.vx += Math.cos(pushAngle) * PHYSICS.engineTorque;
            car.vy += Math.sin(pushAngle) * PHYSICS.engineTorque;
        } else {
            // Rotational pitch adjust forces inside open air space vectors curves
            car.angularVelocity += PHYSICS.rotationSpeed * 0.35;
        }
    }
    if (inputs.brake) {
        if (wheels.back.grounded || wheels.front.grounded) {
            car.vx -= Math.cos(car.angle) * PHYSICS.brakingPower;
        } else {
            car.angularVelocity -= PHYSICS.rotationSpeed * 0.35;
        }
    }

    // Apply angular drag adjustments if both tracking nodes remain fully anchored on track surfaces
    if (wheels.back.grounded && wheels.front.grounded) {
        let desiredAngle = Math.atan2(frontGroundY - backGroundY, wheels.front.x - wheels.back.x);
        let angleDiff = desiredAngle - car.angle;
        
        // Normalize angle variance bounds cleanly
        angleDiff = Math.atan2(Math.sin(angleDiff), Math.cos(angleDiff));
        car.angle += angleDiff * 0.3; // High dampening coefficient ground snap value
        car.angularVelocity = 0;
    }

    // Translate global offset tracker pipelines
    if (car.vx < 0 && worldOffset <= 0) {
        car.vx = 0;
    }
    
    // Smooth camera viewport tracking scroll matrix locks updates
    worldOffset += car.vx;
    car.y += car.vy;

    // Lock position boundary restrictions over global visual layout zones
    car.vx *= 0.98; 

    // Handle structural failure evaluation conditions triggers (Death Checks)
    let currentChassisGroundY = getTerrainHeight(car.x + worldOffset);
    if (car.y > currentChassisGroundY + 10) {
        triggerCrash("VEHICLE DESTROYED");
    }

    // Flipped upside down check logic loop rules sequence parameters bounds
    let absRot = Math.abs(car.angle) % (Math.PI * 2);
    if ((wheels.back.grounded || wheels.front.grounded) && (absRot > Math.PI * 0.45 && absRot < Math.PI * 1.5)) {
        triggerCrash("DRIVER HEAD CRASH");
    }
    
    if (currentFuel <= 0 && Math.abs(car.vx) < 0.05 && !wheels.back.grounded && !wheels.front.grounded) {
        triggerCrash("OUT OF FUEL RESERVE");
    }
}

// --- Item Sweeper & Intersection Processing Math ---
function processTokenIntersections() {
    pickupAssets.forEach(asset => {
        if (asset.collected) return;
        
        // Account relative screen coordinates offsets
        let assetScreenX = asset.x - worldOffset;
        let dx = car.x - assetScreenX;
        let dy = car.y - asset.y;
        let distance = Math.sqrt(dx * dx + dy * dy);

        if (distance < car.width * 0.6 + 10) {
            asset.collected = true;
            if (asset.type === 'COIN') {
                coinsCollected += 1;
                coinsVal.innerText = coinsCollected.toString();
            } else if (asset.type === 'FUEL') {
                currentFuel = Math.min(PHYSICS.maxFuel, currentFuel + 45); // Top off tank
            }
        }
    });
}

// --- Graphical Render Engine Graphics Functions ---
function drawWorldGrid() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Deep gradient atmospheric background sky
    let bgGrad = ctx.createLinearGradient(0, 0, 0, canvas.height);
    bgGrad.addColorStop(0, '#020617');
    bgGrad.addColorStop(1, '#0f172a');
    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Draw Vector Terrain Points Mesh Lines Paths Binds
    ctx.beginPath();
    let startViewX = 0;
    let endViewX = canvas.width;

    ctx.moveTo(0, canvas.height);
    for (let screenX = startViewX; screenX <= endViewX; screenX += 5) {
        let computedWorldX = screenX + worldOffset;
        let groundY = getTerrainHeight(computedWorldX);
        ctx.lineTo(screenX, groundY);
    }
    ctx.lineTo(canvas.width, canvas.height);
    ctx.closePath();
    
    ctx.fillStyle = '#1e293b'; // Ground fill matrix color mesh
    ctx.fill();
    
    // Draw neon glowing boundary outline track top edge profile
    ctx.beginPath();
    for (let screenX = startViewX; screenX <= endViewX; screenX += 5) {
        let computedWorldX = screenX + worldOffset;
        let groundY = getTerrainHeight(computedWorldX);
        if (screenX === 0) ctx.moveTo(screenX, groundY);
        else ctx.lineTo(screenX, groundY);
    }
    ctx.strokeStyle = '#06b6d4'; // Cyber cyan line track strip
    ctx.lineWidth = 3;
    ctx.stroke();

    // Render pickup items array
    pickupAssets.forEach(asset => {
        if (asset.collected) return;
        let screenX = asset.x - worldOffset;
        if (screenX < -50 || screenX > canvas.width + 50) return; // Cull out of view items

        if (asset.type === 'COIN') {
            ctx.beginPath();
            ctx.arc(screenX, asset.y, asset.radius, 0, Math.PI * 2);
            ctx.fillStyle = '#f59e0b';
            ctx.shadowColor = '#f59e0b';
            ctx.shadowBlur = 10;
            ctx.fill();
            ctx.shadowBlur = 0; // Clear shadow
        } else if (asset.type === 'FUEL') {
            ctx.fillStyle = '#e11d48';
            ctx.fillRect(screenX - asset.w/2, asset.y - asset.h/2, asset.w, asset.h);
            ctx.fillStyle = '#ffffff';
            ctx.font = '9px monospace';
            ctx.fillText("GAS", screenX - 8, asset.y + 3);
        }
    });

    // --- Draw Physics Buggy Rig Asset ---
    ctx.save();
    ctx.translate(car.x, car.y);
    ctx.rotate(car.angle);

    // Draw Main Driver Cabin Box Chassis
    ctx.fillStyle = '#a855f7'; // Neon Purple Shell
    ctx.fillRect(-car.width / 2, -car.height / 2, car.width, car.height);
    
    // Top spoiler cage tube structural line frame profile element
    ctx.beginPath();
    ctx.moveTo(-15, -car.height/2);
    ctx.lineTo(-5, -car.height/2 - 12);
    ctx.lineTo(15, -car.height/2 - 12);
    ctx.lineTo(20, -car.height/2);
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 2;
    ctx.stroke();

    ctx.restore();

    // Draw Wheel Components independently outside body space rotations to maintain independent axis updates
    drawWheelMesh(wheels.back.x, wheels.back.y);
    drawWheelMesh(wheels.front.x, wheels.front.y);
}

function drawWheelMesh(wx, wy) {
    ctx.beginPath();
    ctx.arc(wx, wy, car.wheelRadius, 0, Math.PI * 2);
    ctx.fillStyle = '#334155';
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 2;
    ctx.fill();
    ctx.stroke();
    
    // Radial spoke visual identifier lines index vector to verify rolling rotation states
    ctx.beginPath();
    ctx.moveTo(wx, wy);
    let scrollStepAngle = worldOffset / 12; // Modulate spin speed relative to movement rate scales
    ctx.lineTo(wx + Math.cos(scrollStepAngle) * car.wheelRadius, wy + Math.sin(scrollStepAngle) * car.wheelRadius);
    ctx.strokeStyle = '#020617';
    ctx.stroke();
}

// --- Interface Overlay Displays Handlers Binds ---
function triggerCrash(message) {
    gameState = 'GAMEOVER';
    document.getElementById('fail-reason').innerText = message;
    document.getElementById('final-distance').innerText = `${Math.floor(worldOffset / 10)}m`;
    document.getElementById('final-coins').innerText = coinsCollected.toString();
    
    hud.classList.add('hidden');
    mobileControls.classList.add('hidden');
    gameoverOverlay.classList.remove('hidden');
}

function resetSimulationState() {
    worldOffset = 0;
    coinsCollected = 0;
    currentFuel = 100;
    
    car.x = 180;
    car.y = 220;
    car.vx = 0;
    car.vy = 0;
    car.angle = 0;
    car.angularVelocity = 0;

    pickupAssets = [];
    generateWorldAssetsForRange(0, 4000); // Pre-seed initial track blocks zones

    coinsVal.innerText = "0";
    distanceVal.innerText = "0m";
    fuelBar.style.width = "100%";
    fuelTxt.innerText = "100%";
}

// --- Frame Loop Pipelines Master Core Execution ---
let chunkMarkerX = 2000;
function runMasterTickLoop() {
    if (gameState === 'PLAYING') {
        updatePhysics();
        processTokenIntersections();
        
        // Procedural map endless tracking generation checker hooks
        if (worldOffset > chunkMarkerX - 1500) {
            generateWorldAssetsForRange(chunkMarkerX, chunkMarkerX + 2000);
            chunkMarkerX += 2000;
        }

        // Live HUD stats strings formatting steps updates
        distanceVal.innerText = `${Math.floor(worldOffset / 10)}m`;
        let computedPct = Math.floor(currentFuel);
        fuelBar.style.width = `${computedPct}%`;
        fuelTxt.innerText = `${computedPct}%`;
        
        if (computedPct < 30) {
            fuelTxt.className = "text-rose-500 font-bold animate-pulse";
        } else {
            fuelTxt.className = "text-emerald-400 font-bold";
        }
    }

    drawWorldGrid();
    requestAnimationFrame(runMasterTickLoop);
}

// --- Hardware Inputs Handlers System Routes ---
window.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowRight' || e.key.toLowerCase() === 'd') inputs.gas = true;
    if (e.key === 'ArrowLeft' || e.key.toLowerCase() === 'a') inputs.brake = true;
});

window.addEventListener('keyup', (e) => {
    if (e.key === 'ArrowRight' || e.key.toLowerCase() === 'd') inputs.gas = false;
    if (e.key === 'ArrowLeft' || e.key.toLowerCase() === 'a') inputs.brake = false;
});

// Mobile Structural Hardware Layout Touch Interfaces Hook Setup Binds
const gasBtn = document.getElementById('ctrl-gas');
const brakeBtn = document.getElementById('ctrl-brake');

gasBtn.addEventListener('touchstart', (e) => { e.preventDefault(); inputs.gas = true; });
gasBtn.addEventListener('touchend', (e) => { e.preventDefault(); inputs.gas = false; });

brakeBtn.addEventListener('touchstart', (e) => { e.preventDefault(); inputs.brake = true; });
brakeBtn.addEventListener('touchend', (e) => { e.preventDefault(); inputs.brake = false; });

// Menu Navigation Click Handlers Action Links
document.getElementById('start-btn').addEventListener('click', () => {
    menuOverlay.classList.add('hidden');
    hud.classList.remove('hidden');
    if (window.innerWidth < 768) mobileControls.classList.remove('hidden');
    resetSimulationState();
    gameState = 'PLAYING';
});

document.getElementById('restart-btn').addEventListener('click', () => {
    gameoverOverlay.classList.add('hidden');
    hud.classList.remove('hidden');
    if (window.innerWidth < 768) mobileControls.classList.remove('hidden');
    resetSimulationState();
    gameState = 'PLAYING';
});

// Fire runtime clock rendering threads loops initialization
requestAnimationFrame(runMasterTickLoop);
