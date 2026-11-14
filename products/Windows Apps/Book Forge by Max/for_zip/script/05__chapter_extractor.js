/**
 * Module 05: Chapter Extractor Orchestrator (with Front Matter & Spatial Image Embedding)
 * Location: script/05_chapter_extractor.js
 * 
 * Usage:
 *   node script/05_chapter_extractor.js [pdfPath] [projectDir] [--threshold=25000] [--split=none|h2|h2-h3]
 *
 * Responsibilities:
 * - Extracts complete book components:
 *   - Front Matter (00-front-matter.md): Cover image, Title Page, Series description, Copyright, ISBN.
 *   - All Chapters (01-..., 02-..., etc.): Rich Markdown formatting, headings, paragraphs, and embedded figures.
 * - Saves extracted chapters directly into "chapters_original/".
 */

require('./node_version_guard');

const fs = require('fs');
const path = require('path');
const { analyzeGeometry } = require('./01__pdf_geometry');
const { detectChapters } = require('./02__toc_parser');
const { buildTypographyProfile, formatRichChapterMarkdown } = require('./03__rich_markdown_formatter');
const { extractCleanFrontMatterItems } = require('./05_toc_filter');
const { writeChapterFiles } = require('./05_chunk_writer');

// Parse CLI arguments
const args = process.argv.slice(2);
const positionalArgs = args.filter(a => !a.startsWith('--'));
let pdfPath = positionalArgs[0];
let projectDir = positionalArgs[1] || process.cwd();
let splitThreshold = 25000;
let splitMode = 'h2-h3';

for (const a of args) {
    if (a.startsWith('--threshold=')) {
        const val = parseInt(a.replace('--threshold=', ''), 10);
        if (val > 0) splitThreshold = val;
    } else if (a.startsWith('--split=')) {
        splitMode = a.replace('--split=', '').trim().toLowerCase();
    }
}

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
                       !fLow.includes('-exported');
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
    console.error(`   Usage: node script/05_chapter_extractor.js <pdf_path> [project_dir]\n`);
    process.exit(1);
}

const chaptersOriginalDir = path.join(projectDir, 'chapters_original');
fs.mkdirSync(chaptersOriginalDir, { recursive: true });

