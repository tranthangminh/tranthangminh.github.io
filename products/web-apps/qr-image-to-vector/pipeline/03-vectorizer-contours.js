/**
 * 03-vectorizer-contours.js - Contour Extraction & Saddle-Point Topology Router
 * Pipeline Step 03: Traces directed polygon boundaries and routes saddle points
 * Complies with _RULE-web-apps.md (< 500 lines)
 * 100% Vanilla JS, Mathematical Manhattan Contour Traversal
 */

class QrContourExtractor {
    /**
     * Extract closed polygon loops from a binary grid
     * @param {Uint8Array} grid - 0 (light) or 1 (dark)
     * @param {number} cols - Grid column count
     * @param {number} rows - Grid row count
     * @param {boolean} connectDiagonals - true for 8-connectivity (dính giao điểm), false for 4-connectivity (tách giao điểm)
     * @returns {Array<Array<{x: number, y: number}>>} Array of closed simplified loops
     */
    static extract(grid, cols, rows, connectDiagonals = true) {
        const edgeMap = new Map();

        const addEdge = (x1, y1, x2, y2) => {
            const key = `${x1},${y1}`;
            if (!edgeMap.has(key)) edgeMap.set(key, []);
            edgeMap.get(key).push({ x: x2, y: y2 });
        };

        // Generate clockwise boundary edges around each dark cell
        for (let y = 0; y < rows; y++) {
            const rowOffset = y * cols;
            for (let x = 0; x < cols; x++) {
                if (!grid[rowOffset + x]) continue;

                if (y === 0 || !grid[(y - 1) * cols + x]) {
                    addEdge(x, y, x + 1, y);
                }
                if (x === cols - 1 || !grid[rowOffset + x + 1]) {
                    addEdge(x + 1, y, x + 1, y + 1);
                }
                if (y === rows - 1 || !grid[(y + 1) * cols + x]) {
                    addEdge(x + 1, y + 1, x, y + 1);
                }
                if (x === 0 || !grid[rowOffset + x - 1]) {
                    addEdge(x, y + 1, x, y);
                }
            }
        }

        const loops = [];
        const visitedEdges = new Set();

        for (const [startKey, targets] of edgeMap.entries()) {
            const [startX, startY] = startKey.split(',').map(Number);

            for (let t = 0; t < targets.length; t++) {
                const initialEdgeId = `${startX},${startY}->${targets[t].x},${targets[t].y}`;
                if (visitedEdges.has(initialEdgeId)) continue;

                const loop = [{ x: startX, y: startY }];
                let prevX = startX;
                let prevY = startY;
                let currX = targets[t].x;
                let currY = targets[t].y;
                visitedEdges.add(initialEdgeId);

                let safety = 200000;
                while ((currX !== startX || currY !== startY) && safety-- > 0) {
                    loop.push({ x: currX, y: currY });
                    const nextKey = `${currX},${currY}`;
                    const nextTargets = edgeMap.get(nextKey);
                    if (!nextTargets || nextTargets.length === 0) break;

                    const inDx = currX - prevX;
                    const inDy = currY - prevY;

                    // Desired turn direction at saddle points:
                    // Right turn (clockwise): (-inDy, inDx) -> stays within cell (tách giao điểm)
                    // Left turn (counter-clockwise): (inDy, -inDx) -> crosses into diagonal (dính giao điểm)
                    const targetDx = connectDiagonals ? inDy : -inDy;
                    const targetDy = connectDiagonals ? -inDx : inDx;

                    let picked = null;
                    let bestScore = -999;

                    for (let i = 0; i < nextTargets.length; i++) {
                        const cand = nextTargets[i];
                        const edgeId = `${currX},${currY}->${cand.x},${cand.y}`;
                        if (visitedEdges.has(edgeId)) continue;

                        const outDx = cand.x - currX;
                        const outDy = cand.y - currY;

                        let score = (outDx === targetDx && outDy === targetDy) ? 10 : 0;
                        if (score > bestScore) {
                            bestScore = score;
                            picked = cand;
                        }
                    }

                    if (!picked) break;

                    visitedEdges.add(`${currX},${currY}->${picked.x},${picked.y}`);
                    prevX = currX;
                    prevY = currY;
                    currX = picked.x;
                    currY = picked.y;
                }

                if (loop.length >= 4 && currX === startX && currY === startY) {
                    const simplified = this.simplify(loop);
                    if (simplified.length >= 3) {
                        loops.push(simplified);
                    }
                }
            }
        }

        return loops;
    }

    /**
     * Function 2: 4-Connected extraction (Tách điểm - Orthogonal 4-connectivity)
     */
    static extract4Connected(grid, cols, rows) {
        return this.extract(grid, cols, rows, false);
    }

    /**
     * Function 3: 8-Connected extraction (Dính điểm - Diagonal 8-connectivity)
     */
    static extract8Connected(grid, cols, rows) {
        return this.extract(grid, cols, rows, true);
    }

    /**
     * Remove collinear intermediate points along straight Manhattan edges
     */
    static simplify(loop) {
        const n = loop.length;
        if (n < 3) return loop;
        const result = [];
        for (let i = 0; i < n; i++) {
            const prev = loop[(i - 1 + n) % n];
            const curr = loop[i];
            const next = loop[(i + 1) % n];

            const dx1 = curr.x - prev.x;
            const dy1 = curr.y - prev.y;
            const dx2 = next.x - curr.x;
            const dy2 = next.y - curr.y;

            if (dx1 * dy2 !== dy1 * dx2) {
                result.push(curr);
            }
        }
        return result;
    }
}

if (typeof window !== 'undefined') {
    window.QrContourExtractor = QrContourExtractor;
}
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { QrContourExtractor };
}
