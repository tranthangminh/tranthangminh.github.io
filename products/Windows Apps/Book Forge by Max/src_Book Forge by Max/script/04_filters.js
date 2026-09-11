/**
 * Module: filters.js
 * Independent filter guards for prepress printer marks, text underlines, divider lines, and full-page frames.
 */

function isDividerLine(bounds) {
    return bounds.height < 1 && bounds.width > 150;
}

function isPrepressPrinterMark(bounds, pageWidth, pageHeight) {
    // 1. Spans entire bleed canvas
    if (bounds.width >= pageWidth * 0.85 && bounds.height >= pageHeight * 0.85) return true;
    // 2. Positioned strictly in margin/slug outside trim area (within 25pt of borders)
    if (bounds.minX < 25 && bounds.maxX < 25) return true;
    if (bounds.minX > pageWidth - 25 && bounds.maxX > pageWidth - 25) return true;
    if (bounds.minY < 25 && bounds.maxY < 25) return true;
    if (bounds.minY > pageHeight - 25 && bounds.maxY > pageHeight - 25) return true;
    return false;
}

function isFullPageSpan(width, height, pageWidth, pageHeight) {
    return width >= pageWidth * 0.85 && height >= pageHeight * 0.85;
}

function isTextUnderlineCluster(paths) {
    if (!paths || paths.length === 0) return false;
    return paths.every(p => p.bounds.height <= 0.8 && !p.isFill && !p.svgPath.includes('C ') && !p.svgPath.includes('Z'));
}

module.exports = {
    isDividerLine,
    isPrepressPrinterMark,
    isFullPageSpan,
    isTextUnderlineCluster
};
