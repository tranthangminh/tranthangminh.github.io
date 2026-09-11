/**
 * Module: metadata_manager.js
 * Manages sequential illustration numbering, obsolete file cleanup, and metadata.json generation.
 */

const fs = require('fs');
const path = require('path');

function createMetadataManager(imagesDir) {
    if (!fs.existsSync(imagesDir)) {
        fs.mkdirSync(imagesDir, { recursive: true });
    }

    const metadata = { items: [] };
    let illustrationCounter = 0;

    function cleanOldIllustrations() {
        if (!fs.existsSync(imagesDir)) return;
        const oldFiles = fs.readdirSync(imagesDir);
        for (const f of oldFiles) {
            if (/^(illustration_\d+|cover)\.(png|jpg|jpeg|webp|svg)$/i.test(f)) {
                try {
                    fs.unlinkSync(path.join(imagesDir, f));
                } catch (e) {}
            }
        }
    }

    function getNextFileName(ext) {
        const numStr = String(illustrationCounter).padStart(2, '0');
        illustrationCounter++;
        return `illustration_${numStr}.${ext}`;
    }

    function addCoverItem(file) {
        metadata.items.push({
            page: 1,
            type: 'cover',
            file: file,
            y: 300
        });
    }

    function addIllustrationItem({ page, type, file, y, bounds, suppressedTexts }) {
        const entry = { page, type, file, y, bounds };
        if (suppressedTexts && suppressedTexts.length > 0) {
            entry.suppressedTexts = suppressedTexts;
        }
        metadata.items.push(entry);
    }

    function save() {
        const metaPath = path.join(imagesDir, 'metadata.json');
        fs.writeFileSync(metaPath, JSON.stringify(metadata, null, 2), 'utf8');
        return metaPath;
    }

    function getCounter() {
        return illustrationCounter;
    }

    return {
        cleanOldIllustrations,
        getNextFileName,
        addCoverItem,
        addIllustrationItem,
        save,
        getCounter,
        getItems: () => metadata.items
    };
}

module.exports = {
    createMetadataManager
};
