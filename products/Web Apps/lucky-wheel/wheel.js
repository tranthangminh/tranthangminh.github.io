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
        this.sizingMode = options.sizingMode || 'equal'; // 'equal' or 'weighted'
        this.spinDuration = options.spinDuration || 5000; // ms

        // Rotation angles in radians
        this.currentAngle = 0;
        this.startAngle = 0;
        this.targetAngle = 0;

        // Pointer configuration (12 o'clock / Top)
        this.pointerAngle = -Math.PI / 2; // -90 deg

        // Pointer dynamic kickback wobble physics
        this.pointerDeflection = 0;
        this.pointerVelocity = 0;
        this.lastPegPassed = -1;

        // Animation state
        this.isSpinning = false;
        this.spinStartTime = 0;
        this.onSpinEnd = options.onSpinEnd || null;
        this.onTick = options.onTick || null;

        // High DPI setup
        this.resize();
        window.addEventListener('resize', () => this.resize());
    }

    /**
     * Handle high-DPI scaling for ultra-sharp canvas rendering
     */
    resize() {
        const wrapper = this.canvas.parentElement;
        const wRect = wrapper ? wrapper.getBoundingClientRect() : this.canvas.getBoundingClientRect();
        const dpr = window.devicePixelRatio || 1;
        const size = Math.max(260, Math.floor(Math.min(wRect.width || 480, wRect.height || 480)));

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

        if (this.pointerCanvas) {
            const pRect = this.pointerCanvas.getBoundingClientRect();
            this.pointerCanvas.width = (pRect.width || 44) * dpr;
            this.pointerCanvas.height = (pRect.height || 48) * dpr;
            this.pointerCtx.setTransform(1, 0, 0, 1, 0, 0);
            this.pointerCtx.scale(dpr, dpr);
            this.pWidth = pRect.width || 44;
            this.pHeight = pRect.height || 48;
        }

        this.draw();
    }

    /**
     * Update active slices
     */
    setSlices(slices) {
        this.slices = slices.filter(s => s.enabled !== false);
        this.calculateAngles();
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
            if (this.sizingMode === 'weighted') {
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

        // Safe landing angle within middle 70% of winning slice (avoids edge boundary ambiguity)
        const offsetInSlice = winningSlice.startAngle + winningSlice.span * (0.15 + Math.random() * 0.70);

        // Calculate targetAngle so that winning point rotates to pointer angle (-Math.PI / 2)
        // pointerAngle = (offsetInSlice + targetAngle) mod 2PI => targetAngle = pointerAngle - offsetInSlice + 2PI * k
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

            // Trigger physical kickback deflection on pointer
            this.pointerDeflection = 0.28 * Math.min(speedFactor + 0.35, 1.0);

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
     * Draw wheel on canvas
     */
    draw() {
        const ctx = this.ctx;
        const cx = this.centerX;
        const cy = this.centerY;
        const r = this.radius;

        ctx.clearRect(0, 0, this.width, this.height);

        if (!this.slices || this.slices.length === 0) {
            this.drawEmptyPlaceholder();
            return;
        }

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

        // 6. Draw Pointer
        this.drawPointer();
    }

    /**
     * Draw text aligned radially within the slice
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

        // Auto-scale font size depending on slice count and slice angle
        const sliceSpan = end - start;
        const availableArc = (radius * 0.65) * sliceSpan;
        let fontSize = Math.floor(Math.min(18, Math.max(10, availableArc * 0.45)));

        ctx.font = `600 ${fontSize}px Montserrat, system-ui, sans-serif`;

        // Truncate text if needed
        let text = slice.text || '';
        const maxTextWidth = radius * 0.62;
        while (ctx.measureText(text).width > maxTextWidth && text.length > 3) {
            text = text.substring(0, text.length - 2) + '…';
        }

        // Slight text shadow for readability
        ctx.shadowColor = fontColor === '#ffffff' ? 'rgba(0,0,0,0.65)' : 'rgba(255,255,255,0.45)';
        ctx.shadowBlur = 2;
        ctx.shadowOffsetX = 1;
        ctx.shadowOffsetY = 1;

        ctx.fillText(text, radius - 20, 0);
        ctx.restore();
    }

    /**
     * Draw metallic glossy center hub
     */
    drawCenterHub(ctx, cx, cy) {
        ctx.save();
        const hubRadius = Math.max(34, this.radius * 0.17);

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
        ctx.arc(cx, cy, hubRadius * 0.65, 0, Math.PI * 2);
        const innerGrad = ctx.createLinearGradient(cx, cy - hubRadius * 0.65, cx, cy + hubRadius * 0.65);
        innerGrad.addColorStop(0, '#06b6d4');
        innerGrad.addColorStop(1, '#0891b2');
        ctx.fillStyle = innerGrad;
        ctx.fill();

        // SPIN text or icon in center
        ctx.fillStyle = '#ffffff';
        ctx.font = `800 ${Math.floor(hubRadius * 0.42)}px Montserrat, sans-serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.shadowColor = 'rgba(0,0,0,0.5)';
        ctx.shadowBlur = 3;
        ctx.fillText('SPIN', cx, cy);

        ctx.restore();
    }

    /**
     * Draw pointer indicator at 12 o'clock with wobble kickback
     */
    drawPointer() {
        const pCanvas = this.pointerCanvas;
        if (!pCanvas) return;
        const ctx = this.pointerCtx;
        const w = this.pWidth;
        const h = this.pHeight;

        ctx.clearRect(0, 0, w, h);
        ctx.save();

        // Pivot point at top center of pointer
        ctx.translate(w / 2, 8);
        ctx.rotate(this.pointerDeflection);

        // Draw physical needle/peg
        ctx.beginPath();
        ctx.moveTo(-10, 0);
        ctx.lineTo(10, 0);
        ctx.lineTo(0, h - 12);
        ctx.closePath();

        // Needle gradient
        const needleGrad = ctx.createLinearGradient(-10, 0, 10, 0);
        needleGrad.addColorStop(0, '#ef4444');
        needleGrad.addColorStop(0.5, '#f87171');
        needleGrad.addColorStop(1, '#b91c1c');
        ctx.fillStyle = needleGrad;
        ctx.shadowColor = 'rgba(239, 68, 68, 0.6)';
        ctx.shadowBlur = 8;
        ctx.shadowOffsetY = 2;
        ctx.fill();
        ctx.lineWidth = 1.5;
        ctx.strokeStyle = '#ffffff';
        ctx.stroke();

        // Needle top pivot cap
        ctx.beginPath();
        ctx.arc(0, 0, 6, 0, Math.PI * 2);
        ctx.fillStyle = '#e2e8f0';
        ctx.fill();
        ctx.lineWidth = 1;
        ctx.strokeStyle = '#0f172a';
        ctx.stroke();

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
