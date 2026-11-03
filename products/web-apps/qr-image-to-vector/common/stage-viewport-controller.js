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
        this.offsets = new Map();

        this.scale = 1;
        this.panX = 0;
        this.panY = 0;
        this.isDragging = false;
        this.isSpacePressed = false;
        this.startX = 0;
        this.startY = 0;
        this.hasMoved = false;
        this.panMode = false;

        this._initEvents();
    }

    setTargets(targets) {
        this.targets = targets ? (Array.isArray(targets) ? targets.filter(Boolean) : [targets]) : [];
        this._applyTransform();
    }

    /** Shifts one target from the stage center by (x, y) layout px; the shift scales with zoom so it stays locked to the other targets. */
    setOffset(el, x = 0, y = 0) {
        if (!el) return;
        if (x || y) this.offsets.set(el, { x, y }); else this.offsets.delete(el);
        this._applyTransform();
    }

    /** Pointer position relative to the center of the split pane it is over (side by side or stacked), else of the stage */
    _focal(clientX, clientY) {
        const panes = this.targets.length > 1 ? this.targets.map((t) => t.closest('.split-pane')).filter(Boolean) : [];
        const pane = panes.find((p) => { const r = p.getBoundingClientRect(); return clientX >= r.left && clientX <= r.right && clientY >= r.top && clientY <= r.bottom; });
        const r = (pane || this.viewport).getBoundingClientRect();
        return { x: clientX - (r.left + r.width / 2), y: clientY - (r.top + r.height / 2) };
    }
    /** One-finger drag moves the view while move mode is on; otherwise one finger scrolls the page or edits the box */
    setPanMode(on) {
        this.panMode = Boolean(on);
        this.viewport.classList.toggle('is-pan-mode', this.panMode);
    }

    _initTouch() {
        const points = new Map();
        let pinch = null, drag = null;
        const ignore = 'button, input, select, a, textarea, .stage-submode-pill, .stage-action-bar, .stage-toolbar, .stage-generator-panel, .pixelart-pane-toolbar';

        const startPinch = () => {
            const [a, b] = [...points.values()];
            pinch = { dist: Math.hypot(a.x - b.x, a.y - b.y) || 1, mid: { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 }, scale: this.scale, panX: this.panX, panY: this.panY };
            drag = null;
        };

        // Capture phase: sees every finger even when the canvas under it handles its own pointer events
        this.viewport.addEventListener('pointerdown', (e) => {
            if (e.pointerType !== 'touch' || e.target.closest(ignore)) return;
            points.set(e.pointerId, { x: e.clientX, y: e.clientY });
            if (points.size === 2) startPinch();
            else if (points.size === 1 && this.panMode) drag = { x: e.clientX - this.panX, y: e.clientY - this.panY };
        }, true);

        window.addEventListener('pointermove', (e) => {
            if (!points.has(e.pointerId)) return;
            points.set(e.pointerId, { x: e.clientX, y: e.clientY });
            if (pinch && points.size >= 2) {
                const [a, b] = [...points.values()];
                const mid = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
                const newScale = Math.max(0.1, Math.min(10, pinch.scale * (Math.hypot(a.x - b.x, a.y - b.y) / pinch.dist)));
                const focal = this._focal(pinch.mid.x, pinch.mid.y);
                this.panX = focal.x - (focal.x - pinch.panX) * (newScale / pinch.scale) + (mid.x - pinch.mid.x);
                this.panY = focal.y - (focal.y - pinch.panY) * (newScale / pinch.scale) + (mid.y - pinch.mid.y);
                this.scale = newScale;
                this._applyTransform();
                this.onZoomChange(this.scale);
            } else if (drag) {
                this.panX = e.clientX - drag.x;
                this.panY = e.clientY - drag.y;
                this._applyTransform();
            }
        });

        const release = (e) => {
            points.delete(e.pointerId);
            if (points.size < 2) pinch = null;
            if (points.size === 0) drag = null;
        };
        window.addEventListener('pointerup', release);
        window.addEventListener('pointercancel', release);
    }

    _initEvents() {
        if (!this.viewport) return;
        this._initTouch();

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

            const { x: mouseX, y: mouseY } = this._focal(e.clientX, e.clientY);

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
        for (let i = 0; i < this.targets.length; i++) {
            const el = this.targets[i];
            if (el) {
                const off = this.offsets.get(el) || { x: 0, y: 0 };
                el.style.transform = `translate(${(this.panX + off.x * this.scale).toFixed(2)}px, ${(this.panY + off.y * this.scale).toFixed(2)}px) scale(${this.scale.toFixed(4)})`;
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
