/**
 * 04-vectorizer-fillet.js - Fillet Corner Geometry & Discrete Block Renderer
 * Pipeline Step 04: Renders Manhattan fillet arcs and individual rounded blocks
 * Complies with _RULE-web-apps.md (< 500 lines)
 * 100% Vanilla JS, Smooth Circular Fillet Arcs
 */

class QrFilletRenderer {
    /**
     * Render closed polygon loop with smooth circular fillet corner arcs
     */
    static renderLoop(loop, radius, scaleX = 1, scaleY = 1, offsetX = 0, offsetY = 0) {
        const n = loop.length;
        if (n < 3) return '';

        if (radius <= 0.001) {
            let path = `M${((loop[0].x + offsetX) * scaleX).toFixed(2)} ${((loop[0].y + offsetY) * scaleY).toFixed(2)}`;
            for (let i = 1; i < n; i++) {
                path += `L${((loop[i].x + offsetX) * scaleX).toFixed(2)} ${((loop[i].y + offsetY) * scaleY).toFixed(2)}`;
            }
            return path + 'Z';
        }

        const pts = [];
        for (let i = 0; i < n; i++) {
            const prev = loop[(i - 1 + n) % n];
            const curr = loop[i];
            const next = loop[(i + 1) % n];

            const inDx = curr.x - prev.x;
            const inDy = curr.y - prev.y;
            const outDx = next.x - curr.x;
            const outDy = next.y - curr.y;

            const lenIn = Math.abs(inDx) + Math.abs(inDy);
            const lenOut = Math.abs(outDx) + Math.abs(outDy);

            const rMax = Math.min(lenIn / 2, lenOut / 2);
            const rEff = Math.min(radius, rMax);

            const startX = curr.x - (inDx / lenIn) * rEff;
            const startY = curr.y - (inDy / lenIn) * rEff;
            const endX = curr.x + (outDx / lenOut) * rEff;
            const endY = curr.y + (outDy / lenOut) * rEff;

            const cross = inDx * outDy - inDy * outDx;
            const sweep = cross > 0 ? 1 : 0;

            pts.push({
                start: { x: (startX + offsetX) * scaleX, y: (startY + offsetY) * scaleY },
                end: { x: (endX + offsetX) * scaleX, y: (endY + offsetY) * scaleY },
                rx: rEff * scaleX,
                ry: rEff * scaleY,
                sweep
            });
        }

        let d = `M${pts[0].end.x.toFixed(2)} ${pts[0].end.y.toFixed(2)}`;
        for (let i = 0; i < n; i++) {
            const nextIdx = (i + 1) % n;
            d += `L${pts[nextIdx].start.x.toFixed(2)} ${pts[nextIdx].start.y.toFixed(2)}`;
            d += `A${pts[nextIdx].rx.toFixed(2)} ${pts[nextIdx].ry.toFixed(2)} 0 0 ${pts[nextIdx].sweep} ${pts[nextIdx].end.x.toFixed(2)} ${pts[nextIdx].end.y.toFixed(2)}`;
        }
        return d + 'Z';
    }

    /**
     * Render discrete square blocks with individual rounded corners and gap
     */
    static renderDiscreteBlocks(matrix, cols, rows, radiusNorm, scaleX, scaleY, offsetX, offsetY, gapNorm) {
        const paths = [];
        const rxFraction = Math.max(0, Math.min(0.5, radiusNorm * 0.5));
        const gap = Math.max(0, Math.min(0.2, gapNorm));

        for (let r = 0; r < rows; r++) {
            for (let c = 0; c < cols; c++) {
                if (!matrix[r * cols + c]) continue;

                const x = (c + offsetX + gap) * scaleX;
                const y = (r + offsetY + gap) * scaleY;
                const w = scaleX * (1 - 2 * gap);
                const h = scaleY * (1 - 2 * gap);

                if (rxFraction <= 0.001) {
                    paths.push(`M${x.toFixed(2)} ${y.toFixed(2)}h${w.toFixed(2)}v${h.toFixed(2)}h-${w.toFixed(2)}Z`);
                } else {
                    const rx = rxFraction * Math.min(w, h);
                    const innerW = w - 2 * rx;
                    const innerH = h - 2 * rx;
                    paths.push(
                        `M${(x + rx).toFixed(2)} ${y.toFixed(2)}` +
                        `h${innerW.toFixed(2)}` +
                        `a${rx.toFixed(2)} ${rx.toFixed(2)} 0 0 1 ${rx.toFixed(2)} ${rx.toFixed(2)}` +
                        `v${innerH.toFixed(2)}` +
                        `a${rx.toFixed(2)} ${rx.toFixed(2)} 0 0 1 -${rx.toFixed(2)} ${rx.toFixed(2)}` +
                        `h-${innerW.toFixed(2)}` +
                        `a${rx.toFixed(2)} ${rx.toFixed(2)} 0 0 1 -${rx.toFixed(2)} -${rx.toFixed(2)}` +
                        `v-${innerH.toFixed(2)}` +
                        `a${rx.toFixed(2)} ${rx.toFixed(2)} 0 0 1 ${rx.toFixed(2)} -${rx.toFixed(2)}Z`
                    );
                }
            }
        }

        return paths.join('');
    }
}

if (typeof window !== 'undefined') {
    window.QrFilletRenderer = QrFilletRenderer;
}
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { QrFilletRenderer };
}
