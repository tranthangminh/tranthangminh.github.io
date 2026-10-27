/**
 * pixelart-topology.js - Topological Connected Components & Enclosure Hierarchy
 * Pipeline Step for 8-Bit Pixel Art: Analyzes blob containment relationships (Blobs inside Blobs),
 * fills internal holes so parent shapes form solid underlays (Russian Doll model), and computes
 * z-index painter's order for professional editing in Figma/Illustrator.
 * Complies with _RULE-web-apps.md (< 500 lines)
 * 100% Vanilla JS
 */

class PixelArtTopology {
    /**
     * Analyze matrix to build layered enclosure components
     * @param {Int16Array} matrix - Matrix of color indices (-1 for transparent)
     * @param {number} cols - Matrix column count
     * @param {number} rows - Matrix row count
     * @param {Array<{hex: string, isTransparent: boolean}>} palette
     * @param {Object} [options={}]
     * @param {number} [options.threshold=0.70] - Enclosure perimeter contact ratio (0.5 to 1.0)
     * @param {boolean} [options.enabled=true] - Whether to build layered solids
     * @returns {Array<{id: number, colorIdx: number, hex: string, depth: number, solidPixels: Int32Array}>}
     */
    static analyze(matrix, cols, rows, palette, options = {}) {
        const threshold = Math.max(0.5, Math.min(1.0, options.threshold ?? 0.70));
        const total = cols * rows;

        // 1. Connected Component Labeling (4-connectivity)
        const labels = new Int32Array(total);
        labels.fill(0);
        const components = [];
        const compMap = new Map();
        let nextId = 1;

        for (let r = 0; r < rows; r++) {
            const rOffset = r * cols;
            for (let c = 0; c < cols; c++) {
                const idx = rOffset + c;
                if (labels[idx] !== 0) continue;

                const color = matrix[idx];
                if (color < 0 || (palette[color] && palette[color].isTransparent)) {
                    labels[idx] = -1; // Transparent background
                    continue;
                }

                // BFS flood fill
                const comp = {
                    id: nextId,
                    colorIdx: color,
                    hex: palette[color] ? palette[color].hex : '#000000',
                    pixels: [],
                    perimeterNeighbors: {},
                    totalPerimeter: 0,
                    parentId: null,
                    children: [],
                    depth: 0
                };

                const queue = [idx];
                labels[idx] = nextId;
                let head = 0;

                while (head < queue.length) {
                    const curr = queue[head++];
                    comp.pixels.push(curr);
                    const cy = Math.floor(curr / cols);
                    const cx = curr % cols;

                    if (cx > 0) {
                        const n = curr - 1;
                        if (labels[n] === 0 && matrix[n] === color) { labels[n] = nextId; queue.push(n); }
                    }
                    if (cx < cols - 1) {
                        const n = curr + 1;
                        if (labels[n] === 0 && matrix[n] === color) { labels[n] = nextId; queue.push(n); }
                    }
                    if (cy > 0) {
                        const n = curr - cols;
                        if (labels[n] === 0 && matrix[n] === color) { labels[n] = nextId; queue.push(n); }
                    }
                    if (cy < rows - 1) {
                        const n = curr + cols;
                        if (labels[n] === 0 && matrix[n] === color) { labels[n] = nextId; queue.push(n); }
                    }
                }

                components.push(comp);
                compMap.set(nextId, comp);
                nextId++;
            }
        }

        if (components.length === 0) return [];

        // 2. Scan perimeter contacts for each component
        for (let i = 0; i < components.length; i++) {
            const comp = components[i];
            const pxs = comp.pixels;
            const pNeighbors = comp.perimeterNeighbors;

            for (let j = 0; j < pxs.length; j++) {
                const p = pxs[j];
                const cy = Math.floor(p / cols);
                const cx = p % cols;

                const checkNeighbor = (nIdx, isBorder) => {
                    if (isBorder) {
                        comp.totalPerimeter++;
                        pNeighbors['border'] = (pNeighbors['border'] || 0) + 1;
                    } else {
                        const nLabel = labels[nIdx];
                        if (nLabel !== comp.id) {
                            comp.totalPerimeter++;
                            pNeighbors[nLabel] = (pNeighbors[nLabel] || 0) + 1;
                        }
                    }
                };

                checkNeighbor(p - 1, cx === 0);
                checkNeighbor(p + 1, cx === cols - 1);
                checkNeighbor(p - cols, cy === 0);
                checkNeighbor(p + cols, cy === rows - 1);
            }
        }

        // 3. Dominant Contact & Family Enclosure Tree Construction
        const getRoot = (id) => {
            let curr = compMap.get(id);
            while (curr && curr.parentId) curr = compMap.get(curr.parentId);
            return curr ? curr.id : id;
        };

        const tryAttach = (comp, candidate) => {
            if (!candidate) return false;
            let curr = candidate;
            while (curr && curr.parentId) {
                if (curr.parentId === comp.id) return false;
                curr = compMap.get(curr.parentId);
            }
            comp.parentId = candidate.id;
            candidate.children.push(comp.id);
            return true;
        };

        // Pass 1: Direct Dominant Neighbor
        for (let i = 0; i < components.length; i++) {
            const comp = components[i];
            if (comp.totalPerimeter === 0) continue;

            let bestNeighbor = null;
            let maxCount = 0;
            for (const [nIdStr, count] of Object.entries(comp.perimeterNeighbors)) {
                if (nIdStr === 'border' || nIdStr === '-1') continue;
                const nId = parseInt(nIdStr, 10);
                if (count > maxCount) {
                    maxCount = count;
                    bestNeighbor = compMap.get(nId);
                }
            }

            if (bestNeighbor && (maxCount / comp.totalPerimeter) >= threshold) {
                tryAttach(comp, bestNeighbor);
            }
        }

        const computeDepth = (comp) => {
            if (!comp.parentId) return 0;
            const parent = compMap.get(comp.parentId);
            return 1 + (parent ? computeDepth(parent) : 0);
        };

        // Pass 2: Ancestor Family Enclosure for multi-contact children
        for (let i = 0; i < components.length; i++) {
            const comp = components[i];
            if (comp.parentId || comp.totalPerimeter === 0) continue;

            const familyCounts = {};
            const familyBestChild = {};
            for (const [nIdStr, count] of Object.entries(comp.perimeterNeighbors)) {
                if (nIdStr === 'border' || nIdStr === '-1') continue;
                const nId = parseInt(nIdStr, 10);
                const neighbor = compMap.get(nId);
                const rootId = getRoot(nId);
                familyCounts[rootId] = (familyCounts[rootId] || 0) + count;
                const prev = familyBestChild[rootId];
                if (!prev) {
                    familyBestChild[rootId] = neighbor;
                } else {
                    const prevCount = comp.perimeterNeighbors[prev.id] || 0;
                    if (count > prevCount || (count === prevCount && computeDepth(neighbor) > computeDepth(prev))) {
                        familyBestChild[rootId] = neighbor;
                    }
                }
            }

            let bestRoot = null;
            let maxFamCount = 0;
            for (const [rootIdStr, count] of Object.entries(familyCounts)) {
                if (count > maxFamCount) {
                    maxFamCount = count;
                    bestRoot = parseInt(rootIdStr, 10);
                }
            }

            if (bestRoot && (maxFamCount / comp.totalPerimeter) >= threshold) {
                tryAttach(comp, familyBestChild[bestRoot] || compMap.get(bestRoot));
            }
        }

        // 4. Final Depth Calculation for each component

        for (let i = 0; i < components.length; i++) {
            components[i].depth = computeDepth(components[i]);
        }

        // 5. Fill Descendant Pixels into Parent Masks (Hole-Filling)
        const collectDescendants = (comp) => {
            let res = [];
            for (let i = 0; i < comp.children.length; i++) {
                const ch = compMap.get(comp.children[i]);
                if (ch) {
                    res = res.concat(ch.pixels, collectDescendants(ch));
                }
            }
            return res;
        };

        const result = components.map(comp => {
            const descendantPxs = collectDescendants(comp);
            let solidPixels;
            if (descendantPxs.length === 0) {
                solidPixels = new Int32Array(comp.pixels);
            } else {
                // Merge pixels and remove duplicates
                const unionSet = new Set(comp.pixels);
                for (let k = 0; k < descendantPxs.length; k++) {
                    unionSet.add(descendantPxs[k]);
                }
                solidPixels = new Int32Array(unionSet);
            }

            return {
                id: comp.id,
                colorIdx: comp.colorIdx,
                hex: comp.hex,
                depth: comp.depth,
                solidPixels
            };
        });

        // 6. Sort Z-Order by depth ascending (Parents first, then children, then grandchildren)
        result.sort((a, b) => a.depth - b.depth);

        return result;
    }
}

if (typeof window !== 'undefined') {
    window.PixelArtTopology = PixelArtTopology;
}
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { PixelArtTopology };
}
