/**
 * CanvasNode — creates a draggable node element on the canvas.
 *
 * Each node has:
 *  - a header (draggable handle)
 *  - a body (arbitrary content)
 *  - input ports on the left edge, output ports on the right edge
 */

export class CanvasNode {
    constructor(config) {
        this.id = config.id || `node-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
        this.x = config.x ?? 100;
        this.y = config.y ?? 100;
        this.title = config.title || 'Node';
        this.dotColor = config.dotColor || 'white';
        this.inputs = config.inputs || [];
        this.outputs = config.outputs || [];
        this.bodyHTML = config.bodyHTML || '';
        this.element = null;
    }

    /**
     * Build the DOM element and return it.
     */
    render() {
        const el = document.createElement('div');
        el.className = 'canvas-node';
        el.dataset.nodeId = this.id;
        el.style.left = `${this.x}px`;
        el.style.top = `${this.y}px`;

        // --- Header ---
        const header = document.createElement('div');
        header.className = 'node-header';
        header.innerHTML = `
            <span class="node-dot dot-${this.dotColor}"></span>
            <span class="node-title">${this.title}</span>
        `;
        el.appendChild(header);

        // --- Ports section (two-column, in document flow) ---
        if (this.inputs.length || this.outputs.length) {
            const portsSection = document.createElement('div');
            portsSection.className = 'ports-section';

            const leftCol = document.createElement('div');
            leftCol.className = 'ports-col ports-col-left';
            this.inputs.forEach((port) => {
                leftCol.appendChild(this._buildPort(port, 'left'));
            });
            portsSection.appendChild(leftCol);

            const rightCol = document.createElement('div');
            rightCol.className = 'ports-col ports-col-right';
            this.outputs.forEach((port) => {
                rightCol.appendChild(this._buildPort(port, 'right'));
            });
            portsSection.appendChild(rightCol);

            el.appendChild(portsSection);
        }

        // --- Body (custom fields) ---
        if (this.bodyHTML) {
            const body = document.createElement('div');
            body.className = 'node-body';
            body.innerHTML = this.bodyHTML;
            el.appendChild(body);
        }

        this.element = el;
        return el;
    }

    _buildPort(port, side) {
        const row = document.createElement('div');
        row.className = `node-port port-${side}`;

        const dot = document.createElement('span');
        dot.className = `node-port-dot port-${port.color || 'white'}`;
        dot.dataset.portName = port.name;

        const label = document.createElement('span');
        label.className = 'node-port-label';
        label.textContent = port.name;

        row.appendChild(dot);
        row.appendChild(label);

        return row;
    }
}

/**
 * Enable dragging on all .canvas-node elements inside a container.
 * @param {HTMLElement} container - The canvas element
 * @param {Function} getPanOffset - Callback that returns {x, y} pan offset for this canvas
 * Returns a cleanup function.
 */
export function enableDragging(container, getPanOffset) {
    let activeNode = null;
    let offsetX = 0;
    let offsetY = 0;

    function onPointerDown(e) {
        const node = e.target.closest('.canvas-node');
        if (!node || e.target.closest('.node-port-dot')) return;

        activeNode = node;
        const currentX = parseFloat(activeNode.style.left) || 0;
        const currentY = parseFloat(activeNode.style.top) || 0;
        // Convert mouse position to canvas local coordinates
        const pan = getPanOffset();
        const localMouseX = e.clientX - pan.x;
        const localMouseY = e.clientY - pan.y;
        offsetX = localMouseX - currentX;
        offsetY = localMouseY - currentY;

        activeNode.classList.add('selected');
        activeNode.style.zIndex = 10;
        e.preventDefault();
    }

    function onPointerMove(e) {
        if (!activeNode) return;
        // Convert mouse position to canvas local coordinates
        const pan = getPanOffset();
        const localMouseX = e.clientX - pan.x;
        const localMouseY = e.clientY - pan.y;

        let newX = localMouseX - offsetX;
        let newY = localMouseY - offsetY;

        activeNode.style.left = `${newX}px`;
        activeNode.style.top = `${newY}px`;

        // Redraw connections for this canvas
        const canvasId = container.id.replace('canvas-', '');
        if (diagramStates[canvasId]) {
            drawConnections(container, diagramStates[canvasId]);
        }
    }

    function onPointerUp() {
        if (!activeNode) return;
        // Snap to grid on release (28px matches background-size)
        let newX = parseFloat(activeNode.style.left) || 0;
        let newY = parseFloat(activeNode.style.top) || 0;
        newX = Math.round(newX / 28) * 28;
        newY = Math.round(newY / 28) * 28;
        activeNode.style.left = `${newX}px`;
        activeNode.style.top = `${newY}px`;

        activeNode.classList.remove('selected');
        activeNode.style.zIndex = '';
        activeNode = null;

        // Redraw connections after snap
        const canvasId = container.id.replace('canvas-', '');
        if (diagramStates[canvasId]) {
            drawConnections(container, diagramStates[canvasId]);
        }
    }

    container.addEventListener('pointerdown', onPointerDown);
    window.addEventListener('pointermove', onPointerMove);
    window.addEventListener('pointerup', onPointerUp);

    return () => {
        container.removeEventListener('pointerdown', onPointerDown);
        window.removeEventListener('pointermove', onPointerMove);
        window.removeEventListener('pointerup', onPointerUp);
    };
}

// Store diagram state per canvas for connection redraw
const diagramStates = {};

/**
 * Draw SVG connection lines between nodes on a canvas.
 * @param {HTMLElement} canvas - The canvas element
 * @param {Object} state - { nodes: [{id, element}], connections: [{id, fromNode, toNode, fromPort, toPort, label, color}] }
 */
export function drawConnections(canvas, state) {
    if (!canvas || !state) return;

    // Store state for redraw on drag
    const canvasId = canvas.id.replace('canvas-', '');
    diagramStates[canvasId] = state;

    // Remove existing SVG
    const existingSvg = canvas.querySelector('svg.connections-svg');
    if (existingSvg) existingSvg.remove();

    // Create SVG overlay
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.classList.add('connections-svg');
    svg.setAttribute('width', '100%');
    svg.setAttribute('height', '100%');
    svg.setAttribute('viewBox', '0 0 2000 2000');
    svg.style.position = 'absolute';
    svg.style.top = '0';
    svg.style.left = '0';
    svg.style.pointerEvents = 'none';
    svg.style.zIndex = '0';

    // Add defs for arrow markers and gradients
    const defs = document.createElementNS('http://www.w3.org/2000/svg', 'defs');

    // Arrow marker
    const marker = document.createElementNS('http://www.w3.org/2000/svg', 'marker');
    marker.setAttribute('id', 'arrowhead');
    marker.setAttribute('viewBox', '0 0 10 7');
    marker.setAttribute('refX', '9');
    marker.setAttribute('refY', '3.5');
    marker.setAttribute('markerWidth', '8');
    marker.setAttribute('markerHeight', '6');
    marker.setAttribute('orient', 'auto');
    const arrowPath = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    arrowPath.setAttribute('d', 'M 0 0 L 10 3.5 L 0 7 Z');
    arrowPath.setAttribute('fill', '#555');
    marker.appendChild(arrowPath);
    defs.appendChild(marker);

    svg.appendChild(defs);

    // Draw each connection
    if (state.connections) {
        state.connections.forEach(conn => {
            const fromEl = findNodeElement(canvas, conn.fromNode);
            const toEl = findNodeElement(canvas, conn.toNode);

            if (!fromEl || !toEl) return;

            const fromRect = fromEl.getBoundingClientRect();
            const toRect = toEl.getBoundingClientRect();
            const canvasRect = canvas.getBoundingClientRect();

            // Calculate port positions
            const fromX = fromRect.right - canvasRect.left;
            const fromY = fromRect.top + fromRect.height / 2 - canvasRect.top;
            const toX = toRect.left - canvasRect.left;
            const toY = toRect.top + toRect.height / 2 - canvasRect.top;

            // Bezier control points
            const dx = Math.abs(toX - fromX);
            const cp = Math.max(dx * 0.5, 60);

            // Determine curve direction
            let cp1x, cp1y, cp2x, cp2y;
            if (toX > fromX) {
                // Left to right
                cp1x = fromX + cp;
                cp1y = fromY;
                cp2x = toX - cp;
                cp2y = toY;
            } else {
                // Right to left or wrapping
                cp1x = fromX - cp;
                cp1y = fromY;
                cp2x = toX + cp;
                cp2y = toY;
            }

            const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
            const d = `M ${fromX} ${fromY} C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${toX} ${toY}`;
            path.setAttribute('d', d);
            path.setAttribute('fill', 'none');

            const color = conn.color || 'white';
            const strokeColor = getPortColor(color);
            path.setAttribute('stroke', strokeColor);
            path.setAttribute('stroke-width', '1.5');
            path.setAttribute('stroke-opacity', '0.5');
            path.setAttribute('marker-end', 'url(#arrowhead)');

            svg.appendChild(path);

            // Add label if present
            if (conn.label) {
                const midX = (fromX + toX) / 2;
                const midY = (fromY + toY) / 2 - 8;

                const labelBg = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
                const text = document.createElementNS('http://www.w3.org/2000/svg', 'text');
                text.textContent = conn.label;
                text.setAttribute('x', midX);
                text.setAttribute('y', midY);
                text.setAttribute('text-anchor', 'middle');
                text.setAttribute('fill', '#888');
                text.setAttribute('font-size', '10');
                text.setAttribute('font-family', 'Inter, sans-serif');

                // Measure text for background
                svg.appendChild(text);
                const bbox = text.getBBox();
                svg.removeChild(text);

                labelBg.setAttribute('x', bbox.x - 4);
                labelBg.setAttribute('y', bbox.y - 2);
                labelBg.setAttribute('width', bbox.width + 8);
                labelBg.setAttribute('height', bbox.height + 4);
                labelBg.setAttribute('rx', '3');
                labelBg.setAttribute('fill', '#111');
                labelBg.setAttribute('fill-opacity', '0.7');

                svg.appendChild(labelBg);
                svg.appendChild(text);
            }
        });
    }

    canvas.appendChild(svg);
}

function findNodeElement(canvas, nodeId) {
    return canvas.querySelector(`[data-node-id="${nodeId}"]`);
}

function getPortColor(color) {
    const colors = {
        'yellow': '#facc15',
        'green': '#4ade80',
        'red': '#f87171',
        'blue': '#60a5fa',
        'purple': '#c084fc',
        'white': '#888',
    };
    return colors[color] || '#888';
}
