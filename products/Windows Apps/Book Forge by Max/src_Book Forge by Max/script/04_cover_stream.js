/**
 * Module: cover_stream.js
 * Stream 1: High-resolution true-color sRGB Cover extractor for Page 1.
 */

const path = require('path');
const { renderFullCoverPuppeteer } = require('./04_renderer');

async function extractCover({ pNum, imagesDir, getBrowser, pdfBase64, metadataManager }) {
    if (pNum !== 1) return false;

    const coverOut = path.join(imagesDir, 'cover.png');
    const browser = await getBrowser();
    if (browser) {
        await renderFullCoverPuppeteer(browser, pdfBase64, coverOut);
        console.log(`  [Cover] Extracted: images_original/cover.png (High-Res sRGB Color Managed PNG)`);
        metadataManager.addCoverItem('cover.png');
        return true;
    }
    return false;
}

module.exports = {
    extractCover
};
