/**
 * Module 03: Rich Markdown Typography & Formatting Engine (with Spatial Image & Divider Embedding)
 * Location: script/03__rich_markdown_formatter.js
 * 
 * Orchestrator:
 * - 03_footnote_engine.js: 2-Way Footnote Matching & Injection Engine
 * - diacritic_normalizer.js: NFC & clean diacritics sanitizer
 * 
 * Responsibilities:
 * - Establishes typography profile & dominant body font size.
 * - Auto-detects Markdown Headings (H1, H2, H3) and Spatial Alignment (Center/Right).
 * - Hyphenation repair, Drop-Cap & Small-Cap reconstruction.
 * - Paragraph segmentation with alternating odd/even gutter support.
 * - Interleaves illustrations & scene break dividers at exact coordinates.
 * - Injects Footnotes immediately after their host paragraphs via 03_footnote_engine.
 */

const { sanitizeText } = require('./diacritic_normalizer');
const {
    toUnicodeSuperscript,
    toUnicodeSubscript,
    extractFootnoteRegistry,
    isFootnoteDefinitionLine,
    matchAndInjectFootnotes,
    flushRemainingFootnotes
} = require('./03_footnote_engine');

function buildTypographyProfile(fontSizesCount) {
    let dominantFs = 11;
    let maxCharCount = 0;

    for (let [fsStr, count] of Object.entries(fontSizesCount)) {
        if (count > maxCharCount) {
            maxCharCount = count;
            dominantFs = parseFloat(fsStr);
        }
    }

    return {
        dominantFs,
        h1Threshold: Math.round(dominantFs * 1.6 * 10) / 10,
        h2Threshold: Math.round(dominantFs * 1.28 * 10) / 10,
        h3Threshold: Math.round(dominantFs * 1.14 * 10) / 10,
        noteThreshold: Math.round(dominantFs * 0.86 * 10) / 10
    };
}

/**
 * Formats extracted chapter items (lines + images) into rich, publication-grade Markdown
 */
