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
 * Returns a cleanup function.
 */
export function enableDragging(container) {
    let activeNode = null;
    let offsetX = 0;
    let offsetY = 0;

    function onPointerDown(e) {
        const node = e.target.closest('.canvas-node');
        if (!node || e.target.closest('.node-port-dot')) return;

        activeNode = node;
        const rect = node.getBoundingClientRect();
        const containerRect = container.getBoundingClientRect();
        offsetX = e.clientX - (rect.left - containerRect.left);
        offsetY = e.clientY - (rect.top - containerRect.top);

        activeNode.classList.add('selected');
        activeNode.style.zIndex = 10;
        e.preventDefault();
    }

    function onPointerMove(e) {
        if (!activeNode) return;
        const containerRect = container.getBoundingClientRect();
        let newX = e.clientX - containerRect.left - offsetX;
        let newY = e.clientY - containerRect.top - offsetY;

        // Snap to grid (28px matches background-size)
        newX = Math.round(newX / 28) * 28;
        newY = Math.round(newY / 28) * 28;

        activeNode.style.left = `${newX}px`;
        activeNode.style.top = `${newY}px`;
    }

    function onPointerUp() {
        if (!activeNode) return;
        activeNode.classList.remove('selected');
        activeNode.style.zIndex = '';
        activeNode = null;
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
