#!/usr/bin/env node

/**
 * Module 07: Professional Book & PDF Publishing Engine
 * Location: script/07__pdf_publisher.js
 * 
 * Orchestrates:
 * - script/07_cover_engine.js: Cover page discovery, 0-margin rendering & merging
 * - script/07_toc_engine.js: Dynamic Table of Contents (2-pass measurement)
 * - script/07_image_layout_engine.js: Proportional image layout & smart pagination
 */

const fs = require('fs');
const path = require('path');

function requireGlobal(moduleName) {
    const appDataNpm = path.join(process.env.APPDATA || '', 'npm', 'node_modules');
    const localPath = path.join(appDataNpm, moduleName);
    try {
        if (fs.existsSync(localPath)) return require(localPath);
    } catch (e) {}
    try {
        return require(moduleName);
    } catch (e) {
        return null;
    }
}

// Sub-engines
const coverEngine = require('./07_cover_engine.js');
const tocEngine = require('./07_toc_engine.js');
const imageEngine = require('./07_image_layout_engine.js');
const outlineEngine = require('./07_outline_engine.js');
const gutterEngine = require('./07_gutter_engine.js');
const headerEngine = require('./07_header_engine.js');

const { launchRobustBrowser } = require('./browser_launcher');

// External libraries
const puppeteerMod = requireGlobal('puppeteer');
const markdownItMod = requireGlobal('markdown-it');
const pdfLibMod = requireGlobal('pdf-lib');
const pdfParseMod = requireGlobal('pdf-parse');

if (!puppeteerMod) {
    console.error('❌ Error: puppeteer module is required. Please install via: npm install -g puppeteer');
    process.exit(1);
}
if (!pdfLibMod) {
    console.error('❌ Error: pdf-lib module is required. Please install via: npm install -g pdf-lib');
    process.exit(1);
}
if (!pdfParseMod) {
    console.error('❌ Error: pdf-parse module is required. Please install via: npm install -g pdf-parse');
    process.exit(1);
}

// ── 1. Page Geometry & Paper Profiles ──
const PROFILES = gutterEngine.PROFILES;

/**
 * Returns local @font-face definition for Lora from script folder
 */
