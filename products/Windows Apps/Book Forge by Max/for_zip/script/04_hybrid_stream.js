/**
 * Module: hybrid_stream.js
 * Stream 4: Hybrid Diagram Extractor (Vector + Text / Raster) rendered at 300 DPI via Chromium Canvas.
 */

const path = require('path');
const { renderPdfCropPuppeteer } = require('./04_renderer');

async function exportHybridDiagram({
    pNum,
    cl,
    associatedTexts,
    imagesDir,
    getBrowser,
    pdfBase64,
    metadataManager
}) {
    const fileName = metadataManager.getNextFileName('png');
    const outPath = path.join(imagesDir, fileName);
    const browser = await getBrowser();
    if (browser) {
        await renderPdfCropPuppeteer(browser, pdfBase64, pNum, cl, outPath);
        console.log(`  [Hybrid Page ${pNum}] Saved ${fileName} (${Math.round(cl.width)}x${Math.round(cl.height)} pt) - Hybrid Vector+Text/Raster`);
        metadataManager.addIllustrationItem({
            page: pNum,
            type: 'hybrid',
            file: fileName,
            y: (cl.minY + cl.maxY) / 2,
            bounds: cl,
            suppressedTexts: associatedTexts
        });
    }
}

module.exports = {
    exportHybridDiagram
};
