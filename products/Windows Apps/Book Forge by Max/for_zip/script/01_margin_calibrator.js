/**
 * Submodule 01_6: Header/Footer Gap Analyzer & Margin Calibrator
 * Location: script/01_6_margin_calibrator.js
 * 
 * Responsibilities:
 * - Statistically analyzes vertical gaps at page headers and footers across sample pages.
 * - Computes dynamic cutoffs: avgHeaderY, avgFooterY.
 * - Filters out running headers, running footers, and page numbers into bodyLines.
 * - Filters valid non-header/footer illustrations.
 * - Calculates per-page Left Margin & Right Margin for book binding gutters.
 * - Merges text lines and images into pageItems (sorted Y descending).
 */

const PAGE_NUMBER = /^\s*([0-9]+|[ivxlcdm]+)\s*$/i;

/** Page numbers aside, a running header or footer repeats the same text from page to page. */
function runningMarkKey(text) {
    return text.replace(/\d+/g, '#').replace(/\s+/g, ' ').trim().toLowerCase();
}

/**
 * Finds the running band from the line separated from the page body on each page.
 * A heading that opens a page is also set apart by a large gap, but its text does not repeat
 * and it is larger than body text. Counting those would move the band into the body and
 * drop the first line of every page, so only repeated lines of body size or smaller count.
 */
function findRunningBand(candidates, dominantFs) {
    const freq = {};
    for (const line of candidates) {
        const key = runningMarkKey(line.text);
        freq[key] = (freq[key] || 0) + 1;
    }
    const marks = candidates.filter(line => {
        if (line.maxFs > dominantFs * 1.1) return false;
        return freq[runningMarkKey(line.text)] > 1 || PAGE_NUMBER.test(line.text);
    });
    return { marks, freq };
}

function calibrateMarginsAndFilterHeaders(pagesData, dominantFs) {
    const topCandidates = [];
    const bottomCandidates = [];

    for (let p of pagesData) {
        if (p.lines.length < 5) continue;
        const l0 = p.lines[0];
        const l1 = p.lines[1];
        const lLast = p.lines[p.lines.length - 1];
        const lPrev = p.lines[p.lines.length - 2];

        if (l0.y - l1.y > 18) topCandidates.push(l0);
        if (lPrev.y - lLast.y > 18) bottomCandidates.push(lLast);
    }

    const header = findRunningBand(topCandidates, dominantFs);
    const footer = findRunningBand(bottomCandidates, dominantFs);
    const avgHeaderY = header.marks.length >= 3 ? Math.min(...header.marks.map(l => l.y)) : 0;
    const avgFooterY = footer.marks.length >= 3 ? Math.max(...footer.marks.map(l => l.y)) : 0;

    for (let p of pagesData) {
        // Filter Running Headers and Footers
        p.bodyLines = p.lines.filter((l, idx) => {
            const key = runningMarkKey(l.text);
            if (avgHeaderY > 0 && l.y >= avgHeaderY && l.maxFs <= dominantFs * 1.1) {
                if (l.text.length < 70 && (header.freq[key] > 1 || idx === 0)) return false;
            }
            if (avgFooterY > 0 && l.y <= avgFooterY) {
                if (PAGE_NUMBER.test(l.text) || footer.freq[key] > 1) return false;
            }
            return true;
        });

        // Filter valid non-header/footer images
        const validImages = p.images.filter(img => {
            if (img.type === 'cover') return false;
            if (avgHeaderY > 0 && img.y >= avgHeaderY) return false;
            if (avgFooterY > 0 && img.y <= avgFooterY) return false;
            return true;
        });

        // Per-Page Left and Right Margin calculation
        const longLines = p.bodyLines.filter(l => l.text.length > 35);
        const pageLeft = longLines.length > 0 ? Math.min(...longLines.map(l => l.minX)) : 50;
        const pageRight = longLines.length > 0 ? Math.max(...longLines.map(l => l.maxX)) : p.width - 50;

        p.bodyLines.forEach(l => {
            l.pageNum = p.pageNum;
            l.pageLeft = pageLeft;
            l.pageRight = pageRight;
        });

        // Combine text lines and images, sorted Y descending
        p.pageItems = [...p.bodyLines, ...validImages].sort((a, b) => b.y - a.y);
    }

    return {
        avgHeaderY,
        avgFooterY
    };
}

module.exports = {
    calibrateMarginsAndFilterHeaders
};
