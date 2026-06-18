const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

// DOM Target Anchors Selectors Binds
const menuOverlay = document.getElementById('menu-overlay');
const gameoverOverlay = document.getElementById('gameover-overlay');
const hud = document.getElementById('hud');
const mobileControls = document.getElementById('mobile-controls');
const scoreVal = document.getElementById('score-val');

// --- Component Option Skin Matrix Profiles ---
const SKINS = ["#06b6d4", "#f43f5e", "#fbbf24"];
const THEMES = [
    { name: "Cyber City", bgTop: "#020617", bgBot: "#0f172a", platformColor: "#1e293b", strokeColor: "#f43f5e" },
    { name: "Acid Void",   bgTop: "#050505", bgBot: "#022c22", platformColor: "#064e3b", strokeColor: "#10b981" },
    { name: "Deep Cosmos", bgTop: "#1e1b4b", bgBot: "#030712", platformColor: "#312e81", strokeColor: "#818cf8" }
];

let selectedSkinIdx = 0;
let selectedThemeIdx = 0;

let gameState = 'MENU';
let score = 0;
let cameraX = 0;

// Engine Configuration Physics Parameters
const PHYSICS = {
    gravity: 0.5,
    friction: 0.85,
    speed: 4.5,
    jumpForce: -11.5
};

// Player Dynamic Body State Object
let player = {
    x: 100, y: 200,
    w: 20, h: 32,
    vx: 0, vy: 0,
    grounded: false
};

// Level Interactive Structural Entities Matrix
let mapPlatforms = [];
let interactiveMechanics = []; // Tokens, spikes, bounce pads, portals
let activeMovingPlatforms = [];

let inputs = { left: false, right: false, jump: false };

// --- Structural Map Blueprint Generator ---
function buildStageArchitecture() {
    mapPlatforms = [
        { x: 0, y: 400, w: 500, h: 50 },
        { x: 580, y: 340, w: 200, h: 20 },
        { x: 850, y: 280, w: 180, h: 20 },
        { x: 1100, y: 400, w: 400, h: 50 },
        { x: 1600, y: 330, w: 220, h: 20 },
        { x: 1900, y: 240, w: 150, h: 20 },
        { x: 2150, y: 400, w: 600, h: 50 } // Goal Line Arena Platform
    ];

    activeMovingPlatforms = [
        { x: 380, y: 240, startY: 240, endY: 380, w: 100, h: 15, speed: 1.5, dir: 1 },
        { x: 1380, y: 340, startX: 1380, endX: 1580, w: 90, h: 15, speed: 2, dir: 1 }
    ];

    interactiveMechanics = [
        // Star score collectible targets tokens
        { type: 'COIN', x: 220, y: 360, w: 12, h: 12, gathered: false },
        { type: 'COIN', x: 680, y: 300, w: 12, h: 12, gathered: false },
        { type: 'COIN', x: 920, y: 230, w: 12, h: 12, gathered: false },
        { type: 'COIN', x: 1250, y: 360, w: 12, h: 12, gathered: false },
        { type: 'COIN', x: 1700, y: 280, w: 12, h: 12, gathered: false },

        // Hyper High-Velocity Bounce Pad Springs
        { type: 'BOUNCE', x: 1150, y: 385, w: 24, h: 15 },
        
        // Hazard Death Spikes Meshes
        { type: 'SPIKE', x: 1280, y: 385, w: 30, h: 15 },
        { x: 1310, y: 385, w: 30, h: 15 },

        // Level Exit End Gate Teleporter Portal
        { type: 'PORTAL', x: 2600, y: 320, w: 30, h: 80 }
    ];
}

// --- Platformer Physics Engine AABB Intersection Pipelines ---
function updatePhysicsSimulation() {
    // Process Left/Right Inertia Math Vectoring
    if (inputs.left)  player.vx = -PHYSICS.speed;
    if (inputs.right) player.vx = PHYSICS.speed;
    if (!inputs.left && !inputs.right) player.vx *= PHYSICS.friction;

    // Apply Standard Gravitational Accel Constant
    player.vy += PHYSICS.gravity;

    // Transition coordinate boundaries steps updates
    player.x += player.vx;
    
    // Evaluate Horizontal Platform Collisions
    player.grounded = false;
    processPlatformCollisions('HORIZONTAL');

    player.y += player.vy;
    // Evaluate Vertical Platform Collisions
    processPlatformCollisions('VERTICAL');

    // Run Moving Platforms Physics Loop Updates
    activeMovingPlatforms.forEach(mp => {
        // Handle physical spatial translations along designated structural track paths
        if (mp.startX !== undefined) {
            mp.x += mp.speed * mp.dir;
            if (mp.x > mp.endX || mp.x < mp.startX) mp.dir *= -1;
        } else {
            mp.y += mp.speed * mp.dir;
            if (mp.y > mp.endY || mp.y < mp.startY) mp.dir *= -1;
        }

        // Rider dynamic friction attachments pipeline connection calculations 
        if (player.x + player.w > mp.x && player.x < mp.x + mp.w) {
            // Player standing flush directly over moving platform frame boundaries
            if (player.y + player.h >= mp.y && player.y + player.h <= mp.y + mp.speed + 6 && player.vy >= 0) {
                player.y = mp.y - player.h;
                player.vy = 0;
                player.grounded = true;
                if (mp.startX !== undefined) player.x += mp.speed * mp.dir; // Pull passenger horizontally
            }
        }
    });

    // Handle Jump Commands Action Triggers
    if (inputs.jump && player.grounded) {
        player.vy = PHYSICS.jumpForce;
        player.grounded = false;
    }

    // Anchor camera horizontal window viewport offset point smoothly tracking player positions
    cameraX = player.x - 250;
    if (cameraX < 0) cameraX = 0;

    // Evaluate Interactive Objects Collision Intersection Nodes
    interactiveMechanics.forEach(item => {
        if (player.x < item.x + item.w && player.x + player.w > item.x &&
            player.y < item.y + item.h && player.y + player.h > item.y) {
            
            if (item.type === 'COIN' && !item.gathered) {
                item.gathered = true;
                score += 100;
                scoreVal.innerText = score.toString();
            } else if (item.type === 'BOUNCE') {
                player.vy = PHYSICS.jumpForce * 1.45; // Blast passenger into space
            } else if (item.type === 'SPIKE') {
                triggerSimulationEnd('CRASHED');
            } else if (item.type === 'PORTAL') {
                triggerSimulationEnd('CLEARED');
            }
        }
    });

    // Out of bounds drop fall boundary checker triggers
    if (player.y > canvas.height + 100) {
        triggerSimulationEnd('CRASHED');
    }
}

