import './style.css';
import './app.css';

const chatPanel = document.getElementById('chat-panel');
const chatToggle = document.getElementById('chat-toggle');
const chatClose = document.getElementById('chat-close');
const chatMessages = document.querySelector('.chat-messages');
const chatInput = document.querySelector('.chat-input');
const chatSend = document.querySelector('.chat-send');
const app = document.getElementById('app');

chatToggle.classList.add('hidden');

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

waitForWails().then(() => {
    console.log('Wails bindings ready:', window.go);
    console.log('window.go.main:', window.go.main);
    console.log('window.go.main.App:', window.go.main.App);

    // Chat UI
    chatClose.addEventListener('click', () => {
        chatPanel.classList.add('hidden');
        chatToggle.classList.remove('hidden');
    });

    chatToggle.addEventListener('click', () => {
        chatPanel.classList.remove('hidden');
        chatToggle.classList.add('hidden');
        chatInput.focus();
    });

    chatSend.addEventListener('click', sendMessage);

    chatInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            sendMessage();
        }
    });

    // Draggable dot grid
    let isDragging = false;
    let startX = 0;
    let startY = 0;
    let currentX = 0;
    let currentY = 0;

    app.addEventListener('mousedown', (e) => {
        if (e.target.closest('.chat-panel') || e.target.closest('.chat-toggle')) {
            return;
        }
        isDragging = true;
        startX = e.clientX - currentX;
        startY = e.clientY - currentY;
        app.style.cursor = 'grabbing';
    });

    window.addEventListener('mousemove', (e) => {
        if (!isDragging) return;
        currentX = e.clientX - startX;
        currentY = e.clientY - startY;
        app.style.backgroundPosition = `${currentX}px ${currentY}px`;
    });

    window.addEventListener('mouseup', () => {
        if (!isDragging) return;
        isDragging = false;
        app.style.cursor = 'grab';
    });
});

// Send message handler
async function sendMessage() {
    console.log('sendMessage called');
    const message = chatInput.value.trim();
    if (!message) return;

    console.log('sending message:', message);
    console.log('window.go:', window.go);
    console.log('window.go.main:', window.go?.main);
    console.log('window.go.main.App:', window.go?.main?.App);

    chatInput.value = '';
    appendMessage(message, 'user');

    const loadingBubble = appendMessage('...', 'assistant', true);

    try {
        const response = await window.go.main.App.Chat(message);

        if (loadingBubble) loadingBubble.remove();
        appendMessage(response, 'assistant');
    } catch (err) {
        console.error('Chat error:', err);
        if (loadingBubble) loadingBubble.remove();
        appendMessage(`Error: ${err.message || err}`, 'assistant');
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
        bubble.style.backgroundColor = '#2a2a2a';
        bubble.style.borderColor = '#3a3a3a';
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
        return `<pre style="background:#111;padding:8px;border-radius:6px;overflow-x:auto;margin:4px 0;font-size:12px;border:1px solid #2a2a2a"><code>${code.trim()}</code></pre>`;
    });

    escaped = escaped.replace(/`([^`]+)`/g, '<code style="background:#1a1a1a;padding:2px 4px;border-radius:3px;font-size:12px;border:1px solid #2a2a2a">$1</code>');

    escaped = escaped.replace(/\n/g, '<br>');

    return escaped;
}
