/**
 * Module: raster_stream.js
 * Stream 2: Standalone Raster Image Extractor (sRGB JPEG direct dump & Flate/Grayscale/Masked Puppeteer render).
 */

const fs = require('fs');
const path = require('path');
const { renderPdfCropPuppeteer } = require('./04_renderer');

async function extractStandaloneRaster({
    pNum,
    pageRasterStreams,
    pageImagePlacements,
    imagesDir,
    getBrowser,
    pdfBase64,
    pageWidth,
    pageHeight,
    metadataManager
}) {
    if (!pageRasterStreams || pageRasterStreams.length === 0) return;

    for (let rIdx = 0; rIdx < pageRasterStreams.length; rIdx++) {
        const fileName = metadataManager.getNextFileName('png');
        const outPath = path.join(imagesDir, fileName);
        const browser = await getBrowser();
        if (browser) {
            const placement = pageImagePlacements[rIdx] || pageImagePlacements[0] || {
                minX: 40, maxX: pageWidth - 40,
                minY: 40, maxY: pageHeight - 40,
                width: pageWidth - 80, height: pageHeight - 80
            };
            await renderPdfCropPuppeteer(browser, pdfBase64, pNum, placement, outPath);
            console.log(`  [Raster Page ${pNum}] Saved ${fileName} (${Math.round(placement.width)}x${Math.round(placement.height)} pt) - Rendered sRGB PNG`);
            metadataManager.addIllustrationItem({
                page: pNum,
                type: 'raster',
                file: fileName,
                y: (placement.minY + placement.maxY) / 2,
                bounds: placement
            });
        }
    }
}

module.exports = {
    extractStandaloneRaster
};
