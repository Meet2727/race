const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

// DOM Target Anchors
const menuOverlay = document.getElementById('menu-overlay');
const gameoverOverlay = document.getElementById('gameover-overlay');
const hud = document.getElementById('hud');
const mobileControls = document.getElementById('mobile-controls');
const scoreVal = document.getElementById('score-val');
const keyHud = document.getElementById('key-hud');

// Skin & Theme Selections Arrays
const SKINS = ["#06b6d4", "#f43f5e", "#fbbf24"];
const THEMES = [
    { name: "Cyber City", bgTop: "#020617", bgBot: "#0f172a", platform: "#1e293b", stroke: "#f43f5e", fluid: "rgba(244, 63, 94, 0.4)" },
    { name: "Acid Void",   bgTop: "#050505", bgBot: "#022c22", platform: "#064e3b", stroke: "#10b981", fluid: "rgba(16, 185, 129, 0.4)" },
    { name: "Deep Cosmos", bgTop: "#1e1b4b", bgBot: "#030712", platform: "#312e81", stroke: "#818cf8", fluid: "rgba(129, 140, 248, 0.4)" }
];

let selectedSkinIdx = 0;
let selectedThemeIdx = 0;

let gameState = 'MENU';
let score = 0;
let cameraX = 0;
let baseInternalWidth = 800;
let baseInternalHeight = 450;

// Advanced Proximity & Hazard System Variables
let fluidLevel = 450; 
let fluidRiseSpeed = 0.22;
let projectiles = [];
let projectileTimer = 0;
let playerHasKey = false;

const PHYSICS = { gravity: 0.55, friction: 0.82, speed: 5.0, jumpForce: -12.0 };

let player = { x: 80, y: 200, w: 22, h: 32, vx: 0, vy: 0, grounded: false };

let mapPlatforms = [];
let interactiveMechanics = [];
let activeMovingPlatforms = [];
let inputs = { left: false, right: false, jump: false };

// --- 100% Responsive Adaptive Canvas Coords Mapping ---
function resizeCanvasCoordinates() {
    const container = document.getElementById('game-container');
    const rect = container.getBoundingClientRect();
    
    // Set internal resolution pixel counts independently from viewport display bounding boxes
    canvas.width = baseInternalWidth;
    canvas.height = baseInternalHeight;
}

// --- Procedural Generation Advanced Level Setup ---
function buildStageArchitecture() {
    fluidLevel = 460; // Reset flood levels
    playerHasKey = false;
    projectiles = [];
    projectileTimer = 0;
    keyHud.classList.remove('text-cyan-400', 'border-cyan-500');
    keyHud.classList.add('text-slate-500');

    mapPlatforms = [
        { x: 0, y: 380, w: 350, h: 70 },
        { x: 420, y: 310, w: 200, h: 20 },
        { x: 700, y: 240, w: 180, h: 20 },
        { x: 950, y: 380, w: 350, h: 70 },
        { x: 1400, y: 290, w: 220, h: 20 },
        { x: 1720, y: 210, w: 200, h: 20 },
        { x: 2050, y: 380, w: 600, h: 70 } 
    ];

    activeMovingPlatforms = [
        { x: 250, y: 220, startY: 180, endY: 340, w: 90, h: 15, speed: 1.8, dir: 1 },
        { x: 1200, y: 300, startX: 1200, endX: 1380, w: 90, h: 15, speed: 2.2, dir: 1 }
    ];

    interactiveMechanics = [
        { type: 'COIN', x: 200, y: 330, w: 12, h: 12, gathered: false },
        { type: 'COIN', x: 520, y: 260, w: 12, h: 12, gathered: false },
        { type: 'COIN', x: 1050, y: 330, w: 12, h: 12, gathered: false },
        { type: 'COIN', x: 1800, y: 160, w: 12, h: 12, gathered: false },

        // Hyper High-Velocity Bounce Pad
        { type: 'BOUNCE', x: 1000, y: 365, w: 24, h: 15 },
        
        // Hazard Spike Meshes
        { type: 'SPIKE', x: 1120, y: 365, w: 30, h: 15 },
        { type: 'SPIKE', x: 1150, y: 365, w: 30, h: 15 },

        // Advanced Mission Key Target Item
        { type: 'SECURITY_KEY', x: 1820, y: 150, w: 18, h: 18, gathered: false },

        // Firewall Locked Exit Teleporter Portal Gate
        { type: 'PORTAL', x: 2500, y: 300, w: 35, h: 80 }
    ];
}

