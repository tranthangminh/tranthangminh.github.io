/**
 * Submodule 03_footnote_engine: 2-Way Footnote Matching & Injection Engine
 * Location: script/03_footnote_engine.js
 * 
 * Responsibilities:
 * - Phase 1: Pre-scans bottom of pages (Y <= 120, small font size) to extract Footnote Definitions.
 * - Supports Arabic/superscript numbers (1, 2, 3... ¹, ², ³...) and symbols (*, †, ‡, §, ¶, #).
 * - Accurately stitches multi-line footnote definitions into clean text.
 * - Phase 2: Detects inline superscript reference markers in body paragraphs.
 * - Phase 3: Reconciles 1-to-1 match between reference markers and footnote definitions.
 * - Injects standard Blockquote citations (> **¹** [Note Text]) immediately after host paragraphs.
 * - Phase 4: Flushes any unconsumed footnotes cleanly to prevent text leakage.
 */

const SUPERSCRIPT_MAP = {
    '0': '⁰', '1': '¹', '2': '²', '3': '³', '4': '⁴',
    '5': '⁵', '6': '⁶', '7': '⁷', '8': '⁸', '9': '⁹',
    '+': '⁺', '-': '⁻', '=': '⁼', '(': '⁽', ')': '⁾',
    'a': 'ᵃ', 'b': 'ᵇ', 'c': 'ᶜ', 'd': 'ᵈ', 'e': 'ᵉ', 'f': 'ᶠ', 'g': 'ᵍ', 'h': 'ʰ', 'i': 'ⁱ', 'j': 'ʲ',
    'k': 'ᵏ', 'l': 'ˡ', 'm': 'ᵐ', 'n': 'ⁿ', 'o': 'ᵒ', 'p': 'ᵖ', 'r': 'ʳ', 's': 'ˢ', 't': 'ᵗ', 'u': 'ᵘ',
    'v': 'ᵛ', 'w': 'ʷ', 'x': 'ˣ', 'y': 'ʸ', 'z': 'ᶻ',
    'A': 'ᴬ', 'B': 'ᴮ', 'D': 'ᴰ', 'E': 'ᴱ', 'G': 'ᴳ', 'H': 'ᴴ', 'I': 'ᴵ', 'J': 'ᴶ', 'K': 'ᴷ', 'L': 'ᴸ',
    'M': 'ᴹ', 'N': 'ᴺ', 'O': 'ᴼ', 'P': 'ᴾ', 'R': 'ᴿ', 'T': 'ᵀ', 'U': 'ᵁ', 'V': 'ⱽ', 'W': 'ᵂ',
    '*': '*', '†': '†', '‡': '‡', '§': '§', '¶': '¶', '#': '#'
};

const SUBSCRIPT_MAP = {
    '0': '₀', '1': '₁', '2': '₂', '3': '₃', '4': '₄',
    '5': '₅', '6': '₆', '7': '₇', '8': '₈', '9': '₉',
    '+': '₊', '-': '₋', '=': '₌', '(': '₍', ')': '₎',
    'a': 'ₐ', 'e': 'ₑ', 'h': 'ₕ', 'i': 'ᵢ', 'j': 'ⱼ', 'k': 'ₖ', 'l': 'ₗ', 'm': 'ₘ', 'n': 'ₙ',
    'o': 'ₒ', 'p': 'ₚ', 'r': 'ᵣ', 's': 'ₛ', 't': 'ₜ', 'u': 'ᵤ', 'v': 'ᵥ', 'x': 'ₓ'
};

function toUnicodeSuperscript(str) {
    if (!str) return '';
    return str.split('').map(c => SUPERSCRIPT_MAP[c] || c).join('');
}

function toUnicodeSubscript(str) {
    if (!str) return '';
    return str.split('').map(c => SUBSCRIPT_MAP[c] || c).join('');
}

/**
 * Pre-scans items in a chapter to extract all Footnote Definitions into a Map.
 * Registry: Map<marker, { marker, uniMarker, text }>
 */
