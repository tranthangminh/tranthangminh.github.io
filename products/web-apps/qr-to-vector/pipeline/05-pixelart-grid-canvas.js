/**
 * pixelart-grid-canvas.js - Screen-Pixel Bounding Box & Equal Grid Overlay Canvas
 * Renders raw image pixels and paints interactive bounding box with dim overlay,
 * 8 resize handles, and razor-sharp 1px screen grid lines distributed evenly in bbox.
 * Complies with _RULE-web-apps.md (< 500 lines)
 * 100% Vanilla JS
 */

class PixelArtGridCanvas {
    /**
     * Compute 8 handle positions in image pixel coordinates
     */
    static getHandleCoords(bbox) {
        if (!bbox) return {};
        const bx = bbox.x, by = bbox.y, bw = bbox.w, bh = bbox.h;
        const mx = bx + bw * 0.5, my = by + bh * 0.5;
        return {
            nw: { x: bx, y: by, cursor: 'nwse-resize' },
            n:  { x: mx, y: by, cursor: 'ns-resize' },
            ne: { x: bx + bw, y: by, cursor: 'nesw-resize' },
            e:  { x: bx + bw, y: my, cursor: 'ew-resize' },
            se: { x: bx + bw, y: by + bh, cursor: 'nwse-resize' },
            s:  { x: mx, y: by + bh, cursor: 'ns-resize' },
            sw: { x: bx, y: by + bh, cursor: 'nesw-resize' },
            w:  { x: bx, y: my, cursor: 'ew-resize' }
        };
    }

    /**
     * Hit test handles or inside bounding box
     */
    static hitTest(clientX, clientY, bbox, gridCanvas, image) {
        if (!image || !gridCanvas || !bbox) return { handle: null, cursor: 'crosshair' };
        const imgW = image.naturalWidth || image.width, imgH = image.naturalHeight || image.height;
        const rect = gridCanvas.getBoundingClientRect();
        if (rect.width <= 0 || rect.height <= 0) return { handle: null, cursor: 'crosshair' };

        const imgX = ((clientX - rect.left) / rect.width) * imgW;
        const imgY = ((clientY - rect.top) / rect.height) * imgH;

        // 14 screen pixels hit zone for handles
        const hitScreenDist = 14;
        const handles = this.getHandleCoords(bbox);

        for (const [key, h] of Object.entries(handles)) {
            const screenDist = Math.hypot((imgX - h.x) * (rect.width / imgW), (imgY - h.y) * (rect.height / imgH));
            if (screenDist <= hitScreenDist) {
                return { handle: key, cursor: h.cursor };
            }
        }

        // Inside bounding box -> Move
        if (imgX >= bbox.x && imgX <= bbox.x + bbox.w && imgY >= bbox.y && imgY <= bbox.y + bbox.h) {
            return { handle: 'move', cursor: 'move' };
        }

        // Outside bounding box -> Crosshair (draw new box)
        return { handle: null, cursor: 'crosshair' };
    }

