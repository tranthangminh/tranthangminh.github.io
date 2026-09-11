/**
 * Module 04: Master Graphic Extractor (4-Stream Modular Architecture)
 * Location: script/04_image_extractor.js
 * 
 * Submodules in script/04_image_extractor/:
 * - spatial_matrix.js: 2D matrix math & CTM path parsing
 * - renderer.js: Puppeteer & PDF.js Canvas sRGB rendering
 * - filters.js: Prepress marks, page borders, text underline filters
 * - clustering.js: 2D connected-component clustering & label expansion
 * - cover_stream.js: Stream 1 (Cover)
 * - raster_stream.js: Stream 2 (Standalone Raster)
 * - vector_stream.js: Stream 3 (Pure Vector SVG)
 * - hybrid_stream.js: Stream 4 (Hybrid Diagram)
 * - metadata_manager.js: Numbering, cleanup, metadata.json
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

const pdfParseMod = loadModule('pdf-parse');
const pdfLib = loadModule('pdf-lib');
if (!pdfLib || !pdfParseMod) {
    console.error('❌ Error: pdf-lib and pdf-parse modules are required.');
    process.exit(1);
}

const { PDFDocument, PDFName, PDFRawStream, PDFDict } = pdfLib;

// Submodules
const { transformPoint, multiplyMatrix, parsePathWithCTM } = require('./04_spatial_matrix');
const { getBrowser, closeBrowser } = require('./04_renderer');
const { clusterVectorPaths, associateDiagramLabels } = require('./04_clustering');
const { createMetadataManager } = require('./04_metadata_manager');
const { extractCover } = require('./04_cover_stream');
const { extractStandaloneRaster } = require('./04_raster_stream');
const { exportPureVector } = require('./04_vector_stream');
const { exportHybridDiagram } = require('./04_hybrid_stream');

// CLI Arguments
const args = process.argv.slice(2);
let pdfPath = args[0] || null;
let projectDir = args[1] || process.cwd();

// Auto-detect PDF if not supplied
if (!pdfPath) {
    const folderName = path.basename(path.resolve(projectDir));
    const parentDir = path.join(projectDir, '..');
    const searchDirs = [parentDir, projectDir]; // check parent first

    for (const dir of searchDirs) {
        if (fs.existsSync(dir)) {
            const files = fs.readdirSync(dir);
            // 1. Try exact match
            let exactMatch = files.find(f => f.toLowerCase() === `${folderName.toLowerCase()}.pdf`);
            if (exactMatch) {
                pdfPath = path.join(dir, exactMatch);
                break;
            }

            // 2. Try clean match
            const match = files.find(f => {
                const fLow = f.toLowerCase();
                return fLow.endsWith('.pdf') && 
                       !fLow.includes('(a4') &&
                       !fLow.includes('(a5') &&
                       !fLow.includes('(a6') &&
                       !fLow.includes('(b5') &&
                       !fLow.includes('(us-letter') &&
                       !fLow.includes('(us-trade') &&
                       !fLow.includes('(mass-market') &&
                       !fLow.includes('(kindle') &&
                       !fLow.includes('(crown') &&
                       !fLow.includes('translated') && 
                       !fLow.includes('ban dich') &&
                       !fLow.includes('-exported') &&
                       !fLow.includes('-original');
            });
            if (match) {
                pdfPath = path.join(dir, match);
                break;
            }
        }
    }
}

if (!pdfPath || !fs.existsSync(pdfPath)) {
    console.error(`\n❌ Error: Cannot find PDF file for "${path.basename(path.resolve(projectDir))}".`);
    console.error(`   Looked for PDF in: ${pdfPath || 'Parent and current directory'}`);
    console.error(`   Usage: node script/04_image_extractor.js <pdf_path> [project_dir]\n`);
    process.exit(1);
}

async function extractAllGraphics() {
    console.log(`\n======================================================`);
    console.log(`🎨 4-STREAM MODULAR GRAPHIC EXTRACTOR: ${path.basename(pdfPath)}`);
    console.log(`📁 Project Directory: ${projectDir}`);
    console.log(`======================================================\n`);

    const imagesDir = path.join(projectDir, 'images_original');
    const metadataManager = createMetadataManager(imagesDir);
    metadataManager.cleanOldIllustrations();

    const pdfBytes = fs.readFileSync(pdfPath);
    const pdfBase64 = pdfBytes.toString('base64');
    const pdfDoc = await PDFDocument.load(pdfBytes, { ignoreEncryption: true });
    const pdfLibPages = pdfDoc.getPages();

    const parser = new pdfParseMod.PDFParse(new Uint8Array(pdfBytes));
    await parser.load();
    const doc = parser.doc;

    try {
        for (let pNum = 1; pNum <= doc.numPages; pNum++) {
            const page = await doc.getPage(pNum);
            const viewport = page.getViewport({ scale: 1.0 });
            const pageWidth = viewport.width;
            const pageHeight = viewport.height;
            const opList = await page.getOperatorList();
            const textContent = await page.getTextContent();

function colorToCss(arg) {
    if (!arg) return '#000000';
    if (typeof arg === 'string') {
        if (arg.startsWith('#') || arg.startsWith('rgb')) return arg;
        return arg;
    }
    if (typeof arg === 'number') {
        const v = Math.max(0, Math.min(255, Math.round(arg * 255)));
        return `rgb(${v},${v},${v})`;
    }
    if (Array.isArray(arg)) {
        if (arg.length === 1) {
            const v = Math.max(0, Math.min(255, Math.round(arg[0] * 255)));
            return `rgb(${v},${v},${v})`;
        }
        if (arg.length === 3) {
            const r = Math.round(arg[0] > 1 ? arg[0] : arg[0] * 255);
            const g = Math.round(arg[1] > 1 ? arg[1] : arg[1] * 255);
            const b = Math.round(arg[2] > 1 ? arg[2] : arg[2] * 255);
            return `rgb(${r},${g},${b})`;
        }
        if (arg.length === 4) {
            const c = arg[0], m = arg[1], y = arg[2], k = arg[3];
            const r = Math.round(255 * (1 - c) * (1 - k));
            const g = Math.round(255 * (1 - m) * (1 - k));
            const b = Math.round(255 * (1 - y) * (1 - k));
            return `rgb(${r},${g},${b})`;
        }
    }
    return '#000000';
}

function getLineCap(val) {
    if (val === 1) return 'round';
    if (val === 2) return 'square';
    return 'butt';
}

function getLineJoin(val) {
    if (val === 1) return 'round';
    if (val === 2) return 'bevel';
    return 'miter';
}

            // 1. Collect Vector Paths & Image Placements on this page
            let gState = {
                ctm: [1, 0, 0, 1, 0, 0],
                strokeColor: '#000000',
                fillColor: '#000000',
                lineWidth: 1.0,
                lineCap: 'butt',
                lineJoin: 'miter',
                dashArray: [],
                strokeAlpha: 1.0,
                fillAlpha: 1.0
            };
            const gStateStack = [];
            const pagePaths = [];
            const pageImagePlacements = [];

            for (let i = 0; i < opList.fnArray.length; i++) {
                const fn = opList.fnArray[i];
                const opArgs = opList.argsArray[i];

                if (fn === 10) { // save
                    gStateStack.push(JSON.parse(JSON.stringify(gState)));
                } else if (fn === 11) { // restore
                    if (gStateStack.length > 0) gState = gStateStack.pop();
                } else if (fn === 12 && Array.isArray(opArgs) && opArgs.length === 6) { // transform
                    gState.ctm = multiplyMatrix(gState.ctm, opArgs);
                } else if (fn === 2 && opArgs && typeof opArgs[0] === 'number') { // setLineWidth
                    gState.lineWidth = opArgs[0];
                } else if (fn === 3 && opArgs && typeof opArgs[0] === 'number') { // setLineCap
                    gState.lineCap = getLineCap(opArgs[0]);
                } else if (fn === 4 && opArgs && typeof opArgs[0] === 'number') { // setLineJoin
                    gState.lineJoin = getLineJoin(opArgs[0]);
                } else if (fn === 6 && opArgs) { // setDash
                    if (Array.isArray(opArgs[0])) gState.dashArray = opArgs[0];
                } else if (fn === 9 && opArgs && Array.isArray(opArgs[0])) { // setGState
                    for (const item of opArgs[0]) {
                        if (Array.isArray(item) && item.length >= 2) {
                            if (item[0] === 'CA') gState.strokeAlpha = item[1];
                            else if (item[0] === 'ca') gState.fillAlpha = item[1];
                        }
                    }
                } else if (fn === 56 || fn === 58 || fn === 60 || fn === 52 || fn === 53) { // stroke color
                    gState.strokeColor = colorToCss(opArgs ? (opArgs.length === 1 ? opArgs[0] : opArgs) : '#000000');
                } else if (fn === 57 || fn === 59 || fn === 61 || fn === 54 || fn === 55) { // fill color
                    gState.fillColor = colorToCss(opArgs ? (opArgs.length === 1 ? opArgs[0] : opArgs) : '#000000');
                } else if (fn === 82 || fn === 83 || fn === 85) { // paintImage
                    const p0 = transformPoint({ x: 0, y: 0 }, gState.ctm);
                    const p1 = transformPoint({ x: 1, y: 0 }, gState.ctm);
                    const p2 = transformPoint({ x: 1, y: 1 }, gState.ctm);
                    const p3 = transformPoint({ x: 0, y: 1 }, gState.ctm);
                    const minX = Math.min(p0.x, p1.x, p2.x, p3.x);
                    const maxX = Math.max(p0.x, p1.x, p2.x, p3.x);
                    const minY = Math.min(p0.y, p1.y, p2.y, p3.y);
                    const maxY = Math.max(p0.y, p1.y, p2.y, p3.y);
                    const w = maxX - minX;
                    const h = maxY - minY;
                    if (w >= 10 && h >= 10) {
                        pageImagePlacements.push({ minX, maxX, minY, maxY, width: w, height: h });
                    }
                } else if (fn === 91) { // constructPath
                    const drawOp = opArgs[0];
                    const isClipOrEnd = (drawOp >= 28 && drawOp <= 30);
                    if (!isClipOrEnd) {
                        const res = parsePathWithCTM(opArgs[1], gState.ctm);
                        if (res) {
                            const isStroke = (drawOp === 20 || drawOp === 21 || (drawOp >= 24 && drawOp <= 27));
                            const isFill = (drawOp === 22 || drawOp === 23 || (drawOp >= 24 && drawOp <= 27));
                            const isEvenOdd = (drawOp === 23 || drawOp === 25 || drawOp === 27);

                            const isOuterBox = res.bounds.width > 200 && res.bounds.height > 8 && isFill && (gState.fillColor === '#ffffff' || gState.fillColor === 'rgb(255,255,255)');

                            pagePaths.push({
                                idx: i,
                                ...res,
                                isFill,
                                isStroke,
                                isEvenOdd,
                                isClipOrEnd: false,
                                isOuterBox,
                                strokeColor: gState.strokeColor,
                                fillColor: gState.fillColor,
                                lineWidth: gState.lineWidth,
                                lineCap: gState.lineCap,
                                lineJoin: gState.lineJoin,
                                dashArray: gState.dashArray,
                                strokeAlpha: gState.strokeAlpha,
                                fillAlpha: gState.fillAlpha
                            });
                        }
                    }
                }
            }

            // 2. Collect Raster Images on this page (via pdf-lib)
            const pageRasterStreams = [];
            const pdfLibPage = pdfLibPages[pNum - 1];
            const res = pdfLibPage.node.Resources();
            if (res) {
                const xObj = res.lookup(PDFName.of('XObject'));
                if (xObj && (xObj instanceof PDFDict)) {
                    for (const k of xObj.keys()) {
                        const item = xObj.lookup(k);
                        if (item instanceof PDFRawStream) {
                            const st = item.dict.get(PDFName.of('Subtype'));
                            if (st && st.toString() === '/Image') {
                                const w = parseInt(item.dict.get(PDFName.of('Width')).toString(), 10);
                                const h = parseInt(item.dict.get(PDFName.of('Height')).toString(), 10);
                                if (w >= 20 && h >= 20) {
                                    pageRasterStreams.push({ item, width: w, height: h });
                                }
                            }
                        }
                    }
                }
            }

            // Stream 1: Cover Extractor (Page 1)
            const coverProcessed = await extractCover({
                pNum,
                imagesDir,
                getBrowser,
                pdfBase64,
                metadataManager
            });
            if (coverProcessed) continue;

            // Stream 3 & 4: 2D Spatial Clustering for Vector & Hybrid Diagrams
            const clusters = clusterVectorPaths(pagePaths, pageWidth, pageHeight);

            for (let cl of clusters) {
                const associatedTexts = associateDiagramLabels(cl, textContent);
                const hasRaster = pageRasterStreams.length > 0;

                if (hasRaster) {
                    await exportHybridDiagram({
                        pNum,
                        cl,
                        associatedTexts,
                        imagesDir,
                        getBrowser,
                        pdfBase64,
                        metadataManager
                    });
                } else {
                    // 100% Pure Vector SVG (supports Paths + Text Labels)
                    exportPureVector({
                        pNum,
                        cl,
                        imagesDir,
                        metadataManager
                    });
                }
            }

            // Stream 2: Standalone Pure Raster Extractor
            if (clusters.length === 0 && (pageRasterStreams.length > 0 || pageImagePlacements.length > 0)) {
                await extractStandaloneRaster({
                    pNum,
                    pageRasterStreams,
                    pageImagePlacements,
                    imagesDir,
                    getBrowser,
                    pdfBase64,
                    pageWidth,
                    pageHeight,
                    metadataManager
                });
            }
        }
    } finally {
        await closeBrowser();
    }

    metadataManager.save();
    console.log(`\n🎉 GRAPHIC EXTRACTION COMPLETE! Extracted ${metadataManager.getCounter()} illustrations + Cover.\n`);
}

extractAllGraphics().catch(err => {
    console.error('❌ Fatal error in graphic extraction:', err);
    process.exit(1);
});
