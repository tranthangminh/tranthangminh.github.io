/**
 * 05b-vectorizer-paint.js - QR Color Painter (2-color eyes, linear/radial gradient, one color per vector shape)
 * Splits the finder patterns ("eyes") from the data body and builds the SVG paint markup.
 * Gradient angle: 0 = left to right, increasing clockwise (90 = top to bottom).
 * 100% Vanilla JS
 */

class QrPaint {
    static EYE_SIZE = 7;
    static GRADIENT_ID = 'qrGradient';
    static STEPS = 64;

    /**
     * Split a QR module matrix into the 3 finder patterns (7x7 corners) and the remaining body
     * @returns {{body: Uint8Array, eyes: Uint8Array}}
     */
    static splitEyes(matrix, cols, rows) {
        const body = new Uint8Array(matrix);
        const eyes = new Uint8Array(matrix.length);
        const size = this.EYE_SIZE;
        const origins = [[0, 0], [cols - size, 0], [0, rows - size]];
        for (const [ox, oy] of origins) {
            for (let r = oy; r < oy + size; r++) {
                for (let c = ox; c < ox + size; c++) {
                    const i = r * cols + c;
                    eyes[i] = matrix[i];
                    body[i] = 0;
                }
            }
        }
        return { body, eyes };
    }

    /**
     * Build the paint markup for the 'duo' and 'gradient' color modes
     * @param {Object} ctx - { mode, style, buildShapes, bodyPath, eyePath, matrix, bodyMatrix, cols, rows, scale, pad, fgColor,
     *                         eyeColor, gradColor, gradType, gradAngle, gradPerShape, gradEyes }
     * @returns {string} SVG markup (defs + shapes)
     */
    static render(ctx) {
        const { mode, bodyPath, eyePath, fgColor, eyeColor } = ctx;
        const path = (d, fill) => (d ? `  <path d="${d}" fill="${fill}" />\n` : '');

        if (mode !== 'gradient') return path(bodyPath, fgColor) + path(eyePath, eyeColor);

        const grad = this._gradient(ctx);
        const gradFill = `url(#${this.GRADIENT_ID})`;
        const eyesFollow = Boolean(ctx.gradEyes);

        if (!ctx.gradPerShape) {
            return `  <defs>${grad.markup}</defs>\n` + path(bodyPath, gradFill) + path(eyePath, eyesFollow ? gradFill : eyeColor);
        }

        return this._shapePaths(ctx, eyesFollow ? ctx.matrix : ctx.bodyMatrix, grad) + (eyesFollow ? '' : path(eyePath, eyeColor));
    }

    /** Gradient geometry shared by the continuous gradient and the per-shape color sampling */
    static _gradient(ctx) {
        const { cols, rows, scale, pad, fgColor, gradColor, gradType } = ctx;
        const angle = (Number(ctx.gradAngle) || 0) * Math.PI / 180;
        const w = cols * scale, h = rows * scale;
        const cx = pad * scale + w / 2, cy = pad * scale + h / 2;
        const f = (n) => n.toFixed(2);
        const stops = `<stop offset="0" stop-color="${fgColor}" /><stop offset="1" stop-color="${gradColor}" />`;

        if (gradType === 'radial') {
            const radius = Math.hypot(w, h) / 2;
            return {
                markup: `<radialGradient id="${this.GRADIENT_ID}" gradientUnits="userSpaceOnUse" cx="${f(cx)}" cy="${f(cy)}" r="${f(radius)}">${stops}</radialGradient>`,
                t: (x, y) => Math.hypot(x - cx, y - cy) / radius
            };
        }

        const dx = Math.cos(angle), dy = Math.sin(angle);
        const length = Math.abs(w * dx) + Math.abs(h * dy);
        return {
            markup: `<linearGradient id="${this.GRADIENT_ID}" gradientUnits="userSpaceOnUse" x1="${f(cx - dx * length / 2)}" y1="${f(cy - dy * length / 2)}" x2="${f(cx + dx * length / 2)}" y2="${f(cy + dy * length / 2)}">${stops}</linearGradient>`,
            t: (x, y) => ((x - cx) * dx + (y - cy) * dy) / length + 0.5
        };
    }