function formatRichChapterMarkdown(chapterNumber, chapterTitle, rawItems, typoProfile) {
    let md = `# ${chapterTitle}\n\n`;

    const cleanTitleCompact = chapterTitle.replace(/[^a-zA-Z]/g, '').toLowerCase();

    // 1. Filter out repetitive chapter title decor lines at the very beginning of the chapter
    let filteredItems = [...rawItems];
    let initialLinesCount = Math.min(8, filteredItems.length);
    let itemsToRemove = [];

    for (let i = 0; i < initialLinesCount; i++) {
        const it = filteredItems[i];
        if (it.isImage) break; // Don't strip initial images

        const lineText = (it.items || []).map(token => token.str).join(' ').trim();
        const compact = lineText.replace(/[^a-zA-Z]/g, '').toLowerCase();

        const isSingleLetterDropCap = /^[A-Z]$/.test(lineText) && (it.maxFs >= typoProfile.h1Threshold || it.maxFs >= 30);
        const isDuplicateTitle = compact.length > 3 && (cleanTitleCompact.includes(compact) || compact.includes(cleanTitleCompact));
        const isChapterNum = /^(chapter\s+\d+|\d+)$/i.test(lineText) && it.maxFs >= typoProfile.h2Threshold;

        if (isSingleLetterDropCap || isDuplicateTitle || isChapterNum) {
            itemsToRemove.push(i);
        } else {
            break;
        }
    }

    filteredItems = filteredItems.filter((_, idx) => !itemsToRemove.includes(idx));

    // 2. Pre-scan Footnote Definitions via 03_footnote_engine
    const footnoteRegistry = extractFootnoteRegistry(filteredItems, typoProfile, assembleParagraphTokens);

    // 3. Main Pass: Process Body Paragraphs, Headings & Interleaved Media
    const paragraphs = [];
    let curParagraphTokens = [];
    const footnoteState = { inFootnoteBlock: false };

    function addParagraphWithInlineFootnotes(tokens) {
        const pText = assembleParagraphTokens(tokens);
        if (!pText) return;
        paragraphs.push(pText);

        // Match & inject footnotes immediately after the host paragraph
        const injectedNotes = matchAndInjectFootnotes(pText, footnoteRegistry);
        if (injectedNotes) {
            paragraphs.push(injectedNotes);
        }
    }

    for (let i = 0; i < filteredItems.length; i++) {
        const item = filteredItems[i];

        // Handle Embedded Images & Scene Dividers
        if (item.isImage) {
            if (curParagraphTokens.length > 0) {
                addParagraphWithInlineFootnotes(curParagraphTokens);
                curParagraphTokens = [];
            }

            if (item.type === 'figure' || item.imageName) {
                paragraphs.push(`![Hình minh họa](../images_original/${item.imageName})`);
            } else if (item.type === 'divider') {
                paragraphs.push(`---`);
            }
            continue;
        }

        // Handle Text Lines
        const line = item;
        if (!line.items || line.items.length === 0) continue;

        const prevLine = i > 0 && !filteredItems[i - 1].isImage ? filteredItems[i - 1] : null;
        const lineFs = line.maxFs || typoProfile.dominantFs;
        const rawLineText = (line.text || line.items.map(it => it.str).join(' ')).trim();
        if (!rawLineText) continue;

        // Skip footnote definition lines (already captured in registry)
        if (isFootnoteDefinitionLine(line, typoProfile, footnoteState)) {
            continue;
        }

        // Heading Detection
        const isSingleLetter = /^[A-Z]$/.test(rawLineText);
        const isStandaloneSectionNumber = /^\s*([0-9]{1,2}|[IVXLCDM]{1,6})\s*$/i.test(rawLineText);
        const isFootnoteSized = lineFs <= typoProfile.noteThreshold;
        const isH2 = !isSingleLetter && ((lineFs >= typoProfile.h2Threshold && rawLineText.length < 80) 
                  || (isStandaloneSectionNumber && lineFs >= typoProfile.dominantFs && !isFootnoteSized));
        const isH3 = !isSingleLetter && lineFs >= typoProfile.h3Threshold && rawLineText.length < 80 && !isH2 && !isFootnoteSized;
        const isSmallNote = isFootnoteSized;

        if (isH2 || isH3 || (isStandaloneSectionNumber && !isFootnoteSized)) {
            if (curParagraphTokens.length > 0) {
                addParagraphWithInlineFootnotes(curParagraphTokens);
                curParagraphTokens = [];
            }

            const cleanHeader = sanitizeText(rawLineText);
            if (isH2 || isStandaloneSectionNumber) {
                paragraphs.push(`## ${cleanHeader}`);
            } else {
                paragraphs.push(`### ${cleanHeader}`);
            }
            continue;
        }

        // Spatial Alignment Detection (Right-aligned signatures & Center-aligned epigraphs)
        const colWidth = (line.pageRight !== undefined && line.pageLeft !== undefined) ? (line.pageRight - line.pageLeft) : 350;
        const deltaLeft = line.pageLeft !== undefined ? (line.minX - line.pageLeft) : 0;
        const deltaRight = line.pageRight !== undefined ? (line.pageRight - line.maxX) : 0;
        const lineWidth = line.maxX - line.minX;
        const lineMid = (line.minX + line.maxX) / 2;
        const pageMid = (line.pageLeft !== undefined && line.pageRight !== undefined) ? ((line.pageLeft + line.pageRight) / 2) : 200;

        const isRightAligned = (lineWidth < colWidth * 0.7) && (deltaRight <= 15) && (deltaLeft > colWidth * 0.35);
        const isCentered = (lineWidth < colWidth - 40) && (deltaLeft > 25) && (deltaRight > 25) && (Math.abs(deltaLeft - deltaRight) <= 25) && (Math.abs(lineMid - pageMid) <= 20);

        if (isRightAligned || isCentered) {
            if (curParagraphTokens.length > 0) {
                addParagraphWithInlineFootnotes(curParagraphTokens);
                curParagraphTokens = [];
            }

            const formattedLine = assembleParagraphTokens(line.items.map(t => ({
                ...t,
                isSmallNote,
                isBold: !!t.isBold,
                isItalic: !!t.isItalic,
                isSuperscript: !!t.isSuperscript,
                isSubscript: !!t.isSubscript
            })));

            if (formattedLine) {
                if (isRightAligned) {
                    paragraphs.push(`<p align="right">${formattedLine}</p>`);
                } else {
                    paragraphs.push(`<p align="center">${formattedLine}</p>`);
                }
            }
            continue;
        }

        // Paragraph Segmentation Signals
        const isIndented = line.pageLeft !== undefined && (line.minX >= line.pageLeft + 7.0);
        const isPrevShort = prevLine && prevLine.pageRight !== undefined && 
                            (prevLine.maxX < prevLine.pageRight - 15.0) && 
                            /[,\.\?!;:’”\"]$/.test(prevLine.text.trim());
        const isVerticalGap = prevLine && (line.pageNum === prevLine.pageNum) && (prevLine.y - line.y > 18.0);
        const isQuoteStart = /^[“‘—-]/.test(rawLineText) && isIndented;

        const isNewParagraph = (i > 0) && (isIndented || isPrevShort || isVerticalGap || isQuoteStart);

        if (isNewParagraph && curParagraphTokens.length > 0) {
            addParagraphWithInlineFootnotes(curParagraphTokens);
            curParagraphTokens = [];
        }

        for (let it of line.items) {
            const str = it.str;
            if (!str) continue;
            curParagraphTokens.push({
                str,
                hasLeadingSpace: it.hasLeadingSpace,
                isBold: !!it.isBold,
                isItalic: !!it.isItalic,
                isSmallNote,
                isSuperscript: !!it.isSuperscript,
                isSubscript: !!it.isSubscript
            });
        }
        curParagraphTokens.push({ isLineBreak: true });
    }

    if (curParagraphTokens.length > 0) {
        addParagraphWithInlineFootnotes(curParagraphTokens);
    }

    // Flush any unconsumed footnotes cleanly (safety fallback)
    const remainingNotes = flushRemainingFootnotes(footnoteRegistry);
    if (remainingNotes) {
        paragraphs.push(remainingNotes);
    }

    // Normalize consecutive contiguous H2 headings without body text
    const normalizedParagraphs = normalizeConsecutiveH2Headings(paragraphs);

    // Clean output
    const cleanParagraphs = normalizedParagraphs
        .map(p => sanitizeText(p).trim())
        .filter(p => p.length > 0 && !/^[A-Za-z]$/.test(p));

    md = sanitizeText(md.trim()) + '\n\n' + cleanParagraphs.join('\n\n') + '\n';
    return sanitizeText(md);
}

/**
 * Normalizes consecutive H2 headings without content in between into prominent centered text
 */
function normalizeConsecutiveH2Headings(paragraphs) {
    const result = [];
    let i = 0;
    while (i < paragraphs.length) {
        const p = paragraphs[i];
        if (p.startsWith('## ') && !p.startsWith('### ')) {
            let j = i;
            while (j < paragraphs.length && paragraphs[j].startsWith('## ') && !paragraphs[j].startsWith('### ')) {
                j++;
            }
            const count = j - i;
            if (count >= 2) {
                for (let k = i; k < j; k++) {
                    const headingText = paragraphs[k].replace(/^##\s+/, '').trim();
                    result.push(`<p align="center" style="font-size: 1.4em;"><strong>${headingText}</strong></p>`);
                }
                i = j;
                continue;
            }
        }
        result.push(p);
        i++;
    }
    return result;
}

/**
 * Assembles tokens in a paragraph into clean Markdown with hyphenation repair & multi-pass drop caps
 */
function assembleParagraphTokens(tokens) {
    if (!tokens || tokens.length === 0) return '';

    // Step 1: Repair hyphenation across line breaks
    const repairedTokens = [];
    for (let i = 0; i < tokens.length; i++) {
        const t = tokens[i];
        if (t.isLineBreak) {
            if (repairedTokens.length > 0 && i + 1 < tokens.length) {
                const prev = repairedTokens[repairedTokens.length - 1];
                const next = tokens[i + 1];
                if (prev.str && /[a-zA-Z]-$/.test(prev.str) && next && next.str && /^[a-zA-Z]/.test(next.str)) {
                    prev.str = prev.str.slice(0, -1) + next.str;
                    prev.isHyphenJoined = true;
                    i++; // skip next token
                    continue;
                } else if (next) {
                    next.hasLeadingSpace = true; // Line wraps naturally have space between words
                }
            }
            continue;
        }
        repairedTokens.push(t);
    }

    // Step 2: Coalesce adjacent tokens with identical formatting
    const groups = [];
    let curGroup = null;

    for (let t of repairedTokens) {
        const str = t.str;
        if (!str || !str.trim()) continue;

        const isBold = !!t.isBold;
        const isItalic = !!t.isItalic;
        const isSmallNote = !!t.isSmallNote;
        const isSuperscript = !!t.isSuperscript;
        const isSubscript = !!t.isSubscript;
        const hasLeadingSpace = t.hasLeadingSpace !== false;

        if (!curGroup 
            || curGroup.isBold !== isBold 
            || curGroup.isItalic !== isItalic 
            || curGroup.isSmallNote !== isSmallNote
            || curGroup.isSuperscript !== isSuperscript
            || curGroup.isSubscript !== isSubscript) {
            curGroup = {
                isBold,
                isItalic,
                isSmallNote,
                isSuperscript,
                isSubscript,
                hasLeadingSpace,
                tokens: [t]
            };
            groups.push(curGroup);
        } else {
            curGroup.tokens.push(t);
        }
    }

    // Step 3: Format markdown groups
    const formattedParts = [];

    for (let g of groups) {
        let text = '';
        for (let i = 0; i < g.tokens.length; i++) {
            const tok = g.tokens[i];
            if (i > 0 && tok.hasLeadingSpace !== false && !text.endsWith(' ')) {
                text += ' ';
            }
            text += tok.str;
        }
        text = text.replace(/\s+/g, ' ').trim();
        if (!text) continue;

        let formatted = text;
        if (g.isSuperscript) {
            formatted = toUnicodeSuperscript(text);
        } else if (g.isSubscript) {
            formatted = toUnicodeSubscript(text);
        } else if (g.isBold && g.isItalic) {
            formatted = `***${text}***`;
        } else if (g.isBold) {
            formatted = `**${text}**`;
        } else if (g.isItalic) {
            formatted = `*${text}*`;
        } else if (g.isSmallNote) {
            formatted = `<small>*${text}*</small>`;
        }
        formattedParts.push({ text: formatted, hasLeadingSpace: g.hasLeadingSpace });
    }

    let text = '';
    for (let i = 0; i < formattedParts.length; i++) {
        const part = formattedParts[i];
        if (i > 0 && part.hasLeadingSpace !== false && !text.endsWith(' ')) {
            text += ' ';
        }
        text += part.text;
    }

    // Multi-pass Drop-Cap & Small-Cap repair
    let prevText = '';
    while (prevText !== text) {
        prevText = text;
        text = text.replace(/\b([A-Z])\s+([A-Z]+)\b(?=\s+[A-Z]|\s+[a-z])/g, '$1$2');
    }

    const assembled = text
        .replace(/\s+([,\.\?!;:’”\)])/g, '$1')
        .replace(/([“‘\(\[])\s+/g, '$1')
        .replace(/\s+([⁰¹²³⁴⁵⁶⁷⁸⁹⁺⁻⁼⁽⁾ᵃᵇᶜᵈᵉᶠᵍʰⁱʲᵏˡᵐⁿᵒᵖʳˢᵗᵘᵛʷˣʸᶻ†‡§¶#]+)/g, '$1')
        .replace(/\s+([₀₁₂₃₄₅₆₇₈₉₊₋₌₍₎ₐₑₕᵢⱼₖₗₘₙₒₚᵣₛₜᵤᵥₓ]+)/g, '$1')
        .replace(/\s+/g, ' ')
        .trim();

    return sanitizeText(assembled);
}

module.exports = {
    buildTypographyProfile,
    formatRichChapterMarkdown
};