// --- Platformer Rigid Body Physics Loops Engine ---
function updatePhysicsSimulation() {
    if (inputs.left)  player.vx = -PHYSICS.speed;
    if (inputs.right) player.vx = PHYSICS.speed;
    if (!inputs.left && !inputs.right) player.vx *= PHYSICS.friction;

    player.vy += PHYSICS.gravity;
    player.x += player.vx;
    
    player.grounded = false;
    processPlatformCollisions('HORIZONTAL');

    player.y += player.vy;
    processPlatformCollisions('VERTICAL');

    // Handle rising liquid floor hazard metrics
    fluidLevel -= fluidRiseSpeed;
    if (player.y + player.h >= fluidLevel) {
        triggerSimulationEnd('CRASHED', 'Avatar evaporated in rising chemical liquid flood layers.');
    }

    // Spawn falling hazards from top of map dynamically over time intervals
    projectileTimer++;
    if (projectileTimer > 90) {
        projectiles.push({ x: player.x + Math.random() * 400 - 200, y: -20, r: 6, vy: 4 });
        projectileTimer = 0;
    }

    // Translate projectile items down screen space arrays
    for (let i = projectiles.length - 1; i >= 0; i--) {
        let p = projectiles[i];
        p.y += p.vy;

        // Check intersections with player bounding box radius checks
        if (p.x > player.x && p.x < player.x + player.w && p.y > player.y && p.y < player.y + player.h) {
            triggerSimulationEnd('CRASHED', 'Killed by meteor projectile strikes fragments.');
        }
        if (p.y > baseInternalHeight) projectiles.splice(i, 1);
    }

    // Process Moving Platforms Tracking Loops
    activeMovingPlatforms.forEach(mp => {
        if (mp.startX !== undefined) {
            mp.x += mp.speed * mp.dir;
            if (mp.x > mp.endX || mp.x < mp.startX) mp.dir *= -1;
        } else {
            mp.y += mp.speed * mp.dir;
            if (mp.y > mp.endY || mp.y < mp.startY) mp.dir *= -1;
        }

        if (player.x + player.w > mp.x && player.x < mp.x + mp.w) {
            if (player.y + player.h >= mp.y && player.y + player.h <= mp.y + mp.speed + 6 && player.vy >= 0) {
                player.y = mp.y - player.h;
                player.vy = 0;
                player.grounded = true;
                if (mp.startX !== undefined) player.x += mp.speed * mp.dir;
            }
        }
    });

    if (inputs.jump && player.grounded) {
        player.vy = PHYSICS.jumpForce;
        player.grounded = false;
    }

    cameraX = player.x - 200;
    if (cameraX < 0) cameraX = 0;

    // Interactive Trigger Targets Pipeline Loops
    interactiveMechanics.forEach(item => {
        if (player.x < item.x + item.w && player.x + player.w > item.x &&
            player.y < item.y + item.h && player.y + player.h > item.y) {
            
            if (item.type === 'COIN' && !item.gathered) {
                item.gathered = true;
                score += 100;
                scoreVal.innerText = score.toString();
            } else if (item.type === 'BOUNCE') {
                player.vy = PHYSICS.jumpForce * 1.45;
            } else if (item.type === 'SPIKE') {
                triggerSimulationEnd('CRASHED', 'Lethal physical spikes pierced core chassis frame elements.');
            } else if (item.type === 'SECURITY_KEY' && !item.gathered) {
                item.gathered = true;
                playerHasKey = true;
                keyHud.classList.remove('text-slate-500');
                keyHud.classList.add('text-cyan-400', 'border-cyan-500');
            } else if (item.type === 'PORTAL') {
                if (playerHasKey) {
                    triggerSimulationEnd('CLEARED', 'Firewall secure records successfully vaulted into secure matrix layers.');
                }
            }
        }
    });
}

