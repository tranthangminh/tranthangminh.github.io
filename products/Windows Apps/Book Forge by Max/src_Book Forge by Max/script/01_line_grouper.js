/**
 * Submodule 01_5: Horizontal Line Grouper & Inter-Token Space Calibrator
 * Location: script/01_5_line_grouper.js
 * 
 * Responsibilities:
 * - Quantizes raw tokens into discrete horizontal lines via bucketY (tolerance +-3.2 pt).
 * - Sorts tokens horizontally by X ascending.
 * - Calibrates space boundaries: gap >= max(1.0pt, maxFs * 0.10).
 * - Fuses contiguous tokens of the same font style without breaking words.
 * - Sorts lines vertically by Y descending (top-to-bottom).
 */

function groupTokensIntoLines(rawTokens) {
    const linesMap = new Map();

    for (let it of rawTokens) {
        const rawY = it.bucketY !== undefined ? it.bucketY : it.y;
        let assignedY = null;

        for (let existingY of linesMap.keys()) {
            if (Math.abs(existingY - rawY) <= 3.2) {
                assignedY = existingY;
                break;
            }
        }

        if (assignedY === null) {
            assignedY = rawY;
            linesMap.set(assignedY, []);
        }
        linesMap.get(assignedY).push(it);
    }

    const lines = [];
    for (let [yKey, rawItems] of linesMap.entries()) {
        rawItems.sort((a, b) => a.x - b.x);

        const mergedTokens = [];
        let lineText = '';
        let lastRight = 0;
        let lastFs = 0;

        for (let i = 0; i < rawItems.length; i++) {
            const it = rawItems[i];
            const str = it.str;
            const x = it.x;
            const w = it.w || 0;
            const fs = it.fs;

            if (!str && w === 0) continue;

            if (!lineText) {
                lineText = str;
                mergedTokens.push({ ...it, str, hasLeadingSpace: false });
            } else {
                const gap = x - lastRight;
                const prevToken = mergedTokens[mergedTokens.length - 1];
                const sameStyle = prevToken.isBold === it.isBold 
                               && prevToken.isItalic === it.isItalic
                               && !prevToken.isSuperscript 
                               && !it.isSuperscript
                               && !prevToken.isSubscript
                               && !it.isSubscript;
                const isSupSub = it.isSuperscript || it.isSubscript;
                const maxFs = Math.max(fs, lastFs || fs);
                const spaceThreshold = Math.max(1.0, maxFs * 0.10);
                const isRealSpace = (gap >= spaceThreshold && !isSupSub);

                if (isRealSpace) {
                    if (!lineText.endsWith(' ')) {
                        lineText += ' ';
                    }
                    lineText += str;
                    mergedTokens.push({ ...it, str, hasLeadingSpace: true });
                } else if (sameStyle) {
                    lineText += str;
                    prevToken.str += str;
                    prevToken.w = (prevToken.w || 0) + w;
                } else {
                    mergedTokens.push({ ...it, str, hasLeadingSpace: false });
                    lineText += str;
                }
            }
            lastRight = Math.max(lastRight, x + w);
            lastFs = fs;
        }

        const maxFs = Math.max(...rawItems.map(it => it.fs));
        const minX = Math.min(...rawItems.map(it => it.x));
        const maxX = Math.max(...rawItems.map(it => it.x + (it.w || 0)));

        const cleanText = lineText.replace(/\s+/g, ' ').trim();

        if (cleanText) {
            lines.push({
                isLine: true,
                y: yKey,
                maxFs,
                text: cleanText,
                minX,
                maxX,
                items: mergedTokens
            });
        }
    }

    lines.sort((a, b) => b.y - a.y);
    return lines;
}

module.exports = {
    groupTokensIntoLines
};
