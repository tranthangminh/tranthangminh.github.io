/**
 * Module: vector_stream.js
 * Stream 3: Pure Vector SVG Generator for crisp standalone vector & hybrid diagram vectors.
 */

const fs = require('fs');
const path = require('path');

function escapeXml(str) {
    if (!str) return '';
    return str
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&apos;');
}

function generateSvgFromPaths(paths, bounds, textItems = []) {
    const pad = 6;
    const vbWidth = Math.ceil(bounds.width + pad * 2);
    const vbHeight = Math.ceil(bounds.height + pad * 2);

    let svgElements = '';

    // 1. Render Vector Paths
    for (let p of paths) {
        if (!p.svgPath || p.isClipOrEnd) continue; // Skip invisible/clip paths

        let transformedPath = '';
        const d = p.svgPath;
        const tokens = d.split(/(?=[MLCZ])/);

        for (let t of tokens) {
            t = t.trim();
            if (!t) continue;
            const cmd = t[0];
            const coords = t.slice(1).trim().split(/[\s,]+/).filter(Boolean).map(Number);

            if (cmd === 'M' || cmd === 'L') {
                if (coords.length >= 2) {
                    const nx = (coords[0] - bounds.minX + pad).toFixed(2);
                    const ny = (bounds.maxY - coords[1] + pad).toFixed(2);
                    transformedPath += ` ${cmd} ${nx} ${ny}`;
                }
            } else if (cmd === 'C') {
                if (coords.length >= 6) {
                    const x1 = (coords[0] - bounds.minX + pad).toFixed(2);
                    const y1 = (bounds.maxY - coords[1] + pad).toFixed(2);
                    const x2 = (coords[2] - bounds.minX + pad).toFixed(2);
                    const y2 = (bounds.maxY - coords[3] + pad).toFixed(2);
                    const x3 = (coords[4] - bounds.minX + pad).toFixed(2);
                    const y3 = (bounds.maxY - coords[5] + pad).toFixed(2);
                    transformedPath += ` C ${x1} ${y1}, ${x2} ${y2}, ${x3} ${y3}`;
                }
            } else if (cmd === 'Z') {
                transformedPath += ' Z';
            }
        }

        const fillAttr = p.isFill ? (p.fillColor || '#000000') : 'none';
        const strokeAttr = p.isStroke ? (p.strokeColor || '#000000') : 'none';
        const strokeWidth = p.lineWidth || 1.0;
        const lineCap = p.lineCap || 'butt';
        const lineJoin = p.lineJoin || 'miter';
        const fillRuleAttr = p.isEvenOdd ? ' fill-rule="evenodd"' : '';
        const opacityAttr = (p.fillAlpha && p.fillAlpha < 1.0) ? ` opacity="${p.fillAlpha}"` : '';

        let extraStrokeAttrs = '';
        if (p.isStroke) {
            extraStrokeAttrs = ` stroke-width="${strokeWidth}" stroke-linecap="${lineCap}" stroke-linejoin="${lineJoin}"`;
            if (p.dashArray && Array.isArray(p.dashArray) && p.dashArray.length > 0) {
                extraStrokeAttrs += ` stroke-dasharray="${p.dashArray.join(',')}"`;
            }
        }

        svgElements += `  <path d="${transformedPath.trim()}" fill="${fillAttr}" stroke="${strokeAttr}"${extraStrokeAttrs}${fillRuleAttr}${opacityAttr} />\n`;
    }

    // 2. Render Text Elements (Diagram Labels)
    if (textItems && textItems.length > 0) {
        svgElements += `  <!-- Diagram Text Labels -->\n`;
        for (let t of textItems) {
            const nx = (t.x - bounds.minX + pad).toFixed(2);
            const ny = (bounds.maxY - t.y + pad).toFixed(2);
            const fs = (t.fontSize || 10).toFixed(1);
            const cleanText = escapeXml(t.str);

            svgElements += `  <text x="${nx}" y="${ny}" font-family="Lora, serif" font-size="${fs}px" fill="#2c2e35">${cleanText}</text>\n`;
        }
    }

    return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${vbWidth} ${vbHeight}" width="${vbWidth}" height="${vbHeight}">
${svgElements}</svg>`;
}

function exportPureVector({ pNum, cl, imagesDir, metadataManager }) {
    const fileName = metadataManager.getNextFileName('svg');
    const svgContent = generateSvgFromPaths(cl.paths, cl, cl.textItems || []);
    const outPath = path.join(imagesDir, fileName);
    fs.writeFileSync(outPath, svgContent, 'utf8');
    const hasText = cl.textItems && cl.textItems.length > 0;
    console.log(`  [Vector Page ${pNum}] Saved ${fileName} (${Math.round(cl.width)}x${Math.round(cl.height)} pt) - ${hasText ? 'Vector Diagram + Text Labels' : 'Pure Vector Paths'}`);
    metadataManager.addIllustrationItem({
        page: pNum,
        type: 'vector',
        file: fileName,
        y: (cl.minY + cl.maxY) / 2,
        bounds: cl
    });
}

module.exports = {
    generateSvgFromPaths,
    exportPureVector
};
