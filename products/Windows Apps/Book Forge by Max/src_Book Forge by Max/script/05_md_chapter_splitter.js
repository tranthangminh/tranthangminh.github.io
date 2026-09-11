/**
 * Module 05 Helper: Fast Markdown Chapter Splitter (H1-based)
 * Location: script/05_md_chapter_splitter.js
 * 
 * Logic:
 * 1. Checks ONLY for [folderName].md at the parent level (cùng cấp với folder sách).
 * 2. Parses H1 headings (# Heading or <h1>...</h1>).
 * 3. Extracts Front Matter (if any) to chapters_original/00-front-matter.md.
 * 4. Splits each H1 chapter cleanly into chapters_original/XX-[title].md.
 * 5. Copies the source Markdown book file into the project folder.
 */

const fs = require('fs');
const path = require('path');

const args = process.argv.slice(2);
let inputPath = null;
let customThreshold = null;
let splitMode = 'h2-h3';
let projectDir = process.cwd();

for (let a of args) {
    if (a.startsWith('--threshold=')) {
        const val = parseInt(a.replace('--threshold=', '').replace(/\D/g, ''), 10);
        if (!isNaN(val) && val > 0) customThreshold = val;
    } else if (a.startsWith('--split=')) {
        splitMode = a.replace('--split=', '').trim().toLowerCase();
    } else if (!a.startsWith('--') && !inputPath) {
        inputPath = a.trim();
    }
}

const allowH2 = splitMode !== 'none';
const allowH3 = splitMode.includes('h3');

const parentDir = path.dirname(projectDir);
const folderName = path.basename(projectDir);

// 1. Strict discovery at parent directory only (cùng cấp folder)
if (!inputPath) {
    const candidateParent = path.join(parentDir, `${folderName}.md`);
    if (fs.existsSync(candidateParent)) {
        inputPath = candidateParent;
    }
} else {
    inputPath = path.resolve(projectDir, inputPath);
}

if (!inputPath || !fs.existsSync(inputPath)) {
    console.error(`❌ Error: Markdown source file not found at parent level: ${path.join(parentDir, folderName + '.md')}`);
    console.error(`👉 Please make sure "${folderName}.md" is placed in the parent folder (cùng cấp với folder sách).`);
    process.exit(1);
}

const chaptersOriginalDir = path.join(projectDir, 'chapters_original');
if (!fs.existsSync(chaptersOriginalDir)) {
    fs.mkdirSync(chaptersOriginalDir, { recursive: true });
}

// Clean old files in chapters_original
const oldFiles = fs.readdirSync(chaptersOriginalDir);
for (const f of oldFiles) {
    if (f.endsWith('.md')) {
        try { fs.unlinkSync(path.join(chaptersOriginalDir, f)); } catch (e) {}
    }
}

console.log(`\n======================================================`);
console.log(`📖 MARKDOWN CHAPTER SPLITTER (H1 ENGINE)`);
console.log(`📄 Input File: ${inputPath}`);
console.log(`📁 Target Directory: chapters_original/`);
console.log(`======================================================\n`);

const content = fs.readFileSync(inputPath, 'utf8');
const lines = content.split('\n');

const chapters = [];
let currentChapter = {
    title: 'Front Matter',
    isFrontMatter: true,
    lines: []
};

let inCodeBlock = false;

