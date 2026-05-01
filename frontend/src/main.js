import './style.css';
import './app.css';
import './canvas.css';
import { CanvasNode, enableDragging } from './canvas-node.js';

const chatPanel = document.getElementById('chat-panel');
const chatToggle = document.getElementById('chat-toggle');
const chatClose = document.getElementById('chat-close');
const chatTitle = document.querySelector('.chat-title');
const chatMessages = document.querySelector('.chat-messages');
const chatInput = document.querySelector('.chat-input');
const chatSend = document.querySelector('.chat-send');
const app = document.getElementById('app');

// --- C4 Level Toggles ---
const c4Toggles = document.querySelectorAll('.c4-toggle');
const c4Canvases = document.querySelectorAll('.c4-canvas');

let activeLevel = 'system-landscape';

// Per-canvas pan state so each C4 level remembers its own scroll position
let panOffsetX = 0;
let panOffsetY = 0;

const panState = {
    'system-landscape': { offsetX: 0, offsetY: 0 },
    'system':           { offsetX: 0, offsetY: 0 },
    'container':        { offsetX: 0, offsetY: 0 },
    'component':        { offsetX: 0, offsetY: 0 },
};

function applyPan() {
    app.style.backgroundPosition = `${panOffsetX}px ${panOffsetY}px`;
    const activeCanvas = document.querySelector('.c4-canvas.active');
    if (activeCanvas) {
        activeCanvas.style.transform = `translate(${panOffsetX}px, ${panOffsetY}px)`;
    }
}

function switchC4Level(level) {
    // Save current canvas pan state
    const current = panState[activeLevel];
    if (current) {
        current.offsetX = panOffsetX;
        current.offsetY = panOffsetY;
    }

    activeLevel = level;

    // Restore new canvas pan state
    const next = panState[level];
    if (next) {
        panOffsetX = next.offsetX;
        panOffsetY = next.offsetY;
    }

    // Update toggle buttons
    c4Toggles.forEach(btn => {
        btn.classList.toggle('active', btn.dataset.level === level);
    });

    // Switch active canvas
    c4Canvases.forEach(canvas => {
        const isActive = canvas.id === `canvas-${level}`;
        canvas.classList.toggle('active', isActive);
        // Always keep each canvas at its own saved pan offset so nodes don't jump
        const state = panState[canvas.id.replace('canvas-', '')];
        if (state) {
            canvas.style.transform = `translate(${state.offsetX}px, ${state.offsetY}px)`;
        }
    });

    // Apply pan for the now-active canvas
    applyPan();
}

c4Toggles.forEach(btn => {
    btn.addEventListener('click', () => {
        switchC4Level(btn.dataset.level);
    });
});

// --- Chat UI: attach immediately, don't wait for Wails ---
chatPanel.addEventListener('pointerenter', () => {
    chatInput.focus();
});

chatClose.addEventListener('click', () => {
    chatPanel.classList.add('hidden');
    chatToggle.classList.remove('hidden');
});

chatToggle.addEventListener('click', () => {
    chatPanel.classList.remove('hidden');
    chatToggle.classList.add('hidden');
    chatInput.focus();
});

// Wails v2.12.0 injects bindings on window.go after page load
// Wait for window.go to be ready, then wire up event listeners
function waitForWails() {
    return new Promise((resolve) => {
        if (window.go && window.go.main && window.go.main.App) {
            resolve();
            return;
        }
        const check = setInterval(() => {
            if (window.go && window.go.main && window.go.main.App) {
                clearInterval(check);
                resolve();
            }
        }, 50);
        // Safety timeout after 10s
        setTimeout(() => { clearInterval(check); resolve(); }, 10000);
    });
}

