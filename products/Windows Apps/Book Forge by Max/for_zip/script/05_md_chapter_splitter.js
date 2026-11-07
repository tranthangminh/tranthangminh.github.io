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
const { cleanTitle, writeChapterFiles } = require('./05_chunk_writer');

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

for (let i = 0; i < chapters.length; i++) {
    const chp = chapters[i];

    if (chp.isFrontMatter) {
        const fileName = '00-front-matter.md';
        const chpFullText = chp.lines.join('\n').trim() + '\n';
        fs.writeFileSync(path.join(chaptersOriginalDir, fileName), chpFullText, 'utf8');
        totalSavedFiles++;
        console.log(`  [00] Saved: chapters_original/${fileName} (${chpFullText.length} chars)`);
        continue;
    }

    fileSeq++;
    totalSavedFiles += writeChapterFiles(chaptersOriginalDir, String(fileSeq).padStart(2, '0'), chp.title, chp.lines, SPLIT_CHAR_THRESHOLD, splitMode);
}

console.log(`\n🎉 EXTRACTION COMPLETE! Successfully split into ${totalSavedFiles} chapter files in "chapters_original/".\n`);

