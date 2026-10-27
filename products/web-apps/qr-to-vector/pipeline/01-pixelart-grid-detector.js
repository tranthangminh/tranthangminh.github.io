/**
 * pixelart-grid-detector.js - Robust Bounding Box Detector & Grid Sampler
 * Pipeline Step for 8-Bit Pixel Art:
 *  - Detects object bounding box (eliminating surrounding transparent/solid margins)
 *  - Auto-estimates optimal columns and rows based on detected block pitch
 *  - Core-samples center 50% of each cell inside the bounding box
 * Complies with _RULE-web-apps.md (< 500 lines)
 * 100% Vanilla JS
 */

class PixelArtGridDetector {
    /**
     * Automatically detect object bounding box (cropping transparent or solid uniform borders)
     * @param {ImageData} imageData
     * @returns {{x: number, y: number, w: number, h: number}}
     */
    static detectObjectBoundingBox(imageData) {
        const { width: w, height: h, data } = imageData;
        if (w <= 2 || h <= 2) return { x: 0, y: 0, w, h };

        // 1. Inspect 4 corners to determine background mode
        const corners = [
            0,
            (w - 1) * 4,
            ((h - 1) * w) * 4,
            ((h - 1) * w + (w - 1)) * 4
        ];

        let transCount = 0;
        for (const idx of corners) {
            if (data[idx + 3] < 20) transCount++;
        }

        const isTransparentBg = transCount >= 2;
        let bgR = 0, bgG = 0, bgB = 0;

        if (!isTransparentBg) {
            // Check if corner pixels share a uniform solid background color
            bgR = data[corners[0]];
            bgG = data[corners[0] + 1];
            bgB = data[corners[0] + 2];
            let matches = 0;
            for (const idx of corners) {
                const diff = Math.abs(data[idx] - bgR) + Math.abs(data[idx + 1] - bgG) + Math.abs(data[idx + 2] - bgB);
                if (diff < 24) matches++;
            }
            // If corners don't agree, default to full image bounding box
            if (matches < 3) return { x: 0, y: 0, w, h };
        }

        const isForeground = (r, g, b, a) => {
            if (a < 20) return false;
            if (isTransparentBg) return true;
            const diff = Math.abs(r - bgR) + Math.abs(g - bgG) + Math.abs(b - bgB);
            return diff > 24;
        };

        // 2. Scan bounds for foreground pixels
        let minX = w, maxX = -1, minY = h, maxY = -1;

        for (let y = 0; y < h; y++) {
            const rowOffset = y * w * 4;
            for (let x = 0; x < w; x++) {
                const idx = rowOffset + x * 4;
                if (isForeground(data[idx], data[idx + 1], data[idx + 2], data[idx + 3])) {
                    if (x < minX) minX = x;
                    if (x > maxX) maxX = x;
                    if (y < minY) minY = y;
                    if (y > maxY) maxY = y;
                }
            }
        }

        // If no foreground detected or object occupies virtually full canvas
        if (maxX < minX || maxY < minY) {
            return { x: 0, y: 0, w, h };
        }

        const bw = maxX - minX + 1;
        const bh = maxY - minY + 1;

        // If borders are negligible (<= 1px all around), use full image
        if (bw >= w - 1 && bh >= h - 1) {
            return { x: 0, y: 0, w, h };
        }

        return { x: minX, y: minY, w: bw, h: bh };
    }

    /**
     * Automatically detect fundamental block pitch using edge projections
     * @param {ImageData} imageData
     * @returns {{pitch: number, pitchX: number, pitchY: number, offsetX: number, offsetY: number}}
     */
    static detectGrid(imageData) {
        const { width: w, height: h, data } = imageData;
        if (w < 4 || h < 4) return { pitch: 1, pitchX: 1, pitchY: 1, offsetX: 0, offsetY: 0 };

        const diffX = new Float32Array(w);
        const stepY = Math.max(1, Math.floor(h / 300));
        for (let x = 0; x < w - 1; x++) {
            let sum = 0;
            for (let y = 0; y < h; y += stepY) {
                const i1 = (y * w + x) * 4, i2 = (y * w + x + 1) * 4;
                sum += Math.abs(data[i1] - data[i2]) + Math.abs(data[i1 + 1] - data[i2 + 1]) + Math.abs(data[i1 + 2] - data[i2 + 2]);
            }
            diffX[x] = sum;
        }

        const diffY = new Float32Array(h);
        const stepX = Math.max(1, Math.floor(w / 300));
        for (let y = 0; y < h - 1; y++) {
            let sum = 0;
            for (let x = 0; x < w; x += stepX) {
                const i1 = (y * w + x) * 4, i2 = ((y + 1) * w + x) * 4;
                sum += Math.abs(data[i1] - data[i2]) + Math.abs(data[i1 + 1] - data[i2 + 1]) + Math.abs(data[i1 + 2] - data[i2 + 2]);
            }
            diffY[y] = sum;
        }

        const resX = this._findPitchAndOffset(diffX, w);
        const resY = this._findPitchAndOffset(diffY, h);

        let pitch = 8;
        if (resX.pitch > 1 && resY.pitch > 1) {
            pitch = (resX.support >= resY.support) ? resX.pitch : resY.pitch;
        } else if (resX.pitch > 1) {
            pitch = resX.pitch;
        } else if (resY.pitch > 1) {
            pitch = resY.pitch;
        } else {
            pitch = 1;
        }

        const p = Math.max(1, Math.min(64, pitch));
        return { pitch: p, pitchX: p, pitchY: p, offsetX: resX.offset || 0, offsetY: resY.offset || 0 };
    }

