/**
 * Module: Book Project QA Audit
 * Location: script/audit_pdf_vs_md.js
 *
 * Usage:
 *   node script/audit_pdf_vs_md.js [projectDir]
 *
 * Exit code 1 means a defect that reaches the printed book or a stale master file:
 *   - A referenced image cannot be found.
 *   - A compiled "[Book]-<edition>.md" does not match its chapter files.
 *   - No chapters exist in the project.
 *
 * Warnings do not fail the audit:
 *   - Typography anomalies (glyph corruption, decomposed diacritics, phantom or empty headings).
 *   - Unclosed ** or *** markers.
 *   - Translated chapters that are missing, or differ from the original in headings, images or paragraphs.
 *   - Markdown holding far fewer words than the source PDF.
 */

require('./node_version_guard');

const fs = require('fs');
const path = require('path');
const { listChapterFiles, lintMarkdown, buildMasterContent } = require('./06_master_builder');

const localBundled = path.join(__dirname, 'node_modules', 'pdf-parse');
const appDataNpm = path.join(process.env.APPDATA || '', 'npm', 'node_modules', 'pdf-parse');
let pdfParseMod;
const candidatePaths = [localBundled, appDataNpm, 'pdf-parse'];
for (const p of candidatePaths) {
    try {
        pdfParseMod = require(p);
        if (pdfParseMod) break;
    } catch (e) {}
}
if (!pdfParseMod) {
    console.error('❌ Error: pdf-parse module is required. Please install via: npm install -g pdf-parse');
    process.exit(1);
}

const MIN_PDF_WORD_RATIO = 0.9;
const PARAGRAPH_TOLERANCE = 0.2;
const EDITIONS = [
    { label: 'Original', folder: 'chapters_original', baseName: 'original', isOriginal: true },
    { label: 'Translated', folder: 'chapters_translated', baseName: 'translated', isOriginal: false }
];

let errorCount = 0;
let warningCount = 0;

function addError(message) {
    errorCount++;
    console.log(`  [ERROR] ${message}`);
}

function addWarning(message) {
    warningCount++;
    console.log(`  [!] ${message}`);
}

function countWords(text) {
    return text.split(/\s+/).filter(w => /[\p{L}\p{N}]/u.test(w)).length;
}

function stripMarkup(md) {
    return md
        .replace(/!\[[^\]]*\]\([^)]*\)/g, ' ')
        .replace(/<[^>]+>/g, ' ')
        .replace(/[#*_]/g, ' ');
}

function getTextBlocks(md) {
    return md.split(/\r?\n\r?\n/).map(p => p.trim()).filter(p => p && !p.startsWith('#') && !p.startsWith('![') && p !== '---');
}

function countHeadings(md) {
    const counts = { 1: 0, 2: 0, 3: 0 };
    let inCode = false;
    for (const line of md.split('\n')) {
        if (line.trim().startsWith('```')) inCode = !inCode;
        const match = !inCode && line.match(/^(#{1,3})\s/);
        if (match) counts[match[1].length]++;
    }
    return counts;
}

function findImageRefs(md) {
    const refs = [];
    const regex = /!\[[^\]]*\]\(([^)\s]+)[^)]*\)|<img\b[^>]*\bsrc=["']([^"']+)["']/gi;
    let match;
    while ((match = regex.exec(md)) !== null) {
        const ref = match[1] || match[2];
        if (!/^(https?:|data:)/i.test(ref) && !path.basename(ref).startsWith('cover.')) refs.push(ref);
    }
    return refs;
}

// Mirrors the lookup order of 07_image_layout_engine.js so a pass here means the image reaches the PDF.
function imageExists(ref, chaptersDir, projectDir) {
    const fileName = path.basename(ref);
    return [
        path.join(chaptersDir, ref),
        path.join(projectDir, ref),
        path.join(projectDir, 'images_translated', fileName),
        path.join(projectDir, 'images_original', fileName),
        path.join(projectDir, 'images', fileName)
    ].some(p => fs.existsSync(p));
}

function findSourcePdf(projectDir, folderName) {
    const target = `${folderName}.pdf`.toLowerCase();
    for (const dir of [path.dirname(projectDir), projectDir]) {
        const match = fs.readdirSync(dir).find(f => f.toLowerCase() === target);
        if (match) return path.join(dir, match);
    }
    return null;
}

