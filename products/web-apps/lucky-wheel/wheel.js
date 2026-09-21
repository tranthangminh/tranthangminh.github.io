/**
 * Lucky Wheel - Canvas 2D Rendering & Physics Engine
 * High-performance 60 FPS wheel animation, dynamic peg detection, radial text, and confetti system.
 */

class LuckyWheelEngine {
    constructor(canvas, options = {}) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');
        this.pointerCanvas = options.pointerCanvas || null;
        this.pointerCtx = this.pointerCanvas ? this.pointerCanvas.getContext('2d') : null;

        this.slices = [];
        this.sizingMode = options.sizingMode || 'weighted'; // 'weighted' | 'equal' | 'equal_weighted'
        this.displayMode = options.displayMode || '2d'; // '2d' | '3d_tilt' | '3d_cylinder'
        this.spinDuration = options.spinDuration || 5000; // ms

        // Rotation angles in radians
        this.currentAngle = 0;
        this.startAngle = 0;
        this.targetAngle = 0;

        // Pointer configuration (4:30 position / 45 degrees)
        this.pointerAngle = Math.PI / 4; // PI/4 rad = 45 deg = 4:30 position

        // Pointer dynamic kickback wobble physics
        this.pointerDeflection = 0;
        this.pointerVelocity = 0;
        this.lastPegPassed = -1;

        // Animation state
        this.isSpinning = false;
        this.spinStartTime = 0;
        this.onSpinEnd = options.onSpinEnd || null;
        this.onTick = options.onTick || null;

        // Display mode & 3D thickness transition state (0% to 100%)
        this.thicknessProgress = (this.displayMode === '2d') ? 0 : 1;
        this._modeAnimId = null;
        this._isTransitioning = false;
        this._transitionSourceMode = null;

