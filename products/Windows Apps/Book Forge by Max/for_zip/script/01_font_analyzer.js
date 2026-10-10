/**
 * Submodule 01_2: Font Style & Size Analyzer
 * Location: script/01_2_font_analyzer.js
 * 
 * Responsibilities:
 * - Queries PDF.js commonObjs to detect true embedded font names.
 * - Categorizes fonts into Bold, Italic, and Normal weights.
 * - Computes the dominant body text font size across the entire document.
 */

function buildFontStyles(page, textContent) {
    const fontStyles = new Map();

    for (let item of textContent.items) {
        if (!item.fontName) continue;
        if (!fontStyles.has(item.fontName)) {
            let realName = '';
            if (page.commonObjs && page.commonObjs.has(item.fontName)) {
                const fo = page.commonObjs.get(item.fontName);
                realName = fo.name || fo.fallbackName || '';
            }
            const isBold = /bold|black|heavy|w[789]/i.test(realName);
            const isItalic = /italic|oblique|slanted|kursiv/i.test(realName);
            fontStyles.set(item.fontName, { isBold, isItalic, realName });
        }
    }

    return fontStyles;
}

function computeDominantFontSize(fontSizesCount) {
    let dominantFs = 11;
    let maxCharCount = 0;

    for (let [fsStr, count] of Object.entries(fontSizesCount)) {
        if (count > maxCharCount) {
            maxCharCount = count;
            dominantFs = parseFloat(fsStr);
        }
    }

    return dominantFs;
}

module.exports = {
    buildFontStyles,
    computeDominantFontSize
};