function getLoraFontDef() {
    const regPath = path.join(__dirname, 'Lora-VariableFont_wght.ttf');
    const itaPath = path.join(__dirname, 'Lora-Italic-VariableFont_wght.ttf');

    const regUri = 'file:///' + regPath.replace(/\\/g, '/').replace(/'/g, '%27').replace(/ /g, '%20');
    const itaUri = 'file:///' + itaPath.replace(/\\/g, '/').replace(/'/g, '%27').replace(/ /g, '%20');
    return `
    @font-face {
      font-family: 'Lora';
      font-style: normal;
      font-weight: 100 900;
      src: url("${regUri}") format("truetype");
    }
    @font-face {
      font-family: 'Lora';
      font-style: italic;
      font-weight: 100 900;
      src: url("${itaUri}") format("truetype");
    }
    `;
}

// ── 2. Curated Typography Font ──
const FONTS = {
    'Lora': {
        name: 'Lora (Modern Literary Serif)',
        fontFamily: "'Lora', serif"
    }
};

// ── 3. CLI Argument Parsing ──
const args = process.argv.slice(2);
let inputPath = null;
let profileKey = 'A5';
let bindingMode = 'print'; // 'print' (alternating gutters) or 'screen' (symmetric)
let projectDir = process.cwd();
let noteOption = null;
let tocDepth = 'h1'; // 'h1', 'h1-h2', 'h1-h2-h3'

for (const arg of args) {
    if (arg.startsWith('--input=')) {
        inputPath = arg.substring(8).trim();
    } else if (arg.startsWith('--profile=')) {
        const rawP = arg.substring(10).trim();
        const found = Object.keys(PROFILES).find(k => k.toLowerCase() === rawP.toLowerCase());
        if (found) profileKey = found;
    } else if (arg.startsWith('--binding=')) {
        const b = arg.substring(10).trim().toLowerCase();
        if (b === 'print' || b === 'screen') bindingMode = b;
    } else if (arg.startsWith('--project=')) {
        projectDir = path.resolve(arg.substring(10).trim());
    } else if (arg.startsWith('--note=')) {
        noteOption = arg.substring(7).trim();
    } else if (arg.startsWith('--toc=')) {
        const t = arg.substring(6).trim().toLowerCase();
        if (t === 'h1-h2-h3' || t === 'h1,h2,h3' || t === 'h3') tocDepth = 'h1-h2-h3';
        else if (t === 'h1-h2' || t === 'h1,h2' || t === 'h2') tocDepth = 'h1-h2';
        else tocDepth = 'h1';
    } else if (!arg.startsWith('--') && !inputPath) {
        inputPath = arg.trim();
    }
}

// Auto-detect input markdown if omitted
if (!inputPath) {
    const mdFiles = fs.readdirSync(projectDir).filter(f => f.endsWith('.md') && !f.startsWith('_') && !f.toLowerCase().includes('readme') && !f.toLowerCase().includes('checklist'));
    if (mdFiles.length > 0) {
        inputPath = path.join(projectDir, mdFiles[0]);
    } else {
        console.error('❌ Error: No markdown book file found to publish.');
        process.exit(1);
    }
} else {
    inputPath = path.resolve(projectDir, inputPath);
}

if (!fs.existsSync(inputPath)) {
    console.error(`❌ Error: Input file not found at: ${inputPath}`);
    process.exit(1);
}

const selectedProfile = PROFILES[profileKey];
const selectedFont = FONTS['Lora'];
const folderName = path.basename(projectDir);

/**
 * Loads and renders editable Translator's Note / Preface Markdown (placed after Cover, before TOC)
 * Selects _TRANSLATOR_NOTE_translated.md for Vietnamese and _TRANSLATOR_NOTE_original.md for English/Original
 */
function getTranslatorNoteHtml(projectDir, isVietnamese = false) {
    if (noteOption && noteOption.toLowerCase() === 'none') return '';
    const noteFileName = noteOption ? noteOption : (isVietnamese ? '_TRANSLATOR_NOTE_translated.md' : '_TRANSLATOR_NOTE_original.md');
    const notePath = path.join(projectDir, noteFileName);

    if (fs.existsSync(notePath)) {
        let raw = fs.readFileSync(notePath, 'utf8').trim();
        if (raw.length > 0) {
            // Auto-fill or clean empty metadata fields if omitted
            const bookTitle = path.basename(projectDir);
            raw = raw.replace(/\*\s*\*\*Nguyên tác:\*\*\s*$/m, `* **Nguyên tác:** ${bookTitle}`);
            raw = raw.replace(/\*\s*\*\*Original Title:\*\*\s*$/m, `* **Original Title:** ${bookTitle}`);
            raw = raw.replace(/\*\s*\*\*Nguồn đối chiếu:\*\*\s*$/m, '');
            raw = raw.replace(/\*\s*\*\*Reference Source:\*\*\s*$/m, '');

            const md = markdownItMod ? markdownItMod({ html: true, linkify: true, typographer: true }) : null;
            let rendered = md ? md.render(raw) : `<pre>${raw}</pre>`;
            rendered = rendered.replace(/<h1/gi, '<h1 data-no-toc="true" class="translator-note-title"');
            rendered = imageEngine.processImagesInHtml(rendered, projectDir, isVietnamese);
            return `
      <div class="translator-note-page">
        <div class="translator-note-content">
          ${rendered}
        </div>
      </div>
    `;
        }
    }
    return '';
}

/**
 * Builds Full HTML with Typography System, Book Binding Gutter Margins & Dynamic TOC
 */
function buildHtml(mdContent, profile, font, tocItems = null, isVietnamese = false, binding = 'print') {
    const md = markdownItMod ? markdownItMod({ html: true, linkify: true, typographer: true }) : null;

    // Clean any cover blocks or raw TOCs from markdown body
    let cleanMd = mdContent
        .replace(/<div class="cover-page"[\s\S]*?<\/div>/gi, '')
        .replace(/!\[.*?\]\([^)]*cover\.(jpg|jpeg|png|webp|svg)\)/gi, '')
        .replace(/^---+\s*$/m, '')
        .trim();

    let bodyHtml = md ? md.render(cleanMd) : `<pre>${cleanMd}</pre>`;

    // 1. Inject Heading IDs and invisible chapter tokens
    bodyHtml = tocEngine.injectHeadingMarkers(bodyHtml);

    // 2. Prepend Table of Contents if provided
    if (tocItems && tocItems.length > 0) {
        bodyHtml = tocEngine.generateTocHtml(tocItems, isVietnamese) + '\n' + bodyHtml;
    }

    // 3. Prepend Translator's Note (after Cover, before TOC, not in TOC)
    const translatorNoteHtml = getTranslatorNoteHtml(projectDir, isVietnamese);
    if (translatorNoteHtml) {
        bodyHtml = translatorNoteHtml + '\n' + bodyHtml;
    }

    // 4. Process and embed all local illustrations via 07_image_layout_engine
    bodyHtml = imageEngine.processImagesInHtml(bodyHtml, projectDir, isVietnamese);

    const loraFontDef = getLoraFontDef();

    return `<!DOCTYPE html>
<html lang="${isVietnamese ? 'vi' : 'en'}">
<head>
  <meta charset="UTF-8">
  <title>${folderName}</title>
  <style>
    ${loraFontDef}

    :root {
      /* ── 1. Base Body & Spacing ── */
      --body-size: ${profile.fontSize};
      --body-line-height: 1.5;
      --para-spacing: 0.75em;

      /* ── 2. Headings Scale (relative to body) ── */
      --h1-size: calc(var(--body-size) * 2.2);
      --h2-size: calc(var(--body-size) * 1.8);
      --h3-size: calc(var(--body-size) * 1.5);
      --h4-size: calc(var(--body-size) * 1.2);
      --h5-size: calc(var(--body-size) * 1.0);
      --h6-size: calc(var(--body-size) * 0.8);
      --heading-line-height: 1.3;

      /* ── 3. Supporting Text Elements ── */
      --blockquote-size: calc(var(--body-size) * 0.95);
      --table-size:      calc(var(--body-size) * 0.90);
      --code-size:       calc(var(--body-size) * 0.88);
      --note-size:       calc(var(--body-size) * 0.85);
      --caption-size:    calc(var(--body-size) * 0.85);
      --supsub-size:     calc(var(--body-size) * 0.75);

      /* ── 4. Theme Colors & Borders ── */
      --text-color: #1a1a1a;
      --text-muted: #555555;
      --bg-color: #ffffff;
      --blockquote-bg: #f8f9fa;
      --blockquote-border: #888888;
      --table-border: #e0e0e0;
    }

    ${gutterEngine.getGutterCssRules(profile, binding)}

    /* Base Document Layout */
    html, body {
      background-color: var(--bg-color);
      color: var(--text-color);
      font-family: ${font.fontFamily};
      font-size: var(--body-size);
      line-height: var(--body-line-height);
      margin: 0;
      padding: 0;
      text-rendering: optimizeLegibility;
      -webkit-font-smoothing: antialiased;
      word-wrap: break-word;
    }

    /* Headings */
    h1, h2, h3, h4, h5, h6 {
      color: var(--text-color);
      font-family: ${font.fontFamily};
      page-break-inside: avoid;
    }

    h1 {
      font-size: var(--h1-size);
      font-weight: 700;
      text-align: center;
      margin-top: 2rem;
      margin-bottom: 1.2rem;
      line-height: var(--heading-line-height);
      page-break-before: always;
      page-break-after: avoid;
    }
    h1:first-of-type { page-break-before: avoid; }

    h2 {
      font-size: var(--h2-size);
      font-weight: 600;
      text-align: center;
      margin-top: 1.5rem;
      margin-bottom: 0.8rem;
      line-height: var(--heading-line-height);
      page-break-after: avoid;
    }

    h3 {
      font-size: var(--h3-size);
      font-weight: 600;
      text-align: center;
      margin-top: 1.3rem;
      margin-bottom: 0.6rem;
      line-height: 1.35;
      page-break-after: avoid;
    }

    h4, h5, h6 {
      font-weight: 600;
      text-align: left;
      line-height: 1.4;
      page-break-after: avoid;
    }
    h4 { font-size: var(--h4-size); margin-top: 1.1rem; margin-bottom: 0.5rem; }
    h5 { font-size: var(--h5-size); margin-top: 1.0rem; margin-bottom: 0.4rem; }
    h6 { font-size: var(--h6-size); margin-top: 0.8rem; margin-bottom: 0.3rem; }

    /* Paragraphs & Text Alignment */
    p {
      margin-top: 0;
      margin-bottom: var(--para-spacing);
      text-align: justify;
      text-justify: inter-word;
      orphans: 3;
      widows: 3;
    }

    /* Dedicated Alignment Overrides (Center / Right) */
    p[align="center"], p[align="center"] *,
    div[align="center"], div[align="center"] p, div[align="center"] *,
    div[style*="text-align: center"], div[style*="text-align: center"] p, div[style*="text-align: center"] *,
    div[style*="text-align:center"], div[style*="text-align:center"] p, div[style*="text-align:center"] *,
    p[style*="text-align: center"], p[style*="text-align: center"] *,
    p[style*="text-align:center"], p[style*="text-align:center"] *,
    .center, .center p, .text-center, .text-center p, center, center p {
      text-align: center !important;
    }

    p[align="right"], p[align="right"] *,
    div[align="right"], div[align="right"] p, div[align="right"] *,
    div[style*="text-align: right"], div[style*="text-align: right"] p, div[style*="text-align: right"] *,
    div[style*="text-align:right"], div[style*="text-align:right"] p, div[style*="text-align:right"] *,
    p[style*="text-align: right"], p[style*="text-align: right"] *,
    p[style*="text-align:right"], p[style*="text-align:right"] *,
    .right, .right p, .text-right, .text-right p {
      text-align: right !important;
    }

    /* Blockquotes */
    blockquote {
      margin: 1.2em 0;
      padding: 0.8em 1.2em;
      border-left: 3px solid var(--blockquote-border);
      background-color: var(--blockquote-bg);
      font-size: var(--blockquote-size);
      font-style: italic;
      line-height: 1.55;
      page-break-inside: auto;
      break-inside: auto;
    }
    blockquote p { margin-bottom: 0.5em; }
    blockquote p:last-child { margin-bottom: 0; }

    /* Notes & Footnotes */
    small, .footnote {
      font-size: var(--note-size);
      color: var(--text-muted);
      line-height: 1.4;
    }

    ${tocEngine.getTocCssRules()}
    ${imageEngine.getImageCssRules()}

    /* ── Translator Note / Preface Page ── */
    .translator-note-page {
      page-break-after: always;
      break-after: page;
      box-sizing: border-box;
      display: flex;
      flex-direction: column;
      justify-content: center;
      min-height: 100%;
      padding: 0;
    }

    .translator-note-content h1 {
      font-size: var(--h2-size);
      text-align: center;
      margin-top: 0.5em;
      margin-bottom: 1.2em;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      page-break-before: avoid;
      break-before: avoid;
    }

    .translator-note-content h2,
    .translator-note-content h3 {
      text-align: center;
      margin-top: 1em;
      margin-bottom: 0.8em;
      page-break-before: avoid;
      break-before: avoid;
    }

    .translator-note-content p {
      text-align: justify;
      text-justify: inter-word;
      line-height: 1.6;
      margin-bottom: 1em;
    }

    .translator-note-content blockquote {
      margin: 1.2em 0;
      padding: 0.8em 1.2em;
    }

    /* Captions */
    figcaption, .caption, caption {
      font-size: var(--caption-size);
      font-style: italic;
      color: var(--text-muted);
    }

    /* Lists */
    ul, ol {
      margin-top: 0;
      margin-bottom: var(--para-spacing);
      padding-left: 1.8em;
    }
    li {
      margin-bottom: 0.3em;
      text-align: justify;
      line-height: var(--body-line-height);
    }

    /* Tables */
    table {
      width: 100%;
      border-collapse: collapse;
      margin: 1.5em 0;
      font-size: var(--table-size);
      page-break-inside: avoid;
    }
    th, td {
      border: 1px solid var(--table-border);
      padding: 0.5em 0.8em;
      text-align: left;
    }
    th {
      background-color: #f2f2f2;
      font-weight: 600;
    }

    /* Code Blocks */
    pre, code {
      font-family: 'Consolas', 'Courier New', monospace;
      font-size: var(--code-size);
    }
    pre {
      background-color: var(--blockquote-bg);
      border: 1px solid var(--table-border);
      padding: 0.8em 1em;
      border-radius: 4px;
      overflow-x: auto;
      page-break-inside: avoid;
    }

    /* Horizontal Rules */
    hr {
      border: none;
      border-top: 1px solid var(--table-border);
      margin: 2em 0;
    }
  </style>
</head>
<body>
  ${bodyHtml}
</body>
</html>`;
}

/**
 * Main PDF Publishing Engine
 */
async function renderPdf() {
    console.log('======================================================');
    console.log(`📖 PUBLISHING EBOOK & PRINT PDF: ${folderName}`);
    console.log(`📄 Input Markdown: ${path.basename(inputPath)}`);
    console.log(`📐 Paper Profile: ${selectedProfile.name} (${selectedProfile.width} x ${selectedProfile.height})`);
    console.log(`🔤 Typography: ${selectedFont.name} (Body: ${selectedProfile.fontSize})`);
    console.log(`📚 Binding Mode: ${bindingMode === 'print' ? 'Book Binding (Alternating Inside/Outside Gutter Margins)' : 'Digital Screen (Symmetrical Margins)'}`);
    console.log('======================================================\n');

    const inputBaseName = path.basename(inputPath, path.extname(inputPath));
    const bindingSuffix = bindingMode === 'screen' ? '-screen' : '';
    const outPdfName = `${inputBaseName} (${profileKey}${bindingSuffix}).pdf`;
    const outPdfPath = path.join(projectDir, outPdfName);
    const mdContent = fs.readFileSync(inputPath, 'utf8');
    const isVietnamese = inputPath.toLowerCase().includes('translated') || inputPath.toLowerCase().includes('dich');

    const browser = await launchRobustBrowser(puppeteerMod);

    try {
        // ── STEP 1: Standalone Full-Bleed Cover Page (Page 1) ──
        let coverPdfBytes = null;
        const activeCover = coverEngine.findCoverImage(projectDir, isVietnamese);

        if (activeCover) {
            console.log('[1/4] Generating Standalone Full-Bleed Cover Page...');
            coverPdfBytes = await coverEngine.renderCoverPdf(browser, activeCover, selectedProfile);
            console.log('  ✓ Standalone Cover Page ready (0 margin, 0 header/footer).');
        } else {
            console.log('[1/4] No cover image found. Skipping Cover Page.');
        }

        // ── STEP 2: Pass 1 — Draft Render to Calculate H1 Page Numbers ──
        console.log('[2/4] Pass 1: Measuring DOM pagination & determining H1 chapter pages...');
        const draftHtml = buildHtml(mdContent, selectedProfile, selectedFont, null, isVietnamese, bindingMode);
        const draftPage = await browser.newPage();
        await draftPage.setContent(draftHtml, { waitUntil: 'networkidle0' });
        await draftPage.evaluateHandle('document.fonts.ready');

        // Extract list of H1/H2/H3 elements based on tocDepth (excluding translator-note and no-toc)
        const h1Elements = await draftPage.evaluate((depth) => {
            let selector = 'h1';
            if (depth === 'h1-h2') selector = 'h1, h2';
            else if (depth === 'h1-h2-h3') selector = 'h1, h2, h3';

            const list = Array.from(document.querySelectorAll(selector)).filter(el => {
                if (el.closest('.translator-note-page')) return false;
                if (el.hasAttribute('data-no-toc')) return false;
                if (el.id === 'table-of-contents' || el.classList.contains('toc-heading')) return false;
                return true;
            });

            return list.map((el) => {
                const tag = el.tagName.toLowerCase();
                const level = tag === 'h1' ? 1 : (tag === 'h2' ? 2 : 3);
                const markerMatch = el.textContent.match(/\[\[(CHP|SEC|SUB)_\d+\]\]/);
                const marker = markerMatch ? markerMatch[0] : '';
                return {
                    id: el.id || '',
                    title: el.innerText.replace(/(\[\[(CHP|SEC|SUB)_\d+\]\]|§(CHP|SEC|SUB)_\d+§)/g, '').trim(),
                    marker: marker,
                    level: level
                };
            });
        }, tocDepth);

        // Filter out container "# Front Matter" and raw "# Table of Contents"
        const tocCandidates = h1Elements.filter(item => {
            const low = item.title.toLowerCase();
            return low !== 'front matter' && low !== 'mục lục' && low !== 'table of contents';
        });

        // Inject placeholder Table of Contents into draftPage to occupy exact real page count in draft PDF
        if (tocCandidates.length > 0) {
            const placeholderTocHtml = tocEngine.generateTocHtml(
                tocCandidates.map(it => ({ ...it, pageNum: 999 })),
                isVietnamese
            );
            await draftPage.evaluate((tocHtml) => {
                const tempDiv = document.createElement('div');
                tempDiv.innerHTML = tocHtml;
                const tocEl = tempDiv.firstElementChild;
                const transNote = document.querySelector('.translator-note-page');
                if (transNote && transNote.nextSibling) {
                    transNote.parentNode.insertBefore(tocEl, transNote.nextSibling);
                } else if (transNote) {
                    transNote.parentNode.appendChild(tocEl);
                } else {
                    document.body.insertBefore(tocEl, document.body.firstChild);
                }
            }, placeholderTocHtml);
            await draftPage.evaluateHandle('document.fonts.ready');
        }

        // 2-Column Header: Custom from _HEADER-translated.md / _HEADER-original.md or defaults
        const defaultBookTitle = folderName.replace(/[-_]/g, ' ').replace(/\(.*?\)/g, '').trim();
        const headerConfig = headerEngine.loadHeaderConfig(projectDir, isVietnamese);

        // Render draft PDF in memory to inspect page numbers
        await draftPage.evaluateHandle('document.fonts.ready');
        await new Promise(r => setTimeout(r, 200));

        const draftPdfBytes = await draftPage.pdf({
            width: selectedProfile.width,
            height: selectedProfile.height,
            margin: { top: selectedProfile.margin.top, bottom: selectedProfile.margin.bottom },
            preferCSSPageSize: true,
            printBackground: true,
            displayHeaderFooter: false
        });
        await draftPage.close();

        // Calculate accurate TOC page numbers via 07_toc_engine
        const finalTocItems = await tocEngine.measureChapterPages(draftPdfBytes, pdfParseMod, tocCandidates, true);

        // ── STEP 3: Pass 2 — Inject Table of Contents & Build Final PDF ──
        console.log(`[3/4] Pass 2: Building dynamic Table of Contents with ${finalTocItems.length} items (${tocDepth.toUpperCase()})...`);
        finalTocItems.forEach(it => {
            const indent = it.level === 3 ? '       ↳ ' : (it.level === 2 ? '   • ' : ' • ');
            console.log(`    ${indent}${it.title.padEnd(50, '.')} Page ${it.pageNum}`);
        });

        // Build final HTML with TOC and Translator Note
        const finalHtml = buildHtml(mdContent, selectedProfile, selectedFont, finalTocItems, isVietnamese, bindingMode);
        const finalBodyPage = await browser.newPage();
        await finalBodyPage.setContent(finalHtml, { waitUntil: 'networkidle0' });
        await finalBodyPage.evaluateHandle('document.fonts.ready');
        await new Promise(r => setTimeout(r, 200));

        // Build sections for dynamic H1 header (running headers anchor to H1 chapters)
        const sections = [];
        const hasTranslatorNote = finalHtml.includes('translator-note-page');
        let currentP = 1;

        if (hasTranslatorNote) {
            sections.push({
                title: isVietnamese ? 'Lưu ý của người chuyển ngữ' : "Converter's Note",
                startPage: 1,
                endPage: 1
            });
            currentP = 2;
        }

        const h1Items = finalTocItems.filter(it => (it.level || 1) === 1);
        if (h1Items.length > 0) {
            const firstChapPage = h1Items[0].pageNum;
            if (firstChapPage > currentP) {
                sections.push({
                    title: isVietnamese ? 'Mục lục' : 'Table of Contents',
                    startPage: currentP,
                    endPage: firstChapPage - 1
                });
            }

            for (let i = 0; i < h1Items.length; i++) {
                const item = h1Items[i];
                const nextItem = (i < h1Items.length - 1) ? h1Items[i + 1] : null;
                const startP = item.pageNum;
                const endP = nextItem ? (nextItem.pageNum - 1) : 999999;
                sections.push({
                    title: item.title,
                    startPage: startP,
                    endPage: endP
                });
            }
        } else {
            sections.push({
                title: defaultBookTitle,
                startPage: 1,
                endPage: 999999
            });
        }

        const finalBodyPdfBytes = await gutterEngine.renderAlternatingPdf(
            finalBodyPage,
            pdfLibMod,
            selectedProfile,
            selectedFont,
            headerConfig,
            sections,
            bindingMode
        );
        const rawHeadings = await outlineEngine.extractHeadingsFromPage(finalBodyPage, tocDepth);
        await finalBodyPage.close();

        // ── STEP 4: Merge Standalone Cover + Document Outline ──
        console.log('[4/4] Merging Standalone Cover + Document Outline & Saving PDF...');
        const finalPdfDoc = await pdfLibMod.PDFDocument.load(finalBodyPdfBytes, { ignoreEncryption: true });
        if (coverPdfBytes) {
            await coverEngine.prependCoverToDocument(pdfLibMod, finalPdfDoc, coverPdfBytes);
        }

        // Build & inject hierarchical PDF Document Outline (Bookmarks)
        const outlineTree = await outlineEngine.buildOutlineTree({
            pdfParseMod,
            finalBodyPdfBytes,
            rawHeadings,
            hasCover: !!coverPdfBytes,
            hasTranslatorNote,
            isVietnamese
        });
        outlineEngine.applyOutlinesToDocument(pdfLibMod, finalPdfDoc, outlineTree);

        const mergedPdfBytes = await finalPdfDoc.save();
        fs.writeFileSync(outPdfPath, mergedPdfBytes);
        const totalFinalPages = finalPdfDoc.getPageCount();

        console.log('\n======================================================');
        console.log('🎉 PDF PUBLICATION COMPLETED SUCCESSFULLY!');
        console.log(`📄 Output File: ${outPdfPath}`);
        console.log(`📑 Total Pages: ${totalFinalPages} (Cover -> Translator Note -> Table of Contents -> Content)`);
        console.log(`📚 Gutter Margins: Odd (Left ${selectedProfile.gutterMargin.inside} / Right ${selectedProfile.gutterMargin.outside}) | Even (Left ${selectedProfile.gutterMargin.outside} / Right ${selectedProfile.gutterMargin.inside})`);
        console.log(`🔖 Document Outline: ${tocDepth.toUpperCase()} Bookmarks fully active.`);
        console.log('======================================================\n');

    } finally {
        await browser.close();
    }
}

renderPdf().catch(err => {
    console.error('❌ PDF Publication Failed:', err);
    process.exit(1);
});
