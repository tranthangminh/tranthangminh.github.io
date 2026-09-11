/**
 * Module: spatial_matrix.js
 * 2D Matrix transformations and SVG path parsing with CTM coordinates.
 */

function transformPoint(p, ctm) {
    return {
        x: ctm[0] * p.x + ctm[2] * p.y + ctm[4],
        y: ctm[1] * p.x + ctm[3] * p.y + ctm[5]
    };
}

function multiplyMatrix(m1, m2) {
    return [
        m1[0] * m2[0] + m1[2] * m2[1],
        m1[1] * m2[0] + m1[3] * m2[1],
        m1[0] * m2[2] + m1[2] * m2[3],
        m1[1] * m2[2] + m1[3] * m2[3],
        m1[0] * m2[4] + m1[2] * m2[5] + m1[4],
        m1[1] * m2[4] + m1[3] * m2[5] + m1[5]
    ];
}

function parsePathWithCTM(arg1, ctm) {
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    let svgPath = '';
    for (let obj of arg1) {
        if (!obj) continue;
        const d = obj.args || obj.data || (ArrayBuffer.isView(obj) || Array.isArray(obj) ? obj : null);
        if (!d || d.length === 0) continue;

        let i = 0;
        while (i < d.length) {
            const op = d[i++];
            if (op === 0) { // moveTo
                if (i + 1 < d.length) {
                    const p = transformPoint({ x: d[i], y: d[i + 1] }, ctm);
                    svgPath += ` M ${p.x.toFixed(2)} ${p.y.toFixed(2)}`;
                    minX = Math.min(minX, p.x); maxX = Math.max(maxX, p.x);
                    minY = Math.min(minY, p.y); maxY = Math.max(maxY, p.y);
                    i += 2;
                }
            } else if (op === 1) { // lineTo
                if (i + 1 < d.length) {
                    const p = transformPoint({ x: d[i], y: d[i + 1] }, ctm);
                    svgPath += ` L ${p.x.toFixed(2)} ${p.y.toFixed(2)}`;
                    minX = Math.min(minX, p.x); maxX = Math.max(maxX, p.x);
                    minY = Math.min(minY, p.y); maxY = Math.max(maxY, p.y);
                    i += 2;
                }
            } else if (op === 2) { // curveTo (Bézier)
                if (i + 5 < d.length) {
                    const p1 = transformPoint({ x: d[i], y: d[i + 1] }, ctm);
                    const p2 = transformPoint({ x: d[i + 2], y: d[i + 3] }, ctm);
                    const p3 = transformPoint({ x: d[i + 4], y: d[i + 5] }, ctm);
                    svgPath += ` C ${p1.x.toFixed(2)} ${p1.y.toFixed(2)}, ${p2.x.toFixed(2)} ${p2.y.toFixed(2)}, ${p3.x.toFixed(2)} ${p3.y.toFixed(2)}`;
                    minX = Math.min(minX, p1.x, p2.x, p3.x); maxX = Math.max(maxX, p1.x, p2.x, p3.x);
                    minY = Math.min(minY, p1.y, p2.y, p3.y); maxY = Math.max(maxY, p1.y, p2.y, p3.y);
                    i += 6;
                }
            } else if (op === 3) { // closePath
                svgPath += ' Z';
            } else if (op === 4) { // rectangle
                if (i + 3 < d.length) {
                    const rx = d[i], ry = d[i + 1], rw = d[i + 2], rh = d[i + 3];
                    const p1 = transformPoint({ x: rx, y: ry }, ctm);
                    const p2 = transformPoint({ x: rx + rw, y: ry }, ctm);
                    const p3 = transformPoint({ x: rx + rw, y: ry + rh }, ctm);
                    const p4 = transformPoint({ x: rx, y: ry + rh }, ctm);
                    svgPath += ` M ${p1.x.toFixed(2)} ${p1.y.toFixed(2)} L ${p2.x.toFixed(2)} ${p2.y.toFixed(2)} L ${p3.x.toFixed(2)} ${p3.y.toFixed(2)} L ${p4.x.toFixed(2)} ${p4.y.toFixed(2)} Z`;
                    minX = Math.min(minX, p1.x, p2.x, p3.x, p4.x); maxX = Math.max(maxX, p1.x, p2.x, p3.x, p4.x);
                    minY = Math.min(minY, p1.y, p2.y, p3.y, p4.y); maxY = Math.max(maxY, p1.y, p2.y, p3.y, p4.y);
                    i += 4;
                }
            }
        }
    }

    if (minX === Infinity) return null;
    return {
        bounds: { minX, minY, maxX, maxY, width: maxX - minX, height: maxY - minY },
        svgPath: svgPath.trim()
    };
}

module.exports = {
    transformPoint,
    multiplyMatrix,
    parsePathWithCTM
};
