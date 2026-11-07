/**
 * Module 02: Hierarchical Chapter Detection
 * Location: script/02_toc_parser.js
 *
 * Responsibilities:
 * - Priority 1: Reads the book's Table of Contents and locates each listed chapter in the body.
 *   Wrapped titles are stitched, indented or smaller entries are treated as sections, not chapters.
 * - Priority 2: Without a usable TOC, groups lines into heading blocks and takes the font size
 *   used for chapter headings as the chapter tier. Smaller headings stay inside their chapter.
 * - A chapter starts at its heading line, so several chapters can share one page.
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

const WORD_NUMBER = '(?:twenty[- ]?)?(?:one|two|three|four|five|six|seven|eight|nine)|ten|eleven|twelve|thirteen|fourteen|fifteen|sixteen|seventeen|eighteen|nineteen|twenty|thirty';
const CHAPTER_LABEL = new RegExp(`^(?:chapter|chương|phần|part)\\s+(?:\\d{1,3}|[ivxlcdm]{1,7}|${WORD_NUMBER})(?:\\s*[:.\\-–—]\\s*\\S.*|\\s*[:.])?$`, 'iu');
const BARE_LABEL = new RegExp(`^(?:chapter|chương|phần|part)\\s+(?:\\d{1,3}|[ivxlcdm]{1,7}|${WORD_NUMBER})[:.]?$`, 'iu');
const PART_LABEL = /^(?:part|phần)\s/iu;
const NAMED_SECTION = /^(?:foreword|preface|introduction|prologue|epilogue|afterword|conclusion|acknowledge?ments|translator'?s note|note by the translator|lời nói đầu|lời mở đầu|lời tựa|lời giới thiệu|lời kết)$/iu;
const BARE_NUMBER = /^(?:\d{1,3}|[IVXLC]{1,6})\.?$/;
const TOC_LABEL_START = /^(?:(?:chapter|chương|phần|part)\s+\S|\d{1,2}\.|[ivxlcdm]+\.)/iu;
const TOC_BARE_LABEL = /^(?:chapter|chương|phần|part)$/iu;
const ROMAN = /^m{0,4}(?:cm|cd|d?c{0,3})(?:xc|xl|l?x{0,3})(?:ix|iv|v?i{0,3})$/;
const LABEL_PREFIX = /^(?:(?:chapter|chương|phần|part)\s+\S+?|\d{1,2}\.|[ivxlcdm]+\.)(?:\s*[:.\-–—]\s*|\s+|$)/iu;

const HEADING_RATIO = 1.28;
const TOC_SCAN_PAGES = 20;
const TOC_SECTION_INDENT = 8;
const SAME_SIZE = 0.5;

function stripAccents(text) {
    return text.normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[đĐ]/g, 'd');
}

function lettersOnly(text) {
    return stripAccents(text).replace(/[^\p{L}]/gu, '').toLowerCase();
}

function compactKey(text) {
    return stripAccents(text).replace(/[^\p{L}\p{N}]/gu, '').toLowerCase();
}

function isTocHeader(text) {
    if (!text) return false;
    return TOC_KEYWORDS.includes(lettersOnly(text));
}

function isChapterLabel(text) {
    const t = text.trim();
    return CHAPTER_LABEL.test(t) || NAMED_SECTION.test(t);
}

function bodyLinesOf(page) {
    return page.bodyLines || page.lines || [];
}

/** Splits "Title ..... 12" into its title and page reference. A lone "Chapter 3" has no page reference. */
function parseTocLine(text) {
    const m = text.match(/^(.*?\S)[\s.…·•_–—-]*[\s.…·•_–—-](\d{1,4}|[ivxlcdm]{1,8})$/u);
    if (m && !TOC_BARE_LABEL.test(m[1])) {
        const isNumber = /^\d+$/.test(m[2]);
        if (isNumber || ROMAN.test(m[2])) {
            return { title: m[1].trim(), bookPageNum: isNumber ? parseInt(m[2], 10) : null, hasPageRef: true };
        }
    }
    return { title: text, bookPageNum: null, hasPageRef: false };
}

function collectTocLines(tocPages) {
    const raw = [];
    for (const page of tocPages) {
        for (const line of bodyLinesOf(page)) {
            const text = line.text.trim();
            if (isTocHeader(text) || text.length < 2 || /^(?:\d+|[ivxlcdm]+)$/i.test(text)) continue;
            raw.push({ ...parseTocLine(text), minX: line.minX });
        }
    }
    return raw;
}