function auditChapterFile(fileName, text, idx, chaptersDir, projectDir) {
    const words = countWords(stripMarkup(text));
    const textBlocks = getTextBlocks(text);
    const headingTotal = Object.values(countHeadings(text)).reduce((a, b) => a + b, 0);
    const first = (textBlocks[0] || '').replace(/\s+/g, ' ').slice(0, 65);
    const last = (textBlocks[textBlocks.length - 1] || '').replace(/\s+/g, ' ').slice(-65);

    console.log(`  ✓ [${String(idx).padStart(2, '0')}] ${fileName.padEnd(45, ' ')} | ${String(words).padStart(6, ' ')} words | ${headingTotal} headings | ${textBlocks.length} paras`);
    console.log(`       Start: "${first}..."`);
    console.log(`       End:   "...${last}"`);

    const glyphArtifacts = text.match(/\b\w+MM\b/g);
    if (glyphArtifacts) addWarning(`[${fileName}] Glyph corruption: ${glyphArtifacts.join(', ')}`);

    const diacritics = text.match(/[A-Za-z]+[´`ˆ¸¨~][A-Za-z]*/g);
    if (diacritics) addWarning(`[${fileName}] Decomposed diacritics: ${diacritics.join(', ')}`);

    text.split('\n').forEach((line, lineIdx) => {
        const trimmed = line.trim();
        if (/^#{1,3}\s+[A-Za-z]$/.test(trimmed)) addWarning(`[${fileName}:${lineIdx + 1}] Single-letter heading: "${trimmed}"`);
        if (/^#{1,4}\s*$/.test(trimmed)) addWarning(`[${fileName}:${lineIdx + 1}] Empty heading`);
    });

    lintMarkdown(text).forEach(issue => addWarning(`[${fileName}] ${issue}`));

    findImageRefs(text).forEach(ref => {
        if (!imageExists(ref, chaptersDir, projectDir)) addError(`[${fileName}] Missing image: ${ref}`);
    });

    return { words, paragraphs: textBlocks.length };
}

function auditEdition(edition, projectDir, folderName) {
    const chaptersDir = path.join(projectDir, edition.folder);
    const files = fs.existsSync(chaptersDir) ? listChapterFiles(chaptersDir) : [];
    if (files.length === 0) return null;

    console.log(`\n📚 ${edition.label} edition: ${files.length} file(s) in ${edition.folder}/`);

    const chapters = {};
    let totalWords = 0;
    let totalParagraphs = 0;
    files.forEach((fileName, idx) => {
        const text = fs.readFileSync(path.join(chaptersDir, fileName), 'utf8');
        const stats = auditChapterFile(fileName, text, idx, chaptersDir, projectDir);
        chapters[fileName] = { text, ...stats };
        totalWords += stats.words;
        totalParagraphs += stats.paragraphs;
    });
    console.log(`  📊 Total: ${files.length} files | ${totalParagraphs.toLocaleString()} paragraphs | ${totalWords.toLocaleString()} words`);

    const masterName = `${folderName}-${edition.baseName}.md`;
    const masterPath = path.join(projectDir, masterName);
    if (fs.existsSync(masterPath)) {
        const expected = buildMasterContent(projectDir, folderName, chaptersDir, files, edition.isOriginal);
        if (fs.readFileSync(masterPath, 'utf8').trim() === expected.trim()) {
            console.log(`  ✓ ${masterName} matches its chapter files`);
        } else {
            addError(`${masterName} does not match its chapter files. Publishing rebuilds it automatically.`);
        }
    } else {
        console.log(`  [INFO] ${masterName} has not been compiled yet`);
    }

    return { files, chapters, totalWords };
}

// Translators may rename a chapter's slug, so files pair up by their numeric prefix (e.g. "02_01").
function chapterKey(fileName) {
    const match = fileName.match(/^\d+(?:_\d+)*/);
    return match ? match[0] : fileName;
}

function auditTranslation(original, translated) {
    console.log('\n🔁 Translation parity (Original vs Translated)');

    const translatedByKey = new Map(translated.files.map(f => [chapterKey(f), f]));
    const originalKeys = new Set(original.files.map(chapterKey));
    const missing = original.files.filter(f => !translatedByKey.has(chapterKey(f)));
    const extra = translated.files.filter(f => !originalKeys.has(chapterKey(f)));

    console.log(`  ${original.files.length - missing.length}/${original.files.length} original file(s) have a translation`);
    if (missing.length > 0) addWarning(`Not translated yet (${missing.length}): ${missing.join(', ')}`);
    if (extra.length > 0) addWarning(`Translated files with no original (${extra.length}): ${extra.join(', ')}`);

    for (const originalFile of original.files) {
        const translatedFile = translatedByKey.get(chapterKey(originalFile));
        if (!translatedFile) continue;

        const o = original.chapters[originalFile];
        const t = translated.chapters[translatedFile];

        const originalHeadings = countHeadings(o.text);
        const translatedHeadings = countHeadings(t.text);
        for (const level of [1, 2, 3]) {
            if (originalHeadings[level] !== translatedHeadings[level]) {
                addWarning(`[${translatedFile}] H${level} count: original ${originalHeadings[level]}, translated ${translatedHeadings[level]}`);
            }
        }

        const originalImages = findImageRefs(o.text).length;
        const translatedImages = findImageRefs(t.text).length;
        if (originalImages !== translatedImages) {
            addWarning(`[${translatedFile}] Image count: original ${originalImages}, translated ${translatedImages}`);
        }

        if (Math.abs(o.paragraphs - t.paragraphs) > Math.max(2, o.paragraphs * PARAGRAPH_TOLERANCE)) {
            addWarning(`[${translatedFile}] Paragraph count: original ${o.paragraphs}, translated ${t.paragraphs}`);
        }
    }
}

async function auditSourcePdf(pdfPath, original) {
    const parser = new pdfParseMod.PDFParse(new Uint8Array(fs.readFileSync(pdfPath)));
    await parser.load();
    const doc = parser.doc;

    let pdfWords = 0;
    for (let pageNum = 1; pageNum <= doc.numPages; pageNum++) {
        const page = await doc.getPage(pageNum);
        const content = await page.getTextContent();
        pdfWords += countWords(content.items.map(item => item.str + (item.hasEOL ? ' ' : '')).join(''));
        page.cleanup();
    }

    console.log(`\n📄 Source PDF: ${path.basename(pdfPath)} (${doc.numPages} pages)`);
    if (!original) {
        console.log('  [INFO] No original chapters to compare with the PDF');
        return;
    }

    const ratio = pdfWords > 0 ? original.totalWords / pdfWords : 1;
    console.log(`  PDF ${pdfWords.toLocaleString()} words | Original chapters ${original.totalWords.toLocaleString()} words | ${(ratio * 100).toFixed(1)}%`);
    if (ratio < MIN_PDF_WORD_RATIO) {
        addWarning(`Original chapters hold only ${(ratio * 100).toFixed(1)}% of the PDF's words. Text may have been lost during extraction.`);
    }
}

async function auditBook(projectDir) {
    const folderName = path.basename(projectDir);

    console.log('================================================================');
    console.log(`🔬 BOOK AUDIT: ${folderName}`);
    console.log('================================================================');

    const original = auditEdition(EDITIONS[0], projectDir, folderName);
    const translated = auditEdition(EDITIONS[1], projectDir, folderName);

    if (!original && !translated) {
        addError('No chapter files found in chapters_original/ or chapters_translated/.');
    }

    if (original && translated) {
        auditTranslation(original, translated);
    }

    const pdfPath = findSourcePdf(projectDir, folderName);
    if (pdfPath) {
        await auditSourcePdf(pdfPath, original);
    } else {
        console.log(`\n[INFO] "${folderName}.pdf" not found beside or inside the project. Skipping the source PDF comparison.`);
    }

    console.log('\n================================================================');
    if (errorCount > 0) {
        console.log(`[ERROR] AUDIT FINISHED: ${errorCount} error(s), ${warningCount} warning(s).`);
    } else if (warningCount > 0) {
        console.log(`[!] AUDIT FINISHED: ${warningCount} warning(s), no errors. Review them before publishing.`);
    } else {
        console.log('🎉 AUDIT COMPLETE: no problems found.');
    }
    console.log('================================================================\n');

    process.exitCode = errorCount > 0 ? 1 : 0;
}

auditBook(path.resolve(process.argv[2] || process.cwd())).catch(err => {
    console.error(err);
    process.exit(1);
});
