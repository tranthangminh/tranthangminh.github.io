/**
 * Submodule 01_3: Raw Token Extractor & Vocabulary Segmenter
 * Location: script/01_3_token_extractor.js
 * 
 * Responsibilities:
 * - Extracts text tokens with high-precision 2D coordinates (x, y, w, fs).
 * - Suppresses tokens overlapping with hybrid vector/raster image clusters.
 * - Dynamic vocabulary learning via NLP engine (learnFromText).
 * - Letter-spacing decompression & de-spacing (despace).
 * - Tracks character counts per font size.
 */

const { despace, learnFromText } = require('./word_segmenter_EN');

function extractRawTokens(textContent, fontStyles, hybridBoxes, fontSizesCount) {
    const rawTokens = [];

    for (let item of textContent.items) {
        let str = item.str;
        if (!str && (!item.width || item.width === 0)) continue;
        if (typeof str === 'string' && !str.trim() && (item.width || 0) <= 0.25) continue;

        const y = Math.round(item.transform[5] * 10) / 10;
        const x = Math.round(item.transform[4] * 10) / 10;
        const w = Math.round((item.width || 0) * 10) / 10;
        const fs = Math.round(Math.hypot(item.transform[0], item.transform[1]) * 10) / 10;
        const style = fontStyles.get(item.fontName) || { isBold: false, isItalic: false };

        // Suppress tokens inside hybrid vector/raster clusters
        let isSuppressed = false;
        for (let b of hybridBoxes) {
            if (x >= b.minX - 3 && x <= b.maxX + 3 && y >= b.minY - 3 && y <= b.maxY + 3) {
                isSuppressed = true;
                break;
            }
        }
        if (isSuppressed) continue;

        // Dynamic in-memory vocabulary learning from regular body text
        if (str && str.length >= 4 && !str.includes(' ') && fs >= 10 && fs <= 14) {
            learnFromText(str);
        }

        // High-precision de-spacing
        str = despace(str);
        if (!str && w === 0) continue;

        // Track font size statistics for headings vs notes
        if (str.trim().length > 0 && fs > 0) {
            const fsKey = fs.toFixed(1);
            fontSizesCount[fsKey] = (fontSizesCount[fsKey] || 0) + str.trim().length;
        }

        rawTokens.push({
            x,
            y,
            w,
            fs,
            str,
            bucketY: y,
            isBold: style.isBold,
            isItalic: style.isItalic,
            isSuperscript: false,
            isSubscript: false,
            isLeading: false
        });
    }

    return rawTokens;
}

module.exports = {
    extractRawTokens
};
