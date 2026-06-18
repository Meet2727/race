const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

// DOM Target Binds
const menuOverlay = document.getElementById('menu-overlay');
const gameoverOverlay = document.getElementById('gameover-overlay');
const hud = document.getElementById('hud');
const scoreVal = document.getElementById('score-val');
const modeTxt = document.getElementById('mode-txt');
const aiStatus = document.getElementById('ai-status');

// Configuration Matrix Arrays
const SKINS = ["#06b6d4", "#f43f5e", "#fbbf24"];
const THEMES = [
    { name: "Cyber City", bgTop: "#020617", bgBot: "#0f172a", platform: "#1e293b", stroke: "#f43f5e", fluid: "rgba(244, 63, 94, 0.3)" },
    { name: "Acid Void",   bgTop: "#050505", bgBot: "#022c22", platform: "#064e3b", stroke: "#10b981", fluid: "rgba(16, 185, 129, 0.3)" },
    { name: "Deep Cosmos", bgTop: "#1e1b4b", bgBot: "#030712", platform: "#312e81", stroke: "#818cf8", fluid: "rgba(129, 140, 248, 0.3)" }
];

let selectedSkinIdx = 0;
let selectedThemeIdx = 0;

let gameState = 'MENU';
let score = 0;
let cameraX = 0;
const V_WIDTH = 800;
const V_HEIGHT = 450;

// Advanced World Hazard Parameters
let fluidLevel = 450;
let fluidRiseSpeed = 0.25;
let projectiles = [];
let projectileTimer = 0;

const PHYSICS = { gravity: 0.55, friction: 0.82, speed: 5.0, jumpForce: -12.0 };
let player = { x: 80, y: 200, w: 22, h: 32, vx: 0, vy: 0, grounded: false };

let mapPlatforms = [];
let interactiveMechanics = [];
let inputs = { left: false, right: false, jump: false };

// --- ML Machine Learning Q-Learning AI Autopilot Matrix ---
let aiMode = false;
let qTable = {}; // State-Action Matrix Map Dictionary
let lastState = null;
let lastAction = null;

const actionsAI = ['STAY', 'LEFT', 'RIGHT', 'JUMP'];
const alpha = 0.2; // ML Learning Rate
const discount = 0.9; // Future value weight estimation discount

function getAIState() {
    // Find closest hazardous projectile
    let closestP = { x: 999, y: 999 };
    projectiles.forEach(p => {
        if (p.x > player.x && p.x < closestP.x) closestP = p;
    });

    // Quantize floating metrics into string indices keys for matrix lookups
    let relX = Math.round((closestP.x - player.x) / 40);
    let relY = Math.round((closestP.y - player.y) / 40);
    let isGrounded = player.grounded ? 1 : 0;

    return `${relX}_${relY}_${isGrounded}`;
}

function selectAIAction(state) {
    if (!qTable[state]) {
        qTable[state] = [0, 0, 0, 0]; // Initialize STAY, LEFT, RIGHT, JUMP states
    }
    // Epsilon-Greedy selection shortcut (Exploit highest recorded lookup value weights)
    let weights = qTable[state];
    let maxIdx = weights.indexOf(Math.max(...weights));
    return actionsAI[maxIdx];
}

function executeAIAutopilotPipeline() {
    if (!aiMode) return;

    let currentState = getAIState();
    
    // Reward structure calculation
    if (lastState && lastAction !== null) {
        let reward = 1; // Staying alive reward frame baseline
        if (gameState === 'GAMEOVER') reward = -100; // Major punishment for death loops triggers

        let oldWeights = qTable[lastState];
        let currentWeights = qTable[currentState] || [0, 0, 0, 0];
        
        // Classic Bellman Equation update function logic rule step
        oldWeights[lastAction] += alpha * (reward + discount * Math.max(...currentWeights) - oldWeights[lastAction]);
    }

    if (gameState === 'GAMEOVER') return;

    let action = selectAIAction(currentState);
    lastState = currentState;
    lastAction = actionsAI.indexOf(action);

    // Turn selected state output flags back into movement inputs parameters
    inputs.left = (action === 'LEFT');
    inputs.right = (action === 'RIGHT');
    inputs.jump = (action === 'JUMP');
}