function processPlatformCollisions(axis) {
    const targets = [...mapPlatforms, ...activeMovingPlatforms];
    targets.forEach(plat => {
        if (player.x < plat.x + plat.w && player.x + player.w > plat.x &&
            player.y < plat.y + plat.h && player.y + player.h > plat.y) {
            
            if (axis === 'HORIZONTAL') {
                if (player.vx > 0) player.x = plat.x - player.w;
                if (player.vx < 0) player.x = plat.x + plat.w;
            } else {
                if (player.vy > 0) {
                    player.y = plat.y - player.h;
                    player.vy = 0;
                    player.grounded = true;
                }
                if (player.vy < 0) {
                    player.y = plat.y + plat.h;
                    player.vy = 0;
                }
            }
        }
    });
}

// --- Graphical Render Engine Module ---
function renderFrameOutput() {
    const theme = THEMES[selectedThemeIdx];

    let bg = ctx.createLinearGradient(0, 0, 0, canvas.height);
    bg.addColorStop(0, theme.bgTop);
    bg.addColorStop(1, theme.bgBot);
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.save();
    ctx.translate(-cameraX, 0);

    // Static Platforms Drawing
    ctx.fillStyle = theme.platform;
    mapPlatforms.forEach(plat => {
        ctx.fillRect(plat.x, plat.y, plat.w, plat.h);
        ctx.strokeStyle = theme.stroke;
        ctx.lineWidth = 1.5;
        ctx.strokeRect(plat.x, plat.y, plat.w, plat.h);
    });

    // Moving platforms drawing
    ctx.fillStyle = "#475569";
    activeMovingPlatforms.forEach(mp => {
        ctx.fillRect(mp.x, mp.y, mp.w, mp.h);
        ctx.strokeStyle = "#94a3b8";
        ctx.strokeRect(mp.x, mp.y, mp.w, mp.h);
    });

    // Drawing Items & Interactive Hazards Matrix
    interactiveMechanics.forEach(item => {
        if (item.type === 'COIN' && !item.gathered) {
            ctx.fillStyle = "#fbbf24";
            ctx.fillRect(item.x, item.y, item.w, item.h);
        } else if (item.type === 'BOUNCE') {
            ctx.fillStyle = "#a855f7";
            ctx.fillRect(item.x, item.y, item.w, item.h);
        } else if (item.type === 'SPIKE') {
            ctx.fillStyle = "#ef4444";
            ctx.beginPath();
            ctx.moveTo(item.x, item.y + item.h);
            ctx.lineTo(item.x + item.w/2, item.y);
            ctx.lineTo(item.x + item.w, item.y + item.h);
            ctx.closePath();
            ctx.fill();
        } else if (item.type === 'SECURITY_KEY' && !item.gathered) {
            ctx.fillStyle = "#22d3ee";
            ctx.fillRect(item.x, item.y, item.w, item.h);
        } else if (item.type === 'PORTAL') {
            ctx.fillStyle = playerHasKey ? "rgba(236, 72, 153, 0.6)" : "rgba(71, 85, 105, 0.4)";
            ctx.fillRect(item.x, item.y, item.w, item.h);
            ctx.strokeStyle = playerHasKey ? "#f43f5e" : "#475569";
            ctx.strokeRect(item.x, item.y, item.w, item.h);
        }
    });

    // Draw Falling Projectiles Hazards
    ctx.fillStyle = "#f97316";
    projectiles.forEach(p => {
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fill();
    });

    // Draw Player Body Box Mesh Matrix
    ctx.fillStyle = SKINS[selectedSkinIdx];
    ctx.fillRect(player.x, player.y, player.w, player.h);

    ctx.restore();

    // Render rising liquid flood wave panel overlay across screen baseline coords
    ctx.fillStyle = theme.fluid;
    ctx.fillRect(0, fluidLevel, canvas.width, canvas.height - fluidLevel);
    ctx.strokeStyle = theme.stroke;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(0, fluidLevel);
    ctx.lineTo(canvas.width, fluidLevel);
    ctx.stroke();
}

// --- Lifecycle Views Navigation Handlers ---
function triggerSimulationEnd(status, descMsg) {
    gameState = 'GAMEOVER';
    hud.classList.add('hidden');
    mobileControls.classList.add('hidden');
    
    const endTitle = document.getElementById('end-title');
    const endDesc = document.getElementById('end-desc');
    document.getElementById('final-score').innerText = score.toString();

    if (status === 'CLEARED') {
        endTitle.innerText = "STAGE STACK CLEARED";
        endTitle.className = "text-3xl font-black text-emerald-400 mb-1 tracking-wider";
        endDesc.innerText = descMsg;
    } else {
        endTitle.innerText = "INTEGRITY FRACTURED";
        endTitle.className = "text-3xl font-black text-rose-500 mb-1 tracking-wider";
        endDesc.innerText = descMsg;
    }
    gameoverOverlay.classList.remove('hidden');
}

