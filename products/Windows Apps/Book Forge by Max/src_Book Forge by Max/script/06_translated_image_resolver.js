#!/usr/bin/env node

/**
 * Module 06 Helper: Translated Image Path Resolver
 * Location: script/06_translated_image_resolver.js
 * 
 * Functionality:
 * 1. Checks if `images_translated/` contains any translated graphics/images.
 * 2. If present, scans all translated markdown files (*-translated.md and chapters_translated/*.md).
 * 3. Rewrites image paths from `images_original/<file>` to `images_translated/<file>` when the translated image exists.
 * 4. Preserves `images_original/<file>` for any images that have not been translated yet (Safe Fallback).
 */

const fs = require('fs');
const path = require('path');

const projectDir = process.cwd();
const imagesTranslatedDir = path.join(projectDir, 'images_translated');
const imagesOriginalDir = path.join(projectDir, 'images_original');

console.log('======================================================');
console.log('🖼️  TRANSLATED IMAGE PATH RESOLVER');
console.log(`📁 Project: ${path.basename(projectDir)}`);
console.log('======================================================\n');

if (!fs.existsSync(imagesTranslatedDir)) {
    console.log('ℹ️  No "images_translated/" folder found. Skipping image path update.\n');
    process.exit(0);
}

// 1. Get list of all available translated images
const validImageExts = new Set(['.png', '.jpg', '.jpeg', '.svg', '.webp', '.gif']);
const translatedImages = new Set(
    fs.readdirSync(imagesTranslatedDir).filter(f => validImageExts.has(path.extname(f).toLowerCase()))
);

if (translatedImages.size === 0) {
    console.log('ℹ️  "images_translated/" is empty. Keeping original image paths.\n');
    process.exit(0);
}

console.log(`✓ Found ${translatedImages.size} translated image(s) in "images_translated/".`);

// 2. Discover translated markdown target files
const targetMdFiles = [];

// A. Master compiled translated markdown (*-translated.md)
const rootFiles = fs.readdirSync(projectDir);
rootFiles.forEach(f => {
    if (f.endsWith('.md') && (f.includes('-translated') || f.includes('_translated') || f.includes('-dich'))) {
        targetMdFiles.push(path.join(projectDir, f));
    }
});

// B. Chapter files in chapters_translated/
const chaptersTranslatedDir = path.join(projectDir, 'chapters_translated');
if (fs.existsSync(chaptersTranslatedDir)) {
    const chpFiles = fs.readdirSync(chaptersTranslatedDir).filter(f => f.endsWith('.md'));
    chpFiles.forEach(f => {
        targetMdFiles.push(path.join(chaptersTranslatedDir, f));
    });
}

if (targetMdFiles.length === 0) {
    console.log('ℹ️  No translated markdown files (*-translated.md or chapters_translated/*.md) found.\n');
    process.exit(0);
}

// 3. Process each markdown file and swap image paths
let totalSwapped = 0;

targetMdFiles.forEach(filePath => {
    let content = fs.readFileSync(filePath, 'utf8');
    let fileSwapped = 0;

    // Pattern 1: Markdown syntax ![alt](images_original/filename.ext)
    content = content.replace(/(!\[.*?\]\()([^)]*?)images_original\/([^)\s]+)(\))/gi, (match, p1, p2, imgFile, p4) => {
        const baseName = path.basename(imgFile);
        if (translatedImages.has(baseName)) {
            fileSwapped++;
            return `${p1}${p2}images_translated/${baseName}${p4}`;
        }
        return match;
    });

    // Pattern 2: HTML <img> tag src="images_original/filename.ext"
    content = content.replace(/(<img[^>]*?src=["'])([^"']*?)images_original\/([^"'\s]+)(["'])/gi, (match, p1, p2, imgFile, p4) => {
        const baseName = path.basename(imgFile);
        if (translatedImages.has(baseName)) {
            fileSwapped++;
            return `${p1}${p2}images_translated/${baseName}${p4}`;
        }
        return match;
    });

    if (fileSwapped > 0) {
        fs.writeFileSync(filePath, content, 'utf8');
        const relPath = path.relative(projectDir, filePath);
        console.log(`  ✓ Updated ${fileSwapped} image path(s) in: ${relPath}`);
        totalSwapped += fileSwapped;
    }
});

console.log(`\n🎉 IMAGE RESOLUTION COMPLETE! Total ${totalSwapped} image reference(s) migrated to "images_translated/".\n`);