function extractFootnoteRegistry(filteredItems, typoProfile, assembleTokensFn) {
    const footnoteRegistry = new Map();
    let curFnMarker = null;
    let curFnTokens = [];

    for (let item of filteredItems) {
        if (item.isImage || !item.items || item.items.length === 0) continue;

        const line = item;
        const lineFs = line.maxFs || typoProfile.dominantFs;
        const isBottomArea = line.y <= 120;
        const isFootnoteSized = lineFs <= typoProfile.noteThreshold;
        const rawLineText = (line.text || line.items.map(it => it.str).join(' ')).trim();

        if (isBottomArea && isFootnoteSized) {
            const leadingToken = line.items[0];
            const hasLeadingMarker = leadingToken && (leadingToken.isLeading || leadingToken.isSuperscript);
            const startsWithMarkerPattern = /^([0-9]{1,2}|[*†‡§¶#])\s+/.test(rawLineText);

            if (hasLeadingMarker || startsWithMarkerPattern) {
                if (curFnMarker && curFnTokens.length > 0) {
                    const uni = toUnicodeSuperscript(curFnMarker);
                    footnoteRegistry.set(curFnMarker, {
                        marker: curFnMarker,
                        uniMarker: uni,
                        text: assembleTokensFn(curFnTokens)
                    });
                }
                if (hasLeadingMarker) {
                    curFnMarker = (leadingToken.marker || leadingToken.str || (rawLineText.match(/^([0-9]{1,2}|[*†‡§¶#])/) || [])[1] || '*').trim();
                    curFnTokens = line.items.slice(1);
                } else {
                    const match = rawLineText.match(/^([0-9]{1,2}|[*†‡§¶#])/);
                    curFnMarker = match ? match[1] : '*';
                    curFnTokens = line.items.slice(1);
                }
            } else if (curFnMarker) {
                curFnTokens.push({ isLineBreak: true });
                curFnTokens.push(...line.items);
            }
        }
    }

    if (curFnMarker && curFnTokens.length > 0) {
        const uni = toUnicodeSuperscript(curFnMarker);
        footnoteRegistry.set(curFnMarker, {
            marker: curFnMarker,
            uniMarker: uni,
            text: assembleTokensFn(curFnTokens)
        });
    }

    return footnoteRegistry;
}

/**
 * Checks if a line is a bottom footnote definition line to skip it during body paragraph extraction.
 */
function isFootnoteDefinitionLine(line, typoProfile, state) {
    const lineFs = line.maxFs || typoProfile.dominantFs;
    const isBottomArea = line.y <= 120;
    const isFootnoteSized = lineFs <= typoProfile.noteThreshold;
    const rawLineText = (line.text || (line.items || []).map(it => it.str).join(' ')).trim();

    if (isBottomArea && isFootnoteSized) {
        const leadingToken = line.items && line.items.length > 0 ? line.items[0] : null;
        const hasLeadingMarker = leadingToken && (leadingToken.isLeading || leadingToken.isSuperscript);
        const startsWithMarkerPattern = /^([0-9]{1,2}|[*†‡§¶#])\s+/.test(rawLineText);

        if (hasLeadingMarker || startsWithMarkerPattern) {
            state.inFootnoteBlock = true;
        }
        return state.inFootnoteBlock;
    }

    state.inFootnoteBlock = false;
    return false;
}

/**
 * Matches inline superscript markers inside a paragraph and returns formatted Blockquote Markdown.
 * Matched footnotes are deleted from the registry so they only attach once.
 */
function matchAndInjectFootnotes(paragraphText, footnoteRegistry) {
    if (!paragraphText || footnoteRegistry.size === 0) return null;

    const attachedNotes = [];
    for (let [marker, noteObj] of [...footnoteRegistry.entries()]) {
        const uniMarker = noteObj.uniMarker;
        // Match exact unicode superscript or bracketed marker
        if (paragraphText.includes(uniMarker) || paragraphText.includes(`[${marker}]`) || paragraphText.includes(`^${marker}`)) {
            attachedNotes.push(`> **${uniMarker}** ${noteObj.text.trim()}`);
            footnoteRegistry.delete(marker); // Consume
        }
    }

    if (attachedNotes.length > 0) {
        return attachedNotes.join('\n>\n');
    }
    return null;
}

/**
 * Flushes any remaining unconsumed footnotes (safety fallback at chapter end).
 */
function flushRemainingFootnotes(footnoteRegistry) {
    if (!footnoteRegistry || footnoteRegistry.size === 0) return null;

    const remainingNotes = [];
    for (let [marker, noteObj] of footnoteRegistry.entries()) {
        remainingNotes.push(`> **${noteObj.uniMarker}** ${noteObj.text.trim()}`);
    }
    footnoteRegistry.clear();
    return remainingNotes.join('\n>\n');
}

module.exports = {
    toUnicodeSuperscript,
    toUnicodeSubscript,
    extractFootnoteRegistry,
    isFootnoteDefinitionLine,
    matchAndInjectFootnotes,
    flushRemainingFootnotes
};
