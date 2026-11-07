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
const { listChapterFiles, lintMarkdown, buildMasterContent } = require('./06_master_builder');

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
const files = listChapterFiles(targetDir, outputFileName);

if (files.length === 0) {
    console.error(`⚠️  Warning: No markdown chapter files found in "${sourceMode}/".`);
    process.exit(1);
}

console.log(`Found ${files.length} chapter file(s) to compile.\n`);

// 2. Syntax Quality Linter
let lintErrors = 0;

for (let file of files) {
    const issues = lintMarkdown(fs.readFileSync(path.join(targetDir, file), 'utf8').trim());
    if (issues.length > 0) {
        console.log(`⚠️  Linter warnings in [${file}]:`);
        issues.forEach(iss => console.log(`   - ${iss}`));
        lintErrors += issues.length;
    } else {
        console.log(`  ✓ ${file} (Passed QA Linter)`);
    }
}

// 3. Compile Master Content
fs.writeFileSync(outputFilePath, buildMasterContent(projectDir, folderName, targetDir, files, baseName === 'original'), 'utf8');

console.log('\n======================================================');
if (lintErrors === 0) {
    console.log(`🎉 COMPILATION COMPLETE! (0 Lint Errors)`);
} else {
    console.log(`⚠️  COMPILATION FINISHED with ${lintErrors} warning(s).`);
}
console.log(`📄 Saved: ${outputFilePath}`);
console.log('======================================================\n');
