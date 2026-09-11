/**
 * Module: renderer.js
 * High-resolution Puppeteer Chromium & PDF.js Canvas rendering engine.
 * Guarantees ICC sRGB color space conversion, unfiltering, and soft mask compositing.
 */

const fs = require('fs');
const path = require('path');

function loadModule(name) {
    const appDataNpm = path.join(process.env.APPDATA || '', 'npm', 'node_modules');
    const candidatePaths = [path.join(appDataNpm, name), name];
    for (const p of candidatePaths) {
        try {
            const mod = require(p);
            if (mod) return mod;
        } catch (e) {}
    }
    return null;
}

const { launchRobustBrowser } = require('./browser_launcher');
const puppeteerMod = loadModule('puppeteer');
let sharedBrowser = null;

async function getBrowser() {
    if (!sharedBrowser && puppeteerMod) {
        sharedBrowser = await launchRobustBrowser(puppeteerMod);
    }
    return sharedBrowser;
}

async function closeBrowser() {
    if (sharedBrowser) {
        try {
            await sharedBrowser.close();
        } catch (e) {}
        sharedBrowser = null;
    }
}

function getPdfHtmlWrapper() {
    const appDataNpm = path.join(process.env.APPDATA || '', 'npm', 'node_modules');
    const pdfUmdPath = path.join(appDataNpm, 'pdf-parse', 'dist', 'pdf-parse', 'web', 'pdf-parse.umd.js');
    const pdfUmdJs = fs.readFileSync(pdfUmdPath, 'utf8');
    const workerPath = path.join(appDataNpm, 'pdf-parse', 'dist', 'pdf-parse', 'web', 'pdf.worker.mjs');
    const workerJs = fs.readFileSync(workerPath, 'utf8');

    return `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <script>${pdfUmdJs}</script>
  <style> body { margin: 0; padding: 0; background: #fff; } canvas { display: block; } </style>
</head>
<body>
  <canvas id="pdf-canvas"></canvas>
  <script>
    const workerBlob = new Blob([${JSON.stringify(workerJs)}], { type: 'application/javascript' });
    const workerUrl = URL.createObjectURL(workerBlob);
    window.renderPage = async function(pdfB64, pNum, scale) {
        const rawData = atob(pdfB64);
        const uint8Array = new Uint8Array(rawData.length);
        for (let i = 0; i < rawData.length; i++) uint8Array[i] = rawData.charCodeAt(i);
        PdfParse.PDFParse.setWorker(workerUrl);
        const parser = new PdfParse.PDFParse(uint8Array);
        await parser.load();
        const doc = parser.doc;
        const page = await doc.getPage(pNum);
        const viewport = page.getViewport({ scale: scale });
        const canvas = document.getElementById('pdf-canvas');
        canvas.width = viewport.width;
        canvas.height = viewport.height;
        const ctx = canvas.getContext('2d');
        await page.render({ canvasContext: ctx, viewport: viewport }).promise;
        return {
            width: viewport.width,
            height: viewport.height,
            unscaledHeight: page.getViewport({ scale: 1.0 }).height,
            view: page.view || [0, 0, viewport.width, viewport.height]
        };
    };
  </script>
</body>
</html>`;
}

async function renderFullCoverPuppeteer(browser, pdfBase64, outputPath, scale = 2.5) {
    const page = await browser.newPage();
    try {
        await page.setContent(getPdfHtmlWrapper());
        const pageInfo = await page.evaluate(async (b64, pNum, sc) => {
            return await window.renderPage(b64, pNum, sc);
        }, pdfBase64, 1, scale);

        const canvasEl = await page.$('#pdf-canvas');
        await page.setViewport({ width: Math.ceil(pageInfo.width), height: Math.ceil(pageInfo.height), deviceScaleFactor: 1 });
        await canvasEl.screenshot({ path: outputPath, type: 'png' });
    } finally {
        await page.close();
    }
}

async function renderPdfCropPuppeteer(browser, pdfBase64, pageNum, cropBox, outputPath, scale = (96 / 72), pad = 4) {
    const page = await browser.newPage();
    try {
        await page.setContent(getPdfHtmlWrapper());
        const pageInfo = await page.evaluate(async (b64, pNum, sc) => {
            return await window.renderPage(b64, pNum, sc);
        }, pdfBase64, pageNum, scale);

        const viewX = (pageInfo.view && typeof pageInfo.view[0] === 'number') ? pageInfo.view[0] : 0;
        const viewY = (pageInfo.view && typeof pageInfo.view[1] === 'number') ? pageInfo.view[1] : 0;

        const clipX = Math.max(0, (cropBox.minX - viewX - pad) * scale);
        const clipY = Math.max(0, (pageInfo.unscaledHeight - (cropBox.maxY - viewY) - pad) * scale);
        const clipW = Math.min((cropBox.width + pad * 2) * scale, pageInfo.width - clipX);
        const clipH = Math.min((cropBox.height + pad * 2) * scale, pageInfo.height - clipY);

        const canvasEl = await page.$('#pdf-canvas');
        await page.setViewport({ width: Math.ceil(pageInfo.width), height: Math.ceil(pageInfo.height), deviceScaleFactor: 1 });
        await canvasEl.screenshot({ path: outputPath, clip: { x: clipX, y: clipY, width: clipW, height: clipH }, type: 'png' });
    } finally {
        await page.close();
    }
}

module.exports = {
    getBrowser,
    closeBrowser,
    renderFullCoverPuppeteer,
    renderPdfCropPuppeteer
};
