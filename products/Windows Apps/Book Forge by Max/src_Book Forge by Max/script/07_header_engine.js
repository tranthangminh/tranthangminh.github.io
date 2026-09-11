/**
 * Module: Header Configuration & Content Engine
 * Location: script/07_header_engine.js
 * 
 * Responsibilities:
 * 1. Loads 4-line header configuration from _HEADER-translated.md or _HEADER-original.md:
 *    - Line 1: Header Trái - Hàng 1
 *    - Line 2: Header Trái - Hàng 2
 *    - Line 3: Header Phải - Hàng 1
 *    - Line 4: Header Phải - Hàng 2
 * 2. Slot Resolution:
 *    - Left Header (Lines 1 & 2): If both empty ("") -> isDynamicH1 = true (uses active H1 of each page).
 *                                 If either has text or space (" ") -> uses those 2 lines.
 *    - Right Header (Lines 3 & 4): If both empty ("") ->
 *                                  • Vietnamese: 'Chuyển ngữ: <a href="https://fb.me/maxiechen" style="color: inherit; text-decoration: none;">Trần Thắng Minh</a>'
 *                                  • English: 'Converter: <a href="https://fb.me/maxiechen" style="color: inherit; text-decoration: none;">Trần Thắng Minh</a>'
 *                                  If either has text or space (" ") -> uses those 2 lines.
 * 3. Builds 2-column HTML header row (50% Left, 50% Right, allows 2 lines of text).
 */

const fs = require('fs');
const path = require('path');

/**
 * Converts markdown links [text](url), bold (**text**), italic (*text* / _text_), and bold-italic (***text***) to styled HTML tags
 */
function formatHeaderSlot(slotText) {
    if (!slotText) return '';
    let text = slotText;
    // 1. Markdown links: [text](url)
    text = text.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" style="color: inherit; text-decoration: none;">$1</a>');
    // 2. Bold + Italic: ***text*** or ___text___
    text = text.replace(/\*\*\*([^*]+)\*\*\*/g, '<strong><em>$1</em></strong>');
    text = text.replace(/___([^_]+)___/g, '<strong><em>$1</em></strong>');
    // 3. Bold: **text** or __text__
    text = text.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
    text = text.replace(/__([^_]+)__/g, '<strong>$1</strong>');
    // 4. Italic: *text* or _text_
    text = text.replace(/\*([^*]+)\*/g, '<em>$1</em>');
    text = text.replace(/_([^_]+)_/g, '<em>$1</em>');
    return text;
}

/**
 * Combines 2 lines into structured HTML
 */
function combineLines(line1, line2) {
    const formatted1 = line1 !== '' ? formatHeaderSlot(line1).normalize('NFC') : '';
    const formatted2 = line2 !== '' ? formatHeaderSlot(line2).normalize('NFC') : '';
    if (formatted1 && formatted2) return `<div>${formatted1}</div><div>${formatted2}</div>`;
    if (formatted1) return formatted1;
    if (formatted2) return formatted2;
    return '';
}

/**
 * Loads header configuration from _HEADER-translated.md or _HEADER-original.md
 */
function loadHeaderConfig(projectDir, isVietnamese) {
    const configFileName = isVietnamese ? '_HEADER-translated.md' : '_HEADER-original.md';
    const primaryFile = path.join(projectDir, configFileName);
    const fallbackFile = path.join(projectDir, '_HEADER.md');
    const oldTitleFile = path.join(projectDir, '_BOOK_TITLE.txt');

    let fileContent = null;

    if (fs.existsSync(primaryFile)) {
        fileContent = fs.readFileSync(primaryFile, 'utf8');
    } else if (fs.existsSync(fallbackFile)) {
        fileContent = fs.readFileSync(fallbackFile, 'utf8');
    } else if (fs.existsSync(oldTitleFile)) {
        fileContent = fs.readFileSync(oldTitleFile, 'utf8');
    }

    let isDynamicH1 = true;
    let left = '';
    const defaultRight = isVietnamese
        ? 'Chuyển ngữ: <a href="https://fb.me/maxiechen" style="color: inherit; text-decoration: none;">Trần Thắng Minh</a>'
        : 'Converter: <a href="https://fb.me/maxiechen" style="color: inherit; text-decoration: none;">Trần Thắng Minh</a>';
    let right = defaultRight;
    let splitLeft = 70;

    if (fileContent !== null && fileContent !== undefined) {
        const rawLines = fileContent.split(/\r?\n/);

        // Lines 1 & 2: Left Header (2 lines)
        const l1 = rawLines.length > 0 ? rawLines[0] : '';
        const l2 = rawLines.length > 1 ? rawLines[1] : '';

        if (l1 !== '' || l2 !== '') {
            isDynamicH1 = false;
            left = combineLines(l1, l2);
        }

        // Lines 3 & 4: Right Header (2 lines)
        const r1 = rawLines.length > 2 ? rawLines[2] : '';
        const r2 = rawLines.length > 3 ? rawLines[3] : '';

        if (r1 !== '' || r2 !== '') {
            right = combineLines(r1, r2);
        }

        // Line 5+: Width Ratio (e.g. 70, 25, "70% / 30%", etc.)
        for (let i = 4; i < rawLines.length; i++) {
            const line = rawLines[i].trim();
            if (line) {
                const match = line.match(/(\d+)/);
                if (match) {
                    const val = parseInt(match[1], 10);
                    if (val >= 10 && val <= 90) {
                        splitLeft = val;
                        break;
                    }
                }
            }
        }
    }

    return {
        isDynamicH1,
        left,
        right,
        splitLeft
    };
}

/**
 * Builds HTML for 2-column header content with customizable width ratio (e.g. 70% Left, 30% Right)
 */
function buildHeaderContentHtml(leftText, rightText, splitLeft = 70) {
    const left = leftText || '';
    const right = rightText || '';
    const validSplitLeft = (typeof splitLeft === 'number' && splitLeft >= 10 && splitLeft <= 90) ? splitLeft : 70;
    const splitRight = 100 - validSplitLeft;
    return `<div style="width: 100%; display: flex; justify-content: space-between; align-items: flex-start; gap: 8px; border-bottom: 1px solid #d0d0d0; padding-bottom: 4px; font-size: 8pt; line-height: 1.2;">
      <div style="flex: 1 1 ${validSplitLeft}%; max-width: ${validSplitLeft}%; width: ${validSplitLeft}%; text-align: left; box-sizing: border-box; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; word-break: break-word;">${left}</div>
      <div style="flex: 1 1 ${splitRight}%; max-width: ${splitRight}%; width: ${splitRight}%; text-align: right; box-sizing: border-box; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; word-break: break-word;">${right}</div>
    </div>`;
}

module.exports = {
    loadHeaderConfig,
    buildHeaderContentHtml
};
