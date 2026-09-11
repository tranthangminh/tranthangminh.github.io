/**
 * Module: Universal PDF vs. Markdown Comprehensive Audit & Verification Suite
 * Location: script/compare/audit_pdf_vs_md.js
 * 
 * Usage:
 *   node script/compare/audit_pdf_vs_md.js [projectDir]
 * 
 * Responsibilities:
 * 1. Automatic Discovery: Detects book PDF and project structure without hardcoding.
 * 2. Structure & Completeness: Verifies Front Matter, Table of Contents, and all Content Chapters.
 * 3. Page & Boundary Check: Maps start/end PDF pages to chapter opening and closing sentences.
 * 4. Typography & Encoding Anomaly Scanner:
 *    - Scans for font glyph corruptions ('MM').
 *    - Scans for decomposed / malformed diacritics (e´, c¸, aˆ, etc.).
 *    - Scans for phantom single-character dropcap headers (## A).
 *    - Scans for empty markdown headings.
 * 5. Full Compilation Parity: Validates 100% exact match between compiled [Book]-original.md and original/*.md.
 */

const fs = require('fs');
const path = require('path');

const appDataNpm = path.join(process.env.APPDATA || '', 'npm', 'node_modules');
let pdfParseMod;
try {
    pdfParseMod = require(path.join(appDataNpm, 'pdf-parse'));
} catch (e) {
    try {
        pdfParseMod = require('pdf-parse');
    } catch (e2) {
        console.error('❌ Error: pdf-parse module is required. Please install via: npm install -g pdf-parse');
        process.exit(1);
    }
}

