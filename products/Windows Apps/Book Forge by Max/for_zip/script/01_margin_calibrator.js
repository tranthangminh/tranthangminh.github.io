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

function calibrateMarginsAndFilterHeaders(pagesData, numPages) {
    const topGaps = [];
    const bottomGaps = [];
    const headerLinesFreq = {};
    const footerLinesFreq = {};

    for (let p of pagesData.slice(0, Math.min(40, numPages))) {
        if (p.lines.length < 5) continue;
        const l0 = p.lines[0];
        const l1 = p.lines[1];
        const lLast = p.lines[p.lines.length - 1];
        const lPrev = p.lines[p.lines.length - 2];

        const topGap = l0.y - l1.y;
        if (topGap > 18) {
            topGaps.push({ headerY: l0.y, bodyTopY: l1.y, gap: topGap });
            headerLinesFreq[l0.text] = (headerLinesFreq[l0.text] || 0) + 1;
        }

        const bottomGap = lPrev.y - lLast.y;
        if (bottomGap > 18) {
            bottomGaps.push({ bodyBottomY: lPrev.y, footerY: lLast.y, gap: bottomGap });
            footerLinesFreq[lLast.text] = (footerLinesFreq[lLast.text] || 0) + 1;
        }
    }

    const avgHeaderY = topGaps.length >= 3 ? topGaps.reduce((acc, g) => acc + g.headerY, 0) / topGaps.length : 0;
    const avgFooterY = bottomGaps.length >= 3 ? bottomGaps.reduce((acc, g) => acc + g.footerY, 0) / bottomGaps.length : 0;

    for (let p of pagesData) {
        // Filter Running Headers and Footers
        p.bodyLines = p.lines.filter((l, idx) => {
            if (avgHeaderY > 0 && l.y >= avgHeaderY) {
                if (l.text.length < 70 && (headerLinesFreq[l.text] > 1 || idx === 0)) return false;
            }
            if (avgFooterY > 0 && l.y <= avgFooterY) {
                if (/^\s*([0-9]+|[ivxlcdm]+)\s*$/i.test(l.text) || footerLinesFreq[l.text] > 1) return false;
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
