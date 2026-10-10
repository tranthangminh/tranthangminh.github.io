/**
 * Submodule 01_1: Graphics & Hybrid Image Loader
 * Location: script/01_1_graphics_loader.js
 * 
 * Responsibilities:
 * - Reads "images/metadata.json" produced by Module 04.
 * - Maps raster, vector, and hybrid graphic assets to their corresponding pages.
 * - Provides bounding boxes of hybrid image clusters to suppress duplicate text.
 */

const fs = require('fs');
const path = require('path');

function loadGraphicsMetadata(projectDir) {
    const pDir = projectDir || process.cwd();
    const candidatePaths = [
        path.join(pDir, 'images_original', 'metadata.json'),
        path.join(pDir, 'images_translated', 'metadata.json'),
        path.join(pDir, 'images', 'metadata.json')
    ];
    let metadataPath = candidatePaths.find(p => fs.existsSync(p));
    let graphicsMetadata = { items: [] };

    if (metadataPath && fs.existsSync(metadataPath)) {
        try {
            graphicsMetadata = JSON.parse(fs.readFileSync(metadataPath, 'utf8'));
        } catch (e) {}
    }

    const pageGraphicsMap = new Map();
    if (graphicsMetadata.items && graphicsMetadata.items.length > 0) {
        for (let item of graphicsMetadata.items) {
            if (item.type === 'cover') continue;
            if (!pageGraphicsMap.has(item.page)) pageGraphicsMap.set(item.page, []);
            pageGraphicsMap.get(item.page).push({
                isImage: true,
                imageName: item.file,
                type: item.type === 'vector' ? 'vector' : 'figure',
                y: item.y !== undefined ? item.y : 300,
                bounds: item.bounds || null,
                suppressedTexts: item.suppressedTexts || []
            });
        }
    }

    return pageGraphicsMap;
}

function getHybridBoxes(pageImages) {
    return pageImages
        .filter(img => img.bounds && img.suppressedTexts && img.suppressedTexts.length > 0)
        .map(img => img.bounds);
}

module.exports = {
    loadGraphicsMetadata,
    getHybridBoxes
};
