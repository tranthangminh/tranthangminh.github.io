/**
 * Module 02: Hierarchical Chapter Detection (with Multiline TOC Title Stitching & Robust Page Matching)
 * Location: script/02_toc_parser.js
 * 
 * Responsibilities:
 * - Priority 1: Finds TOC page ("Contents", "Mục Lục", "Sommaire").
 * - Multiline TOC Stitching: Accurately stitches chapter titles spanning across multiple lines (e.g. "16. On the Threshold of the" + "Subconscious 303").
 * - Calibrates page offset: Offset = PDF Page - Book Page.
 * - Maps TOC chapters to exact starting PDF pages using keyword presence & heading verification.
 * - Priority 2: Fallback to Max Font Size + Universal Heading regex patterns.
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

function isTocHeader(text) {
    if (!text) return false;
    const compact = text.replace(/[^a-zA-Z]/g, '').toLowerCase();
    return TOC_KEYWORDS.includes(compact);
}

async function detectChapters(pagesData, dominantFs) {
    const numPages = pagesData.length;
    let detectedChapters = [];
    let lastTocPageIdx = 0;

    // 🥇 Priority 1: Search for Table of Contents in first 20 pages
    for (let pIdx = 0; pIdx < Math.min(20, numPages); pIdx++) {
        const p = pagesData[pIdx];
        const hasTocTitle = p.lines.some(l => isTocHeader(l.text));

        if (hasTocTitle) {
            console.log(`  -> Found Table of Contents starting on Page ${p.pageNum}! Parsing chapter list...`);
            
            let tocScanPages = [p];
            let nextIdx = pIdx + 1;
            while (nextIdx < Math.min(pIdx + 4, pagesData.length)) {
                const nextP = pagesData[nextIdx];
                const hasPageNumbers = nextP.lines.filter(l => /\b\d+\s*$/.test(l.text.trim())).length >= 2;
                if (hasPageNumbers) {
                    tocScanPages.push(nextP);
                    nextIdx++;
                } else {
                    break;
                }
            }

            lastTocPageIdx = nextIdx - 1;

            // Collect all TOC raw lines
            const rawTocEntries = [];

            for (let tocPage of tocScanPages) {
                for (let l of tocPage.lines) {
                    const lineText = l.text.trim();
                    if (isTocHeader(lineText)) continue;

                    const m = lineText.match(/^([A-Z0-9\.\s\-—,']+?)\s+([ivxlcdm\d]+)$/i);
                    if (m) {
                        const rawTitle = m[1].trim();
                        const pageStr = m[2].trim();
                        const bookPageNum = parseInt(pageStr, 10);
                        rawTocEntries.push({
                            title: rawTitle,
                            bookPageNum: isNaN(bookPageNum) ? null : bookPageNum,
                            hasExplicitNumber: true
                        });
                    } else if (lineText.length > 1 && !/^[ivxlcdm\d]+$/i.test(lineText)) {
                        // Dangling title continuation line
                        rawTocEntries.push({
                            title: lineText,
                            bookPageNum: null,
                            hasExplicitNumber: false
                        });
                    }
                }
            }

            // Stitch multiline TOC titles
            for (let i = 0; i < rawTocEntries.length; i++) {
                const entry = rawTocEntries[i];
                if (!entry.title || entry.title.length < 2) continue;

                // Check if next entry is a continuation
                if (i + 1 < rawTocEntries.length) {
                    const next = rawTocEntries[i + 1];
                    const nextHasChapterPrefix = /^(chapter\s+\d+|[0-9]{1,2}\.|\b[ivxlcdm]+\.)/i.test(next.title);

                    if (!nextHasChapterPrefix) {
                        // Case A: Current has pageNum, Next is continuation without pageNum (e.g. "16. On the Threshold of the 303" + "Subconscious")
                        if (entry.bookPageNum !== null && next.bookPageNum === null) {
                            entry.title += ' ' + next.title;
                            i++; // consume next
                        }
                        // Case B: Current has no pageNum, Next has pageNum (e.g. "16. On the Threshold of the" + "Subconscious 303")
                        else if (entry.bookPageNum === null && next.bookPageNum !== null) {
                            entry.title += ' ' + next.title;
                            entry.bookPageNum = next.bookPageNum;
                            i++; // consume next
                        }
                    }
                }

                if (entry.title.length > 2) {
                    detectedChapters.push({
                        title: entry.title.replace(/\s+/g, ' ').trim(),
                        bookPageNum: entry.bookPageNum,
                        source: 'TOC'
                    });
                }
            }

            if (detectedChapters.length >= 3) {
                console.log(`  -> Successfully extracted ${detectedChapters.length} chapters from TOC!`);
                break;
            } else {
                detectedChapters = [];
            }
        }
    }

    // Helper: checks if title matches page content
    function isPageMatchingChapter(page, cleanTitle) {
        const topLines = page.lines.slice(0, 6);
        const hasLargeFont = topLines.some(l => l.maxFs >= dominantFs * 1.35);
        const topLinesText = topLines.map(l => l.text.replace(/[^a-zA-Z]/g, '').toLowerCase()).join(' ');

        // Check full compact key
        const normKey = cleanTitle.replace(/[^a-zA-Z]/g, '').toLowerCase();
        if (normKey.length > 3 && topLinesText.includes(normKey)) return true;

        // Check key words (words with length >= 4)
        const words = cleanTitle.toLowerCase().replace(/[^a-z\s]/g, '').split(/\s+/).filter(w => w.length >= 4);
        if (words.length > 0 && hasLargeFont) {
            const allWordsPresent = words.every(w => topLinesText.includes(w));
            if (allWordsPresent) return true;
        }

        return false;
    }

    // Map TOC chapters to actual PDF pages
    if (detectedChapters.length > 0) {
        console.log(`  -> Mapping TOC entries to actual PDF pages (calibrating page offset)...`);
        
        let estimatedOffset = 0;
        const firstNumericCh = detectedChapters.find(c => c.bookPageNum !== null && c.bookPageNum >= 1);

        if (firstNumericCh) {
            const cleanTitle = firstNumericCh.title.replace(/^(chapter\s+\d+|[0-9]{1,2}\.|\b[ivxlcdm]+\.)\s*/i, '').trim();

            for (let pIdx = lastTocPageIdx + 1; pIdx < pagesData.length; pIdx++) {
                const p = pagesData[pIdx];
                if (isPageMatchingChapter(p, cleanTitle)) {
                    estimatedOffset = p.pageNum - firstNumericCh.bookPageNum;
                    console.log(`  -> Calibrated PDF page offset: +${estimatedOffset} pages (Book Page ${firstNumericCh.bookPageNum} = PDF Page ${p.pageNum})`);
                    break;
                }
            }
        }

        let lastFoundPageIdx = lastTocPageIdx;

        for (let ch of detectedChapters) {
            const cleanTitle = ch.title.replace(/^(chapter\s+\d+|[0-9]{1,2}\.|\b[ivxlcdm]+\.)\s*/i, '').trim();
            let matchedPageIdx = -1;

            let searchStart = lastFoundPageIdx + 1;
            let searchEnd = pagesData.length;

            if (ch.bookPageNum !== null && estimatedOffset > 0) {
                const targetPdfPage = ch.bookPageNum + estimatedOffset;
                searchStart = Math.max(lastFoundPageIdx + 1, targetPdfPage - 3);
                searchEnd = Math.min(pagesData.length, targetPdfPage + 4);
            }

            for (let pIdx = searchStart; pIdx < searchEnd; pIdx++) {
                const p = pagesData[pIdx];
                if (isPageMatchingChapter(p, cleanTitle)) {
                    matchedPageIdx = pIdx;
                    break;
                }
            }

            if (matchedPageIdx === -1) {
                for (let pIdx = lastFoundPageIdx + 1; pIdx < pagesData.length; pIdx++) {
                    const p = pagesData[pIdx];
                    if (isPageMatchingChapter(p, cleanTitle)) {
                        matchedPageIdx = pIdx;
                        break;
                    }
                }
            }

            if (matchedPageIdx !== -1) {
                ch.pageIndex = matchedPageIdx;
                lastFoundPageIdx = matchedPageIdx;
                console.log(`     ✓ "${ch.title}" -> PDF Page ${pagesData[matchedPageIdx].pageNum}`);
            } else {
                console.log(`     ⚠ Could not locate page for "${ch.title}"`);
            }
        }
    }

    // 🥈 Priority 2 Fallback: Font Size & Universal Heading pattern analysis
    if (detectedChapters.length === 0 || detectedChapters.filter(c => c.pageIndex !== undefined).length < 2) {
        console.log(`  -> Running Font Size & Universal Heading pattern analysis (Fallback)...`);
        const headingCandidates = [];
        const headingRegex = /^(CHAPTER\s+([IVXLCDM\d]+|[A-Z\s]+)|CHƯƠNG\s+\d+|PART\s+[IVXLCDM\d]+|[0-9]{1,2}\.\s+[A-Z]|[0-9]{1,2}\s+[A-Z]|FOREWORD|INTRODUCTION|PREFACE|PROLOGUE|EPILOGUE|TRANSLATOR'?S\s+NOTE|NOTE\s+BY\s+THE\s+TRANSLATOR)/i;

        for (let pIdx = lastTocPageIdx + 1; pIdx < pagesData.length; pIdx++) {
            const p = pagesData[pIdx];
            const linesToScan = p.bodyLines || p.lines || [];
            for (let lIdx = 0; lIdx < Math.min(6, linesToScan.length); lIdx++) {
                const l = linesToScan[lIdx];
                const isLargeFont = l.maxFs >= dominantFs * 1.35;
                const matchesPattern = headingRegex.test(l.text.trim());

                if ((isLargeFont || matchesPattern) && l.text.length < 70 && !/[\u201C\u201D\u2018\u2019\"']/.test(l.text)) {
                    if (headingCandidates.length === 0 || pIdx - headingCandidates[headingCandidates.length - 1].pageIndex > 0) {
                        headingCandidates.push({
                            title: l.text.trim(),
                            pageIndex: pIdx,
                            source: 'HEURISTIC'
                        });
                        break;
                    }
                }
            }
        }

        if (headingCandidates.length >= 2) {
            detectedChapters = headingCandidates;
            console.log(`  -> Detected ${detectedChapters.length} chapters via Font Scale & Pattern heuristics.`);
        }
    }

    return detectedChapters.filter(c => c.pageIndex !== undefined);
}

module.exports = { detectChapters };
