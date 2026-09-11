/**
 * Module 07 Helper: Cover Page Engine
 * Location: script/07_cover_engine.js
 * 
 * Responsibilities:
 * 1. Discover cover image files in project directories (images/, assets/images/, etc.)
 * 2. Generate standalone 0-margin full-bleed HTML for cover rendering using Aspect Fill (object-fit: cover)
 * 3. Render 0-margin cover PDF bytes via Puppeteer with subpixel bleed protection
 * 4. Merge Cover Page at index 0 into the main PDF document while preserving Outlines/Bookmarks
 */

const fs = require('fs');
const path = require('path');

/**
 * Finds active cover image in standard project directories
 */
function findCoverImage(projectDir, isVietnamese = false) {
    const exts = ['.png', '.jpg', '.jpeg', '.webp', '.svg'];
    const preferredDir = isVietnamese ? 'images_translated' : 'images_original';
    const fallbackDir = isVietnamese ? 'images_original' : 'images_translated';

    const candidatePaths = [
        ...exts.map(ext => path.join(projectDir, preferredDir, `cover${ext}`)),
        ...exts.map(ext => path.join(projectDir, fallbackDir, `cover${ext}`)),
        ...exts.map(ext => path.join(projectDir, 'images', `cover${ext}`))
    ];

    for (const p of candidatePaths) {
        if (fs.existsSync(p) && fs.statSync(p).isFile()) {
            return p;
        }
    }
    return null;
}

/**
 * Generates standalone full-bleed 0-margin HTML for the Cover Page (Aspect Fill)
 */
function generateCoverHtml(coverImagePath, selectedProfile) {
    const coverRaw = fs.readFileSync(coverImagePath);
    const coverB64 = coverRaw.toString('base64');
    let mimeType = 'image/jpeg';
    if (coverImagePath.endsWith('.png')) mimeType = 'image/png';
    else if (coverImagePath.endsWith('.webp')) mimeType = 'image/webp';
    else if (coverImagePath.endsWith('.svg')) mimeType = 'image/svg+xml';

    return `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    @page {
      size: ${selectedProfile.width} ${selectedProfile.height};
      margin: 0;
    }
    *, *::before, *::after {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
    }
    html, body {
      margin: 0;
      padding: 0;
      width: 100%;
      height: 100%;
      overflow: hidden;
      background-color: #000000;
    }
    .cover-wrapper {
      position: absolute;
      top: 0;
      left: 0;
      width: 100vw;
      height: 100vh;
      margin: 0;
      padding: 0;
      overflow: hidden;
      display: flex;
      justify-content: center;
      align-items: center;
    }
    img {
      width: 100%;
      height: 100%;
      object-fit: cover;
      object-position: center center;
      display: block;
      transform: scale(1.003); /* Micro-bleed scale to eliminate any 1-2px subpixel rounding gap */
    }
  </style>
</head>
<body>
  <div class="cover-wrapper">
    <img src="data:${mimeType};base64,${coverB64}" alt="Cover" />
  </div>
</body>
</html>`;
}

/**
 * Renders standalone 0-margin Cover Page PDF bytes via Puppeteer (Aspect Fill)
 */
async function renderCoverPdf(browser, coverImagePath, selectedProfile) {
    const coverHtml = generateCoverHtml(coverImagePath, selectedProfile);
    const coverPage = await browser.newPage();
    
    // Set precise viewport with high device scale factor for crisp rendering
    const mmToPx = 3.779527559;
    const wPx = Math.ceil(parseFloat(selectedProfile.width) * mmToPx);
    const hPx = Math.ceil(parseFloat(selectedProfile.height) * mmToPx);
    
    await coverPage.setViewport({
        width: wPx,
        height: hPx,
        deviceScaleFactor: 2
    });

    await coverPage.setContent(coverHtml, { waitUntil: 'networkidle0' });

    const coverPdfBytes = await coverPage.pdf({
        width: selectedProfile.width,
        height: selectedProfile.height,
        margin: { top: 0, right: 0, bottom: 0, left: 0 },
        printBackground: true,
        preferCSSPageSize: true,
        displayHeaderFooter: false
    });

    await coverPage.close();
    return coverPdfBytes;
}

/**
 * Prepends the Cover Page to the loaded PDF-Lib document at index 0 preserving bookmarks
 */
async function prependCoverToDocument(pdfLibMod, targetDoc, coverPdfBytes) {
    if (!coverPdfBytes) return;
    const coverDoc = await pdfLibMod.PDFDocument.load(coverPdfBytes);
    const [copiedCover] = await targetDoc.copyPages(coverDoc, [0]);
    targetDoc.insertPage(0, copiedCover);
}

module.exports = {
    findCoverImage,
    generateCoverHtml,
    renderCoverPdf,
    prependCoverToDocument
};
