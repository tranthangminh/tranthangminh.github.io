/**
 * 03-pixelart-topology.js - Similarity Graph & Topological Solid Layers for Pixel Art
 * Pipeline Step 03: Constructs 8-connected Similarity Graph (Kopf & Lischinski 2011),
 * fills closed paths directly into solid silhouettes, and builds hierarchical nesting
 * layers (Russian Doll / Matryoshka underlays) by innermost-container peeling.
 * Complies with _RULE-web-apps.md (< 500 lines)
 * 100% Vanilla JS
 */

class PixelArtTopology {
    /**
     * Function 4: Build Similarity Graph & Hierarchical Solid Layers
     * @param {Int16Array} matrix - Matrix of color indices (-1 for transparent)
     * @param {number} cols - Matrix column count
     * @param {number} rows - Matrix row count
     * @param {Array<{hex: string, isTransparent: boolean}>} palette
     * @param {Object} [options={}]
     * @param {number} [options.threshold=0.70] - Enclosure perimeter/area contact ratio (0.5 to 1.0)
     * @param {boolean} [options.enabled=true] - Whether to build layered solids
     * @returns {Array<{id: number, colorIdx: number, hex: string, depth: number, solidPixels: Int32Array}>}
     */
    static buildSimilarityGraphAndSolidLayers(matrix, cols, rows, palette, options = {}) {
        const threshold = Math.max(0.5, Math.min(1.0, options.threshold ?? 0.70));
        const total = cols * rows;

        // Step 1: Build 8-connected Similarity Graph Components (with 2x2 Checkerboard Resolution)
        const components = this._buildSimilarityComponents(matrix, cols, rows, palette);
        if (components.length === 0) return [];

        const compMap = new Map();
        components.forEach(c => compMap.set(c.id, c));

        // Step 2: Direct Closed Path Solid Fill (Exterior Flood-Fill per Component)
        this._fillClosedPaths(components, matrix, cols, rows, palette);

        // Step 3: Build Layer Hierarchy by Innermost Container & Ancestor Support
        this._buildLayerHierarchy(components, compMap, matrix, cols, rows, threshold, palette);

        // Step 4: Package Result sorted by depth ascending (Painter's Order: bottom to top)
        const result = components.map(comp => ({
            id: comp.id,
            colorIdx: comp.colorIdx,
            hex: comp.hex,
            depth: comp.depth,
            solidPixels: new Int32Array(comp.solidSet)
        }));

        result.sort((a, b) => a.depth - b.depth);
        return result;
    }

    /**
     * Backward-compatible alias for buildSimilarityGraphAndSolidLayers
     */
    static analyze(matrix, cols, rows, palette, options = {}) {
        return this.buildSimilarityGraphAndSolidLayers(matrix, cols, rows, palette, options);
    }

    /**
     * Build 8-connected components using Kopf-Lischinski Similarity Graph
     */
    static _buildSimilarityComponents(matrix, cols, rows, palette) {
        const total = cols * rows;
        const adj = Array.from({ length: total }, () => []);

        const addEdge = (u, v) => {
            adj[u].push(v);
            adj[v].push(u);
        };

        // 1. Orthogonal Edges (4-connectivity)
        for (let r = 0; r < rows; r++) {
            const rOffset = r * cols;
            for (let c = 0; c < cols; c++) {
                const idx = rOffset + c;
                const colA = matrix[idx];
                if (colA < 0 || (palette[colA] && palette[colA].isTransparent)) continue;

                if (c < cols - 1) {
                    const right = idx + 1;
                    if (matrix[right] === colA) addEdge(idx, right);
                }
                if (r < rows - 1) {
                    const down = idx + cols;
                    if (matrix[down] === colA) addEdge(idx, down);
                }
            }
        }

        // 2. Diagonal Edges with 2x2 Checkerboard Conflict Resolution (Kopf & Lischinski 2011)
        for (let r = 0; r < rows - 1; r++) {
            const rOffset = r * cols;
            for (let c = 0; c < cols - 1; c++) {
                const a = rOffset + c;
                const b = a + 1;
                const d = a + cols;
                const e = d + 1; // 2x2 block: a b / d e

                const colA = matrix[a], colB = matrix[b], colD = matrix[d], colE = matrix[e];
                const validA = colA >= 0 && (!palette[colA] || !palette[colA].isTransparent);
                const validB = colB >= 0 && (!palette[colB] || !palette[colB].isTransparent);

                const diag1 = validA && colA === colE; // a <-> e
                const diag2 = validB && colB === colD; // b <-> d

                if (diag1 && !diag2) {
                    addEdge(a, e);
                } else if (diag2 && !diag1) {
                    addEdge(b, d);
                } else if (diag1 && diag2) {
                    if (colA === colB) {
                        addEdge(a, e);
                        addEdge(b, d);
                    } else {
                        // Sparse Pixels Heuristic: thinner color curve wins diagonal
                        const win = this._countColorsInWindow(matrix, cols, rows, c, r, colA, colB);
                        if (win.countA <= win.countB) addEdge(a, e);
                        else addEdge(b, d);
                    }
                }
            }
        }

        // 3. BFS Traversal to collect Connected Components
        const visited = new Uint8Array(total);
        const components = [];
        let nextId = 1;

        for (let i = 0; i < total; i++) {
            if (visited[i]) continue;
            const col = matrix[i];
            if (col < 0 || (palette[col] && palette[col].isTransparent)) {
                visited[i] = 1;
                continue;
            }

            const comp = {
                id: nextId++,
                colorIdx: col,
                hex: palette[col] ? palette[col].hex : '#000000',
                pixels: [],
                pixelSet: new Set(),
                solidSet: new Set(),
                perimeterNeighbors: {},
                totalPerimeter: 0,
                parentId: null,
                children: [],
                depth: 0,
                minX: cols, minY: rows, maxX: 0, maxY: 0
            };

            const q = [i];
            visited[i] = 1;
            let head = 0;

            while (head < q.length) {
                const curr = q[head++];
                comp.pixels.push(curr);
                comp.pixelSet.add(curr);
                comp.solidSet.add(curr);

                const cx = curr % cols;
                const cy = Math.floor(curr / cols);
                if (cx < comp.minX) comp.minX = cx;
                if (cx > comp.maxX) comp.maxX = cx;
                if (cy < comp.minY) comp.minY = cy;
                if (cy > comp.maxY) comp.maxY = cy;

                const nbrs = adj[curr];
                for (let k = 0; k < nbrs.length; k++) {
                    const n = nbrs[k];
                    if (!visited[n] && matrix[n] === col) {
                        visited[n] = 1;
                        q.push(n);
                    }
                }
            }

            components.push(comp);
        }

        return components;
    }

