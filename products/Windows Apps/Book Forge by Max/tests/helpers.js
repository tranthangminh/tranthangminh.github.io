/**
 * Shared test helpers: builds sample books as real PDFs with Chromium, runs the engine
 * scripts the way the app does, and measures text positions in a PDF.
 */

const fs = require('fs');
const os = require('os');
const path = require('path');
const { spawnSync } = require('child_process');

const SCRIPT_DIR = path.join(__dirname, '..', 'for_zip', 'script');
const req = name => require(path.join(SCRIPT_DIR, 'node_modules', name));
const MM_PER_PT = 25.4 / 72;

const SENTENCES = [
    'The tide came in slowly over the grey stones of the old quay and nobody on the shore paid it any attention.',
    'Fishermen mended their nets in silence while the gulls argued over scraps left on the wet boards below.',
    'By noon the fog had lifted enough to show the far side of the bay and the low roofs of the village.',
    'She kept a careful record of every vessel that passed, writing each name in a ledger with a steady hand.',
    'Nothing in those pages suggested that the coming winter would be any different from the one before it.',
    'A cold wind moved across the water and the moored boats turned together on their ropes like patient animals.'
];

function prose(charCount, seed = 0) {
    const paragraphs = [];
    let chars = 0;
    let i = seed;
    while (chars < charCount) {
        const parts = [];
        for (let s = 0; s < 5; s++) parts.push(SENTENCES[(i + s) % SENTENCES.length]);
        i += 2;
        const text = parts.join(' ');
        paragraphs.push(`<p>${text}</p>`);
        chars += text.length;
    }
    return paragraphs.join('\n');
}

const FIGURE = `<svg width="300" height="150" viewBox="0 0 300 150" xmlns="http://www.w3.org/2000/svg">
  <rect x="1" y="1" width="298" height="148" fill="#f0f4f8" stroke="#334455" stroke-width="2"/>
  <circle cx="60" cy="90" r="30" fill="#88aacc"/>
  <rect x="130" y="60" width="130" height="60" fill="#ccddee" stroke="#334455"/>
  <text x="110" y="35" font-size="30" fill="#112233">Figure 1</text>
</svg>`;

const TITLE_PAGE = `<div style="page-break-after: always; text-align: center; padding-top: 30mm;">
  <div style="font-size: 34pt; font-weight: 700;">The Quiet Harbor</div>
  <p style="margin-top: 12mm;">A novel by Sample Author</p>
  <p style="margin-top: 60mm; font-size: 9pt;">Copyright 2026 Sample Press. All rights reserved.</p>
</div>`;

const CHAPTERS = {
    one: `<h1>Chapter 1: The Harbor</h1>
<h2>Morning Tide</h2>${prose(3000, 0)}
<h2 style="page-break-before: always;">An Unexpected Boat</h2>${prose(3000, 1)}`,
    two: `<h1>Chapter 2: The Survey</h1>
<h2>Charts and Soundings</h2>${prose(2500, 2)}
<div style="text-align: center;">${FIGURE}</div>
<p>The drawing above shows where the channel narrows before the breakwater.</p>
<h2>Deep Water</h2>${prose(2500, 3)}`,
    three: `<h1>Chapter 3: A Very Long Record</h1>
<h2>The First Ledger</h2>${prose(25000, 4)}
<h2>The Second Ledger</h2>${prose(25000, 5)}`
};

const tocRow = (title, page, indent = 0) => `<div style="display: flex; justify-content: space-between; margin: 2mm 0 2mm ${indent}mm;"><span>${title}</span><span>${page}</span></div>`;

function pageBreakBefore(html) {
    return `<div style="page-break-before: always;"></div>${html}`;
}

