/**
 * Module 05_toc_filter: Table of Contents Detection & Front Matter Exclusion Engine
 * Location: script/05_toc_filter.js
 * 
 * Responsibilities:
 * - Employs a 3-Gate Structural Density & Multi-Page Continuity Decision Engine.
 * - Detects and excises full-page and multi-page Table of Contents / Menus from Front Matter.
 * - Distinguishes between TOC pages and Prose/Copyright pages.
 * - Prevents raw static TOC leakage into 00-front-matter.md across all books.
 */

const TOC_KEYWORDS = [
    'contents',
    'tableofcontents',
    'generalcontents',
    'indexofchapters',
    'tabledesmatieres',
    'sommaire',
    'mucluc',
    'inhalt',
    'inhaltsverzeichnis'
];

/**
 * Checks if a specific line is a TOC header keyword
 */
function isTocHeadingLine(text) {
    if (!text) return false;
    const clean = text.replace(/[^a-zA-Z]/g, '').toLowerCase();
    return TOC_KEYWORDS.includes(clean);
}

/**
 * Checks if a line matches typical TOC structural patterns (dot leaders, trailing page numbers, chapter labels)
 */
function isTocPatternLine(text) {
    if (!text) return false;
    const trimmed = text.trim();
    if (!trimmed || trimmed.length > 90) return false;

    const hasTrailingPageNum = /\b(\d{1,4}|[ivxlcdm]{1,8})\s*$/i.test(trimmed);
    const startsWithNumOrPart = /^(\d{1,2}\b|[ivxlcdm]+\b|part\b|chapter\b|section\b|foreword\b|introduction\b|preface\b|sources\b|epilogue\b|index\b|about\b)/i.test(trimmed);

    return hasTrailingPageNum || (startsWithNumOrPart && trimmed.length < 50);
}

/**
 * Evaluates whether a given page in Front Matter is a Table of Contents page.
 */
function isTableOfContentsPage(pageData, chapters, isPrevPageToc = false) {
    if (!pageData) return { isToc: false, reason: null };

    const bodyLines = pageData.bodyLines || [];
    const rawLines = bodyLines.map(l => (l.text || '').trim()).filter(Boolean);
    if (rawLines.length === 0) return { isToc: false, reason: null };

    // Ignore pages with dense long prose paragraphs (Copyright, Dedication, Editor's Note, Foreword)
    const longProseLines = rawLines.filter(l => l.length > 55);
    if (longProseLines.length > 10 && !rawLines.slice(0, 3).some(l => /contents/i.test(l))) {
        return { isToc: false, reason: `Prose page (contains ${longProseLines.length} long lines)` };
    }

    // --- GATE 1: Keyword Signature (Top 3 lines) ---
    const topLines = rawLines.slice(0, 3);
    for (const l of topLines) {
        if (isTocHeadingLine(l)) {
            return { isToc: true, reason: `Gate 1: Keyword "${l}"` };
        }
    }

    // --- GATE 2: Structural Density & Dot Leaders ---
    const tocPatternLines = rawLines.filter(isTocPatternLine);
    const patternRatio = tocPatternLines.length / rawLines.length;

    if (tocPatternLines.length >= 4 && patternRatio >= 0.5) {
        return { isToc: true, reason: `Gate 2: Structural density (${tocPatternLines.length}/${rawLines.length} = ${(patternRatio * 100).toFixed(0)}%)` };
    }

    // --- GATE 3: Multi-Page Continuation ---
    if (isPrevPageToc && tocPatternLines.length >= 2 && longProseLines.length <= 2) {
        return { isToc: true, reason: `Gate 3: Multi-page continuation (${tocPatternLines.length} pattern lines)` };
    }

    return { isToc: false, reason: null };
}

/**
 * Filters all pages in Front Matter, removing full-page and multi-page TOCs
 * and returning the clean array of items for 00-front-matter.md.
 */
function extractCleanFrontMatterItems(pagesData, firstChapterPageIndex, chapters) {
    const cleanItems = [];
    let isPrevPageToc = false;
    let skippedPages = 0;

    for (let pIdx = 0; pIdx < firstChapterPageIndex; pIdx++) {
        const page = pagesData[pIdx];
        const { isToc, reason } = isTableOfContentsPage(page, chapters, isPrevPageToc);

        if (isToc) {
            console.log(`  🚫 [Skip TOC] Page ${pIdx + 1}: Excluded from 00-front-matter.md (${reason})`);
            isPrevPageToc = true;
            skippedPages++;
        } else {
            cleanItems.push(...page.pageItems);
            isPrevPageToc = false;
        }
    }

    return { cleanItems, skippedPages };
}

module.exports = {
    isTableOfContentsPage,
    extractCleanFrontMatterItems
};