    static _findPitchAndOffset(diff, len) {
        let sum = 0;
        for (let i = 0; i < len; i++) sum += diff[i];
        const mean = sum / len;

        const peaks = [];
        for (let i = 1; i < len - 1; i++) {
            if (diff[i] > mean * 0.4 && diff[i] >= diff[i - 1] && diff[i] >= diff[i + 1]) {
                peaks.push(i);
            }
        }
        if (peaks.length < 2) return { pitch: 1, offset: 0, support: 0 };

        const intervalCounts = {};
        for (let i = 0; i < peaks.length; i++) {
            for (let j = i + 1; j < Math.min(peaks.length, i + 8); j++) {
                const dist = peaks[j] - peaks[i];
                if (dist >= 2 && dist <= 64) {
                    intervalCounts[dist] = (intervalCounts[dist] || 0) + 1;
                }
            }
        }

        let bestPitch = 1, maxSupport = 0;
        for (let s = 2; s <= Math.min(48, Math.floor(len / 4)); s++) {
            let support = 0;
            for (let k = 1; k <= 5; k++) {
                const dist = s * k;
                if (intervalCounts[dist]) support += intervalCounts[dist] / Math.sqrt(k);
            }
            if (support > maxSupport) {
                maxSupport = support;
                bestPitch = s;
            }
        }

        const offsetWeights = {};
        for (let i = 0; i < peaks.length; i++) {
            const off = (peaks[i] + 1) % bestPitch;
            offsetWeights[off] = (offsetWeights[off] || 0) + 1 / (1 + i * 0.25);
        }

        let bestOffset = 0, maxWeight = 0;
        for (const off in offsetWeights) {
            if (offsetWeights[off] > maxWeight) {
                maxWeight = offsetWeights[off];
                bestOffset = parseInt(off, 10);
            }
        }
        return { pitch: bestPitch, offset: bestOffset, support: maxSupport };
    }

    /**
     * Auto estimate columns and rows for a given bounding box based on detected block pitch
     * @param {ImageData} imageData
     * @param {{x: number, y: number, w: number, h: number}} bbox
     * @returns {{cols: number, rows: number, pitch: number}}
     */
    static estimateGridForBBox(imageData, bbox) {
        const det = this.detectGrid(imageData);
        let pitch = Math.max(1, det.pitch || 8);
        let cols = Math.max(1, Math.round(bbox.w / pitch));
        if (cols > 128) {
            cols = 64;
            pitch = Math.max(1, Math.round(bbox.w / cols));
        }
        const rows = Math.max(1, Math.round(bbox.h / pitch));
        return { cols, rows, pitch };
    }

    /**
     * Core-sample center 50% of each cell inside bounding box
     * @param {ImageData} imageData
     * @param {{x: number, y: number, w: number, h: number}} bbox
     * @param {number} cols - Number of columns inside bbox
     * @param {number} rows - Number of rows inside bbox
     * @returns {{cols: number, rows: number, cells: Array<{r: number, g: number, b: number, a: number}>}}
     */
    static sampleCellsFromBBox(imageData, bbox, cols, rows) {
        const { width: imgW, height: imgH, data } = imageData;
        const cCount = Math.max(1, cols), rCount = Math.max(1, rows);
        const bx = bbox.x || 0, by = bbox.y || 0;
        const bw = bbox.w !== undefined ? bbox.w : (bbox.width || imgW);
        const bh = bbox.h !== undefined ? bbox.h : (bbox.height || imgH);
        const cellW = bw / cCount, cellH = bh / rCount;
        const cells = [];

        for (let r = 0; r < rCount; r++) {
            const cy = by + (r + 0.5) * cellH;
            const halfH = Math.max(0.5, cellH * 0.25);
            const startY = Math.max(0, Math.floor(cy - halfH));
            const endY = Math.min(imgH, Math.ceil(cy + halfH));

            for (let c = 0; c < cCount; c++) {
                const cx = bx + (c + 0.5) * cellW;
                const halfW = Math.max(0.5, cellW * 0.25);
                const startX = Math.max(0, Math.floor(cx - halfW));
                const endX = Math.min(imgW, Math.ceil(cx + halfW));

                let sumR = 0, sumG = 0, sumB = 0, sumA = 0, count = 0;

                for (let y = startY; y < endY; y++) {
                    const rowIdx = y * imgW * 4;
                    for (let x = startX; x < endX; x++) {
                        const idx = rowIdx + x * 4;
                        const a = data[idx + 3];
                        if (a > 24) {
                            sumR += data[idx];
                            sumG += data[idx + 1];
                            sumB += data[idx + 2];
                            sumA += a;
                            count++;
                        }
                    }
                }

                if (count > 0) {
                    cells.push({
                        r: Math.round(sumR / count),
                        g: Math.round(sumG / count),
                        b: Math.round(sumB / count),
                        a: Math.round(sumA / count)
                    });
                } else {
                    cells.push({ r: 0, g: 0, b: 0, a: 0 });
                }
            }
        }
        return { cols: cCount, rows: rCount, cells };
    }