// --- High Fidelity Procedural Map Track ---
function buildStageArchitecture() {
    fluidLevel = 460;
    projectiles = [];
    projectileTimer = 0;

    mapPlatforms = [
        { x: 0, y: 380, w: 350, h: 70 },
        { x: 420, y: 310, w: 200, h: 20 },
        { x: 700, y: 240, w: 180, h: 20 },
        { x: 950, y: 380, w: 350, h: 70 },
        { x: 1400, y: 290, w: 220, h: 20 },
        { x: 1720, y: 210, w: 200, h: 20 },
        { x: 2050, y: 380, w: 1000, h: 70 }
    ];

    interactiveMechanics = [
        { type: 'COIN', x: 200, y: 330, w: 12, h: 12, gathered: false },
        { type: 'COIN', x: 520, y: 260, w: 12, h: 12, gathered: false },
        { type: 'COIN', x: 1050, y: 330, w: 12, h: 12, gathered: false },
        { type: 'BOUNCE', x: 1000, y: 365, w: 24, h: 15 },
        { type: 'SPIKE', x: 1120, y: 365, w: 30, h: 15 },
        { type: 'PORTAL', x: 2600, y: 300, w: 35, h: 80 }
    ];
}

// --- Rigid Body Physics Simulations Engine ---
function updatePhysicsSimulation() {
    if (aiMode) {
        executeAIAutopilotPipeline();
    }

    if (inputs.left)  player.vx = -PHYSICS.speed;
    if (inputs.right) player.vx = PHYSICS.speed;
    if (!inputs.left && !inputs.right) player.vx *= PHYSICS.friction;

    player.vy += PHYSICS.gravity;
    player.x += player.vx;
    
    player.grounded = false;
    processPlatformCollisions('HORIZONTAL');

    player.y += player.vy;
    processPlatformCollisions('VERTICAL');

    // Flood tracker triggers acceleration checks
    fluidLevel -= fluidRiseSpeed;
    if (player.y + player.h >= fluidLevel) {
        triggerSimulationEnd('CRASHED', 'Liquid submersion engine shutdown sequence executed.');
    }

    // Spawn falling meteors targets objects hazards
    projectileTimer++;
    if (projectileTimer > 70) {
        projectiles.push({ x: player.x + Math.random() * 500 - 200, y: -20, r: 7, vy: 4.5 });
        projectileTimer = 0;
    }

    for (let i = projectiles.length - 1; i >= 0; i--) {
        let p = projectiles[i];
        p.y += p.vy;

        if (p.x > player.x && p.x < player.x + player.w && p.y > player.y && p.y < player.y + player.h) {
            triggerSimulationEnd('CRASHED', 'Killed by dynamic projectile particle hit.');
        }
        if (p.y > V_HEIGHT) projectiles.splice(i, 1);
    }

    if (inputs.jump && player.grounded) {
        player.vy = PHYSICS.jumpForce;
        player.grounded = false;
    }

    cameraX = player.x - 200;
    if (cameraX < 0) cameraX = 0;

    interactiveMechanics.forEach(item => {
        if (player.x < item.x + item.w && player.x + player.w > item.x &&
            player.y < item.y + item.h && player.y + player.h > item.y) {
            
            if (item.type === 'COIN' && !item.gathered) {
                item.gathered = true;
                score += 100;
                scoreVal.innerText = score.toString();
            } else if (item.type === 'BOUNCE') {
                player.vy = PHYSICS.jumpForce * 1.40;
            } else if (item.type === 'SPIKE') {
                triggerSimulationEnd('CRASHED', 'Pierced by static level hazard matrix blocks.');
            } else if (item.type === 'PORTAL') {
                triggerSimulationEnd('CLEARED', 'Network data loops cleared successfully.');
            }
        }
    });
}

