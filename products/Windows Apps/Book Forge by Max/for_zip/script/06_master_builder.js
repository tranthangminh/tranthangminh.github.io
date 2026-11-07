/**
 * Module 06 Helper: Master Book Builder
 * Location: script/06_master_builder.js
 *
 * Single definition of how chapter files become the master "[BookName]-<edition>.md".
 * Used by 06__book_compiler.js to write it and by audit_pdf_vs_md.js to verify it.
 */

const fs = require('fs');
const path = require('path');

function listChapterFiles(chaptersDir, excludeName = '') {
    return fs.readdirSync(chaptersDir)
        .filter(f => f.endsWith('.md') && !f.startsWith('_') && f !== excludeName)
        .sort((a, b) => a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' }));
}

function lintMarkdown(content) {
    const errors = [];

    content.split('\n').forEach((line, idx) => {
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

function findCoverImageRelative(projectDir, isOriginal) {
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

function buildMasterContent(projectDir, folderName, chaptersDir, files, isOriginal) {
    let masterContent = '';

    const activeCoverRel = findCoverImageRelative(projectDir, isOriginal);
    if (activeCoverRel) {
        masterContent += `<div class="cover-page" align="center">\n  <img src="${activeCoverRel}" alt="${folderName} Cover" style="max-width: 95%; max-height: 90vh; object-fit: contain;" />\n</div>\n\n---\n\n`;
    }

    const chapterBlocks = files.map(file => {
        return fs.readFileSync(path.join(chaptersDir, file), 'utf8').trim()
            // Strip any duplicate cover image tag inside chapter or front-matter content
            .replace(/!\[.*?\]\([^)]*cover\.(png|jpg|jpeg|webp|svg)\)\s*/gi, '')
            // Rewrite relative image paths from subfolder format (../images_*) to root format (images_*)
            .replace(/\(\.\.\/images_original\//g, '(images_original/')
            .replace(/\(\.\.\/images_translated\//g, '(images_translated/')
            .replace(/src=["']\.\.\/images_original\//g, 'src="images_original/')
            .replace(/src=["']\.\.\/images_translated\//g, 'src="images_translated/')
            .trim();
    });

    return (masterContent + chapterBlocks.join('\n\n---\n\n')).trim() + '\n';
}

module.exports = { listChapterFiles, lintMarkdown, buildMasterContent };