// --- Seed each C4 canvas with sample content ---
function seedCanvases() {
    // System Landscape canvas
    const landscapeCanvas = document.getElementById('canvas-system-landscape');
    const landscapeNode1 = new CanvasNode({
        id: 'landscape-1',
        x: 200,
        y: 140,
        title: 'RobotLegs App',
        dotColor: 'green',
        inputs: [],
        outputs: [],
        bodyHTML: `
            <div class="node-field">
                <div class="node-field-label">type</div>
                <div class="node-field-value">Software System</div>
            </div>
            <div class="node-field">
                <div class="node-field-label">description</div>
                <div class="node-field-value">C4 diagram editor</div>
            </div>
        `,
    });
    landscapeCanvas.appendChild(landscapeNode1.render());

    const landscapeNode2 = new CanvasNode({
        id: 'landscape-2',
        x: 560,
        y: 140,
        title: 'GitHub',
        dotColor: 'white',
        inputs: [],
        outputs: [],
        bodyHTML: `
            <div class="node-field">
                <div class="node-field-label">type</div>
                <div class="node-field-value">Software System</div>
            </div>
            <div class="node-field">
                <div class="node-field-label">description</div>
                <div class="node-field-value">Version control & CI</div>
            </div>
        `,
    });
    landscapeCanvas.appendChild(landscapeNode2.render());

    // System canvas
    const systemCanvas = document.getElementById('canvas-system');
    const systemNode1 = new CanvasNode({
        id: 'system-1',
        x: 160,
        y: 140,
        title: 'User Browser',
        dotColor: 'blue',
        inputs: [],
        outputs: [{ name: 'HTTP', color: 'green' }],
        bodyHTML: `
            <div class="node-field">
                <div class="node-field-label">type</div>
                <div class="node-field-value">Person</div>
            </div>
        `,
    });
    systemCanvas.appendChild(systemNode1.render());

    const systemNode2 = new CanvasNode({
        id: 'system-2',
        x: 520,
        y: 140,
        title: 'RobotLegs',
        dotColor: 'green',
        inputs: [{ name: 'HTTP', color: 'green' }],
        outputs: [{ name: 'REST API', color: 'blue' }],
        bodyHTML: `
            <div class="node-field">
                <div class="node-field-label">type</div>
                <div class="node-field-value">Software System</div>
            </div>
            <div class="node-field">
                <div class="node-field-label">tech</div>
                <div class="node-field-value">Go / Wails / JS</div>
            </div>
        `,
    });
    systemCanvas.appendChild(systemNode2.render());

    // Container canvas
    const containerCanvas = document.getElementById('canvas-container');
    const containerNode1 = new CanvasNode({
        id: 'container-1',
        x: 120,
        y: 140,
        title: 'Desktop App',
        dotColor: 'yellow',
        inputs: [],
        outputs: [{ name: 'HTTP', color: 'green' }],
        bodyHTML: `
            <div class="node-field">
                <div class="node-field-label">type</div>
                <div class="node-field-value">Wails Desktop</div>
            </div>
            <div class="node-field">
                <div class="node-field-label">tech</div>
                <div class="node-field-value">Go 1.22</div>
            </div>
        `,
    });
    containerCanvas.appendChild(containerNode1.render());

    const containerNode2 = new CanvasNode({
        id: 'container-2',
        x: 460,
        y: 140,
        title: 'Frontend UI',
        dotColor: 'blue',
        inputs: [{ name: 'HTTP', color: 'green' }],
        outputs: [],
        bodyHTML: `
            <div class="node-field">
                <div class="node-field-label">type</div>
                <div class="node-field-value">Web View</div>
            </div>
            <div class="node-field">
                <div class="node-field-label">tech</div>
                <div class="node-field-value">Vanilla JS / CSS</div>
            </div>
        `,
    });
    containerCanvas.appendChild(containerNode2.render());

    // Component canvas
    const componentCanvas = document.getElementById('canvas-component');
    const componentNode1 = new CanvasNode({
        id: 'component-1',
        x: 100,
        y: 140,
        title: 'Canvas Renderer',
        dotColor: 'green',
        inputs: [{ name: 'model', color: 'yellow' }],
        outputs: [{ name: 'render', color: 'blue' }],
        bodyHTML: `
            <div class="node-field">
                <div class="node-field-label">type</div>
                <div class="node-field-value">Component</div>
            </div>
            <div class="node-field">
                <div class="node-field-label">tech</div>
                <div class="node-field-value">JavaScript</div>
            </div>
        `,
    });
    componentCanvas.appendChild(componentNode1.render());

    const componentNode2 = new CanvasNode({
        id: 'component-2',
        x: 420,
        y: 140,
        title: 'Chat Service',
        dotColor: 'purple',
        inputs: [{ name: 'prompt', color: 'yellow' }],
        outputs: [{ name: 'response', color: 'green' }],
        bodyHTML: `
            <div class="node-field">
                <div class="node-field-label">type</div>
                <div class="node-field-value">Component</div>
            </div>
            <div class="node-field">
                <div class="node-field-label">tech</div>
                <div class="node-field-value">Go / Claude API</div>
            </div>
        `,
    });
    componentCanvas.appendChild(componentNode2.render());

    const componentNode3 = new CanvasNode({
        id: 'component-3',
        x: 260,
        y: 340,
        title: 'Version Store',
        dotColor: 'white',
        inputs: [{ name: 'save', color: 'blue' }],
        outputs: [{ name: 'load', color: 'green' }],
        bodyHTML: `
            <div class="node-field">
                <div class="node-field-label">type</div>
                <div class="node-field-value">Component</div>
            </div>
            <div class="node-field">
                <div class="node-field-label">tech</div>
                <div class="node-field-value">SQLite</div>
            </div>
        `,
    });
    componentCanvas.appendChild(componentNode3.render());
}