    /**
     * One flat color per vector shape (connected outline incl. its holes), sampled from the gradient at the shape centroid.
     * Shapes landing on the same color step are merged into one path, so there are at most STEPS paths.
     */
    static _shapePaths(ctx, mask, grad) {
        const { cols, rows, scale, pad, style, buildShapes } = ctx;
        const from = this._hexToRgb(ctx.fgColor), to = this._hexToRgb(ctx.gradColor);
        const last = this.STEPS - 1;
        const byStep = new Map();

        for (const shape of this._components(mask, cols, rows, style)) {
            const x = (pad + shape.sumX / shape.cells.length + 0.5) * scale;
            const y = (pad + shape.sumY / shape.cells.length + 0.5) * scale;
            const step = Math.round(Math.max(0, Math.min(1, grad.t(x, y))) * last);

            const w = shape.maxX - shape.minX + 1, h = shape.maxY - shape.minY + 1;
            const grid = new Uint8Array(w * h);
            for (const idx of shape.cells) grid[(Math.floor(idx / cols) - shape.minY) * w + (idx % cols - shape.minX)] = 1;
            const d = buildShapes(grid, w, h, pad + shape.minX, pad + shape.minY).path;
            byStep.set(step, (byStep.get(step) || '') + d);
        }

        let out = `  <defs>${grad.markup}</defs>\n`;
        for (const step of [...byStep.keys()].sort((a, b) => a - b)) {
            out += `  <path d="${byStep.get(step)}" fill="${this._lerpHex(from, to, step / last)}" />\n`;
        }
        return out;
    }

    /** Connected groups of dark modules, matching the outline mode: 8-connected, 4-connected, or single modules (blocks) */
    static _components(mask, cols, rows, style) {
        const single = style === 'blocks';
        const diagonal = style !== 'unified-separated';
        const seen = new Uint8Array(mask.length);
        const shapes = [];

        for (let start = 0; start < mask.length; start++) {
            if (!mask[start] || seen[start]) continue;
            const shape = { cells: [], sumX: 0, sumY: 0, minX: cols, maxX: 0, minY: rows, maxY: 0 };
            const queue = [start];
            seen[start] = 1;
            while (queue.length) {
                const idx = queue.pop();
                const c = idx % cols, r = (idx - c) / cols;
                shape.cells.push(idx);
                shape.sumX += c; shape.sumY += r;
                if (c < shape.minX) shape.minX = c;
                if (c > shape.maxX) shape.maxX = c;
                if (r < shape.minY) shape.minY = r;
                if (r > shape.maxY) shape.maxY = r;
                if (single) continue;
                for (let dr = -1; dr <= 1; dr++) {
                    for (let dc = -1; dc <= 1; dc++) {
                        if ((dr === 0 && dc === 0) || (!diagonal && dr !== 0 && dc !== 0)) continue;
                        const nc = c + dc, nr = r + dr;
                        if (nc < 0 || nc >= cols || nr < 0 || nr >= rows) continue;
                        const n = nr * cols + nc;
                        if (mask[n] && !seen[n]) { seen[n] = 1; queue.push(n); }
                    }
                }
            }
            shapes.push(shape);
        }
        return shapes;
    }

    static _hexToRgb(hex) {
        const n = parseInt(String(hex).replace('#', '').padEnd(6, '0').slice(0, 6), 16) || 0;
        return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
    }

    static _lerpHex(a, b, t) {
        const toHex = (i) => Math.round(a[i] + (b[i] - a[i]) * t).toString(16).padStart(2, '0');
        return `#${toHex(0)}${toHex(1)}${toHex(2)}`.toUpperCase();
    }
}

if (typeof window !== 'undefined') {
    window.QrPaint = QrPaint;
}
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { QrPaint };
}