        // High DPI setup
        this.resize();
        window.addEventListener('resize', () => this.resize());
    }

    /**
     * Handle high-DPI scaling for ultra-sharp canvas rendering
     */
    resize() {
        const wrapper = this.canvas.parentElement;
        const wWidth = wrapper ? (wrapper.clientWidth || wrapper.offsetWidth) : 480;
        const wHeight = wrapper ? (wrapper.clientHeight || wrapper.offsetHeight) : 480;
        // Super-sampling: ensure at least 2x DPR for razor-sharp rendering in 3D perspective
        const dpr = Math.max(2, window.devicePixelRatio || 1);
        const size = Math.max(260, Math.floor(Math.min(wWidth, wHeight)));

        // Skip redundant buffer re-allocation and redraw if dimensions have not changed
        if (this.width === size && this._lastDpr === dpr) {
            return;
        }
        this._lastDpr = dpr;

        this.canvas.width = size * dpr;
        this.canvas.height = size * dpr;
        this.canvas.style.width = `${size}px`;
        this.canvas.style.height = `${size}px`;
        this.ctx.setTransform(1, 0, 0, 1, 0, 0); // reset transform
        this.ctx.scale(dpr, dpr);

        this.width = size;
        this.height = size;
        this.centerX = size / 2;
        this.centerY = size / 2;
        this.radius = size / 2 - 18; // clearance for outer rim & pegs
        const hubRadius = Math.round(this.radius * 0.36);
        this.hubRadius = hubRadius;

        if (wrapper) {
            wrapper.style.setProperty('--wheel-radius', `${this.radius}px`);
            wrapper.style.setProperty('--wheel-size', `${size}px`);
            wrapper.style.setProperty('--hub-size', `${hubRadius * 2}px`);
            wrapper.style.setProperty('--hub-radius', `${hubRadius}px`);
        }

        if (this.pointerCanvas) {
            // Use layout dimensions (offsetWidth/offsetHeight) or explicit fallback,
            // NEVER getBoundingClientRect() which is distorted by rotate(45deg) or 3D transforms
            const pw = this.pointerCanvas.offsetWidth || 64;
            const ph = this.pointerCanvas.offsetHeight || 56;
            this.pointerCanvas.width = pw * dpr;
            this.pointerCanvas.height = ph * dpr;
            this.pointerCtx.setTransform(1, 0, 0, 1, 0, 0);
            this.pointerCtx.scale(dpr, dpr);
            this.pWidth = pw;
            this.pHeight = ph;
        }

        this._discCacheValid = false;
        this.draw();
    }

    /**
     * Update active slices
     */
    setSlices(slices) {
        this.slices = slices.filter(s => s.enabled !== false);
        this.calculateAngles();
        this._discCacheValid = false;
        this.draw();
    }

    /**
     * Set slice sizing mode ('equal' or 'weighted')
     */
    setSizingMode(mode) {
        this.sizingMode = mode;
        this.calculateAngles();
        this.draw();
    }

    /**
     * Set display mode ('2d' | '3d_tilt' | '3d_cylinder') with smooth thickness transition (0% - 100%)
     */
    setDisplayMode(mode) {
        if (this.displayMode === mode) return;

        const prevMode = this.displayMode;
        this.displayMode = mode;

        const isTo3D = (mode === '3d_tilt' || mode === '3d_cylinder');
        const isFrom3D = (prevMode === '3d_tilt' || prevMode === '3d_cylinder');

        if (this._modeAnimId) {
            cancelAnimationFrame(this._modeAnimId);
            this._modeAnimId = null;
        }

        // Animate thickness from 0% to 100% (or 100% to 0%) matching 0.45s CSS transition
        if ((prevMode === '2d' && isTo3D) || (isFrom3D && mode === '2d')) {
            const startVal = (this.thicknessProgress !== undefined) ? this.thicknessProgress : (isTo3D ? 0 : 1);
            const endVal = isTo3D ? 1 : 0;
            const duration = 450; // ms, matches 0.45s CSS cubic-bezier transition
            const startTime = performance.now();
            this._isTransitioning = true;
            this._transitionSourceMode = prevMode;

            const animateTransition = (now) => {
                const elapsed = now - startTime;
                const t = Math.min(1, elapsed / duration);
                // Ease out cubic
                const ease = 1 - Math.pow(1 - t, 3);
                this.thicknessProgress = startVal + (endVal - startVal) * ease;
                this.draw();

                if (t < 1) {
                    this._modeAnimId = requestAnimationFrame(animateTransition);
                } else {
                    this._modeAnimId = null;
                    this._isTransitioning = false;
                    this._transitionSourceMode = null;
                    this.thicknessProgress = endVal;
                    this.draw();
                }
            };

            this._modeAnimId = requestAnimationFrame(animateTransition);
        } else {
            this.thicknessProgress = isTo3D ? 1 : 0;
            this._isTransitioning = false;
            this._transitionSourceMode = null;
            this.draw();
        }
    }

    /**
     * Adjust hex color brightness for 3D volumetric shading
     */
    adjustBrightness(hex, factor) {
        if (!hex || typeof hex !== 'string' || hex.charAt(0) !== '#') return hex;
        let color = hex.slice(1);
        if (color.length === 3) {
            color = color.split('').map(c => c + c).join('');
        }
        if (color.length !== 6) return hex;
        const num = parseInt(color, 16);
        let r = (num >> 16);
        let g = ((num >> 8) & 0x00FF);
        let b = (num & 0x0000FF);

        r = Math.min(255, Math.max(0, Math.round(r * factor)));
        g = Math.min(255, Math.max(0, Math.round(g * factor)));
        b = Math.min(255, Math.max(0, Math.round(b * factor)));

        return `rgb(${r}, ${g}, ${b})`;
    }

    /**
     * Calculate visible arc intervals intersecting [0, PI] (lower half of cylinder)
     */
    getVisibleArcSegments(startAngle, endAngle, currentAngle) {
        const TWO_PI = Math.PI * 2;
        const span = endAngle - startAngle;
        let s = (startAngle + currentAngle) % TWO_PI;
        if (s < 0) s += TWO_PI;
        let e = s + span;

        const segments = [];
        if (e <= TWO_PI) {
            const segStart = Math.max(0, s);
            const segEnd = Math.min(Math.PI, e);
            if (segStart < segEnd) {
                segments.push([segStart, segEnd]);
            }
        } else {
            const seg1Start = Math.max(0, s);
            const seg1End = Math.min(Math.PI, TWO_PI);
            if (seg1Start < seg1End) {
                segments.push([seg1Start, seg1End]);
            }
            const wrapEnd = e - TWO_PI;
            const seg2Start = 0;
            const seg2End = Math.min(Math.PI, wrapEnd);
            if (seg2Start < seg2End) {
                segments.push([seg2Start, seg2End]);
            }
        }
        return segments;
    }

    /**
     * Pre-calculate slice angular intervals
     */
    calculateAngles() {
        if (!this.slices || this.slices.length === 0) return;

        const totalWeight = this.slices.reduce((sum, s) => sum + Math.max(1, Number(s.weight) || 1), 0);
        let accAngle = 0;

        this.slices.forEach(slice => {
            const sliceWeight = Math.max(1, Number(slice.weight) || 1);
            const span = this.sizingMode === 'weighted' 
                ? (sliceWeight / totalWeight) * (Math.PI * 2)
                : (Math.PI * 2) / this.slices.length;

            slice.startAngle = accAngle;
            slice.endAngle = accAngle + span;
            slice.span = span;
            accAngle += span;
        });
    }

    /**
     * Start spinning to a determined or random winner
     */
    spin(forcedWinnerIndex = null) {
        if (this.isSpinning || !this.slices || this.slices.length === 0) return false;

        this.isSpinning = true;
        this.spinStartTime = performance.now();
        this.startAngle = this.currentAngle % (Math.PI * 2);

        // Pick winner index
        let winnerIdx = forcedWinnerIndex;
        if (winnerIdx === null || winnerIdx < 0 || winnerIdx >= this.slices.length) {
            if (this.sizingMode === 'weighted' || this.sizingMode === 'equal_weighted') {
                const totalWeight = this.slices.reduce((sum, s) => sum + Math.max(1, Number(s.weight) || 1), 0);
                let rnd = Math.random() * totalWeight;
                for (let i = 0; i < this.slices.length; i++) {
                    const w = Math.max(1, Number(this.slices[i].weight) || 1);
                    if (rnd <= w) {
                        winnerIdx = i;
                        break;
                    }
                    rnd -= w;
                }
                if (winnerIdx === null) winnerIdx = this.slices.length - 1;
            } else {
                winnerIdx = Math.floor(Math.random() * this.slices.length);
            }
        }

        const winningSlice = this.slices[winnerIdx];

        // Suspenseful dramatic landings: often landing "mé mé" near the slice boundary pegs!
        // Ratio varies from 0.04 (barely crossed into the slice) to 0.96 (almost ticked into next slice)
        let ratio;
        const flavor = Math.random();
        if (flavor < 0.35) {
            // 35% chance: Dramatic close-call near start edge (barely made it past the peg into the slice!)
            ratio = 0.04 + Math.random() * 0.10; // 0.04 to 0.14
        } else if (flavor < 0.70) {
            // 35% chance: Dramatic cliffhanger near end edge (almost ticked into the next slice!)
            ratio = 0.86 + Math.random() * 0.10; // 0.86 to 0.96
        } else {
            // 30% chance: Natural landing across the body of the slice
            ratio = 0.18 + Math.random() * 0.64; // 0.18 to 0.82
        }

        const offsetInSlice = winningSlice.startAngle + winningSlice.span * ratio;

        // Calculate targetAngle so that winning point rotates to pointer angle (0 rad at 3 o'clock)
        const fullSpins = 5 + Math.floor(Math.random() * 3); // 5 to 7 full revolutions
        let rawTarget = this.pointerAngle - offsetInSlice;
        
        // Normalize forward rotation
        while (rawTarget < this.startAngle) {
            rawTarget += Math.PI * 2;
        }
        this.targetAngle = rawTarget + fullSpins * Math.PI * 2;
        this.winningSlice = winningSlice;
        this.winningIndex = winnerIdx;
        this.lastPegPassed = -1;

        // Build disc cache just before spinning (only for 2D/3D-tilt flat mode)
        if (this.displayMode === '2d' || this.displayMode === '3d_tilt') {
            this._rebuildDiscCache();
        }

        // Run animation frame loop
        this.animate(this.spinStartTime);
        return true;
    }

    /**
     * Animation loop running at 60 FPS
     */
    animate(now) {
        const elapsed = now - this.spinStartTime;
        const progress = Math.min(elapsed / this.spinDuration, 1);

        // Ease-out Quartic deceleration curve: 1 - (1 - p)^4
        const ease = 1 - Math.pow(1 - progress, 4);
        this.currentAngle = this.startAngle + (this.targetAngle - this.startAngle) * ease;

        // Rotational speed factor for audio pitch
        const speedFactor = Math.pow(1 - progress, 2);

        // Track slice boundary transitions for peg collision & ticks
        this.checkPegCollision(speedFactor);

        // Update pointer wobble physics
        this.updatePointerPhysics();

        // Render current state
        this.draw();

        if (progress < 1) {
            requestAnimationFrame((timestamp) => this.animate(timestamp));
        } else {
            // Spin completed
            this.currentAngle = this.targetAngle;
            this.isSpinning = false;
            this.pointerDeflection = 0;
            this.pointerVelocity = 0;
            this.draw();

            if (this.onSpinEnd) {
                this.onSpinEnd(this.winningSlice, this.winningIndex);
            }
        }
    }

    /**
     * Determine which slice is currently under the pointer
     */
    getSliceIndexAtPointer() {
        if (!this.slices || this.slices.length === 0) return -1;

        let norm = (this.pointerAngle - this.currentAngle) % (Math.PI * 2);
        if (norm < 0) norm += Math.PI * 2;

        for (let i = 0; i < this.slices.length; i++) {
            const s = this.slices[i];
            if (norm >= s.startAngle && norm < s.endAngle) {
                return i;
            }
        }
        return this.slices.length - 1;
    }

    /**
     * Check when boundary pegs cross the pointer position
     */
    checkPegCollision(speedFactor) {
        if (!this.slices || this.slices.length === 0) return;

        const currentSliceIdx = this.getSliceIndexAtPointer();

        if (this.lastPegPassed === -1) {
            this.lastPegPassed = currentSliceIdx;
            return;
        }

        if (currentSliceIdx !== this.lastPegPassed) {
            this.lastPegPassed = currentSliceIdx;

            // Trigger physical kickback deflection on pointer (downwards for clockwise spin at 3 o'clock)
            this.pointerDeflection = -0.28 * Math.min(speedFactor + 0.35, 1.0);

            // Play synthesized tick
            if (this.onTick) {
                this.onTick(speedFactor);
            }
        }
    }

    /**
     * Spring physics for pointer wobble
     */
    updatePointerPhysics() {
        if (Math.abs(this.pointerDeflection) > 0.002 || Math.abs(this.pointerVelocity) > 0.002) {
            // Damped spring oscillation
            const springForce = -this.pointerDeflection * 0.42;
            this.pointerVelocity += springForce;
            this.pointerVelocity *= 0.76; // friction damping
            this.pointerDeflection += this.pointerVelocity;
        } else {
            this.pointerDeflection = 0;
            this.pointerVelocity = 0;
        }
    }

    /**
     * Fallback palette colors for slices
     */
    getDefaultColor(idx) {
        const defaultPalette = ['#ef4444', '#f97316', '#eab308', '#10b981', '#06b6d4', '#3b82f6', '#8b5cf6', '#ec4899'];
        return defaultPalette[idx % defaultPalette.length];
    }

    /**
     * Draw wheel on canvas according to displayMode
     */
    draw() {
        if (!this.slices || this.slices.length === 0) {
            this.ctx.clearRect(0, 0, this.width, this.height);
            this.drawEmptyPlaceholder();
            return;
        }

        // During transition from 3D to 2D, maintain 3D rendering while thickness shrinks to 0
        const effectiveMode = (this.displayMode === '2d' && this._isTransitioning && this.thicknessProgress > 0)
            ? (this._transitionSourceMode || '3d_tilt')
            : this.displayMode;

        if (effectiveMode === '3d_cylinder' && window.LuckyWheel3DCylinder) {
            window.LuckyWheel3DCylinder.draw(this);
        } else if (effectiveMode === '3d_tilt' && window.LuckyWheel3DTilt) {
            window.LuckyWheel3DTilt.draw(this);
        } else {
            this.drawFlatWheel();
        }
    }

    /**
     * Standard 2D Flat Wheel Rendering (Used for 2D and 3D Tilt)
    /**
     * Draw the complete wheel disc surface (Outer rim, slices, text, pegs, center hub)
     * Single source of truth for 2D wheel surface, reused directly by 3D Tilt mode.
     */
    drawWheelDisc() {
        const ctx = this.ctx;
        const cx = this.centerX;
        const cy = this.centerY;
        const r = this.radius;

        ctx.save();
        ctx.translate(cx, cy);

        // 1. Draw Outer Glowing Rim Shadow
        ctx.save();
        ctx.beginPath();
        ctx.arc(0, 0, r + 8, 0, Math.PI * 2);
        ctx.fillStyle = '#090d16';
        ctx.shadowColor = 'rgba(0, 0, 0, 0.6)';
        ctx.shadowBlur = 18;
        ctx.shadowOffsetY = 6;
        ctx.fill();
        ctx.restore();

        // 2. Draw Metallic Outer Rim
        const rimGradient = ctx.createRadialGradient(0, 0, r, 0, 0, r + 8);
        rimGradient.addColorStop(0, '#1e293b');
        rimGradient.addColorStop(0.5, '#475569');
        rimGradient.addColorStop(1, '#0f172a');
        ctx.beginPath();
        ctx.arc(0, 0, r + 8, 0, Math.PI * 2);
        ctx.fillStyle = rimGradient;
        ctx.fill();
        ctx.lineWidth = 1.5;
        ctx.strokeStyle = '#334155';
        ctx.stroke();

        // 3. Draw Rotating Slices
        ctx.rotate(this.currentAngle);

        this.slices.forEach((slice, idx) => {
            const start = slice.startAngle;
            const end = slice.endAngle;

            // Draw slice wedge
            ctx.beginPath();
            ctx.moveTo(0, 0);
            ctx.arc(0, 0, r, start, end);
            ctx.closePath();

            // Fill color
            ctx.fillStyle = slice.color || this.getDefaultColor(idx);
            ctx.fill();

            // Slice divider line
            ctx.lineWidth = 2;
            ctx.strokeStyle = '#0f172a';
            ctx.stroke();

            // Draw radial text
            this.drawSliceText(ctx, slice, start, end, r);
        });

        // 4. Draw Pegs (Chốt ghim) at slice boundaries
        this.slices.forEach(slice => {
            const angle = slice.startAngle;
            const pegDistance = r + 3;
            const px = Math.cos(angle) * pegDistance;
            const py = Math.sin(angle) * pegDistance;

            ctx.save();
            ctx.beginPath();
            ctx.arc(px, py, 3.5, 0, Math.PI * 2);

            // Metallic 3D peg gradient
            const pegGrad = ctx.createRadialGradient(px - 1, py - 1, 0.5, px, py, 3.5);
            pegGrad.addColorStop(0, '#ffffff');
            pegGrad.addColorStop(0.4, '#e2e8f0');
            pegGrad.addColorStop(0.8, '#64748b');
            pegGrad.addColorStop(1, '#1e293b');

            ctx.fillStyle = pegGrad;
            ctx.shadowColor = 'rgba(0, 0, 0, 0.5)';
            ctx.shadowBlur = 3;
            ctx.fill();
            ctx.lineWidth = 0.75;
            ctx.strokeStyle = '#0f172a';
            ctx.stroke();
            ctx.restore();
        });

        ctx.restore(); // restore rotation & translation

        // 5. Draw Glossy Center Hub
        this.drawCenterHub(ctx, cx, cy);
    }

    /**
     * Draw standard 2D flat wheel
     */
    drawFlatWheel() {
        const ctx = this.ctx;
        ctx.clearRect(0, 0, this.width, this.height);

        // During spinning: use cached disc image (rotate it) — saves all slice/text/peg draw calls
        if (this.isSpinning && this._discCache && this._discCacheValid) {
            const cx = this.centerX;
            const cy = this.centerY;
            const size = this.width;

            // Draw static rim shadow (outside rotation) from cache
            ctx.drawImage(this._discRimCache, 0, 0, size, size);

            // Draw rotating disc from cache
            ctx.save();
            ctx.translate(cx, cy);
            ctx.rotate(this.currentAngle);
            ctx.drawImage(this._discCache, -cx, -cy, size, size);
            ctx.restore();

            // Draw hub on top (always centered, no rotation)
            this.drawCenterHub(ctx, cx, cy);
        } else {
            this.drawWheelDisc();
        }

        this.drawPointer();
    }

    /**
     * Build offscreen disc cache: renders the full wheel disc at angle=0.
     * Call this whenever slices change or canvas is resized.
     */
    _rebuildDiscCache() {
        const size = this.width;
        const dpr = this._lastDpr || 1;
        if (!size) return;

        // ---- Cache 1: Rotating disc (slices + text + pegs), drawn at angle=0 ----
        if (!this._discCache || this._discCache.width !== size * dpr) {
            this._discCache = document.createElement('canvas');
            this._discCache.width = size * dpr;
            this._discCache.height = size * dpr;
        }
        const offCtx = this._discCache.getContext('2d');
        offCtx.setTransform(1, 0, 0, 1, 0, 0);
        offCtx.scale(dpr, dpr);
        offCtx.clearRect(0, 0, size, size);

        const cx = size / 2;
        const cy = size / 2;
        const r = this.radius;

        offCtx.save();
        offCtx.translate(cx, cy);
        // angle = 0 for the cache; actual rotation applied via ctx.rotate in drawFlatWheel
        this.slices.forEach((slice, idx) => {
            const start = slice.startAngle;
            const end = slice.endAngle;
            offCtx.beginPath();
            offCtx.moveTo(0, 0);
            offCtx.arc(0, 0, r, start, end);
            offCtx.closePath();
            offCtx.fillStyle = slice.color || this.getDefaultColor(idx);
            offCtx.fill();
            offCtx.lineWidth = 2;
            offCtx.strokeStyle = '#0f172a';
            offCtx.stroke();
            this.drawSliceText(offCtx, slice, start, end, r);
        });
        // Pegs
        this.slices.forEach(slice => {
            const angle = slice.startAngle;
            const pegDistance = r + 3;
            const px = Math.cos(angle) * pegDistance;
            const py = Math.sin(angle) * pegDistance;
            offCtx.save();
            offCtx.beginPath();
            offCtx.arc(px, py, 3.5, 0, Math.PI * 2);
            const pegGrad = offCtx.createRadialGradient(px - 1, py - 1, 0.5, px, py, 3.5);
            pegGrad.addColorStop(0, '#ffffff');
            pegGrad.addColorStop(0.4, '#e2e8f0');
            pegGrad.addColorStop(0.8, '#64748b');
            pegGrad.addColorStop(1, '#1e293b');
            offCtx.fillStyle = pegGrad;
            offCtx.shadowColor = 'rgba(0, 0, 0, 0.5)';
            offCtx.shadowBlur = 3;
            offCtx.fill();
            offCtx.lineWidth = 0.75;
            offCtx.strokeStyle = '#0f172a';
            offCtx.stroke();
            offCtx.restore();
        });
        offCtx.restore();

        // ---- Cache 2: Static rim (shadow + metallic ring, no rotation) ----
        if (!this._discRimCache || this._discRimCache.width !== size * dpr) {
            this._discRimCache = document.createElement('canvas');
            this._discRimCache.width = size * dpr;
            this._discRimCache.height = size * dpr;
        }
        const rimCtx = this._discRimCache.getContext('2d');
        rimCtx.setTransform(1, 0, 0, 1, 0, 0);
        rimCtx.scale(dpr, dpr);
        rimCtx.clearRect(0, 0, size, size);

        rimCtx.save();
        rimCtx.translate(cx, cy);
        // Rim shadow
        rimCtx.save();
        rimCtx.beginPath();
        rimCtx.arc(0, 0, r + 8, 0, Math.PI * 2);
        rimCtx.fillStyle = '#090d16';
        rimCtx.shadowColor = 'rgba(0, 0, 0, 0.6)';
        rimCtx.shadowBlur = 18;
        rimCtx.shadowOffsetY = 6;
        rimCtx.fill();
        rimCtx.restore();
        // Metallic rim
        const rimGrad = rimCtx.createRadialGradient(0, 0, r, 0, 0, r + 8);
        rimGrad.addColorStop(0, '#1e293b');
        rimGrad.addColorStop(0.5, '#475569');
        rimGrad.addColorStop(1, '#0f172a');
        rimCtx.beginPath();
        rimCtx.arc(0, 0, r + 8, 0, Math.PI * 2);
        rimCtx.fillStyle = rimGrad;
        rimCtx.fill();
        rimCtx.lineWidth = 1.5;
        rimCtx.strokeStyle = '#334155';
        rimCtx.stroke();
        rimCtx.restore();

        this._discCacheValid = true;
    }


    /**
     * Draw text aligned radially within the slice
     * Scales dynamically with screen size / wheel radius, supports up to 36px font,
     * auto 2-line wrapping for long items, and enforces a minimum floor (11px).
     */
    drawSliceText(ctx, slice, start, end, radius) {
        ctx.save();
        const midAngle = start + (end - start) / 2;
        ctx.rotate(midAngle);

        // Calculate contrasting font color
        const fontColor = this.getContrastColor(slice.color || '#3b82f6');
        ctx.fillStyle = fontColor;
        ctx.textAlign = 'right';
        ctx.textBaseline = 'middle';

        // 1. Text multi-line splitting (up to 2 lines)
        let rawText = (slice.text || '').trim();
        let lines = [rawText];

        if (rawText.includes('\n')) {
            const parts = rawText.split('\n');
            lines = [parts[0].trim(), parts.slice(1).join(' ').trim()].filter(Boolean);
        } else if (rawText.includes(' ') && rawText.length > 7) {
            const words = rawText.split(/\s+/);
            if (words.length >= 2) {
                let bestSplit = 1;
                let minDiff = Infinity;
                for (let i = 1; i < words.length; i++) {
                    const l1 = words.slice(0, i).join(' ');
                    const l2 = words.slice(i).join(' ');
                    const diff = Math.abs(l1.length - l2.length);
                    if (diff < minDiff) {
                        minDiff = diff;
                        bestSplit = i;
                    }
                }
                lines = [words.slice(0, bestSplit).join(' '), words.slice(bestSplit).join(' ')];
            }
        }
        const isMultiLine = lines.length > 1;

        // 2. Responsive font scaling with max 36px and min 11px limit
        const sliceSpan = end - start;
        const availableArc = (radius * 0.60) * sliceSpan;
        const MIN_FONT_SIZE = 11;
        const MAX_FONT_SIZE = isMultiLine ? 28 : 36;

        const targetSize = Math.round(isMultiLine ? radius * 0.095 : radius * 0.12);
        const arcCap = Math.round(availableArc * (isMultiLine ? 0.32 : 0.50));
        let fontSize = Math.max(MIN_FONT_SIZE, Math.min(MAX_FONT_SIZE, Math.min(targetSize, arcCap)));

        ctx.font = `700 ${fontSize}px Montserrat, system-ui, sans-serif`;

        // 3. Truncate line with ellipsis if still wider than slice room
        // maxLineWidth capped to avoid hub overlap: text must stop before hubRadius
        const maxLineWidth = radius * 0.54;
        for (let i = 0; i < lines.length; i++) {
            let line = lines[i];
            while (ctx.measureText(line).width > maxLineWidth && line.length > 3) {
                line = line.substring(0, line.length - 2) + '…';
            }
            lines[i] = line;
        }

        // 4. Drop shadow for crisp readability
        ctx.shadowColor = fontColor === '#ffffff' ? 'rgba(0,0,0,0.65)' : 'rgba(255,255,255,0.45)';
        ctx.shadowBlur = 3;
        ctx.shadowOffsetX = 1;
        ctx.shadowOffsetY = 1;

        // 5. Draw text lines radially
        // Mobile (radius < 160): 10px rim padding — brings text closer to edge
        // Desktop: 20px rim padding
        const textAnchorX = radius < 160 ? radius - 10 : radius - 20;
        if (!isMultiLine) {
            ctx.fillText(lines[0], textAnchorX, 0);
        } else {
            const lineHeight = fontSize * 1.16;
            ctx.fillText(lines[0], textAnchorX, -lineHeight * 0.52);
            ctx.fillText(lines[1], textAnchorX, lineHeight * 0.52);
        }

        ctx.restore();
    }

    /**
     * Draw metallic glossy center hub
     */
    drawCenterHub(ctx, cx, cy) {
        ctx.save();
        const hubRadius = this.hubRadius || Math.round(this.radius * 0.36);

        // Outer rim of hub
        ctx.beginPath();
        ctx.arc(cx, cy, hubRadius, 0, Math.PI * 2);
        const hubGrad = ctx.createRadialGradient(cx - hubRadius * 0.3, cy - hubRadius * 0.3, 2, cx, cy, hubRadius);
        hubGrad.addColorStop(0, '#475569');
        hubGrad.addColorStop(0.7, '#1e293b');
        hubGrad.addColorStop(1, '#0f172a');
        ctx.fillStyle = hubGrad;
        ctx.shadowColor = 'rgba(0, 0, 0, 0.7)';
        ctx.shadowBlur = 12;
        ctx.shadowOffsetY = 4;
        ctx.fill();
        ctx.lineWidth = 3;
        ctx.strokeStyle = '#06b6d4';
        ctx.stroke();

        // Inner jewel
        ctx.beginPath();
        ctx.arc(cx, cy, hubRadius * 0.68, 0, Math.PI * 2);
        const innerGrad = ctx.createLinearGradient(cx, cy - hubRadius * 0.68, cx, cy + hubRadius * 0.68);
        innerGrad.addColorStop(0, '#06b6d4');
        innerGrad.addColorStop(1, '#0891b2');
        ctx.fillStyle = innerGrad;
        ctx.fill();

        // SPIN text in center (Sized comfortably inside inner circle without clipping)
        ctx.fillStyle = '#ffffff';
        ctx.font = `800 ${Math.floor(hubRadius * 0.32)}px Montserrat, sans-serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.shadowColor = 'rgba(0, 0, 0, 0.4)';
        ctx.shadowBlur = 4;
        const spinText = window.LuckyWheelI18n ? window.LuckyWheelI18n.t('actions.spin') : 'SPIN';
        ctx.fillText(spinText, cx, cy);

        ctx.restore();
    }

    /**
     * Draw pointer indicator on Right side (3 o'clock) with wobble kickback
     */
    drawPointer() {
        const pCanvas = this.pointerCanvas;
        if (!pCanvas) return;

        // Delegate to dedicated 3D visual modules
        if (this.displayMode === '3d_cylinder' && window.LuckyWheel3DCylinder) {
            window.LuckyWheel3DCylinder.drawPointer(this);
            return;
        }
        if (this.displayMode === '3d_tilt' && window.LuckyWheel3DTilt && typeof window.LuckyWheel3DTilt.drawPointer === 'function') {
            window.LuckyWheel3DTilt.drawPointer(this);
            return;
        }

        this.drawStandardPointer();
    }

    /**
     * Standard pointer indicator on Right side (3 o'clock) with wobble kickback
     * Single source of truth for 2D and 3D Tilt pointer.
     */
    drawStandardPointer() {
        const pCanvas = this.pointerCanvas;
        if (!pCanvas) return;

        const ctx = this.pointerCtx;
        const w = this.pWidth;
        const h = this.pHeight;

        ctx.clearRect(0, 0, w, h);
        ctx.save();

        // Pivot point near right edge of pointer canvas (attached outside the right rim)
        ctx.translate(w - 10, h / 2);
        ctx.rotate(this.pointerDeflection);
        ctx.beginPath();
        ctx.moveTo(0, -14);
        ctx.lineTo(0, 14);
        ctx.lineTo(-(w - 16), 0);
        ctx.closePath();

        // Needle gradient (vertical rich red gradient)
        const needleGrad = ctx.createLinearGradient(0, -14, 0, 14);
        needleGrad.addColorStop(0, '#f87171');
        needleGrad.addColorStop(0.35, '#ef4444');
        needleGrad.addColorStop(0.7, '#dc2626');
        needleGrad.addColorStop(1, '#991b1b');
        ctx.fillStyle = needleGrad;
        ctx.shadowColor = 'rgba(239, 68, 68, 0.65)';
        ctx.shadowBlur = 10;
        ctx.shadowOffsetX = -2;
        ctx.fill();
        ctx.lineWidth = 1.8;
        ctx.strokeStyle = '#ffffff';
        ctx.stroke();

        // Needle right pivot metallic cap
        ctx.beginPath();
        ctx.arc(0, 0, 8.5, 0, Math.PI * 2);
        const capGrad = ctx.createRadialGradient(-2, -2, 1, 0, 0, 9);
        capGrad.addColorStop(0, '#ffffff');
        capGrad.addColorStop(0.5, '#cbd5e1');
        capGrad.addColorStop(1, '#475569');
        ctx.fillStyle = capGrad;
        ctx.shadowColor = 'rgba(0, 0, 0, 0.4)';
        ctx.shadowBlur = 4;
        ctx.fill();
        ctx.lineWidth = 1.5;
        ctx.strokeStyle = '#0f172a';
        ctx.stroke();

        // Inner rivet
        ctx.beginPath();
        ctx.arc(0, 0, 3.5, 0, Math.PI * 2);
        ctx.fillStyle = '#1e293b';
        ctx.fill();

        ctx.restore();
    }

    /**
     * Placeholder when no slices exist
     */
    drawEmptyPlaceholder() {
        const ctx = this.ctx;
        ctx.save();
        ctx.beginPath();
        ctx.arc(this.centerX, this.centerY, this.radius, 0, Math.PI * 2);
        ctx.fillStyle = '#1e293b';
        ctx.fill();
        ctx.lineWidth = 2;
        ctx.strokeStyle = '#334155';
        ctx.stroke();

        ctx.fillStyle = '#94a3b8';
        ctx.font = '600 15px Montserrat, sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('Add slices to spin!', this.centerX, this.centerY);
        ctx.restore();
    }

    /**
     * Calculate contrast text color (White vs Dark)
     */
    getContrastColor(hexColor) {
        let hex = hexColor.replace('#', '');
        if (hex.length === 3) {
            hex = hex.split('').map(c => c + c).join('');
        }
        const r = parseInt(hex.substring(0, 2), 16) || 0;
        const g = parseInt(hex.substring(2, 4), 16) || 0;
        const b = parseInt(hex.substring(4, 6), 16) || 0;
        const brightness = (r * 299 + g * 587 + b * 114) / 1000;
        return brightness > 155 ? '#0f172a' : '#ffffff';
    }

    /**
     * Default vibrant color fallback
     */
    getDefaultColor(idx) {
        const colors = [
            '#ef4444', '#f97316', '#eab308', '#10b981', 
            '#06b6d4', '#3b82f6', '#8b5cf6', '#ec4899'
        ];
        return colors[idx % colors.length];
    }
}

/**
 * Confetti Particle Engine for Winner Celebrations
 */
class ConfettiEngine {
    constructor(canvas) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');
        this.particles = [];
        this.isActive = false;
        this.animationId = null;

        this.resize();
        window.addEventListener('resize', () => this.resize());
    }

    resize() {
        this.canvas.width = window.innerWidth;
        this.canvas.height = window.innerHeight;
    }

    fire(count = 140) {
        this.resize();
        this.particles = [];
        this.isActive = true;

        const colors = ['#ef4444', '#f97316', '#eab308', '#10b981', '#06b6d4', '#3b82f6', '#8b5cf6', '#ec4899', '#ffffff'];

        for (let i = 0; i < count; i++) {
            this.particles.push({
                x: window.innerWidth / 2 + (Math.random() - 0.5) * 200,
                y: window.innerHeight * 0.45,
                w: 8 + Math.random() * 8,
                h: 5 + Math.random() * 6,
                color: colors[Math.floor(Math.random() * colors.length)],
                vx: (Math.random() - 0.5) * 16,
                vy: -8 - Math.random() * 12,
                rot: Math.random() * 360,
                rotSpeed: (Math.random() - 0.5) * 18,
                gravity: 0.35 + Math.random() * 0.25,
                drag: 0.985,
                opacity: 1,
                decay: 0.007 + Math.random() * 0.009
            });
        }

        if (this.animationId) {
            cancelAnimationFrame(this.animationId);
        }
        this.loop();
    }

    loop() {
        if (!this.isActive) return;

        const ctx = this.ctx;
        ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

        let aliveCount = 0;

        for (let i = 0; i < this.particles.length; i++) {
            const p = this.particles[i];
            p.vx *= p.drag;
            p.vy += p.gravity;
            p.x += p.vx;
            p.y += p.vy;
            p.rot += p.rotSpeed;
            p.opacity -= p.decay;

            if (p.opacity > 0 && p.y < this.canvas.height + 20) {
                aliveCount++;
                ctx.save();
                ctx.translate(p.x, p.y);
                ctx.rotate((p.rot * Math.PI) / 180);
                ctx.fillStyle = p.color;
                ctx.globalAlpha = Math.max(0, p.opacity);
                ctx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h);
                ctx.restore();
            }
        }

        if (aliveCount > 0) {
            this.animationId = requestAnimationFrame(() => this.loop());
        } else {
            this.isActive = false;
            ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        }
    }

    stop() {
        this.isActive = false;
        if (this.animationId) {
            cancelAnimationFrame(this.animationId);
        }
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    }
}

// Global exports
window.LuckyWheelEngine = LuckyWheelEngine;
window.ConfettiEngine = ConfettiEngine;