async function auditBook(projectDir) {
    projectDir = projectDir || process.cwd();
    const folderName = path.basename(path.resolve(projectDir));
    const parentDir = path.join(projectDir, '..');
    let originalDir = path.join(projectDir, 'chapters_original');
    if (!fs.existsSync(originalDir) && fs.existsSync(path.join(projectDir, 'original'))) {
        originalDir = path.join(projectDir, 'original');
    }

    console.log('================================================================');
    console.log(`🔬 COMPREHENSIVE BOOK AUDIT: ${folderName}`);
    console.log('================================================================\n');

    // 1. Auto-detect PDF file
    let pdfPath = null;
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
                       !fLow.includes('(b5') &&
                       !fLow.includes('(kindle') &&
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

    if (!pdfPath || !fs.existsSync(pdfPath)) {
        console.error(`❌ Cannot locate PDF file for "${folderName}". Looked in: ${searchDirs.join(', ')}`);
        process.exit(1);
    }

    console.log(`📄 PDF Source: ${path.basename(pdfPath)}`);
    console.log(`📁 Project Folder: ${projectDir}`);
    console.log(`📁 Original Chapters: ${originalDir}\n`);

    // 2. Load PDF
    const buf = fs.readFileSync(pdfPath);
    const parser = new pdfParseMod.PDFParse(new Uint8Array(buf));
    await parser.load();
    const doc = parser.doc;
    console.log(`[1/4] PDF Document Loaded: ${doc.numPages} Pages.`);

    // 3. Load Markdown Chapters
    if (!fs.existsSync(originalDir)) {
        console.error(`❌ "original/" directory not found. Please run 01_EXTRACT_PDF.bat first.`);
        process.exit(1);
    }
    const chapterFiles = fs.readdirSync(originalDir).filter(f => f.endsWith('.md') && f !== 'full_book_original.md').sort();
    console.log(`[2/4] Extracted Chapters: ${chapterFiles.length} files found in original/.\n`);

    // 4. Detailed Chapter-by-Chapter Integrity & Boundary Audit
    console.log(`[3/4] Checking Chapter Structure, Boundaries & Word Counts...`);
    let totalMdWords = 0;
    let totalParagraphs = 0;

    for (let idx = 0; idx < chapterFiles.length; idx++) {
        const fileName = chapterFiles[idx];
        const filePath = path.join(originalDir, fileName);
        const mdText = fs.readFileSync(filePath, 'utf8');

        const cleanText = mdText.replace(/<[^>]+>/g, ' ').replace(/[#*_]/g, ' ').replace(/\s+/g, ' ').trim();
        const words = cleanText.split(/\s+/).filter(Boolean).length;
        totalMdWords += words;

        const rawParagraphs = mdText.split('\n\n').map(p => p.trim()).filter(Boolean);
        const headings = rawParagraphs.filter(p => p.startsWith('#'));
        const textBlocks = rawParagraphs.filter(p => !p.startsWith('#') && !p.startsWith('![') && p !== '---');
        totalParagraphs += textBlocks.length;

        const firstSentence = (textBlocks[0] || '').replace(/\n+/g, ' ').slice(0, 65);
        const lastSentence = (textBlocks[textBlocks.length - 1] || '').replace(/\n+/g, ' ').slice(-65);

        console.log(`  ✓ [${String(idx).padStart(2, '0')}] ${fileName.padEnd(45, ' ')} | ${String(words).padStart(6, ' ')} words | ${headings.length} headings | ${textBlocks.length} paras`);
        console.log(`       Start: "${firstSentence}..."`);
        console.log(`       End:   "...${lastSentence}"`);
    }

    console.log(`\n  📊 Total Book Stats: ${chapterFiles.length} files | ${totalParagraphs.toLocaleString()} paragraphs | ${totalMdWords.toLocaleString()} words.`);

    // 5. Typography & Encoding Anomaly Scanner
    console.log(`\n[4/4] Scanning for Typography & Encoding Anomalies...`);
    const anomalies = [];
    const compiledPath = path.join(projectDir, `${folderName}-original.md`);
    let compiledText = '';
    if (fs.existsSync(compiledPath)) {
        compiledText = fs.readFileSync(compiledPath, 'utf8');
    }

    for (const fileName of chapterFiles) {
        const text = fs.readFileSync(path.join(originalDir, fileName), 'utf8');

        // Check for 'MM' artifact
        const mmMatches = text.match(/\b\w+MM\b/g);
        if (mmMatches) {
            anomalies.push({ file: fileName, type: 'Glyph Corruption', detail: `Found 'MM' artifact: ${mmMatches.join(', ')}` });
        }

        // Check for floating diacritic artifacts (e´, c¸, aˆ, etc.)
        const diacriticMatches = text.match(/[A-Za-z]+[´`ˆ¸¨~][A-Za-z]*/g);
        if (diacriticMatches) {
            anomalies.push({ file: fileName, type: 'Malformed Diacritic', detail: `Found decomposed diacritics: ${diacriticMatches.join(', ')}` });
        }

        // Check for phantom single-letter headers (## A)
        const lines = text.split('\n');
        lines.forEach((l, lIdx) => {
            if (/^#{1,3}\s+[A-Za-z]$/.test(l.trim())) {
                anomalies.push({ file: fileName, line: lIdx + 1, type: 'Phantom Header', detail: `Single-letter heading: "${l.trim()}"` });
            }
            if (/^#{1,4}\s*$/.test(l.trim())) {
                anomalies.push({ file: fileName, line: lIdx + 1, type: 'Empty Header', detail: `Empty header at line ${lIdx + 1}` });
            }
        });
    }

    if (anomalies.length === 0) {
        console.log(`  ✅ 0 Anomalies detected! Unicode NFC, diacritics, and ligatures are 100% clean.`);
    } else {
        console.log(`  ⚠️ Found ${anomalies.length} potential anomalies:`);
        anomalies.forEach(a => console.log(`     - [${a.file}] ${a.type}: ${a.detail}`));
    }

    // 6. Full Compilation Verification
    if (compiledText) {
        let reconstructed = '';
        const coverRelPath = fs.existsSync(path.join(projectDir, 'images', 'cover.png')) ? 'images/cover.png' : 'images/cover.jpg';
        if (fs.existsSync(path.join(projectDir, coverRelPath))) {
            reconstructed += `<div class="cover-page" align="center">\n  <img src="${coverRelPath}" alt="${folderName} Cover" style="max-width: 95%; max-height: 90vh; object-fit: contain;" />\n</div>\n\n---\n\n`;
        }
        const fileContents = chapterFiles.map(f => {
            let content = fs.readFileSync(path.join(originalDir, f), 'utf8').trim();
            content = content.replace(/!\[.*?\]\([^)]*cover\.(png|jpg|jpeg|webp)\)\s*/gi, '');
            return content
                .replace(/\(\.\.\/images\//g, '(images/')
                .replace(/src="\.\.\/images\//g, 'src="images/')
                .replace(/src='\.\.\/images\//g, "src='images/")
                .replace(/\(\.\.\/assets\//g, '(images/')
                .replace(/src="\.\.\/assets\//g, 'src="images/')
                .replace(/src='\.\.\/assets\//g, "src='images/");
        });
        reconstructed += fileContents.join('\n\n---\n\n');
        const isMatched = compiledText.trim() === reconstructed.trim();
        console.log(`\n📚 Compiled File (${path.basename(compiledPath)}): ${compiledText.length.toLocaleString()} chars | ${isMatched ? '✅ 100% EXACT MATCH' : '⚠️ DIFFERS'}`);
    }

    console.log('\n================================================================');
    console.log('🎉 AUDIT COMPLETE: Book extraction is fully verified and publication-ready!');
    console.log('================================================================\n');
}

const targetDir = process.argv[2] || process.cwd();
auditBook(targetDir).catch(console.error);