/**
 * Joins titles that wrap over two lines, whichever line carries the page number.
 * Only a line that fills the column can wrap, so a short line without a number belongs to the
 * long line above it, and a long one to the line below it. Two short lines stay separate entries.
 */
function stitchTocEntries(raw) {
    const entries = [];
    const fullLength = Math.max(0, ...raw.map(r => r.title.length)) * 0.7;
    const isFull = line => line.title.length >= fullLength;

    for (let i = 0; i < raw.length; i++) {
        const entry = { ...raw[i] };
        const next = raw[i + 1];

        if (next && !TOC_LABEL_START.test(next.title)) {
            const numberOnNextLine = !entry.hasPageRef && next.hasPageRef && isFull(entry);
            const numberOnFirstLine = entry.hasPageRef && !next.hasPageRef && isFull(entry) && !isFull(next);
            if (numberOnNextLine || numberOnFirstLine) {
                entry.title += ' ' + next.title;
                if (numberOnNextLine) {
                    entry.bookPageNum = next.bookPageNum;
                    entry.hasPageRef = true;
                }
                i++;
            }
        }
        entry.title = entry.title.replace(/\s+/g, ' ').trim();
        if (entry.title.length > 2) entries.push(entry);
    }
    return entries;
}

/** Keeps top-level entries. Sub-sections sit further right than their chapter. */
function dropIndentedEntries(entries) {
    if (entries.length === 0) return entries;
    const baseX = Math.min(...entries.map(e => e.minX));
    return entries.filter(e => e.minX <= baseX + TOC_SECTION_INDENT);
}

