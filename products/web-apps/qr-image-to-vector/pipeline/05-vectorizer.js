/**
 * 05-vectorizer.js - SVG Vectorizer Coordinator
 * Pipeline Step 05: Assembles pure QR matrix into styled vector SVG
 * Complies with _RULE-web-apps.md (< 500 lines)
 * 100% Vanilla JS, SVG Decomposition
 */

class QrVectorizer {
    /**
     * Vectorize a pure boolean QR module matrix
     * @param {{matrix: Uint8Array, cols: number, rows: number, text?: string, logoBox?: Object}} matrixData
     * @param {Object} options
     * @returns {Object} SVG string and stats
     */
    static vectorizeMatrix(matrixData, options = {}) {
        const {
            matrix,
            cols,
            rows,
            text = '',
            logoBox = null
        } = matrixData;

        const {
            mode = 'unified-connected', // 'unified-connected' | 'unified-separated' | 'blocks'
            cornerRadius = 50,          // 0 to 100
            outerPadding = 3,           // Quiet zone in modules (default 3)
            blockGap = 0,               // Gap between blocks (0 to 40%)
            fgColor = '#000000',
            bgColor = '#FFFFFF',
            transparentBg = false,
            moduleResolution = 16,      // SVG base unit per module (default 16px)
            blockSize = 16,
            logoData = null,
            logoScale = 80,
            colorMode = 'solid',        // 'solid' | 'duo' | 'gradient'
            eyeColor = '#000000',       // Finder patterns color (duo, and gradient when gradEyes is off)
            gradColor = '#2563EB',      // Second gradient color (first one is fgColor)
            gradType = 'linear',        // 'linear' | 'radial'
            gradAngle = 45,             // Linear gradient angle in degrees
            gradPerShape = false,       // One flat gradient color per module
            gradEyes = false            // Finder patterns follow the gradient
        } = options;

        const isTransparent = Boolean(transparentBg) || bgColor === 'transparent';

        const padBlocks = Math.max(0, Math.min(10, Math.round(outerPadding)));
        const finalCols = cols + 2 * padBlocks;
        const finalRows = rows + 2 * padBlocks;
        const scale = Math.max(8, Math.min(60, blockSize || moduleResolution || 16));
        const finalSvgWidth = finalCols * scale;
        const finalSvgHeight = finalRows * scale;

        const radiusNorm = Math.max(0, Math.min(100, cornerRadius)) / 100;
        const gapNorm = (Math.max(0, Math.min(40, blockGap)) / 100) * 0.5;

        // Builds the path data of a module grid placed at (offX, offY) modules; defaults to the whole QR.
        const buildShapes = (grid, gridCols = cols, gridRows = rows, offX = padBlocks, offY = padBlocks) => {
            if (mode === 'blocks') {
                let count = 0;
                for (let i = 0; i < grid.length; i++) {
                    if (grid[i]) count++;
                }
                return {
                    path: QrFilletRenderer.render0Connected(grid, gridCols, gridRows, radiusNorm, scale, scale, offX, offY, gapNorm),
                    count
                };
            }
            const loops = (mode === 'unified-separated')
                ? (QrContourExtractor.extract4Connected ? QrContourExtractor.extract4Connected(grid, gridCols, gridRows) : QrContourExtractor.extract(grid, gridCols, gridRows, false))
                : (QrContourExtractor.extract8Connected ? QrContourExtractor.extract8Connected(grid, gridCols, gridRows) : QrContourExtractor.extract(grid, gridCols, gridRows, true));
            const filletRadius = radiusNorm * 0.5;
            return {
                path: loops.map(l => QrFilletRenderer.renderLoop(l, filletRadius, scale, scale, offX, offY)).join(''),
                count: loops.length
            };
        };

        let paintMarkup;
        let shapeCount;
        if (colorMode === 'duo' || colorMode === 'gradient') {
            const { body, eyes } = QrPaint.splitEyes(matrix, cols, rows);
            const bodyShapes = buildShapes(body), eyeShapes = buildShapes(eyes);
            shapeCount = bodyShapes.count + eyeShapes.count;
            paintMarkup = QrPaint.render({
                mode: colorMode, style: mode, buildShapes, bodyPath: bodyShapes.path, eyePath: eyeShapes.path, matrix, bodyMatrix: body,
                cols, rows, scale, pad: padBlocks, fgColor, eyeColor, gradColor, gradType, gradAngle, gradPerShape, gradEyes
            });
        } else {
            const shapes = buildShapes(matrix);
            shapeCount = shapes.count;
            paintMarkup = `  <path d="${shapes.path}" fill="${fgColor}" />\n`;
        }

        let backgroundElement = '';
        if (!isTransparent && bgColor && bgColor !== 'transparent') {
            backgroundElement = `  <rect width="${finalSvgWidth}" height="${finalSvgHeight}" fill="${bgColor}" />\n`;
        }

        // Center Logo Overlay with Quiet Pad matching bgColor (never hardcoded white)
        let logoElement = '';
        if (logoBox && logoData) {
            const boxX = (padBlocks + logoBox.startX) * scale;
            const boxY = (padBlocks + logoBox.startY) * scale;
            const boxSize = logoBox.k * scale;
            const scaleRatio = Math.max(0.2, Math.min(1.0, (logoScale || 80) / 100));
            const logoW = boxSize * scaleRatio;
            const logoH = boxSize * scaleRatio;
            const logoX = boxX + (boxSize - logoW) / 2;
            const logoY = boxY + (boxSize - logoH) / 2;

            let padRect = '';
            if (!isTransparent && bgColor && bgColor !== 'transparent') {
                padRect = `  <rect x="${boxX}" y="${boxY}" width="${boxSize}" height="${boxSize}" fill="${bgColor}" />\n`;
            }
            logoElement = `${padRect}  <image href="${logoData}" x="${logoX}" y="${logoY}" width="${logoW}" height="${logoH}" preserveAspectRatio="xMidYMid meet" />\n`;
        }

        const shapeRendering = (radiusNorm > 0.001) ? 'geometricPrecision' : 'crispEdges';
        const svgString = `<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" viewBox="0 0 ${finalSvgWidth} ${finalSvgHeight}" width="${finalSvgWidth}" height="${finalSvgHeight}" fill-rule="evenodd" shape-rendering="${shapeRendering}">
${backgroundElement}${paintMarkup}${logoElement}</svg>`;

        return {
            svgString,
            width: finalSvgWidth,
            height: finalSvgHeight,
            shapeCount,
            gridCols: finalCols,
            gridRows: finalRows,
            moduleCount: cols,
            text,
            logoBox
        };
    }

    /**
     * Complete Full Pipeline: Image -> Scan -> Extract Matrix -> Vectorize
     */
    static async processImage(imageSource, options = {}) {
        const scanResult = await QrScanner.scan(imageSource);
        if (!scanResult.success || !scanResult.text) {
            return {
                success: false,
                error: scanResult.error || 'NO_QR_DETECTED'
            };
        }

        const matrixData = QrMatrixGenerator.generate(scanResult.text, options);
        const vectorData = this.vectorizeMatrix(matrixData, options);

        return {
            success: true,
            text: scanResult.text,
            engine: scanResult.engine,
            ...vectorData
        };
    }
}

if (typeof window !== 'undefined') {
    window.QrVectorizer = QrVectorizer;
}
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { QrVectorizer };
}