async function run() {
    console.log('======================================================');
    console.log(`📚 EXTRACTING COMPLETE BOOK: ${path.basename(pdfPath)}`);
    console.log(`📁 Target Folder: ${chaptersOriginalDir}`);
    console.log('======================================================\n');

    let pdfParseMod;
    const localBundled = path.join(__dirname, 'node_modules', 'pdf-parse');
    const appDataNpm = path.join(process.env.APPDATA || '', 'npm', 'node_modules');
    const candidatePaths = [localBundled, path.join(appDataNpm, 'pdf-parse'), 'pdf-parse'];
    for (const p of candidatePaths) {
        try {
            pdfParseMod = require(p);
            if (pdfParseMod) break;
        } catch (e) {}
    }

    if (!pdfParseMod || !pdfParseMod.PDFParse) {
        console.error('❌ Error: pdf-parse module is required. Please install via: npm install -g pdf-parse');
        process.exit(1);
    }

    console.log(`[1/4] Loaded PDF: ${path.basename(pdfPath)}`);
    const buf = fs.readFileSync(pdfPath);
    const parser = new pdfParseMod.PDFParse(new Uint8Array(buf));
    await parser.load();
    const doc = parser.doc;

    console.log(`[2/4] Analyzing page geometry, font descriptors & calibrating dynamic margins...`);
    const geom = await analyzeGeometry(doc, pdfPath, projectDir);
    const typoProfile = buildTypographyProfile(geom.fontSizesCount);

    console.log(`  -> Dominant Body Font Size: ${typoProfile.dominantFs}pt`);
    console.log(`  -> Heading Tiers: H1 >= ${typoProfile.h1Threshold}pt, H2 >= ${typoProfile.h2Threshold}pt, H3 >= ${typoProfile.h3Threshold}pt`);
    console.log(`  -> Notes Tier: Small Notes <= ${typoProfile.noteThreshold}pt`);
    console.log(`  -> Header Cutoff: Y > ${geom.avgHeaderY > 0 ? geom.avgHeaderY.toFixed(1) + ' pt' : 'None'}`);
    console.log(`  -> Footer Cutoff: Y < ${geom.avgFooterY > 0 ? geom.avgFooterY.toFixed(1) + ' pt' : 'None'}`);

    console.log(`[3/4] Detecting chapters (TOC & Font Size Hierarchies)...`);
    const chapters = await detectChapters(geom.pagesData, typoProfile.dominantFs);
    if (chapters.length === 0) {
        console.log('  -> No chapter headings found. Keeping the whole book as one chapter.');
        chapters.push({ title: path.basename(pdfPath, path.extname(pdfPath)), pageIndex: 0 });
    }

    console.log(`[4/4] Generating Complete Book Files into "chapters_original/"...`);
    const pagesData = geom.pagesData;
    const startItemOf = c => {
        const idx = c.startLine ? pagesData[c.pageIndex].pageItems.indexOf(c.startLine) : 0;
        return idx < 0 ? 0 : idx;
    };
    let totalSavedFiles = 0;

    // Chunk names depend on the split settings, so leftovers from an earlier run would be compiled twice.
    for (const f of fs.readdirSync(chaptersOriginalDir)) {
        if (f.endsWith('.md')) fs.unlinkSync(path.join(chaptersOriginalDir, f));
    }

    // --- STEP A: Extract Front Matter (Excluding TOC Pages) ---
    const firstChapterPageIndex = chapters[0].pageIndex;
    const itemsAboveFirstChapter = pagesData[firstChapterPageIndex].pageItems.slice(0, startItemOf(chapters[0]));
    if (firstChapterPageIndex > 0 || itemsAboveFirstChapter.length > 0) {
        const { cleanItems: frontMatterItems } = extractCleanFrontMatterItems(pagesData, firstChapterPageIndex, chapters);
        frontMatterItems.push(...itemsAboveFirstChapter);

        let frontMatterMd = `# Front Matter\n\n`;

        const coverCandidates = [
            'cover.png',
            'cover.jpg',
            'cover.jpeg',
            'cover.webp',
            'cover.svg'
        ];
        for (const cFile of coverCandidates) {
            if (fs.existsSync(path.join(projectDir, 'images_original', cFile))) {
                frontMatterMd += `![Cover](../images_original/${cFile})\n\n`;
                break;
            }
        }

        const frontContent = formatRichChapterMarkdown(0, 'Front Matter', frontMatterItems, typoProfile);
        // Strip the duplicate "# Front Matter" generated by formatter
        const cleanFrontContent = frontContent.replace(/^#\s+Front\s+Matter\s+/i, '').trim();
        frontMatterMd += cleanFrontContent + '\n';

        const frontMatterFileName = `00-front-matter.md`;
        fs.writeFileSync(path.join(chaptersOriginalDir, frontMatterFileName), frontMatterMd, 'utf8');
        console.log(`  [00] Saved: chapters_original/${frontMatterFileName} (${frontMatterMd.length} chars)`);
        totalSavedFiles++;
    }

    // --- STEP B: Extract Content Chapters (numbered from 01, with or without a front matter file) ---
    for (let c = 0; c < chapters.length; c++) {
        const startP = chapters[c].pageIndex;
        const nextChapter = chapters[c + 1];
        const endP = nextChapter ? nextChapter.pageIndex : pagesData.length;

        const chapterItems = [];
        for (let pIdx = startP; pIdx <= endP && pIdx < pagesData.length; pIdx++) {
            const items = pagesData[pIdx].pageItems;
            const from = pIdx === startP ? startItemOf(chapters[c]) : 0;
            const to = (nextChapter && pIdx === endP) ? startItemOf(nextChapter) : items.length;
            chapterItems.push(...items.slice(from, to));
        }

        const mdContent = formatRichChapterMarkdown(c, chapters[c].title, chapterItems, typoProfile);

        totalSavedFiles += writeChapterFiles(chaptersOriginalDir, String(c + 1).padStart(2, '0'), chapters[c].title, mdContent.split('\n'), splitThreshold, splitMode);
    }

    console.log(`\n🎉 EXTRACTION COMPLETE! Successfully saved ${totalSavedFiles} files (${chapters.length} Chapters) to "chapters_original/".\n`);
}

run().catch(err => {
    console.error(err);
    process.exit(1);
});