    /**
     * Sparse Pixels Heuristic: count frequencies of 2 competing colors in 6x6 window
     */
    static _countColorsInWindow(matrix, cols, rows, c, r, colA, colB) {
        let countA = 0, countB = 0;
        const minR = Math.max(0, r - 2), maxR = Math.min(rows - 1, r + 3);
        const minC = Math.max(0, c - 2), maxC = Math.min(cols - 1, c + 3);

        for (let y = minR; y <= maxR; y++) {
            const rOff = y * cols;
            for (let x = minC; x <= maxC; x++) {
                const val = matrix[rOff + x];
                if (val === colA) countA++;
                else if (val === colB) countB++;
            }
        }
        return { countA, countB };
    }

    /**
     * Direct Closed Path Solid Fill: For each component, fills enclosed interior pixels directly
     */
    static _fillClosedPaths(components, matrix, cols, rows, palette) {
        const padW = cols + 2, padH = rows + 2;

        for (let i = 0; i < components.length; i++) {
            const comp = components[i];
            // Only components with a large enough bounding box can enclose inner pixels
            const bw = comp.maxX - comp.minX + 1;
            const bh = comp.maxY - comp.minY + 1;
            if (bw < 3 || bh < 3 || comp.pixels.length < 6) continue;

            const visited = new Uint8Array(padW * padH);

            // Mark component pixels as barrier walls (value 2)
            for (let k = 0; k < comp.pixels.length; k++) {
                const p = comp.pixels[k];
                const px = (p % cols) + 1;
                const py = Math.floor(p / cols) + 1;
                visited[py * padW + px] = 2;
            }

            // Exterior 4-connected BFS starting from padded outside (0, 0)
            const q = [0];
            visited[0] = 1;
            let head = 0;

            while (head < q.length) {
                const curr = q[head++];
                const cx = curr % padW, cy = Math.floor(curr / padW);

                if (cx > 0) { const n = curr - 1; if (visited[n] === 0) { visited[n] = 1; q.push(n); } }
                if (cx < padW - 1) { const n = curr + 1; if (visited[n] === 0) { visited[n] = 1; q.push(n); } }
                if (cy > 0) { const n = curr - padW; if (visited[n] === 0) { visited[n] = 1; q.push(n); } }
                if (cy < padH - 1) { const n = curr + padW; if (visited[n] === 0) { visited[n] = 1; q.push(n); } }
            }

            // Any cell within component's bounding box not reached by exterior water is INSIDE closed path!
            for (let cy = comp.minY; cy <= comp.maxY; cy++) {
                const rOff = cy * cols;
                const padOff = (cy + 1) * padW;
                for (let cx = comp.minX; cx <= comp.maxX; cx++) {
                    if (visited[padOff + (cx + 1)] === 0) {
                        const cellIdx = rOff + cx;
                        const col = matrix[cellIdx];
                        // Never fill transparent pixels
                        if (col >= 0 && (!palette[col] || !palette[col].isTransparent)) {
                            comp.solidSet.add(cellIdx);
                        }
                    }
                }
            }
        }
    }