function looksLikeHeadingLine(text) {
    const t = text.trim();
    if (t.length < 2 || t.length >= 80) return false;
    if (/^[“"‘'«‹]/.test(t)) return false;
    if (/[,;]$/.test(t)) return false;
    if (/\.$/.test(t) && !isChapterLabel(t) && !BARE_NUMBER.test(t)) return false;
    return true;
}

/**
 * Groups a page's large lines into headings. A title wrapped over several lines becomes one
 * block, and a label such as "Chapter 3" or a bare number joins the title directly below it.
 */
function buildHeadingBlocks(page, pageIndex, minFs) {
    const lines = bodyLinesOf(page);
    const blocks = [];

    lines.forEach((line, i) => {
        if (line.maxFs < minFs || !looksLikeHeadingLine(line.text)) return;

        const prev = blocks[blocks.length - 1];
        const isNextLine = prev && prev.lastIndex === i - 1;
        const isWrapped = isNextLine && Math.abs(prev.fs - line.maxFs) <= SAME_SIZE && prev.lastY - line.y <= line.maxFs * 1.7;
        const followsLabel = isNextLine && (BARE_LABEL.test(prev.text) || BARE_NUMBER.test(prev.text));

        if (isWrapped || followsLabel) {
            prev.text += ((followsLabel && !isWrapped) ? ': ' : ' ') + line.text.trim();
            prev.fs = Math.max(prev.fs, line.maxFs);
            prev.lastIndex = i;
            prev.lastY = line.y;
            return;
        }
        blocks.push({ text: line.text.trim(), fs: line.maxFs, pageIndex, firstIndex: i, lastIndex: i, lastY: line.y, startLine: line });
    });

    return blocks
        .filter(b => b.text.length < 200 && !isTocHeader(b.text))
        .map(b => ({ ...b, key: compactKey(b.text) }));
}

/**
 * Finds the font size chapters are set in: the size used by chapter labels when the book has
 * them, otherwise the largest size used by at least two different headings. A size used by one
 * heading only is the book title, and repeated identical text is a half-title page.
 */
function pickChapterSize(blocks) {
    const sizeOf = b => Math.round(b.fs * 2) / 2;
    const labelled = blocks.filter(b => CHAPTER_LABEL.test(b.text) && !PART_LABEL.test(b.text));
    const pool = labelled.length >= 2 ? labelled : blocks.filter(b => !PART_LABEL.test(b.text));
    const keysBySize = new Map();

    for (const b of pool) {
        if (!keysBySize.has(sizeOf(b))) keysBySize.set(sizeOf(b), new Set());
        keysBySize.get(sizeOf(b)).add(b.key);
    }

    const sizes = [...keysBySize.keys()].sort((a, b) => b - a);
    return sizes.find(s => keysBySize.get(s).size >= 2) || sizes[0];
}

/** Headings at the chapter size or larger. Larger ones before the first chapter are the title page. */
function selectChapterBlocks(blocks) {
    if (blocks.length === 0) return [];
    const size = pickChapterSize(blocks);
    if (size === undefined) return blocks.filter(b => PART_LABEL.test(b.text));

    const atSize = b => Math.abs(b.fs - size) <= SAME_SIZE;
    const firstIdx = blocks.findIndex(atSize);
    return blocks.filter((b, idx) => {
        if (b.fs < size - SAME_SIZE) return false;
        return atSize(b) || idx > firstIdx || PART_LABEL.test(b.text);
    });
}

/** A short all-caps or label line above the heading belongs to the chapter, not to the previous one. */
function resolveStartLine(page, block) {
    const lines = bodyLinesOf(page);
    const above = lines.slice(0, block.firstIndex);
    const isKicker = l => l.text.length < 40 && (isChapterLabel(l.text) || BARE_NUMBER.test(l.text) || l.text === l.text.toUpperCase());
    if (above.length > 0 && above.length <= 2 && above.every(isKicker)) return lines[0];
    return block.startLine;
}

function toChapter(pagesData, block, title, source) {
    return { title, pageIndex: block.pageIndex, startLine: resolveStartLine(pagesData[block.pageIndex], block), source };
}

function titleMatchesBlock(title, block) {
    const key = compactKey(title);
    const bareKey = compactKey(title.replace(LABEL_PREFIX, ''));
    if (block.key === key || block.key === bareKey) return true;
    if (bareKey.length > 3 && block.key.includes(bareKey)) return true;
    return key.length > 3 && block.key.length >= 4 && key.includes(block.key) && block.key.length >= key.length * 0.5;
}

/** For titles set no larger than body text: looks for the title in the first lines of a page. */
function pageShowsTitle(page, title, dominantFs) {
    const topLines = page.lines.slice(0, 6);
    const topText = topLines.map(l => compactKey(l.text)).join(' ');
    const bare = title.replace(LABEL_PREFIX, '').trim() || title;

    const key = compactKey(bare);
    if (key.length > 3 && topText.includes(key)) return true;

    const hasLargeFont = topLines.some(l => l.maxFs >= dominantFs * 1.35);
    const words = stripAccents(bare).toLowerCase().replace(/[^\p{L}\s]/gu, '').split(/\s+/).filter(w => w.length >= 4);
    return hasLargeFont && words.length > 0 && words.every(w => topText.includes(w));
}

/** Locates each TOC entry in the body, in order, trusting the printed page number when it helps. */
function mapTocEntries(entries, pagesData, firstBodyIdx, blocks, dominantFs) {
    const located = [];
    let pageOffset = null;
    let nextBlock = 0;
    let nextPage = firstBodyIdx;

    for (const entry of entries) {
        const remaining = blocks.slice(nextBlock).filter(b => titleMatchesBlock(entry.title, b));
        let block = remaining[0];
        if (pageOffset !== null && entry.bookPageNum !== null) {
            const target = entry.bookPageNum + pageOffset - 1;
            block = remaining.find(b => Math.abs(b.pageIndex - target) <= 3) || block;
        }

        if (block) {
            if (pageOffset === null && entry.bookPageNum !== null && block.pageIndex + 1 >= entry.bookPageNum) {
                pageOffset = block.pageIndex + 1 - entry.bookPageNum;
                console.log(`  -> Calibrated PDF page offset: +${pageOffset} pages (Book Page ${entry.bookPageNum} = PDF Page ${block.pageIndex + 1})`);
            }
            located.push({ ...toChapter(pagesData, block, entry.title, 'TOC'), block });
            nextBlock = blocks.indexOf(block) + 1;
            nextPage = block.pageIndex;
            console.log(`     ✓ "${entry.title}" -> PDF Page ${pagesData[block.pageIndex].pageNum}`);
            continue;
        }

        let pageIdx = -1;
        for (let p = nextPage + (located.length > 0 ? 1 : 0); p < pagesData.length; p++) {
            if (pageShowsTitle(pagesData[p], entry.title, dominantFs)) {
                pageIdx = p;
                break;
            }
        }
        if (pageIdx === -1) {
            console.log(`     ⚠ Could not locate page for "${entry.title}"`);
            continue;
        }
        located.push({ title: entry.title, pageIndex: pageIdx, source: 'TOC' });
        nextPage = pageIdx;
        while (nextBlock < blocks.length && blocks[nextBlock].pageIndex <= pageIdx) nextBlock++;
        console.log(`     ✓ "${entry.title}" -> PDF Page ${pagesData[pageIdx].pageNum}`);
    }

    // A contents page can list sections without indenting them. Their headings are smaller.
    const sized = located.filter(c => c.block).map(c => c.block);
    const size = sized.length > 0 ? pickChapterSize(sized) : undefined;
    const chapters = located.filter(c => !c.block || size === undefined || c.block.fs >= size - SAME_SIZE);
    if (chapters.length < located.length) console.log(`  -> ${located.length - chapters.length} contents entries are sections inside a chapter.`);
    return { chapters, locatedCount: located.length };
}

function isIsolatedLine(lines, i) {
    const next = lines[i + 1];
    return !next || lines[i].y - next.y >= lines[i].maxFs * 1.8;
}

/** Books whose chapter headings are no larger than body text still mark them with a label line. */
function findLabelledBodyLines(pagesData, firstBodyIdx) {
    const found = [];
    for (let p = firstBodyIdx; p < pagesData.length; p++) {
        const lines = bodyLinesOf(pagesData[p]);
        lines.forEach((line, i) => {
            const text = line.text.trim();
            if (!isChapterLabel(text)) return;
            const isBold = line.items && line.items.every(t => t.isBold);
            if (text === text.toUpperCase() || isBold || isIsolatedLine(lines, i)) {
                found.push({ title: text, pageIndex: p, startLine: line, source: 'LABEL' });
            }
        });
    }
    return found;
}

function findTocPages(pagesData) {
    const limit = Math.min(TOC_SCAN_PAGES, pagesData.length);
    for (let pIdx = 0; pIdx < limit; pIdx++) {
        if (!bodyLinesOf(pagesData[pIdx]).some(l => isTocHeader(l.text))) continue;

        const tocPages = [pagesData[pIdx]];
        let nextIdx = pIdx + 1;
        while (nextIdx < Math.min(pIdx + 4, pagesData.length)) {
            const lines = bodyLinesOf(pagesData[nextIdx]);
            const numbered = lines.filter(l => /\b(?:\d+)\s*$/.test(l.text.trim())).length;
            if (numbered < 2 || numbered < lines.length * 0.4) break;
            tocPages.push(pagesData[nextIdx]);
            nextIdx++;
        }

        const entries = dropIndentedEntries(stitchTocEntries(collectTocLines(tocPages)));
        if (entries.length >= 3) {
            console.log(`  -> Found Table of Contents starting on Page ${pagesData[pIdx].pageNum}! ${entries.length} top-level entries.`);
            return { entries, lastPageIdx: nextIdx - 1 };
        }
    }
    return null;
}

async function detectChapters(pagesData, dominantFs) {
    const minFs = dominantFs * HEADING_RATIO;
    const toc = findTocPages(pagesData);
    const firstBodyIdx = toc ? toc.lastPageIdx + 1 : 0;

    const blocks = [];
    for (let p = firstBodyIdx; p < pagesData.length; p++) {
        blocks.push(...buildHeadingBlocks(pagesData[p], p, minFs));
    }

    if (toc) {
        console.log('  -> Mapping TOC entries to actual PDF pages...');
        const { chapters, locatedCount } = mapTocEntries(toc.entries, pagesData, firstBodyIdx, blocks, dominantFs);
        if (chapters.length >= 2 && locatedCount >= toc.entries.length * 0.5) {
            console.log(`  -> Successfully mapped ${chapters.length} chapters from TOC!`);
            return chapters.map(({ block, ...chapter }) => chapter);
        }
        console.log(`  -> TOC mapped only ${locatedCount}/${toc.entries.length} entries. Falling back to heading analysis.`);
    }

    console.log('  -> Running font size & heading pattern analysis...');
    const chapterBlocks = selectChapterBlocks(blocks);
    if (chapterBlocks.length < 2) {
        const labelled = findLabelledBodyLines(pagesData, firstBodyIdx);
        if (labelled.length >= 2) {
            console.log(`  -> Detected ${labelled.length} chapters from label lines.`);
            return labelled;
        }
    }

    const chapters = chapterBlocks.map(b => toChapter(pagesData, b, b.text, 'HEURISTIC'));
    console.log(`  -> Detected ${chapters.length} chapters via heading font size.`);
    return chapters;
}

module.exports = { detectChapters, isTocHeader };
