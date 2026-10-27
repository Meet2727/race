/* ==========================================================================
   MV — Interactive AI System Controller (script.js)
   Handles Avatar Interaction, Voice Synthesis, Speech Recognition, & AI Chat
   ========================================================================== */

const state = {
  currentAvatar: 'assets/mv-avatar-1.jpg',
  currentMode: 'Royal Gold',
  voiceEnabled: true,
  isSpeaking: false,
  userName: localStorage.getItem('mv_user_name') || 'Boss',
  geminiApiKey: localStorage.getItem('mv_gemini_api_key') || '',
  history: []
};

// DOM Elements
const chatMessages = document.getElementById('chatMessages');
const chatForm = document.getElementById('chatForm');
const userInput = document.getElementById('userInput');
const mvAvatarImg = document.getElementById('mvAvatarImg');
const avatarFrame = document.getElementById('avatarFrame');
const auraRing = document.getElementById('auraRing');
const voiceBars = document.getElementById('voiceBars');
const moodBadge = document.getElementById('moodBadge');
const statusDot = document.getElementById('statusDot');
const statusText = document.getElementById('statusText');
const voiceToggleBtn = document.getElementById('voiceToggleBtn');
const voiceIcon = document.getElementById('voiceIcon');
const clearChatBtn = document.getElementById('clearChatBtn');
const micBtn = document.getElementById('micBtn');
const quickChips = document.getElementById('quickChips');
const personaBtns = document.querySelectorAll('.persona-btn');

// Settings Modal Elements
const settingsBtn = document.getElementById('settingsBtn');
const settingsModal = document.getElementById('settingsModal');
const closeSettingsBtn = document.getElementById('closeSettingsBtn');
const saveSettingsBtn = document.getElementById('saveSettingsBtn');
const resetSettingsBtn = document.getElementById('resetSettingsBtn');
const apiKeyInput = document.getElementById('apiKeyInput');
const userNameInput = document.getElementById('userNameInput');

// Initialize App
function initMV() {
  apiKeyInput.value = state.geminiApiKey;
  userNameInput.value = state.userName;

  const welcomeText = `Namaste ${state.userName}! Main **MV** hoon — aapki personal interactive AI companion. Aap mujhse chat kar sakte hain, mic button daba kar bol sakte hain, ya meri photo par click karke interact kar sakte hain. Bataiye aaj hum kis project par kaam karein?`;
  appendMessage('mv', welcomeText);
}

// Format simple markdown bold & line breaks
function formatText(text) {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
    .replace(/\n/g, '<br>');
}

// Append Message to Chat
function appendMessage(sender, text) {
  const row = document.createElement('div');
  row.className = `msg-row ${sender}`;

  const timeStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

  if (sender === 'mv') {
    row.innerHTML = `
      <img src="${state.currentAvatar}" alt="MV" class="msg-avatar" />
      <div class="msg-bubble">
        <div>${formatText(text)}</div>
        <span class="msg-meta">MV (${state.currentMode}) &bull; ${timeStr}</span>
      </div>
    `;
  } else {
    row.innerHTML = `
      <div class="msg-bubble">
        <div>${formatText(text)}</div>
        <span class="msg-meta">${state.userName} &bull; ${timeStr}</span>
      </div>
    `;
  }

  chatMessages.appendChild(row);
  chatMessages.scrollTop = chatMessages.scrollHeight;
}

// Set Speaking / Visual Animation State
function setSpeakingState(active, customStatus = null) {
  state.isSpeaking = active;
  if (active) {
    avatarFrame.classList.add('speaking');
    auraRing.classList.add('active');
    voiceBars.classList.add('active');
    statusDot.classList.add('speaking');
    statusText.textContent = customStatus || 'MV is speaking...';
  } else {
    avatarFrame.classList.remove('speaking');
    auraRing.classList.remove('active');
    voiceBars.classList.remove('active');
    statusDot.classList.remove('speaking');
    statusText.textContent = 'Online • Ready to interact';
  }
}

