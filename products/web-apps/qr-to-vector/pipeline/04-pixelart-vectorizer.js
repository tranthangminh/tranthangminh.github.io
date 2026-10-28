/**
 * pixelart-vectorizer.js - Multi-Layer & Layered Solid SVG Vectorizer for Pixel Art
 * Generates unified 2D contour polygons (no scanline stripes) with optional Topological
 * Solid Underlays (Matryoshka model).
 * Uses QrContourExtractor for continuous stepped silhouettes and QrFilletRenderer for fillets.
 * Complies with _RULE-web-apps.md (< 500 lines)
 * 100% Vanilla JS
 */

class PixelArtVectorizer {
    /**
     * Vectorize a color-indexed matrix into a multi-layer SVG
     * @param {Int16Array} matrix - Matrix containing palette indices (-1 for transparent)
     * @param {number} cols - Matrix column count
     * @param {number} rows - Matrix row count
     * @param {Array<{hex: string, isTransparent: boolean}>} palette - Color palette
     * @param {Object} [options={}] - Vector style options
     * @returns {string} Complete valid SVG markup string
     */
    static vectorize(matrix, cols, rows, palette, options = {}) {
        const {
            style = 'blocks',
            radius = 0, // 0 to 100 (%)
            blockSize = 16,
            outerPadding = 0, // blocks
            blockGap = 0, // 0 to 40 (%)
            bgColor = '#FFFFFF',
            transparentBg = true,
            layeredSolids = true,
            enclosureThreshold = 0.70
        } = options;

        const totalCells = cols * rows;
        const radiusNorm = Math.max(0, Math.min(1, (radius || 0) / 100));
        const gapNorm = Math.max(0, Math.min(0.4, ((blockGap || 0) / 100) * 0.5));
        const pad = Math.max(0, outerPadding || 0);

        const totalCols = cols + pad * 2;
        const totalRows = rows + pad * 2;
        const totalW = totalCols * blockSize;
        const totalH = totalRows * blockSize;

        const Topology = (typeof window !== 'undefined' && window.PixelArtTopology) ||
                         (typeof require === 'function' ? require('./03-pixelart-topology.js').PixelArtTopology : null);
        const Extractor = (typeof window !== 'undefined' && window.QrContourExtractor) ||
                          (typeof require === 'function' ? require('./03-vectorizer-contours.js').QrContourExtractor : null);
        const Fillet = (typeof window !== 'undefined' && window.QrFilletRenderer) ||
                       (typeof require === 'function' ? require('./04-vectorizer-fillet.js').QrFilletRenderer : null);

        const pathLayers = [];

        // 1. LAYERED SOLID MODE (Function 4: Similarity Graph & Solid Layers)
        if (layeredSolids && Topology && Extractor && Fillet) {
            const comps = (Topology.buildSimilarityGraphAndSolidLayers ? Topology.buildSimilarityGraphAndSolidLayers : Topology.analyze).call(
                Topology, matrix, cols, rows, palette, { threshold: enclosureThreshold }
            );

            for (let i = 0; i < comps.length; i++) {
                const comp = comps[i];
                if (!comp.solidPixels || comp.solidPixels.length === 0) continue;

                const binary = new Uint8Array(totalCells);
                for (let k = 0; k < comp.solidPixels.length; k++) {
                    binary[comp.solidPixels[k]] = 1;
                }

                const pathD = this._renderBinaryMask(
                    binary, cols, rows, style, radiusNorm, gapNorm, blockSize, pad, Extractor, Fillet
                );

                if (pathD.trim()) {
                    pathLayers.push(`<path fill="${comp.hex}" fill-rule="evenodd" d="${pathD.trim()}" data-layer-depth="${comp.depth}" />`);
                }
            }
        } else {
            // 2. FLAT CUTOUT JIGSAW MODE
            for (let pIdx = 0; pIdx < palette.length; pIdx++) {
                const item = palette[pIdx];
                if (item.isTransparent) continue;

                const binary = new Uint8Array(totalCells);
                let hasPixels = false;
                for (let i = 0; i < totalCells; i++) {
                    if (matrix[i] === pIdx) { binary[i] = 1; hasPixels = true; }
                }
                if (!hasPixels) continue;

                const pathD = this._renderBinaryMask(
                    binary, cols, rows, style, radiusNorm, gapNorm, blockSize, pad, Extractor, Fillet
                );

                if (pathD.trim()) {
                    pathLayers.push(`<path fill="${item.hex}" fill-rule="evenodd" d="${pathD.trim()}" />`);
                }
            }
        }

        // Background rect if not transparent
        const bgElement = !transparentBg && bgColor
            ? `<rect width="${totalW}" height="${totalH}" fill="${bgColor}" />`
            : '';

        const shapeRendering = (radiusNorm > 0.001) ? 'geometricPrecision' : 'crispEdges';

        return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${totalW} ${totalH}" width="${totalW}" height="${totalH}" preserveAspectRatio="xMidYMid meet" shape-rendering="${shapeRendering}">\n  ${bgElement}\n  ${pathLayers.join('\n  ')}\n</svg>`;
    }

    /**
     * Render a single binary layer mask according to selected style
     */
    static _renderBinaryMask(binary, cols, rows, style, radiusNorm, gapNorm, blockSize, pad, Extractor, Fillet) {
        if (style === 'blocks' || gapNorm > 0) {
            return Fillet ? (Fillet.render0Connected ? Fillet.render0Connected(binary, cols, rows, radiusNorm, blockSize, blockSize, pad, pad, gapNorm)
                : Fillet.renderDiscreteBlocks(binary, cols, rows, radiusNorm, blockSize, blockSize, pad, pad, gapNorm)) : '';
        }
        if (!Extractor || !Fillet) return '';
        const loops = (style === 'unified-separated')
            ? (Extractor.extract4Connected ? Extractor.extract4Connected(binary, cols, rows) : Extractor.extract(binary, cols, rows, false))
            : (Extractor.extract8Connected ? Extractor.extract8Connected(binary, cols, rows) : Extractor.extract(binary, cols, rows, true));
        return loops.map(loop => Fillet.renderLoop(
            loop, radiusNorm * 0.5, blockSize, blockSize, pad, pad
        )).join(' ');
    }
}

if (typeof window !== 'undefined') {
    window.PixelArtVectorizer = PixelArtVectorizer;
}
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { PixelArtVectorizer };
}
