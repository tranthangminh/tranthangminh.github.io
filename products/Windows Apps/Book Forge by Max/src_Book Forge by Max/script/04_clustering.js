/**
 * Module: clustering.js
 * 2D Connected-Component Clustering, Transitive Bridge Fusion, and Diagram Label Expansion.
 */

const { isDividerLine, isPrepressPrinterMark, isFullPageSpan, isTextUnderlineCluster } = require('./04_filters');

function doBoxesOverlap(b1, b2, margin = 25) {
    return !(b1.maxX + margin < b2.minX ||
             b1.minX - margin > b2.maxX ||
             b1.maxY + margin < b2.minY ||
             b1.minY - margin > b2.maxY);
}

function clusterVectorPaths(pagePaths, pageWidth, pageHeight) {
    const rawClusters = [];
    for (let p of pagePaths) {
        if (isDividerLine(p.bounds)) continue;
        if (isPrepressPrinterMark(p.bounds, pageWidth, pageHeight)) continue;
        if (p.isOuterBox) continue;

        let matched = [];
        for (let j = 0; j < rawClusters.length; j++) {
            if (doBoxesOverlap(p.bounds, rawClusters[j], 25)) {
                matched.push(j);
            }
        }

        if (matched.length === 0) {
            rawClusters.push({
                minX: p.bounds.minX, maxX: p.bounds.maxX,
                minY: p.bounds.minY, maxY: p.bounds.maxY,
                paths: [p]
            });
        } else {
            const firstIdx = matched[0];
            const targetCl = rawClusters[firstIdx];
            targetCl.paths.push(p);
            targetCl.minX = Math.min(targetCl.minX, p.bounds.minX);
            targetCl.maxX = Math.max(targetCl.maxX, p.bounds.maxX);
            targetCl.minY = Math.min(targetCl.minY, p.bounds.minY);
            targetCl.maxY = Math.max(targetCl.maxY, p.bounds.maxY);

            // Merge all other overlapping clusters if p bridges them
            for (let k = matched.length - 1; k >= 1; k--) {
                const otherIdx = matched[k];
                const otherCl = rawClusters[otherIdx];
                targetCl.paths.push(...otherCl.paths);
                targetCl.minX = Math.min(targetCl.minX, otherCl.minX);
                targetCl.maxX = Math.max(targetCl.maxX, otherCl.maxX);
                targetCl.minY = Math.min(targetCl.minY, otherCl.minY);
                targetCl.maxY = Math.max(targetCl.maxY, otherCl.maxY);
                rawClusters.splice(otherIdx, 1);
            }
        }
    }

    const validClusters = [];
    for (let cl of rawClusters) {
        cl.width = cl.maxX - cl.minX;
        cl.height = cl.maxY - cl.minY;

        if (cl.width < 15 || cl.height < 6) continue;
        if (isFullPageSpan(cl.width, cl.height, pageWidth, pageHeight)) continue;
        if (isTextUnderlineCluster(cl.paths)) continue;

        validClusters.push(cl);
    }

    return validClusters;
}

function associateDiagramLabels(cl, textContent) {
    const vectorMinY = cl.minY;
    const vectorMaxY = cl.maxY;
    const associatedTexts = [];
    const textItems = [];

    for (let it of textContent.items) {
        const tx = it.transform[4];
        const ty = it.transform[5];
        const tw = it.width || 0;
        const tfs = Math.hypot(it.transform[0], it.transform[1]) || 10;
        const str = it.str ? it.str.trim() : '';
        if (!str) continue;

        // 1. Text is strictly INSIDE vector bounds
        const isInside = (tx >= cl.minX - 5 && tx + tw <= cl.maxX + 5 && ty >= vectorMinY - 3 && ty <= vectorMaxY + 3);

        // 2. Text is an adjacent Diagram Label directly BELOW vector arrows (within 18pt below vectorMinY)
        const isBelowLabel = (ty >= vectorMinY - 18 && ty <= vectorMinY + 5)
                          && (tx + tw >= cl.minX - 10 && tx <= cl.maxX + 10)
                          && (str.length < 35)
                          && !str.endsWith(':')
                          && !str.endsWith('.');

        if (isInside || isBelowLabel) {
            associatedTexts.push(str);
            textItems.push({
                str,
                x: tx,
                y: ty,
                width: tw,
                fontSize: tfs,
                fontName: it.fontName || 'Lora'
            });
            cl.minX = Math.min(cl.minX, tx);
            cl.maxX = Math.max(cl.maxX, tx + tw);
            cl.minY = Math.min(cl.minY, ty - 2);
            cl.maxY = Math.max(cl.maxY, ty + tfs + 2);
        }
    }

    cl.width = cl.maxX - cl.minX;
    cl.height = cl.maxY - cl.minY;
    cl.textItems = textItems;
    return associatedTexts;
}

module.exports = {
    doBoxesOverlap,
    clusterVectorPaths,
    associateDiagramLabels
};