const VARIANTS = {
    // Chapter 1 opens on the very first page of the PDF.
    noFrontMatter: () => `${CHAPTERS.one}${pageBreakBefore(CHAPTERS.two)}${pageBreakBefore(CHAPTERS.three)}`,
    // A title page, then chapters, no contents page.
    noToc: () => `${TITLE_PAGE}${CHAPTERS.one}${pageBreakBefore(CHAPTERS.two)}${pageBreakBefore(CHAPTERS.three)}`,
    // Chapters follow each other on the same page, nothing forces a new page.
    flowing: () => `<h1>Chapter 1: The Harbor</h1><h2>Morning Tide</h2>${prose(1500, 0)}<h2>An Unexpected Boat</h2>${prose(1500, 1)}<h1>Chapter 2: The Survey</h1><h2>Deep Water</h2>${prose(1500, 2)}<h1>Chapter 3: A Very Long Record</h1><h2>The First Ledger</h2>${prose(1500, 3)}`,
    // A contents page lists chapters only. The numbers are filled in by buildBookPdf.
    toc: pages => `${TITLE_PAGE}<div style="page-break-after: always;"><h1>Contents</h1>
${tocRow('Chapter 1: The Harbor', pages.ch1)}${tocRow('Chapter 2: The Survey', pages.ch2)}${tocRow('Chapter 3: A Very Long Record', pages.ch3)}</div>
${CHAPTERS.one}${pageBreakBefore(CHAPTERS.two)}${pageBreakBefore(CHAPTERS.three)}`,
    // A contents page that lists sections with no indent, and wraps the long chapter title.
    tocFlatSections: pages => `${TITLE_PAGE}<div style="page-break-after: always;"><h1>Mục lục</h1>
${tocRow('Chapter 1: The Harbor', pages.ch1)}${tocRow('Morning Tide', pages.ch1)}${tocRow('An Unexpected Boat', pages.ch1 + 3)}
${tocRow('Chapter 2: The Survey', pages.ch2)}${tocRow('Deep Water', pages.ch2 + 3)}
${tocRow('Chapter 3: A Very Long Record of Everything That Passed In and Out of the Harbor', pages.ch3)}${tocRow('The First Ledger', pages.ch3)}${tocRow('The Second Ledger', pages.ch3 + 20)}</div>
${CHAPTERS.one}${pageBreakBefore(CHAPTERS.two)}${pageBreakBefore(CHAPTERS.three.replace('Chapter 3: A Very Long Record', 'Chapter 3: A Very Long Record of Everything That Passed In and Out of the Harbor'))}`,
    // A contents page that also lists sections, indented under their chapter.
    tocWithSections: pages => `${TITLE_PAGE}<div style="page-break-after: always;"><h1>Contents</h1>
${tocRow('Chapter 1: The Harbor', pages.ch1)}${tocRow('Morning Tide', pages.ch1, 6)}${tocRow('An Unexpected Boat', pages.ch1 + 3, 6)}
${tocRow('Chapter 2: The Survey', pages.ch2)}${tocRow('Charts and Soundings', pages.ch2, 6)}${tocRow('Deep Water', pages.ch2 + 3, 6)}
${tocRow('Chapter 3: A Very Long Record', pages.ch3)}${tocRow('The First Ledger', pages.ch3, 6)}${tocRow('The Second Ledger', pages.ch3 + 20, 6)}</div>
${CHAPTERS.one}${pageBreakBefore(CHAPTERS.two)}${pageBreakBefore(CHAPTERS.three)}`
};

function findBrowser() {
    const candidates = [
        process.env.PUPPETEER_EXECUTABLE_PATH,
        'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
        'C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe',
        'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe'
    ];
    const found = candidates.find(p => p && fs.existsSync(p));
    if (!found) throw new Error('No Chromium browser found. Set PUPPETEER_EXECUTABLE_PATH.');
    return found;
}

async function htmlToPdf(browser, bodyHtml, outPath) {
    const page = await browser.newPage();
    await page.setContent(`<!DOCTYPE html><html><head><meta charset="UTF-8"><style>
        @page { size: 148mm 210mm; margin: 18mm 16mm; }
        body { font-family: Georgia, serif; font-size: 11pt; line-height: 1.5; margin: 0; }
        h1 { font-size: 24pt; } h2 { font-size: 16pt; }
    </style></head><body>${bodyHtml}</body></html>`, { waitUntil: 'load' });
    await page.pdf({ path: outPath, preferCSSPageSize: true, printBackground: true });
    await page.close();
}