    static attachBboxController(ctx) {
        const { overlayCanvas, gridCanvas, getImage, getBbox, setBbox, onBboxChange, onBboxCommit } = ctx;
        if (!overlayCanvas || !gridCanvas) return;

        overlayCanvas.style.pointerEvents = 'auto';
        let isDragging = false, dragHandle = null, startImgX = 0, startImgY = 0, startBox = null;
        let activeHoverHandle = null;

        const getImgPos = (clientX, clientY) => {
            const img = getImage();
            if (!img) return { x: 0, y: 0 };
            const imgW = img.naturalWidth || img.width, imgH = img.naturalHeight || img.height;
            const rect = gridCanvas.getBoundingClientRect();
            const rx = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
            const ry = Math.max(0, Math.min(1, (clientY - rect.top) / rect.height));
            return { x: rx * imgW, y: ry * imgH };
        };

        overlayCanvas.addEventListener('mousemove', (e) => {
            if (isDragging) return;
            // If Space key is held, let stage viewport controller handle cursor
            if (e.code === 'Space' || e.getModifierState('Space')) return;

            const hit = PixelArtGridCanvas.hitTest(e.clientX, e.clientY, getBbox(), gridCanvas, getImage());
            overlayCanvas.style.cursor = hit.cursor;
            activeHoverHandle = hit.handle;
        });

        overlayCanvas.addEventListener('mousedown', (e) => {
            // Only Left Click and NOT holding Space (Space + left click is reserved for pan)
            if (e.button !== 0 || e.getModifierState('Space')) return;

            const hit = PixelArtGridCanvas.hitTest(e.clientX, e.clientY, getBbox(), gridCanvas, getImage());
            const pos = getImgPos(e.clientX, e.clientY);
            startImgX = pos.x;
            startImgY = pos.y;
            startBox = { ...getBbox() };

            if (hit.handle) {
                isDragging = true;
                dragHandle = hit.handle;
            } else {
                // Clicked outside: start drawing new box directly!
                isDragging = true;
                dragHandle = 'draw';
                setBbox({ x: Math.round(startImgX), y: Math.round(startImgY), w: 1, h: 1 });
            }

            e.stopPropagation();
            e.preventDefault();
        });

        window.addEventListener('mousemove', (e) => {
            if (!isDragging) return;
            const img = getImage();
            if (!img) return;
            const imgW = img.naturalWidth || img.width, imgH = img.naturalHeight || img.height;
            const pos = getImgPos(e.clientX, e.clientY);
            const dx = Math.round(pos.x - startImgX);
            const dy = Math.round(pos.y - startImgY);
            const b = { ...getBbox() };

            if (dragHandle === 'move') {
                b.x = Math.max(0, Math.min(imgW - startBox.w, startBox.x + dx));
                b.y = Math.max(0, Math.min(imgH - startBox.h, startBox.y + dy));
            } else if (dragHandle === 'draw') {
                b.x = Math.max(0, Math.min(imgW, Math.min(Math.round(startImgX), Math.round(pos.x))));
                b.y = Math.max(0, Math.min(imgH, Math.min(Math.round(startImgY), Math.round(pos.y))));
                b.w = Math.max(2, Math.min(imgW - b.x, Math.abs(Math.round(pos.x) - Math.round(startImgX))));
                b.h = Math.max(2, Math.min(imgH - b.y, Math.abs(Math.round(pos.y) - Math.round(startImgY))));
            } else {
                let nx = startBox.x, ny = startBox.y, nw = startBox.w, nh = startBox.h;
                if (dragHandle.includes('e')) nw = Math.max(2, Math.min(imgW - startBox.x, startBox.w + dx));
                if (dragHandle.includes('s')) nh = Math.max(2, Math.min(imgH - startBox.y, startBox.h + dy));
                if (dragHandle.includes('w')) {
                    const proposedX = Math.max(0, Math.min(startBox.x + startBox.w - 2, startBox.x + dx));
                    nw = startBox.x + startBox.w - proposedX;
                    nx = proposedX;
                }
                if (dragHandle.includes('n')) {
                    const proposedY = Math.max(0, Math.min(startBox.y + startBox.h - 2, startBox.y + dy));
                    nh = startBox.y + startBox.h - proposedY;
                    ny = proposedY;
                }
                b.x = nx; b.y = ny; b.w = nw; b.h = nh;
            }

            b.x = Math.round(b.x); b.y = Math.round(b.y); b.w = Math.round(b.w); b.h = Math.round(b.h);
            setBbox(b);
            onBboxChange(b);
        });

        window.addEventListener('mouseup', () => {
            if (!isDragging) return;
            isDragging = false;
            dragHandle = null;
            onBboxCommit(getBbox());
        });
    }

