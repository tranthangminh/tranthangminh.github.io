/**
 * stage-viewport-controller.js - Interactive Stage Viewport Controller
 * Features:
 *  - Pan: Hold Middle Click OR Space + Left Click to pan viewport in single or split mode.
 *  - Wheel Zoom: Middle scroll to zoom in/out with cursor focal point (split-aware).
 *  - Double-Click: Toggle between 100% zoom and Fit Screen.
 *  - Multi-target synchronization: Syncs transform across dual split-screen panes.
 * Complies with _RULE-web-apps.md (< 500 lines)
 * 100% Vanilla JS
 */

class StageViewportController {
    /**
     * @param {HTMLElement} viewportEl - Outer stage viewport container
     * @param {HTMLElement|HTMLElement[]} targetEl - Element(s) to pan and scale
     * @param {Function} [onZoomChange] - Callback with new zoom value (number)
     */
    constructor(viewportEl, targetEl, onZoomChange) {
        this.viewport = viewportEl;
        this.targets = targetEl ? (Array.isArray(targetEl) ? targetEl.filter(Boolean) : [targetEl]) : [];
        this.onZoomChange = onZoomChange || (() => {});

        this.scale = 1;
        this.panX = 0;
        this.panY = 0;
        this.isDragging = false;
        this.isSpacePressed = false;
        this.startX = 0;
        this.startY = 0;
        this.hasMoved = false;

        this._initEvents();
    }

    setTargets(targets) {
        this.targets = targets ? (Array.isArray(targets) ? targets.filter(Boolean) : [targets]) : [];
        this._applyTransform();
    }

    _initEvents() {
        if (!this.viewport) return;

        // 1. Space Key Tracking for Pan
        window.addEventListener('keydown', (e) => {
            if (e.code === 'Space' && !e.target.closest('input, textarea, select')) {
                this.isSpacePressed = true;
                if (this.viewport && !this.isDragging) {
                    this.viewport.style.cursor = 'grab';
                }
            }
        });

        window.addEventListener('keyup', (e) => {
            if (e.code === 'Space') {
                this.isSpacePressed = false;
                if (this.viewport && !this.isDragging) {
                    this.viewport.style.cursor = '';
                }
            }
        });

        // 2. Mouse Drag (Pan): ONLY Middle Click (button 1) OR Space + Left Click (button 0 + Space)
        this.viewport.addEventListener('mousedown', (e) => {
            if (e.target.closest('button, input, select, a, textarea, .stage-submode-pill, .stage-action-bar, .stage-toolbar, .stage-generator-panel')) return;

            const isMiddleClick = (e.button === 1);
            const isSpacePan = (e.button === 0 && this.isSpacePressed);
            if (!isMiddleClick && !isSpacePan) return;

            this.isDragging = true;
            this.hasMoved = false;
            this.startX = e.clientX - this.panX;
            this.startY = e.clientY - this.panY;
            this.viewport.style.cursor = 'grabbing';
            e.preventDefault();
        });

        window.addEventListener('mousemove', (e) => {
            if (!this.isDragging) return;
            const newX = e.clientX - this.startX;
            const newY = e.clientY - this.startY;
            if (Math.abs(newX - this.panX) > 2 || Math.abs(newY - this.panY) > 2) {
                this.hasMoved = true;
            }
            this.panX = newX;
            this.panY = newY;
            this._applyTransform();
        });

        window.addEventListener('mouseup', (e) => {
            if (!this.isDragging) return;
            this.isDragging = false;
            if (this.viewport) {
                this.viewport.style.cursor = this.isSpacePressed ? 'grab' : '';
            }
        });

        // 3. Mouse Wheel Zoom (Focal Point)
        this.viewport.addEventListener('wheel', (e) => {
            if (e.target.closest('.stage-generator-panel, .gen-form-container, .pixelart-palette-list')) return;
            e.preventDefault();

            const rect = this.viewport.getBoundingClientRect();
            let mouseX;
            if (this.targets.length > 1) {
                const isLeftPane = (e.clientX - rect.left) < (rect.width * 0.5);
                const paneCenterX = isLeftPane ? (rect.left + rect.width * 0.25) : (rect.left + rect.width * 0.75);
                mouseX = e.clientX - paneCenterX;
            } else {
                mouseX = e.clientX - rect.left - rect.width / 2;
            }
            const mouseY = e.clientY - rect.top - rect.height / 2;

            const factor = e.deltaY < 0 ? 1.15 : (1 / 1.15);
            const newScale = Math.max(0.1, Math.min(10, this.scale * factor));
            if (newScale === this.scale) return;

            this.panX = mouseX - (mouseX - this.panX) * (newScale / this.scale);
            this.panY = mouseY - (mouseY - this.panY) * (newScale / this.scale);
            this.scale = newScale;

            this._applyTransform();
            this.onZoomChange(this.scale);
        }, { passive: false });

        // 4. Double Click Toggle (100% vs Fit Screen)
        this.viewport.addEventListener('dblclick', (e) => {
            if (e.target.closest('button, input, select, a, textarea, .stage-submode-pill, .stage-action-bar, .stage-toolbar, .stage-generator-panel, canvas')) return;
            e.preventDefault();
            if (Math.abs(this.scale - 1) < 0.08) {
                this.fitScreen();
            } else {
                this.reset(1);
            }
        });
    }

    _applyTransform() {
        if (!this.targets.length) return;
        const tf = `translate(${this.panX.toFixed(2)}px, ${this.panY.toFixed(2)}px) scale(${this.scale.toFixed(4)})`;
        for (let i = 0; i < this.targets.length; i++) {
            const el = this.targets[i];
            if (el) {
                el.style.transform = tf;
                el.style.transformOrigin = 'center center';
            }
        }
    }

    zoomIn() {
        this.scale = Math.min(10, Math.round((this.scale + 0.25) * 100) / 100);
        this._applyTransform();
        this.onZoomChange(this.scale);
    }

    zoomOut() {
        this.scale = Math.max(0.1, Math.round((this.scale - 0.25) * 100) / 100);
        this._applyTransform();
        this.onZoomChange(this.scale);
    }

    reset(targetScale = 1) {
        this.scale = targetScale;
        this.panX = 0;
        this.panY = 0;
        this._applyTransform();
        this.onZoomChange(this.scale);
    }

    fitScreen() {
        if (!this.viewport || !this.targets.length) return;
        this.panX = 0;
        this.panY = 0;
        this.scale = 1;
        this._applyTransform();
        this.onZoomChange(this.scale);
    }
}

if (typeof window !== 'undefined') {
    window.StageViewportController = StageViewportController;
}
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { StageViewportController };
}
