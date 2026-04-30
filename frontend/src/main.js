import './style.css';
import './app.css';

const chatPanel = document.getElementById('chat-panel');
const chatToggle = document.getElementById('chat-toggle');
const chatClose = document.getElementById('chat-close');
const app = document.getElementById('app');

chatToggle.classList.add('hidden');

chatClose.addEventListener('click', () => {
    chatPanel.classList.add('hidden');
    chatToggle.classList.remove('hidden');
});

chatToggle.addEventListener('click', () => {
    chatPanel.classList.remove('hidden');
    chatToggle.classList.add('hidden');
});

// Draggable dot grid
let isDragging = false;
let startX = 0;
let startY = 0;
let currentX = 0;
let currentY = 0;

app.addEventListener('mousedown', (e) => {
    // Don't drag if clicking on the chat panel or toggle button
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
