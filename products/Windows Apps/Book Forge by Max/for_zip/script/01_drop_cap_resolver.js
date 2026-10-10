/**
 * Submodule 01_drop_cap_resolver.js: Universal Drop Cap & Initial Letter Resolution Engine
 * Location: script/01_drop_cap_resolver.js
 * 
 * Responsibilities:
 * 1. Signature Detection: Accurately identifies Drop Cap candidates (single uppercase letters,
 *    optionally with opening quotation marks “ " ‘ ' «, font size >= 1.35x dominant body font).
 * 2. Superscript Shielding: Prevents sub/sup detectors from erroneously treating drop caps as
 *    hosts for superscripts (which causes bugs like T3 -> T³ or turning words into mini-text).
 * 3. Line & Token Stitching: Re-aligns drop cap tokens with their host paragraph lines and fuses
 *    the initial letter with the remainder of the word (e.g. “T + he -> “The).
 * 4. Micro-Graphic Filtering: Identifies decorative drop-cap vector/raster glyphs to prevent
 *    extracting them as standalone book figures.
 */

// Matches single uppercase letter, optionally preceded by opening quotes
const DROP_CAP_REGEX = /^[“"‘'«‹]?[A-Z\u00C0-\u024F]$/u;
const LEADING_QUOTE_REGEX = /^[“"‘'«‹]$/;

/**
 * Checks if a string represents a drop-cap letter pattern.
 */
function isDropCapText(str) {
    if (!str) return false;
    const s = str.trim();
    return DROP_CAP_REGEX.test(s) || LEADING_QUOTE_REGEX.test(s);
}

/**
 * Checks if a token is a drop-cap candidate based on text pattern and oversized font.
 */
function isDropCapCandidate(token, dominantFs) {
    if (!token || !token.str) return false;
    const s = token.str.trim();
    if (!isDropCapText(s)) return false;

    const fs = token.fs || 0;
    const domFs = dominantFs || 10;

    // A drop cap must be noticeably larger than the dominant body text
    return (fs >= domFs * 1.35 || fs >= 16);
}

/**
 * Guard function for 01_sub_sup_detector.js:
 * Returns true if candidate host is a drop cap, preventing adjacent tokens from
 * being falsely classified as trailing superscripts / footnotes (e.g. T3 -> T³).
 */
function shouldBypassSuperscriptHost(hostToken, dominantFs) {
    return isDropCapCandidate(hostToken, dominantFs);
}

/**
 * Stitches drop cap tokens into page lines in 01_line_grouper.js.
 * Ensures the drop cap letter becomes the true first token of the first line of the paragraph.
 */
function resolveDropCapsInLines(lines, dominantFs) {
    if (!lines || lines.length < 2) return lines;
    const domFs = dominantFs || 10;

    for (let i = 0; i < lines.length; i++) {
        const curLine = lines[i];
        if (!curLine || !curLine.items || curLine.items.length === 0) continue;

        // Check if curLine is an isolated drop cap line or starts with a drop cap
        const firstToken = curLine.items[0];
        const isStandaloneDropCap = curLine.items.length <= 2 && isDropCapCandidate(firstToken, domFs);

        if (!isStandaloneDropCap) continue;

        // Look for the adjacent host line that continues this drop cap
        // The host line is typically located physically to the right of the drop cap,
        // with its top aligned with or slightly above the drop cap baseline.
        let bestHostLineIdx = -1;
        let minXDist = Infinity;

        for (let j = 0; j < lines.length; j++) {
            if (i === j) continue;
            const targetLine = lines[j];
            if (!targetLine || !targetLine.text) continue;

            // Target line should be within the vertical span of the drop cap
            const yDiff = Math.abs(targetLine.y - curLine.y);
            const dropCapHeight = (firstToken.fs || 24);
            const isWithinVerticalSpan = (targetLine.y >= curLine.y - 4) && (targetLine.y <= curLine.y + dropCapHeight + 6);

            // Target line should start to the right of the drop cap
            const dropCapRight = curLine.maxX || (firstToken.x + (firstToken.w || 0));
            const isToRight = targetLine.minX >= (curLine.minX - 2) && targetLine.minX <= (dropCapRight + (domFs * 2.5));

            if (isWithinVerticalSpan && isToRight) {
                // Check if target line starts with lowercase or continuation word (e.g. "he answer is...")
                const firstWord = targetLine.text.split(/\s+/)[0] || '';
                const isContinuationWord = /^[a-z\u00E0-\u024F]{1,10}\b/u.test(firstWord)
                                        || /^[A-Z]{2,}\b/.test(firstWord)
                                        || /^[0-9]/.test(firstWord);

                if (isContinuationWord && yDiff < minXDist) {
                    minXDist = yDiff;
                    bestHostLineIdx = j;
                }
            }
        }

        if (bestHostLineIdx !== -1) {
            const hostLine = lines[bestHostLineIdx];
            const dropCapTokens = curLine.items.map(t => ({
                ...t,
                fs: hostLine.maxFs || domFs, // normalize font size to host line
                bucketY: hostLine.y,
                hasLeadingSpace: false
            }));

            // Merge drop cap tokens to the front of hostLine.items
            const targetFirstToken = hostLine.items[0];
            const dropCapStr = dropCapTokens.map(t => t.str).join('');

            // Fuse with initial word if host starts with lowercase (e.g. “T + he -> “The)
            if (targetFirstToken && targetFirstToken.str && /^[a-z\u00E0-\u024F]/u.test(targetFirstToken.str)) {
                targetFirstToken.str = dropCapStr + targetFirstToken.str;
                targetFirstToken.hasLeadingSpace = false;
                targetFirstToken.minX = curLine.minX;
                hostLine.minX = Math.min(hostLine.minX, curLine.minX);
                hostLine.text = dropCapStr + hostLine.text;
            } else {
                // Prepend as distinct token
                if (targetFirstToken) {
                    targetFirstToken.hasLeadingSpace = true;
                }
                hostLine.items.unshift(...dropCapTokens);
                hostLine.minX = Math.min(hostLine.minX, curLine.minX);
                hostLine.text = dropCapStr + ' ' + hostLine.text;
            }

            // Remove the standalone drop cap line
            lines.splice(i, 1);
            i--; // adjust loop index
        }
    }

    return lines;
}

/**
 * Filter guard for 04_filters.js:
 * Detects if an extracted vector/raster graphic is a decorative drop cap character glyph
 * rather than a genuine book illustration / figure.
 */
function isDropCapGraphic(bounds, pageWidth, pageHeight) {
    if (!bounds) return false;
    const w = bounds.width || 0;
    const h = bounds.height || 0;
    const minX = bounds.minX !== undefined ? bounds.minX : 0;

    // Drop cap glyphs are small (typically 15pt to 75pt width & height)
    const isGlyphDimension = (w >= 10 && w <= 75 && h >= 10 && h <= 75);
    // Positioned near the left body text margin
    const isLeftMargined = minX < (pageWidth ? pageWidth * 0.35 : 180);

    return isGlyphDimension && isLeftMargined;
}

/**
 * Post-processing repair for 03__rich_markdown_formatter.js:
 * Fixes any residual split drop-cap words in assembled paragraph text.
 * e.g. "“T he" -> "“The", "T he" -> "The", "W hen" -> "When"
 */
function repairSplitDropCapWords(text) {
    if (!text) return text;

    // Pattern 1: Drop cap letter followed by lowercase word continuation
    // e.g. "“T he answer" -> "“The answer", "W hen" -> "When", "I n" -> "In"
    let repaired = text.replace(/(^|[\n\r]|---\n|\.\s+)([“"‘'«‹]?)([A-Z\u00C0-\u024F])\s+([a-z\u00E0-\u024F]{1,8}\b)/gu, '$1$2$3$4');

    // Pattern 2: Drop cap letter followed by small-caps / all-caps continuation
    // e.g. "T HE" -> "THE", "“T HE" -> "“THE"
    repaired = repaired.replace(/(^|[\n\r]|---\n|\.\s+)([“"‘'«‹]?)([A-Z])\s+([A-Z]{2,}\b)/g, '$1$2$3$4');

    return repaired;
}

module.exports = {
    isDropCapText,
    isDropCapCandidate,
    shouldBypassSuperscriptHost,
    resolveDropCapsInLines,
    isDropCapGraphic,
    repairSplitDropCapWords
};
