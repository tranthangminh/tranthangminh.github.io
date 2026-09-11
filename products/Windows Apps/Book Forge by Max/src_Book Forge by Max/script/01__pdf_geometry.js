/**
 * Module 01: PDF Geometry, Spatial Word Reconstruction & Multi-Format Image/Vector Mapping
 * Location: script/01_pdf_geometry.js
 * 
 * Orchestrator:
 * - 01_1_graphics_loader.js: Loads metadata and hybrid suppression bounding boxes.
 * - 01_2_font_analyzer.js: Resolves embedded font styles and dominant body font size.
 * - 01_3_token_extractor.js: Extracts raw tokens with NLP de-spacing and vocab learning.
 * - 01_4_sub_sup_detector.js: Detects footnotes/superscripts/subscripts with strict vertical bounds.
 * - 01_5_line_grouper.js: Clusters tokens into horizontal lines and calibrates word spaces.
 * - 01_6_margin_calibrator.js: Dynamic Header/Footer cutoff detection and gutter margin calculation.
 */

const { loadGraphicsMetadata, getHybridBoxes } = require('./01_graphics_loader');
const { buildFontStyles, computeDominantFontSize } = require('./01_font_analyzer');
const { extractRawTokens } = require('./01_token_extractor');
const { detectSubscriptsAndSuperscripts } = require('./01_sub_sup_detector');
const { groupTokensIntoLines } = require('./01_line_grouper');
const { calibrateMarginsAndFilterHeaders } = require('./01_margin_calibrator');

async function analyzeGeometry(doc, pdfPath, projectDir) {
    const numPages = doc.numPages;
    const pagesData = [];
    const fontSizesCount = {};

    // Step 1: Load Graphics Metadata
    const pageGraphicsMap = loadGraphicsMetadata(projectDir);

    // Step 2: Process each page
    for (let pNum = 1; pNum <= numPages; pNum++) {
        const page = await doc.getPage(pNum);
        const viewport = page.getViewport({ scale: 1.0 });
        const textContent = await page.getTextContent();
        const pageImages = pageGraphicsMap.has(pNum) ? [...pageGraphicsMap.get(pNum)] : [];

        // Build Font Style Map
        const fontStyles = buildFontStyles(page, textContent);
        const hybridBoxes = getHybridBoxes(pageImages);

        // Phase 1: Extract Raw Tokens & De-space
        const rawTokens = extractRawTokens(textContent, fontStyles, hybridBoxes, fontSizesCount);

        // Phase 2: High-Precision Subscript & Superscript Detection
        detectSubscriptsAndSuperscripts(rawTokens);

        // Phase 3 & 4: Line Grouping & Word Merging
        const lines = groupTokensIntoLines(rawTokens);

        pagesData.push({
            pageNum: pNum,
            width: viewport.width,
            height: viewport.height,
            lines,
            images: pageImages
        });
    }

    // Step 3: Compute Dominant Body Font Size
    const dominantFs = computeDominantFontSize(fontSizesCount);

    // Step 4: Calibrate Margins & Filter Running Headers/Footers
    const { avgHeaderY, avgFooterY } = calibrateMarginsAndFilterHeaders(pagesData, numPages);

    return {
        pagesData,
        dominantFs,
        fontSizesCount,
        avgHeaderY,
        avgFooterY
    };
}

module.exports = { analyzeGeometry };