/** Builds one sample book. A contents page needs real page numbers, so that variant renders twice. */
async function buildBookPdf(variant, outPath) {
    const puppeteer = req('puppeteer-core');
    const browser = await puppeteer.launch({ headless: true, executablePath: findBrowser(), args: ['--no-sandbox'] });
    try {
        const build = VARIANTS[variant];
        await htmlToPdf(browser, build({ ch1: 1, ch2: 2, ch3: 3 }), outPath);
        if (variant.startsWith('toc')) {
            const pages = await findPages(outPath, ['Chapter 1: The Harbor', 'Chapter 2: The Survey', 'Chapter 3: A Very Long']);
            await htmlToPdf(browser, build({ ch1: pages[0], ch2: pages[1], ch3: pages[2] }), outPath);
        }
    } finally {
        await browser.close();
    }
    return outPath;
}

async function loadPdf(pdfPath) {
    const { PDFParse } = req('pdf-parse');
    const parser = new PDFParse(new Uint8Array(fs.readFileSync(pdfPath)));
    await parser.load();
    return parser.doc;
}

/** Last page whose text starts with each title, so a contents page earlier in the book is skipped. */
async function findPages(pdfPath, titles) {
    const doc = await loadPdf(pdfPath);
    const found = titles.map(() => 0);
    for (let n = 1; n <= doc.numPages; n++) {
        const page = await doc.getPage(n);
        const content = await page.getTextContent();
        const firstLine = content.items.map(it => it.str).join('').slice(0, 60);
        titles.forEach((t, i) => { if (firstLine.startsWith(t)) found[i] = n; });
    }
    return found;
}

function runScript(script, args, cwd) {
    const env = { ...process.env, PUPPETEER_EXECUTABLE_PATH: findBrowser() };
    const result = spawnSync(process.execPath, [path.join(SCRIPT_DIR, script), ...args], { cwd, env, encoding: 'utf8' });
    if (result.status !== 0) throw new Error(`${script} exited ${result.status}\n${result.stdout}\n${result.stderr}`);
    return result.stdout;
}

/** Runs the PDF to Markdown stages in app order and returns the chapter files by name. */
function extractBook(pdfPath, projectDir, { images = true, extraArgs = [] } = {}) {
    fs.mkdirSync(projectDir, { recursive: true });
    let log = '';
    if (images) log += runScript('04__image_extractor.js', [pdfPath, projectDir], projectDir);
    log += runScript('05__chapter_extractor.js', [pdfPath, projectDir, ...extraArgs], projectDir);
    const dir = path.join(projectDir, 'chapters_original');
    const files = {};
    for (const f of fs.readdirSync(dir).sort()) files[f] = fs.readFileSync(path.join(dir, f), 'utf8');
    return { files, log };
}

function tempDir(prefix) {
    return fs.mkdtempSync(path.join(os.tmpdir(), prefix));
}

/** Left and right text margins of a page in mm, from the body text only (ignores header and footer). */
async function measureBodyMargins(doc, pageNum) {
    const page = await doc.getPage(pageNum);
    const { width, height } = page.getViewport({ scale: 1 });
    const content = await page.getTextContent();
    const bodyTop = height - 15 / MM_PER_PT;
    const bodyBottom = 15 / MM_PER_PT;
    const items = content.items.filter(it => it.str.trim() && it.width > 0.5 && it.transform[5] < bodyTop && it.transform[5] > bodyBottom);
    if (items.length === 0) return null;
    const left = Math.min(...items.map(it => it.transform[4]));
    const right = Math.max(...items.map(it => it.transform[4] + it.width));
    return { pageWidth: width * MM_PER_PT, left: left * MM_PER_PT, right: (width - right) * MM_PER_PT };
}

module.exports = { SCRIPT_DIR, buildBookPdf, extractBook, runScript, tempDir, loadPdf, measureBodyMargins, findBrowser, prose };
