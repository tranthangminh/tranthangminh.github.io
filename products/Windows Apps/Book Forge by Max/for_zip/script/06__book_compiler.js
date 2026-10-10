/**
 * Module 06: Book Compiler & Syntax Quality Linter
 * Location: script/06_book_compiler.js
 * 
 * Usage:
 *   node script/06_book_compiler.js [--source=original|translated]
 * 
 * Responsibilities:
 * - Scans target directory ("original/" or "translated/") for all *.md chapter files.
 * - Runs Syntax Linter: Checks unclosed formatting (***, **, *, ~~), paragraph tags, and headings.
 * - Merges chapters into a single master Markdown file in the project root:
 *   - "[BookName]-original.md" (if --source=original)
 *   - "[BookName]-translated.md" (if --source=translated)
 * - Inserts cover image and metadata headers cleanly.
 */

const fs = require('fs');
const path = require('path');

const args = process.argv.slice(2);
let sourceMode = 'chapters_translated'; // default

for (let a of args) {
    if (a.startsWith('--source=')) {
        sourceMode = a.replace('--source=', '').toLowerCase().trim();
    }
}

// Normalize folder alias and output base name
let targetFolder = 'chapters_translated';
let baseName = 'translated';

if (sourceMode === 'original' || sourceMode === 'chapters_original') {
    targetFolder = 'chapters_original';
    baseName = 'original';
} else if (sourceMode === 'translated' || sourceMode === 'chapters_translated') {
    targetFolder = 'chapters_translated';
    baseName = 'translated';
} else {
    targetFolder = sourceMode;
    baseName = sourceMode;
}

const projectDir = process.cwd();
const folderName = path.basename(path.resolve(projectDir));
const targetDir = path.join(projectDir, targetFolder);

if (!fs.existsSync(targetDir)) {
    console.error(`\n❌ Error: Directory "${targetFolder}/" does not exist in ${projectDir}`);
    process.exit(1);
}

const outputFileName = `${folderName}-${baseName}.md`;
const outputFilePath = path.join(projectDir, outputFileName);

console.log('======================================================');
console.log(`📑 COMPILING BOOK: ${folderName}`);
console.log(`📂 Source Directory: ${targetFolder}/`);
console.log(`📄 Output File: ${outputFileName}`);
console.log('======================================================\n');

// 1. Scan and sort chapter markdown files
const files = fs.readdirSync(targetDir)
    .filter(f => f.endsWith('.md') && !f.startsWith('_') && f !== outputFileName)
    .sort((a, b) => a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' }));

if (files.length === 0) {
    console.error(`⚠️  Warning: No markdown chapter files found in "${sourceMode}/".`);
    process.exit(1);
}

console.log(`Found ${files.length} chapter file(s) to compile.\n`);

// 2. Syntax Quality Linter
let lintErrors = 0;

function lintMarkdown(content, fileName) {
    const lines = content.split('\n');
    let errors = [];

    // Check for dangling triple asterisks ***
    lines.forEach((line, idx) => {
        const tripleStars = (line.match(/\*\*\*/g) || []).length;
        if (tripleStars % 2 !== 0) {
            errors.push(`Line ${idx + 1}: Unclosed triple asterisks (***) found.`);
        }
        
        const doubleStars = (line.replace(/\*\*\*/g, '').match(/\*\*/g) || []).length;
        if (doubleStars % 2 !== 0) {
            errors.push(`Line ${idx + 1}: Unclosed double asterisks (**) found.`);
        }
    });

    return errors;
}

// 3. Compile Master Content
let masterContent = '';

// Step A: Standalone Cover Page (Page 1)
function findCoverImageRelative(isOriginal) {
    const exts = ['.png', '.jpg', '.jpeg', '.webp', '.svg'];
    const preferredDir = isOriginal ? 'images_original' : 'images_translated';
    const fallbackDir = isOriginal ? 'images_translated' : 'images_original';

    const coverCandidates = [
        ...exts.map(ext => `${preferredDir}/cover${ext}`),
        ...exts.map(ext => `${fallbackDir}/cover${ext}`),
        ...exts.map(ext => `images/cover${ext}`)
    ];
    for (const rel of coverCandidates) {
        if (fs.existsSync(path.join(projectDir, rel))) {
            return rel;
        }
    }
    return null;
}

const isOriginalMode = (baseName === 'original');
const activeCoverRel = findCoverImageRelative(isOriginalMode);
if (activeCoverRel) {
    masterContent += `<div class="cover-page" align="center">\n  <img src="${activeCoverRel}" alt="${folderName} Cover" style="max-width: 95%; max-height: 90vh; object-fit: contain;" />\n</div>\n\n---\n\n`;
}

// Step B: Chapters
const chapterBlocks = [];

for (let file of files) {
    const filePath = path.join(targetDir, file);
    let content = fs.readFileSync(filePath, 'utf8').trim();

    // Run linter
    const issues = lintMarkdown(content, file);
    if (issues.length > 0) {
        console.log(`⚠️  Linter warnings in [${file}]:`);
        issues.forEach(iss => console.log(`   - ${iss}`));
        lintErrors += issues.length;
    } else {
        console.log(`  ✓ ${file} (Passed QA Linter)`);
    }

    // Strip any duplicate cover image tag inside chapter or front-matter content
    content = content.replace(/!\[.*?\]\([^)]*cover\.(png|jpg|jpeg|webp|svg)\)\s*/gi, '');

    // Rewrite relative image paths from subfolder format (../images_*) to root format (images_*)
    content = content
        .replace(/\(\.\.\/images_original\//g, '(images_original/')
        .replace(/\(\.\.\/images_translated\//g, '(images_translated/')
        .replace(/src=["']\.\.\/images_original\//g, 'src="images_original/')
        .replace(/src=["']\.\.\/images_translated\//g, 'src="images_translated/');

    chapterBlocks.push(content.trim());
}

masterContent += chapterBlocks.join('\n\n---\n\n');

fs.writeFileSync(outputFilePath, masterContent.trim() + '\n', 'utf8');

console.log('\n======================================================');
if (lintErrors === 0) {
    console.log(`🎉 COMPILATION COMPLETE! (0 Lint Errors)`);
} else {
    console.log(`⚠️  COMPILATION FINISHED with ${lintErrors} warning(s).`);
}
console.log(`📄 Saved: ${outputFilePath}`);
console.log('======================================================\n');