waitForWails().then(() => {
    // Seed canvases
    seedCanvases();

    // Enable dragging on each canvas
    c4Canvases.forEach(canvas => {
        enableDragging(canvas, () => ({ x: panOffsetX, y: panOffsetY }));
    });

    // --- Pan: dot grid + active canvas nodes move together ---
    let isPanning = false;
    let panStartX = 0;
    let panStartY = 0;

    app.addEventListener('mousedown', (e) => {
        if (e.target.closest('.chat-panel') || e.target.closest('.chat-toggle') || e.target.closest('.canvas-node') || e.target.closest('.c4-toggles') || e.target.closest('.top-bar')) {
            return;
        }
        isPanning = true;
        panStartX = e.clientX;
        panStartY = e.clientY;
        app.style.cursor = 'grabbing';
    });

    window.addEventListener('mousemove', (e) => {
        if (!isPanning) return;
        const dx = e.clientX - panStartX;
        const dy = e.clientY - panStartY;
        panOffsetX += dx;
        panOffsetY += dy;
        panStartX = e.clientX;
        panStartY = e.clientY;

        applyPan();
    });

    window.addEventListener('mouseup', () => {
        if (!isPanning) return;
        isPanning = false;
        app.style.cursor = 'grab';
    });

    chatSend.addEventListener('click', sendMessage);

    chatInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            sendMessage();
        }
    });
});

// Send message handler
async function sendMessage() {
    const message = chatInput.value.trim();
    if (!message) return;

    // Hide idle message on first user message
    const idleMsg = document.querySelector('.idle-message');
    if (idleMsg) idleMsg.classList.add('hidden');

    chatInput.value = '';
    appendMessage(message, 'user');

    const loadingBubble = appendMessage('...', 'assistant', true);
    chatTitle.classList.add('active');

    try {
        const response = await window.go.main.App.Chat(message);

        if (loadingBubble) loadingBubble.remove();
        appendMessage(response, 'assistant');
    } catch (err) {
        console.error('Chat error:', err);
        if (loadingBubble) loadingBubble.remove();
        appendMessage(`Error: ${err.message || err}`, 'assistant');
    } finally {
        chatTitle.classList.remove('active');
    }
}

// Append a message bubble to the chat
function appendMessage(text, sender, isLoading = false) {
    const msgDiv = document.createElement('div');
    msgDiv.className = 'chat-message';
    if (sender === 'user') {
        msgDiv.style.justifyContent = 'flex-end';
    }

    const bubble = document.createElement('div');
    bubble.className = 'chat-bubble';
    if (sender === 'user') {
        bubble.style.background = 'linear-gradient(135deg, #2a2a2a 0%, #222 100%)';
        bubble.style.boxShadow = '0 2px 8px rgba(0, 0, 0, 0.3), inset 0 1px 0 rgba(255, 255, 255, 0.04)';
    }
    if (isLoading) {
        bubble.style.opacity = '0.6';
        bubble.style.fontStyle = 'italic';
    }

    bubble.innerHTML = formatMessage(text);
    msgDiv.appendChild(bubble);
    chatMessages.appendChild(msgDiv);
    chatMessages.scrollTop = chatMessages.scrollHeight;

    return msgDiv;
}

// Format message text for display
function formatMessage(text) {
    let escaped = text
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;');

    escaped = escaped.replace(/```(\w*)\n?([\s\S]*?)```/g, (match, lang, code) => {
        return `<pre style="background:#111;padding:8px;border-radius:6px;overflow-x:auto;margin:4px 0;font-size:12px;box-shadow:inset 0 1px 3px rgba(0,0,0,0.3)"><code>${code.trim()}</code></pre>`;
    });

    escaped = escaped.replace(/`([^`]+)`/g, '<code style="background:#1a1a1a;padding:2px 4px;border-radius:3px;font-size:12px;box-shadow:inset 0 1px 2px rgba(0,0,0,0.3)">$1</code>');

    escaped = escaped.replace(/\n/g, '<br>');

    return escaped;
}