    static render(baseCanvas, overlayCanvas, image, bbox, cols = 16, rows = 16, options = {}) {
        if (!baseCanvas || !image) return;
        const w = image.naturalWidth || image.width, h = image.naturalHeight || image.height;
        if (!w || !h) return;

        baseCanvas.width = w; baseCanvas.height = h;
        const ctxBase = baseCanvas.getContext('2d');
        if (ctxBase) {
            ctxBase.imageSmoothingEnabled = false;
            ctxBase.clearRect(0, 0, w, h);
            ctxBase.drawImage(image, 0, 0, w, h);
        }
        if (!overlayCanvas) return;

        const renderOverlay = () => {
            const layoutW = baseCanvas.offsetWidth, layoutH = baseCanvas.offsetHeight;
            if (!layoutW || !layoutH) return;

            overlayCanvas.style.width = `${layoutW}px`; overlayCanvas.style.height = `${layoutH}px`;
            overlayCanvas.style.left = `${baseCanvas.offsetLeft}px`; overlayCanvas.style.top = `${baseCanvas.offsetTop}px`;

            const dpr = window.devicePixelRatio || 1;
            const totalScale = Math.max(0.1, options.zoom || 1) * dpr;
            const bufW = Math.round(layoutW * totalScale), bufH = Math.round(layoutH * totalScale);
            overlayCanvas.width = bufW; overlayCanvas.height = bufH;

            const ctx = overlayCanvas.getContext('2d');
            if (!ctx) return;
            ctx.clearRect(0, 0, bufW, bufH);

            const safeBox = bbox || { x: 0, y: 0, w, h };
            const scaleX = bufW / w, scaleY = bufH / h;
            const bx = Math.round(safeBox.x * scaleX), by = Math.round(safeBox.y * scaleY);
            const bw = Math.round(safeBox.w * scaleX), bh = Math.round(safeBox.h * scaleY);

            const isCrop = options.cropToBbox !== false;

            // 1. Dim Overlay (only when Crop is enabled and box doesn't cover whole image)
            if (isCrop && (safeBox.x > 0 || safeBox.y > 0 || safeBox.w < w || safeBox.h < h)) {
                ctx.fillStyle = 'rgba(0, 0, 0, 0.48)';
                ctx.fillRect(0, 0, bufW, by);
                ctx.fillRect(0, by + bh, bufW, Math.max(0, bufH - (by + bh)));
                ctx.fillRect(0, by, bx, bh);
                ctx.fillRect(bx + bw, by, Math.max(0, bufW - (bx + bw)), bh);
            }

            // 2. Grid Lines: inside bbox if cropped, or projected across entire image if not cropped
            ctx.lineWidth = 1;
            ctx.strokeStyle = options.gridColor || 'rgba(0, 230, 255, 0.80)';
            ctx.beginPath();

            if (isCrop) {
                const cCount = Math.max(1, cols), rCount = Math.max(1, rows);
                for (let c = 1; c < cCount; c++) {
                    const sx = Math.round(bx + c * (bw / cCount)) + 0.5;
                    ctx.moveTo(sx, by); ctx.lineTo(sx, by + bh);
                }
                for (let r = 1; r < rCount; r++) {
                    const sy = Math.round(by + r * (bh / rCount)) + 0.5;
                    ctx.moveTo(bx, sy); ctx.lineTo(bx + bw, sy);
                }
            } else {
                const proj = window.PixelArtGridDetector ?
                    window.PixelArtGridDetector.projectFullImageGrid(w, h, safeBox, cols, rows) :
                    { startX: safeBox.x, startY: safeBox.y, pitchX: safeBox.w / cols, pitchY: safeBox.h / rows };

                for (let x = proj.startX; x <= w + proj.pitchX; x += proj.pitchX) {
                    if (x < 0.5 || x > w - 0.5) continue;
                    const sx = Math.round(x * scaleX) + 0.5;
                    ctx.moveTo(sx, 0); ctx.lineTo(sx, bufH);
                }
                for (let y = proj.startY; y <= h + proj.pitchY; y += proj.pitchY) {
                    if (y < 0.5 || y > h - 0.5) continue;
                    const sy = Math.round(y * scaleY) + 0.5;
                    ctx.moveTo(0, sy); ctx.lineTo(bufW, sy);
                }
            }
            ctx.stroke();

            // 3. Bounding Box Outline
            ctx.lineWidth = Math.max(1, Math.round(1.5 * dpr));
            ctx.strokeStyle = options.bboxBorderColor || '#00e6ff';
            ctx.strokeRect(bx + 0.5, by + 0.5, bw, bh);

            // 4. Eight Prominent Resize Handles
            if (options.showHandles !== false) {
                const cornerR = Math.max(4, Math.round(5 * dpr)), cornerD = cornerR * 2;
                const midR = Math.max(3, Math.round(4 * dpr)), midD = midR * 2;

                // Corners: nw, ne, se, sw
                const corners = [
                    [bx, by], [bx + bw, by], [bx + bw, by + bh], [bx, by + bh]
                ];
                // Midpoints: n, e, s, w
                const midpoints = [
                    [bx + bw * 0.5, by], [bx + bw, by + bh * 0.5],
                    [bx + bw * 0.5, by + bh], [bx, by + bh * 0.5]
                ];

                ctx.lineWidth = Math.max(1, Math.round(1.5 * dpr));
                ctx.strokeStyle = '#005f73';

                // Draw corner handles
                for (let i = 0; i < corners.length; i++) {
                    const [hx, hy] = corners[i];
                    ctx.fillStyle = '#ffffff';
                    ctx.fillRect(Math.round(hx - cornerR), Math.round(hy - cornerR), cornerD, cornerD);
                    ctx.strokeRect(Math.round(hx - cornerR) + 0.5, Math.round(hy - cornerR) + 0.5, cornerD, cornerD);
                }

                // Draw midpoint handles
                for (let i = 0; i < midpoints.length; i++) {
                    const [hx, hy] = midpoints[i];
                    ctx.fillStyle = '#ffffff';
                    ctx.fillRect(Math.round(hx - midR), Math.round(hy - midR), midD, midD);
                    ctx.strokeRect(Math.round(hx - midR) + 0.5, Math.round(hy - midR) + 0.5, midD, midD);
                }
            }
        };

        if (!baseCanvas.offsetWidth || !baseCanvas.offsetHeight) {
            requestAnimationFrame(renderOverlay);
        } else {
            renderOverlay();
        }
    }
}

if (typeof window !== 'undefined') {
    window.PixelArtGridCanvas = PixelArtGridCanvas;
}
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { PixelArtGridCanvas };
}