function processPlatformCollisions(axis) {
    mapPlatforms.forEach(plat => {
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

// --- Virtual Canvas Controller Engine & Touch Maps ---
// We calculate bounding regions relative to internal 800x450 scale metrics
const BTNS = {
    left:  { x: 30,  y: 380, w: 55, h: 55, icon: "←" },
    right: { x: 100, y: 380, w: 55, h: 55, icon: "→" },
    jump:  { x: 650, y: 380, w: 65, h: 55, icon: "JUMP" },
    ai:    { x: 320, y: 15,  w: 160, h: 30, icon: "TOGGLE AUTOPILOT AI" }
};

function drawVirtualCanvasUIButtons() {
    ctx.lineWidth = 2;
    ctx.font = "bold 12px monospace";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";

    Object.keys(BTNS).forEach(key => {
        let b = BTNS[key];
        
        // Dark translucent glassmorphism background styles
        ctx.fillStyle = (key === 'ai' && aiMode) ? "rgba(168, 85, 247, 0.4)" : "rgba(15, 23, 42, 0.8)";
        ctx.strokeStyle = (key === 'ai' && aiMode) ? "#c084fc" : "#475569";
        
        ctx.fillRect(b.x, b.y, b.w, b.h);
        ctx.strokeRect(b.x, b.y, b.w, b.h);
        
        ctx.fillStyle = (key === 'ai' && aiMode) ? "#e9d5ff" : "#94a3b8";
        ctx.fillText(b.icon, b.x + b.w/2, b.y + b.h/2);
    });
}

// Process direct, absolute touch vector calculations mapping screen pixels to baseline game bounds
function handleTouchGestureEvent(clientX, clientY, isStart) {
    const rect = canvas.getBoundingClientRect();
    
    // Convert click client coordinates accurately into internal target bounds space variables
    let canvasX = ((clientX - rect.left) / rect.width) * V_WIDTH;
    let canvasY = ((clientY - rect.top) / rect.height) * V_HEIGHT;

    if (!isStart) {
        // Clear input states on touch end lifecycles
        inputs.left = false; inputs.right = false; inputs.jump = false;
        return;
    }

    // Intercept hit boxes collision states on canvas elements coordinates layout maps
    if (canvasX >= BTNS.left.x && canvasX <= BTNS.left.x + BTNS.left.w && canvasY >= BTNS.left.y && canvasY <= BTNS.left.y + BTNS.left.h) {
        inputs.left = true;
    }
    if (canvasX >= BTNS.right.x && canvasX <= BTNS.right.x + BTNS.right.w && canvasY >= BTNS.right.y && canvasY <= BTNS.right.y + BTNS.right.h) {
        inputs.right = true;
    }
    if (canvasX >= BTNS.jump.x && canvasX <= BTNS.jump.x + BTNS.jump.w && canvasY >= BTNS.jump.y && canvasY <= BTNS.jump.y + BTNS.jump.h) {
        inputs.jump = true;
    }
    if (canvasX >= BTNS.ai.x && canvasX <= BTNS.ai.x + BTNS.ai.w && canvasY >= BTNS.ai.y && canvasY <= BTNS.ai.y + BTNS.ai.h) {
        aiMode = !aiMode;
        modeTxt.innerText = aiMode ? "AI AUTOPILOT" : "MANUAL";
        aiStatus.classList.toggle('text-purple-400');
        aiStatus.classList.toggle('border-purple-500');
    }
}

// Attach listeners straight to canvas mapping layers
canvas.addEventListener('touchstart', (e) => { e.preventDefault(); handleTouchGestureEvent(e.touches[0].clientX, e.touches[0].clientY, true); }, { passive: false });
canvas.addEventListener('touchend', (e) => { e.preventDefault(); handleTouchGestureEvent(null, null, false); }, { passive: false });
canvas.addEventListener('mousedown', (e) => { handleTouchGestureEvent(e.clientX, e.clientY, true); });
window.addEventListener('mouseup', () => { handleTouchGestureEvent(null, null, false); });

// --- Render Engine Module Pipeline ---
function renderFrameOutput() {
    const theme = THEMES[selectedThemeIdx];

    ctx.fillStyle = theme.bgBot;
    ctx.fillRect(0, 0, V_WIDTH, V_HEIGHT);

    ctx.save();
    ctx.translate(-cameraX, 0);

    ctx.fillStyle = theme.platform;
    mapPlatforms.forEach(plat => {
        ctx.fillRect(plat.x, plat.y, plat.w, plat.h);
        ctx.strokeStyle = theme.stroke;
        ctx.strokeRect(plat.x, plat.y, plat.w, plat.h);
    });

    interactiveMechanics.forEach(item => {
        if (item.type === 'COIN' && !item.gathered) {
            ctx.fillStyle = '#fbbf24';
            ctx.fillRect(item.x, item.y, item.w, item.h);
        } else if (item.type === 'BOUNCE') {
            ctx.fillStyle = '#a855f7';
            ctx.fillRect(item.x, item.y, item.w, item.h);
        } else if (item.type === 'SPIKE') {
            ctx.fillStyle = '#ef4444';
            ctx.fillRect(item.x, item.y, item.w, item.h);
        } else if (item.type === 'PORTAL') {
            ctx.fillStyle = 'rgba(236, 72, 153, 0.4)';
            ctx.fillRect(item.x, item.y, item.w, item.h);
        }
    });

    ctx.fillStyle = '#f97316';
    projectiles.forEach(p => {
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fill();
    });

    ctx.fillStyle = SKINS[selectedSkinIdx];
    ctx.fillRect(player.x, player.y, player.w, player.h);

    ctx.restore();

    ctx.fillStyle = theme.fluid;
    ctx.fillRect(0, fluidLevel, V_WIDTH, V_HEIGHT - fluidLevel);

    // Overlay Virtual Canvas interface layer buttons paths on top loop boundaries metrics configurations
    if (gameState === 'PLAYING') {
        drawVirtualCanvasUIButtons();
    }
}

// --- Life Cycle Lifecycle State Managers ---
function triggerSimulationEnd(status, msg) {
    if (aiMode) {
        // Run end tick to feed reward matrices parameters logs before halting execution threads
        executeAIAutopilotPipeline();
    }
    gameState = 'GAMEOVER';
    hud.classList.add('hidden');
    document.getElementById('final-score').innerText = score.toString();
    document.getElementById('end-desc').innerText = msg;
    gameoverOverlay.classList.remove('hidden');
}

function fullEngineParamReset() {
    player.x = 80; player.y = 200;
    player.vx = 0; player.vy = 0;
    score = 0; cameraX = 0;
    scoreVal.innerText = "0";
    buildStageArchitecture();
}

function loop() {
    if (gameState === 'PLAYING') {
        updatePhysicsSimulation();
        scoreVal.innerText = Math.floor(score).toString();
    }
    renderFrameOutput();
    requestAnimationFrame(loop);
}

// --- Menu Configuration Events Mapping ---
function configureSetupHooks() {
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

function syncCanvasDisplayResolution() {
    // Dynamic canvas resolution adjustment parameters scaling metrics tracking configurations maps
    canvas.width = V_WIDTH;
    canvas.height = V_HEIGHT;
}

document.getElementById('start-btn').addEventListener('click', () => {
    menuOverlay.classList.add('hidden');
    hud.classList.remove('hidden');
    fullEngineParamReset();
    gameState = 'PLAYING';
});

document.getElementById('restart-btn').addEventListener('click', () => {
    gameoverOverlay.classList.add('hidden');
    hud.classList.remove('hidden');
    fullEngineParamReset();
    gameState = 'PLAYING';
});

document.getElementById('hud-leave-btn').addEventListener('click', () => {
    gameState = 'MENU';
    hud.classList.add('hidden');
    menuOverlay.classList.remove('hidden');
});

document.getElementById('menu-back-btn').addEventListener('click', () => {
    gameoverOverlay.classList.add('hidden');
    menuOverlay.classList.remove('hidden');
});

window.addEventListener('resize', syncCanvasDisplayResolution);
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

configureSetupHooks();
syncCanvasDisplayResolution();
buildStageArchitecture();
requestAnimationFrame(loop);