    /**
     * Build Layer Hierarchy: Assign each component to its INNERMOST enclosing parent
     */
    static _buildLayerHierarchy(components, compMap, matrix, cols, rows, threshold, palette) {
        const total = cols * rows;

        // Label map for neighbor contact analysis
        const labelGrid = new Int32Array(total);
        for (let i = 0; i < components.length; i++) {
            const comp = components[i];
            for (let k = 0; k < comp.pixels.length; k++) {
                labelGrid[comp.pixels[k]] = comp.id;
            }
        }

        // Calculate perimeter contacts
        for (let i = 0; i < components.length; i++) {
            const comp = components[i];
            for (let k = 0; k < comp.pixels.length; k++) {
                const p = comp.pixels[k];
                const cx = p % cols, cy = Math.floor(p / cols);

                const checkNeighbor = (nIdx, isBorder) => {
                    comp.totalPerimeter++;
                    if (isBorder) comp.perimeterNeighbors['border'] = (comp.perimeterNeighbors['border'] || 0) + 1;
                    else {
                        const nLab = labelGrid[nIdx];
                        if (nLab !== comp.id) {
                            comp.perimeterNeighbors[nLab] = (comp.perimeterNeighbors[nLab] || 0) + 1;
                        }
                    }
                };

                checkNeighbor(p - 1, cx === 0);
                checkNeighbor(p + 1, cx === cols - 1);
                checkNeighbor(p - cols, cy === 0);
                checkNeighbor(p + cols, cy === rows - 1);
            }
        }

        // For each child component, find the INNERMOST parent that encloses it
        for (let i = 0; i < components.length; i++) {
            const child = components[i];
            let bestParent = null;
            let smallestSize = Infinity;

            for (let j = 0; j < components.length; j++) {
                if (i === j) continue;
                const candidate = components[j];
                // Candidate must be strictly larger than child
                if (candidate.solidSet.size <= child.solidSet.size) continue;

                // Check how many of child's pixels are inside candidate's solidSet
                let insideCount = 0;
                for (let k = 0; k < child.pixels.length; k++) {
                    if (candidate.solidSet.has(child.pixels[k])) insideCount++;
                }

                if ((insideCount / child.pixels.length) >= threshold) {
                    if (candidate.solidSet.size < smallestSize) {
                        smallestSize = candidate.solidSet.size;
                        bestParent = candidate;
                    }
                }
            }

            if (bestParent) {
                this._attachChild(child, bestParent, compMap);
            }
        }

        // Ancestor-Assisted Peeling for interior sub-regions (e.g. chest/belly touching parent + ancestor)
        for (let i = 0; i < components.length; i++) {
            const child = components[i];
            if (child.parentId || child.totalPerimeter === 0) continue;

            let bestParent = null;
            let maxRatio = 0;

            for (const [nIdStr, count] of Object.entries(child.perimeterNeighbors)) {
                if (nIdStr === 'border' || nIdStr === '0') continue;
                const nComp = compMap.get(parseInt(nIdStr, 10));
                if (!nComp || nComp.solidSet.size <= child.solidSet.size) continue;

                let contactTotal = count;
                for (const [otherStr, otherCount] of Object.entries(child.perimeterNeighbors)) {
                    if (otherStr === nIdStr || otherStr === 'border' || otherStr === '0') continue;
                    const oComp = compMap.get(parseInt(otherStr, 10));
                    if (oComp && this._isAncestor(oComp, nComp, compMap)) {
                        contactTotal += otherCount;
                    }
                }

                const ratio = contactTotal / child.totalPerimeter;
                if (ratio >= threshold && ratio > maxRatio) {
                    maxRatio = ratio;
                    bestParent = nComp;
                }
            }

            if (bestParent) {
                this._attachChild(child, bestParent, compMap);
                // Also add child pixels into parent's solidSet so parent has solid underlay beneath child
                for (let k = 0; k < child.pixels.length; k++) {
                    bestParent.solidSet.add(child.pixels[k]);
                }
            }
        }

        // Final Depth calculation
        components.forEach(c => { c.depth = this._computeDepth(c, compMap); });
    }

    static _attachChild(child, parent, compMap) {
        if (!parent || child.parentId === parent.id) return;
        // Prevent cyclic attachment
        let curr = parent;
        while (curr) {
            if (curr.id === child.id) return;
            curr = curr.parentId ? compMap.get(curr.parentId) : null;
        }
        child.parentId = parent.id;
        if (!parent.children.includes(child.id)) parent.children.push(child.id);
    }

    static _isAncestor(candidate, comp, compMap) {
        let curr = comp.parentId ? compMap.get(comp.parentId) : null;
        while (curr) {
            if (curr.id === candidate.id) return true;
            curr = curr.parentId ? compMap.get(curr.parentId) : null;
        }
        return false;
    }

    static _computeDepth(comp, compMap) {
        if (!comp.parentId) return 0;
        const parent = compMap.get(comp.parentId);
        return 1 + (parent ? this._computeDepth(parent, compMap) : 0);
    }
}

if (typeof window !== 'undefined') {
    window.PixelArtTopology = PixelArtTopology;
}
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { PixelArtTopology };
}