    /**
     * Project the grid from bounding box outward to cover the entire image
     */
    static projectFullImageGrid(imgW, imgH, bbox, cols, rows) {
        const cCount = Math.max(1, cols), rCount = Math.max(1, rows);
        const bx = bbox.x || 0, by = bbox.y || 0;
        const bw = bbox.w !== undefined ? bbox.w : (bbox.width || imgW);
        const bh = bbox.h !== undefined ? bbox.h : (bbox.height || imgH);
        const pitchX = bw / cCount, pitchY = bh / rCount;
        const colsLeft = Math.ceil(bx / pitchX);
        const startX = bx - colsLeft * pitchX;
        const colsRight = Math.ceil((imgW - (bx + bw)) / pitchX);
        const totalCols = Math.max(1, colsLeft + cCount + colsRight);

        const rowsTop = Math.ceil(by / pitchY);
        const startY = by - rowsTop * pitchY;
        const rowsBottom = Math.ceil((imgH - (by + bh)) / pitchY);
        const totalRows = Math.max(1, rowsTop + rCount + rowsBottom);

        return { startX, startY, pitchX, pitchY, totalCols, totalRows, colsLeft, rowsTop };
    }

    /**
     * Core-sample center 50% of each cell across entire image using bounding-box-aligned projected grid
     */
    static sampleCellsFullProjected(imageData, bbox, cols, rows) {
        const { width: imgW, height: imgH, data } = imageData;
        const proj = this.projectFullImageGrid(imgW, imgH, bbox, cols, rows);
        const cells = [];

        for (let r = 0; r < proj.totalRows; r++) {
            const cy = proj.startY + (r + 0.5) * proj.pitchY;
            const halfH = Math.max(0.5, proj.pitchY * 0.25);
            const startY = Math.max(0, Math.floor(cy - halfH));
            const endY = Math.min(imgH, Math.ceil(cy + halfH));

            for (let c = 0; c < proj.totalCols; c++) {
                const cx = proj.startX + (c + 0.5) * proj.pitchX;
                const halfW = Math.max(0.5, proj.pitchX * 0.25);
                const startX = Math.max(0, Math.floor(cx - halfW));
                const endX = Math.min(imgW, Math.ceil(cx + halfW));

                let sumR = 0, sumG = 0, sumB = 0, sumA = 0, count = 0;
                for (let y = startY; y < endY; y++) {
                    const rowIdx = y * imgW * 4;
                    for (let x = startX; x < endX; x++) {
                        const idx = rowIdx + x * 4;
                        const a = data[idx + 3];
                        if (a > 24) {
                            sumR += data[idx]; sumG += data[idx + 1]; sumB += data[idx + 2]; sumA += a;
                            count++;
                        }
                    }
                }
                if (count > 0) {
                    cells.push({
                        r: Math.round(sumR / count), g: Math.round(sumG / count),
                        b: Math.round(sumB / count), a: Math.round(sumA / count)
                    });
                } else {
                    cells.push({ r: 0, g: 0, b: 0, a: 0 });
                }
            }
        }
        return { cols: proj.totalCols, rows: proj.totalRows, cells, gridMeta: proj };
    }

    /**
     * Legacy compatibility wrapper
     */
    static sampleCells(imageData, pitchX, pitchY, offsetX = 0, offsetY = 0) {
        const { width: imgW, height: imgH } = imageData;
        const bbox = { x: offsetX, y: offsetY, w: imgW - offsetX, h: imgH - offsetY };
        const cols = Math.max(1, Math.floor(bbox.w / pitchX));
        const rows = Math.max(1, Math.floor(bbox.h / pitchY));
        return this.sampleCellsFromBBox(imageData, bbox, cols, rows);
    }
}

if (typeof window !== 'undefined') {
    window.PixelArtGridDetector = PixelArtGridDetector;
}
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { PixelArtGridDetector };
}