function fullEngineParamReset() {
    player.x = 80; player.y = 200;
    player.vx = 0; player.vy = 0;
    score = 0; cameraX = 0;
    scoreVal.innerText = "0";
    buildStageArchitecture();
}

function engineMasterTick() {
    if (gameState === 'PLAYING') {
        updatePhysicsSimulation();
    }
    renderFrameOutput();
    requestAnimationFrame(engineMasterTick);
}

// --- Setup Multi Selection Carousel Layout Matrices Binds ---
function configureSelectionMatrices() {
    document.querySelectorAll('.skin-opt').forEach((btn, idx) => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.skin-opt').forEach(b => b.classList.remove('border-cyan-500', 'text-cyan-400'));
            btn.classList.add('border-cyan-500', 'text-cyan-400');
            selectedSkinIdx = idx;
        });
    });

    document.querySelectorAll('.theme-opt').forEach((btn, idx) => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.theme-opt').forEach(b => b.classList.remove('border-fuchsia-500', 'text-fuchsia-400'));
            btn.classList.add('border-fuchsia-500', 'text-fuchsia-400');
            selectedThemeIdx = idx;
        });
    });
}

function exitToMainSetup() {
    gameState = 'MENU';
    hud.classList.add('hidden');
    mobileControls.classList.add('hidden');
    gameoverOverlay.classList.add('hidden');
    menuOverlay.classList.remove('hidden');
}

// --- Unified Structural Input Multi Binds ---
window.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowLeft' || e.key.toLowerCase() === 'a') inputs.left = true;
    if (e.key === 'ArrowRight' || e.key.toLowerCase() === 'd') inputs.right = true;
    if (e.key === ' ' || e.key.toLowerCase() === 'w' || e.key === 'ArrowUp') inputs.jump = true;
});

window.addEventListener('keyup', (e) => {
    if (e.key === 'ArrowLeft' || e.key.toLowerCase() === 'a') inputs.left = false;
    if (e.key === 'ArrowRight' || e.key.toLowerCase() === 'd') inputs.right = false;
    if (e.key === ' ' || e.key.toLowerCase() === 'w' || e.key === 'ArrowUp') inputs.jump = false;
});

// High-Speed Mobile DOM Pointer listeners (Zero Input-Delay Overrides)
const setTouchInput = (el, action, targetFlag) => {
    el.addEventListener(action, (e) => { e.preventDefault(); inputs[targetFlag] = (action === 'touchstart'); });
};
setTouchInput(document.getElementById('btn-left'), 'touchstart', 'left');
setTouchInput(document.getElementById('btn-left'), 'touchend', 'left');
setTouchInput(document.getElementById('btn-right'), 'touchstart', 'right');
setTouchInput(document.getElementById('btn-right'), 'touchend', 'right');
setTouchInput(document.getElementById('btn-jump'), 'touchstart', 'jump');
setTouchInput(document.getElementById('btn-jump'), 'touchend', 'jump');

document.getElementById('start-btn').addEventListener('click', () => {
    menuOverlay.classList.add('hidden');
    hud.classList.remove('hidden');
    if (window.innerWidth < 768) mobileControls.classList.remove('hidden');
    fullEngineParamReset();
    gameState = 'PLAYING';
});

document.getElementById('restart-btn').addEventListener('click', () => {
    gameoverOverlay.classList.add('hidden');
    hud.classList.remove('hidden');
    if (window.innerWidth < 768) mobileControls.classList.remove('hidden');
    fullEngineParamReset();
    gameState = 'PLAYING';
});

document.getElementById('hud-leave-btn').addEventListener('click', exitToMainSetup);
document.getElementById('menu-back-btn').addEventListener('click', exitToMainSetup);

// Dynamic Orientation Adaptors Engine Registers
window.addEventListener('resize', resizeCanvasCoordinates);

// Boot sequence runs initialization setups
configureSelectionMatrices();
resizeCanvasCoordinates();
buildStageArchitecture();
requestAnimationFrame(engineMasterTick);