function cleanTitle(raw) {
    return raw
        .replace(/<[^>]+>/g, '')         // strip HTML tags
        .replace(/\*\*|\*|__|_/g, '')     // strip bold/italic
        .replace(/^[#\s]+/, '')           // strip leading #
        .trim();
}

function makeSlug(title) {
    const clean = title.replace(/[^\p{L}\p{N}\s_-]/gu, '').trim().toLowerCase();
    const slug = clean.replace(/\s+/g, '-').slice(0, 50);
    return slug || 'chapter';
}

for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    if (line.trim().startsWith('```')) {
        inCodeBlock = !inCodeBlock;
    }

    let isH1 = false;
    let h1Title = '';

    if (!inCodeBlock) {
        // Match Markdown # Heading
        const mdMatch = line.match(/^#\s+(.+)$/);
        if (mdMatch) {
            isH1 = true;
            h1Title = cleanTitle(mdMatch[1]);
        } else {
            // Match HTML <h1...>Heading</h1>
            const htmlMatch = line.match(/<h1\b[^>]*>(.*?)<\/h1>/i);
            if (htmlMatch) {
                isH1 = true;
                h1Title = cleanTitle(htmlMatch[1]);
            }
        }
    }

    if (isH1) {
        if (currentChapter.lines.length > 0 && (currentChapter.lines.some(l => l.trim().length > 0) || !currentChapter.isFrontMatter)) {
            chapters.push(currentChapter);
        }
        currentChapter = {
            title: h1Title,
            isFrontMatter: false,
            lines: [line]
        };
    } else {
        currentChapter.lines.push(line);
    }
}

if (currentChapter.lines.length > 0 && currentChapter.lines.some(l => l.trim().length > 0)) {
    chapters.push(currentChapter);
}

const SPLIT_CHAR_THRESHOLD = (customThreshold && customThreshold > 0) ? customThreshold : 25000;
let fileSeq = 0;
let totalSavedFiles = 0;

function parseSubSections(linesList, headingRegex, htmlRegex) {
    const sections = [];
    let curSec = null;
    let preamble = [];
    let inCode = false;

    for (let i = 0; i < linesList.length; i++) {
        const line = linesList[i];
        if (line.trim().startsWith('```')) inCode = !inCode;

        let isMatch = false;
        let title = '';

        if (!inCode) {
            const mdM = line.match(headingRegex);
            if (mdM) {
                isMatch = true;
                title = cleanTitle(mdM[1]);
            } else if (htmlRegex) {
                const htmlM = line.match(htmlRegex);
                if (htmlM) {
                    isMatch = true;
                    title = cleanTitle(htmlM[1]);
                }
            }
        }

        if (isMatch) {
            if (curSec) sections.push(curSec);
            curSec = { title, lines: [line] };
        } else {
            if (curSec) curSec.lines.push(line);
            else preamble.push(line);
        }
    }
    if (curSec) sections.push(curSec);
    if (sections.length > 0) {
        sections[0].lines = [...preamble, ...sections[0].lines];
    }
    return { sections, preamble };
}

for (let i = 0; i < chapters.length; i++) {
    const chp = chapters[i];
    const chpFullText = chp.lines.join('\n').trim() + '\n';
    const totalChars = chpFullText.length;

    if (chp.isFrontMatter) {
        const fileName = '00-front-matter.md';
        const filePath = path.join(chaptersOriginalDir, fileName);
        fs.writeFileSync(filePath, chpFullText, 'utf8');
        totalSavedFiles++;
        console.log(`  [00] Saved: chapters_original/${fileName} (${totalChars} chars)`);
        continue;
    }

    fileSeq++;
    const padSeq = String(fileSeq).padStart(2, '0');
    const slugH1 = makeSlug(chp.title);

    let h2Data = (allowH2 && totalChars >= SPLIT_CHAR_THRESHOLD) ? parseSubSections(chp.lines, /^##\s+(.+)$/, /<h2\b[^>]*>(.*?)<\/h2>/i) : { sections: [] };

    if (h2Data.sections.length >= 2) {
        console.log(`  ⚡ Chapter [${padSeq}] "${chp.title}" (${totalChars} chars) -> Smart-splitting into ${h2Data.sections.length} H2 sections (${padSeq}_01, ${padSeq}_02...)`);

        for (let sIdx = 0; sIdx < h2Data.sections.length; sIdx++) {
            const secH2 = h2Data.sections[sIdx];
            const subPad = String(sIdx + 1).padStart(2, '0');
            const slugH2 = makeSlug(secH2.title);
            const secH2Text = secH2.lines.join('\n').trim() + '\n';
            const secH2Chars = secH2Text.length;

            // Check if H2 section itself is still >= threshold and has >= 2 H3 sub-headings (only if H3 splitting is enabled)
            let h3Data = (allowH3 && secH2Chars >= SPLIT_CHAR_THRESHOLD) ? parseSubSections(secH2.lines, /^###\s+(.+)$/, /<h3\b[^>]*>(.*?)<\/h3>/i) : { sections: [] };

            if (h3Data.sections.length >= 2) {
                console.log(`     ↳ ⚡ Section [${padSeq}_${subPad}] "${secH2.title}" (${secH2Chars} chars) -> Smart-splitting into ${h3Data.sections.length} H3 sections (${padSeq}_${subPad}_01, ${padSeq}_${subPad}_02...)`);

                for (let h3Idx = 0; h3Idx < h3Data.sections.length; h3Idx++) {
                    const secH3 = h3Data.sections[h3Idx];
                    const h3Pad = String(h3Idx + 1).padStart(2, '0');
                    const slugH3 = makeSlug(secH3.title);
                    const secH3Text = secH3.lines.join('\n').trim() + '\n';

                    let subFileName = '';
                    if (h3Idx === 0) {
                        subFileName = `${padSeq}_${subPad}_${h3Pad}-${sIdx === 0 ? slugH1 : slugH2}.md`;
                    } else {
                        subFileName = `${padSeq}_${subPad}_${h3Pad}-${slugH3}.md`;
                    }

                    const filePath = path.join(chaptersOriginalDir, subFileName);
                    fs.writeFileSync(filePath, secH3Text, 'utf8');
                    totalSavedFiles++;

                    console.log(`        ↳ [${padSeq}_${subPad}_${h3Pad}] Saved: chapters_original/${subFileName} (${secH3Text.length} chars)`);
                }
            } else {
                let subFileName = '';
                if (sIdx === 0) {
                    subFileName = `${padSeq}_${subPad}-${slugH1}.md`;
                } else {
                    subFileName = `${padSeq}_${subPad}-${slugH2}.md`;
                }

                const filePath = path.join(chaptersOriginalDir, subFileName);
                fs.writeFileSync(filePath, secH2Text, 'utf8');
                totalSavedFiles++;

                console.log(`     ↳ [${padSeq}_${subPad}] Saved: chapters_original/${subFileName} (${secH2Text.length} chars)`);
            }
        }
    } else {
        const fileName = `${padSeq}-${slugH1}.md`;
        const filePath = path.join(chaptersOriginalDir, fileName);
        fs.writeFileSync(filePath, chpFullText, 'utf8');
        totalSavedFiles++;

        console.log(`  [${padSeq}] Saved: chapters_original/${fileName} (${totalChars} chars)`);
    }
}

console.log(`\n🎉 EXTRACTION COMPLETE! Successfully split into ${totalSavedFiles} chapter files in "chapters_original/".\n`);