function processPlatformCollisions(axis) {
    // Combine standard static blocks lists and moving arrays sets to run clean overlap iterations
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

// --- Graphical Canvas Matrix Rendering Pipeline ---
function renderFrameOutput() {
    const theme = THEMES[selectedThemeIdx];

    // Compute sky background vector gradients textures blocks
    let bg = ctx.createLinearGradient(0, 0, 0, canvas.height);
    bg.addColorStop(0, theme.bgTop);
    bgGrad = theme.bgBot;
    bg.addColorStop(1, theme.bgBot);
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.save();
    ctx.translate(-cameraX, 0);

    // Draw Static Solid Level Architecture Elements Block Matrices
    ctx.fillStyle = theme.platformColor;
    mapPlatforms.forEach(plat => {
        ctx.fillRect(plat.x, plat.y, plat.w, plat.h);
        ctx.strokeStyle = theme.strokeColor;
        ctx.lineWidth = 1.5;
        ctx.strokeRect(plat.x, plat.y, plat.w, plat.h);
    });

    // Draw Moving Platforms Frame Sets
    ctx.fillStyle = "#475569";
    activeMovingPlatforms.forEach(mp => {
        ctx.fillRect(mp.x, mp.y, mp.w, mp.h);
        ctx.strokeStyle = "#94a3b8";
        ctx.strokeRect(mp.x, mp.y, mp.w, mp.h);
    });

    // Draw Operational Level Interactive Sprites Assets
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
        } else if (item.type === 'PORTAL') {
            // Render neon translucent destination portal layer loop shapes 
            let portGrad = ctx.createLinearGradient(item.x, item.y, item.x + item.w, item.y);
            portGrad.addColorStop(0, "rgba(236, 72, 153, 0.2)");
            portGrad.addColorStop(1, "rgba(168, 85, 247, 0.8)");
            ctx.fillStyle = portGrad;
            ctx.fillRect(item.x, item.y, item.w, item.h);
            ctx.strokeStyle = "#f43f5e";
            ctx.strokeRect(item.x, item.y, item.w, item.h);
        }
    });

    // Draw Player Rig Box Model Sprite Profile Frame
    ctx.fillStyle = SKINS[selectedSkinIdx];
    ctx.fillRect(player.x, player.y, player.w, player.h);

    ctx.restore();
}

// --- View Lifecycle Navigation State Handlers ---
function triggerSimulationEnd(status) {
    gameState = 'GAMEOVER';
    hud.classList.add('hidden');
    mobileControls.classList.add('hidden');
    
    const endTitle = document.getElementById('end-title');
    const endDesc = document.getElementById('end-desc');
    document.getElementById('final-score').innerText = score.toString();

    if (status === 'CLEARED') {
        endTitle.innerText = "STAGE STACK CLEARED";
        endTitle.className = "text-3xl font-black text-emerald-400 mb-1 tracking-wider";
        endDesc.innerText = "System records successfully vaulted into secure matrix layers.";
    } else {
        endTitle.innerText = "INTEGRITY FRACTURED";
        endTitle.className = "text-3xl font-black text-rose-500 mb-1 tracking-wider";
        endDesc.innerText = "Avatar coordinates vanished outside operational framework structures.";
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

// --- Setup Selection Menu Multi-Buttons Matrix Loops ---
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

// --- Structural Input Event Bindings Routing ---
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

// Mobile layout gesture maps overrides Binds
document.getElementById('btn-left').addEventListener('touchstart', (e) => { e.preventDefault(); inputs.left = true; });
document.getElementById('btn-left').addEventListener('touchend', (e) => { e.preventDefault(); inputs.left = false; });
document.getElementById('btn-right').addEventListener('touchstart', (e) => { e.preventDefault(); inputs.right = true; });
document.getElementById('btn-right').addEventListener('touchend', (e) => { e.preventDefault(); inputs.right = false; });
document.getElementById('btn-jump').addEventListener('touchstart', (e) => { e.preventDefault(); inputs.jump = true; });
document.getElementById('btn-jump').addEventListener('touchend', (e) => { e.preventDefault(); inputs.jump = false; });

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

// Bootstrap engine loop runtime initialization sequences
configureSelectionMatrices();
buildStageArchitecture();
requestAnimationFrame(engineMasterTick);