// Text-to-Speech (TTS) for MV
function speakText(rawText) {
  if (!state.voiceEnabled || !('speechSynthesis' in window)) {
    // Simulate visual speaking pulse briefly even if muted
    setSpeakingState(true, 'MV responded');
    setTimeout(() => setSpeakingState(false), 1400);
    return;
  }

  window.speechSynthesis.cancel();
  const cleanText = rawText.replace(/\*\*/g, '').replace(/[#_`]/g, '');
  const utterance = new SpeechSynthesisUtterance(cleanText);

  const voices = window.speechSynthesis.getVoices();
  const femaleVoice = voices.find(v =>
    /female|zira|google hindi|samantha|victoria|veena|lekha/i.test(v.name)
  ) || voices.find(v => v.lang.includes('hi') || v.lang.includes('en'));

  if (femaleVoice) utterance.voice = femaleVoice;
  utterance.pitch = 1.08;
  utterance.rate = 1.02;

  utterance.onstart = () => setSpeakingState(true, 'MV is speaking...');
  utterance.onend = () => setSpeakingState(false);
  utterance.onerror = () => setSpeakingState(false);

  window.speechSynthesis.speak(utterance);
}

// Switch Avatar Persona
function switchAvatar(avatarPath, modeName, themeName) {
  state.currentAvatar = avatarPath;
  state.currentMode = modeName;
  mvAvatarImg.src = avatarPath;
  moodBadge.textContent = `Mode: ${modeName}`;

  if (themeName === 'emerald') {
    document.body.classList.add('theme-emerald');
  } else {
    document.body.classList.remove('theme-emerald');
  }

  personaBtns.forEach(btn => {
    btn.classList.toggle('active', btn.dataset.avatar === avatarPath);
  });
}

personaBtns.forEach(btn => {
  btn.addEventListener('click', () => {
    const { avatar, mode, theme } = btn.dataset;
    switchAvatar(avatar, mode, theme);
    const msg = `Maine apna **${mode}** avatar activate kar liya hai, ${state.userName}! Kaisa lag raha hai ye look?`;
    appendMessage('mv', msg);
    speakText(msg);
  });
});

// Click on Avatar Photo Interaction
avatarFrame.addEventListener('click', () => {
  const reactions = [
    `Haan ${state.userName}, main yahi hoon! Bataiye kya hukum hai?`,
    `Aapne mujhe tap kiya! Mera **${state.currentMode}** mode abhi active hai.`,
    `Main aapki har command ke liye ready hoon, ${state.userName}. Kuch puchna chahte hain?`
  ];
  const pick = reactions[Math.floor(Math.random() * reactions.length)];
  appendMessage('mv', pick);
  speakText(pick);
});

// Built-in Smart Response Generator (Offline / Instant Fallback)
function generateLocalMVResponse(input) {
  const q = input.toLowerCase().trim();

  if (q.includes('switch avatar') || q.includes('look change') || q.includes('change avatar')) {
    const nextIsSecond = state.currentAvatar.includes('mv-avatar-1');
    if (nextIsSecond) {
      switchAvatar('assets/mv-avatar-2.jpg', 'Shadow Tactician', 'emerald');
    } else {
      switchAvatar('assets/mv-avatar-1.jpg', 'Royal Gold', 'gold');
    }
    return `Done ${state.userName}! Maine apna look **${state.currentMode}** par switch kar liya hai.`;
  }

  if (q.includes('intro') || q.includes('kaun ho') || q.includes('who are you') || q.includes('name')) {
    return `Mera naam **MV** hai! Main aapka custom-built interactive AI system hoon. Mere paas 2 visual avatars (**Royal Gold** aur **Shadow Tactician**), voice synthesis, speech recognition, aur smart chat capabilities hain.`;
  }

  if (q.includes('kya kya kar') || q.includes('capabilities') || q.includes('help')) {
    return `Main aapke liye ye sab kar sakti hoon, ${state.userName}:\n1. **Interactive Chat & Advice**: Coding, ideas, aur daily planning.\n2. **Voice Interaction**: Mic daba kar mujhse seedha baat karein.\n3. **Dual Avatar Mode**: Royal Gold aur Shadow Tactician looks ke beech switch karein.\n4. **Git-Ready Architecture**: Aap mujhe seedha GitHub Pages par host kar sakte hain!`;
  }

  if (q.includes('productive') || q.includes('tips')) {
    return `Aaj ka din super productive banane ke 3 solid rules:\n1. **Top 3 Priorities**: Subah sabse pehle 3 sabse zaroori tasks likhein.\n2. **Deep Work Block**: 45 minutes bina phone dekhe single task par focus karein.\n3. **Quick Review**: Raat ko apne code/kaam ko Git par commit karein!`;
  }

  if (q.includes('motivat') || q.includes('quote')) {
    return `**"Code ek baar likha jata hai, par uska impact hazaron logon tak jata hai."** — ${state.userName}, aap jo build kar rahe hain uspar bharosa rakhein, main hamesha aapke saath hoon!`;
  }

  if (q.includes('git') || q.includes('github') || q.includes('push')) {
    return `Mujhe GitHub par push karna bahut aasan hai:\n1. Folder mein \`git init\` karein.\n2. \`git add .\` aur \`git commit -m "Initial MV AI commit"\` chalayein.\n3. Apni GitHub repository link karke \`git push -u origin main\` kar dein!`;
  }

  if (q.includes('hello') || q.includes('hi') || q.includes('namaste') || q.includes('hey')) {
    return `Hello ${state.userName}! Aapse baat karke hamesha accha lagta hai. Bataiye aaj kya plan hai?`;
  }

  if (q.includes('time') || q.includes('samay')) {
    return `Abhi samay ho raha hai **${new Date().toLocaleTimeString()}**, ${state.userName}.`;
  }

  return `Samajh gayi ${state.userName}! Aapne kaha: **"${input}"**. Main **MV (${state.currentMode})** mode mein aapki madad ke liye taiyar hoon. Agar aap chahein toh upar ⚙️ Settings mein apni Gemini API key daal kar mujhe live LLM se bhi connect kar sakte hain!`;
}

// Optional Live Gemini API Call
async function fetchGeminiResponse(promptText) {
  const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${state.geminiApiKey}`;
  const systemPrompt = `You are MV, a friendly, smart, and stylish female AI companion created by ${state.userName}. Your current visual persona is ${state.currentMode}. Reply naturally in concise Hinglish or the language used by the user.`;

  const response = await fetch(endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [
        { role: 'user', parts: [{ text: `${systemPrompt}\n\nUser: ${promptText}` }] }
      ]
    })
  });

  if (!response.ok) throw new Error('API request failed');
  const data = await response.json();
  return data?.candidates?.[0]?.content?.parts?.[0]?.text || generateLocalMVResponse(promptText);
}

// Handle User Message Submission
async function handleUserMessage(text) {
  if (!text.trim()) return;
  appendMessage('user', text);
  userInput.value = '';

  setSpeakingState(true, 'MV is thinking...');

  let reply = '';
  if (state.geminiApiKey) {
    try {
      reply = await fetchGeminiResponse(text);
    } catch (err) {
      reply = generateLocalMVResponse(text);
    }
  } else {
    await new Promise(r => setTimeout(r, 450));
    reply = generateLocalMVResponse(text);
  }

  appendMessage('mv', reply);
  speakText(reply);
}

chatForm.addEventListener('submit', e => {
  e.preventDefault();
  handleUserMessage(userInput.value);
});

// Quick Chips Click
quickChips.addEventListener('click', e => {
  const chip = e.target.closest('.chip');
  if (!chip) return;
  handleUserMessage(chip.dataset.prompt);
});

// Toggle Voice Output
voiceToggleBtn.addEventListener('click', () => {
  state.voiceEnabled = !state.voiceEnabled;
  voiceIcon.textContent = state.voiceEnabled ? '🔊' : '🔇';
  if (!state.voiceEnabled && 'speechSynthesis' in window) {
    window.speechSynthesis.cancel();
    setSpeakingState(false);
  }
});

// Clear Chat
clearChatBtn.addEventListener('click', () => {
  chatMessages.innerHTML = '';
  const msg = `Chat history clear kar di gayi hai, ${state.userName}. Nayi shuruwat karte hain!`;
  appendMessage('mv', msg);
});

// Speech Recognition (Mic Button)
const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
if (SpeechRecognition) {
  const recognition = new SpeechRecognition();
  recognition.lang = 'hi-IN';
  recognition.interimResults = false;

  micBtn.addEventListener('click', () => {
    try {
      recognition.start();
      micBtn.classList.add('listening');
      statusText.textContent = 'Listening to you...';
    } catch (e) {
      recognition.stop();
    }
  });

  recognition.onresult = event => {
    const transcript = event.results[0][0].transcript;
    micBtn.classList.remove('listening');
    handleUserMessage(transcript);
  };

  recognition.onerror = () => {
    micBtn.classList.remove('listening');
    statusText.textContent = 'Online • Ready to interact';
  };

  recognition.onend = () => {
    micBtn.classList.remove('listening');
  };
} else {
  micBtn.addEventListener('click', () => {
    alert('Aapke browser mein Web Speech API supported nahi hai. Chrome ya Edge try karein.');
  });
}

// Settings Modal Logic
settingsBtn.addEventListener('click', () => settingsModal.classList.remove('hidden'));
closeSettingsBtn.addEventListener('click', () => settingsModal.classList.add('hidden'));

saveSettingsBtn.addEventListener('click', () => {
  state.geminiApiKey = apiKeyInput.value.trim();
  state.userName = userNameInput.value.trim() || 'Boss';
  localStorage.setItem('mv_gemini_api_key', state.geminiApiKey);
  localStorage.setItem('mv_user_name', state.userName);
  settingsModal.classList.add('hidden');
  appendMessage('mv', `Settings update ho gayi hain, **${state.userName}**!`);
});

resetSettingsBtn.addEventListener('click', () => {
  apiKeyInput.value = '';
  userNameInput.value = 'Boss';
  localStorage.removeItem('mv_gemini_api_key');
  localStorage.removeItem('mv_user_name');
  state.geminiApiKey = '';
  state.userName = 'Boss';
});

// Load voices and start
if ('speechSynthesis' in window) {
  window.speechSynthesis.onvoiceschanged = () => window.speechSynthesis.getVoices();
}
window.addEventListener('DOMContentLoaded', initMV);
