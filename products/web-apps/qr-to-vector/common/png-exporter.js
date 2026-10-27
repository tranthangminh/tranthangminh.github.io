/**
 * png-exporter.js - High-Resolution PNG Exporter
 * Renders SVG element or string to an offscreen Canvas and downloads as PNG
 * Complies with _RULE-web-apps.md (< 500 lines)
 * 100% Vanilla JS
 */

class PngExporter {
    /**
     * Export SVG string or DOM element as a downloadable PNG image
     * @param {string|SVGElement} svgSource - SVG markup or element
     * @param {string} [filename='pixel-vector.png'] - Output filename
     * @param {number} [scale=1] - Resolution multiplier (default 1x for 1:1 pixel match)
     * @returns {Promise<boolean>}
     */
    static async exportSvg(svgSource, filename = 'pixel-vector.png', scale = 1) {
        let svgString = typeof svgSource === 'string'
            ? svgSource
            : new XMLSerializer().serializeToString(svgSource);

        if (!svgString || !svgString.includes('<svg')) {
            throw new Error('Invalid SVG content provided for PNG export');
        }

        // Ensure proper xmlns declaration
        if (!svgString.includes('xmlns="http://www.w3.org/2000/svg"')) {
            svgString = svgString.replace('<svg ', '<svg xmlns="http://www.w3.org/2000/svg" ');
        }

        // Parse SVG to extract dimension/viewBox
        const parser = new DOMParser();
        const doc = parser.parseFromString(svgString, 'image/svg+xml');
        const svgEl = doc.querySelector('svg');
        if (!svgEl) throw new Error('Could not parse SVG document');

        // 1. Authoritative aspect ratio & intrinsic size from viewBox
        let vbW = 0, vbH = 0;
        const vb = svgEl.getAttribute('viewBox');
        if (vb) {
            const parts = vb.trim().split(/[\s,]+/).map(parseFloat);
            if (parts.length >= 4 && parts[2] > 0 && parts[3] > 0) {
                vbW = parts[2];
                vbH = parts[3];
            }
        }

        // 2. Absolute attributes (ignore percentages like 100%)
        const rawW = svgEl.getAttribute('width') || '';
        const rawH = svgEl.getAttribute('height') || '';
        const attrW = (rawW && !rawW.includes('%')) ? parseFloat(rawW) : 0;
        const attrH = (rawH && !rawH.includes('%')) ? parseFloat(rawH) : 0;

        const baseW = vbW || attrW || 512;
        const baseH = vbH || attrH || 512;

        const targetW = Math.max(1, Math.round(baseW * scale));
        const targetH = Math.max(1, Math.round(baseH * scale));

        // 3. Set explicit rasterization dimensions on SVG element
        svgEl.setAttribute('width', `${targetW}px`);
        svgEl.setAttribute('height', `${targetH}px`);
        if (!svgEl.hasAttribute('viewBox')) {
            svgEl.setAttribute('viewBox', `0 0 ${baseW} ${baseH}`);
        }

        const exportSvgString = new XMLSerializer().serializeToString(svgEl);

        const canvas = document.createElement('canvas');
        canvas.width = targetW;
        canvas.height = targetH;
        const ctx = canvas.getContext('2d');
        if (!ctx) throw new Error('Failed to create 2D canvas context');

        // Disable smoothing to guarantee 100% pure pixel colors without boundary blending
        ctx.imageSmoothingEnabled = false;

        // Render SVG to Image via Blob URL
        const blob = new Blob([exportSvgString], { type: 'image/svg+xml;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const img = new Image();

        try {
            await new Promise((resolve, reject) => {
                img.onload = resolve;
                img.onerror = () => reject(new Error('Failed to rasterize SVG to Image'));
                img.src = url;
            });

            ctx.imageSmoothingEnabled = false;
            ctx.drawImage(img, 0, 0, targetW, targetH);
        } finally {
            URL.revokeObjectURL(url);
        }

        // Trigger native download
        const pngDataUrl = canvas.toDataURL('image/png');
        const downloadLink = document.createElement('a');
        downloadLink.href = pngDataUrl;
        downloadLink.download = filename;
        document.body.appendChild(downloadLink);
        downloadLink.click();
        document.body.removeChild(downloadLink);

        return true;
    }
}

if (typeof window !== 'undefined') {
    window.PngExporter = PngExporter;
}
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { PngExporter };
}
