/**
 * Submodule 01_4: High-Precision Subscript & Superscript Detector
 * Location: script/01_4_sub_sup_detector.js
 * 
 * Responsibilities:
 * - Detects inline footnote references, math superscripts, and chemical subscripts.
 * - Enforces STRICT same-line vertical bounding (REG-18):
 *   - Superscript: Delta Y must be in [+0.15 * FS, +1.0 * FS].
 *   - Subscript: Delta Y must be in [-0.80 * FS, -0.12 * FS].
 *   - Prevents pulling distant footnote text from the bottom of the page up into the body text.
 */

const UNICODE_SUPERSCRIPT = /^[\u00B2\u00B3\u00B9\u2070-\u207F]+$/;
const UNICODE_SUBSCRIPT   = /^[\u2080-\u208F\u2090-\u209F]+$/;
const CANDIDATE_MARKER_REGEX = /^([0-9]{1,2}|[*†‡§¶#\u00B2\u00B3\u00B9\u2070-\u209F])$/;

function detectSubscriptsAndSuperscripts(rawTokens) {
    for (let i = 0; i < rawTokens.length; i++) {
        const c = rawTokens[i];
        const s = c.str.trim();
        if (!s) continue;

        let bestHost = null;
        let bestDist = Infinity;
        let bestType = null;

        for (let j = 0; j < rawTokens.length; j++) {
            if (i === j) continue;
            const h = rawTokens[j];
            if (!h.str.trim()) continue;

            const isHostCandidate = h.fs >= c.fs * 1.15;
            if (!isHostCandidate) continue;

            // Case A: Trailing Superscript (must be slightly above baseline within the same line)
            if (c.y >= h.y + (h.fs * 0.15) && c.y <= h.y + (h.fs * 1.0)) {
                const gap = c.x - (h.x + h.w);
                if (gap >= -1.5 && gap <= (h.fs * 0.45)) {
                    const dist = Math.hypot(gap, c.y - h.y);
                    if (dist < bestDist) {
                        bestDist = dist;
                        bestHost = h;
                        bestType = 'trailing_sup';
                    }
                }
            }

            // Case B: Trailing Subscript (must be slightly below baseline within the same line)
            if (c.y <= h.y - (h.fs * 0.12) && c.y >= h.y - (h.fs * 0.80)) {
                const gap = c.x - (h.x + h.w);
                if (gap >= -1.5 && gap <= (h.fs * 0.45)) {
                    const dist = Math.hypot(gap, h.y - c.y);
                    if (dist < bestDist) {
                        bestDist = dist;
                        bestHost = h;
                        bestType = 'trailing_sub';
                    }
                }
            }

            // Case C: Leading Footnote Marker in Bottom Notes Area
            if (c.y <= 120 && Math.abs(c.y - h.y) <= (h.fs * 0.65) && CANDIDATE_MARKER_REGEX.test(s)) {
                const gap = h.x - (c.x + c.w);
                if (gap >= -1.0 && gap <= (h.fs * 1.8)) {
                    const dist = Math.hypot(gap, c.y - h.y);
                    if (dist < bestDist) {
                        bestDist = dist;
                        bestHost = h;
                        bestType = 'leading_sup';
                    }
                }
            }
        }

        if (bestHost) {
            if (bestType === 'trailing_sup' || bestType === 'leading_sup') {
                c.isSuperscript = true;
                c.isLeading = (bestType === 'leading_sup');
                c.marker = s;
                c.bucketY = bestHost.bucketY !== undefined ? bestHost.bucketY : bestHost.y;
            } else if (bestType === 'trailing_sub') {
                c.isSubscript = true;
                c.bucketY = bestHost.bucketY !== undefined ? bestHost.bucketY : bestHost.y;
            }
        } else if (UNICODE_SUPERSCRIPT.test(s)) {
            c.isSuperscript = true;
            c.marker = s;
        } else if (UNICODE_SUBSCRIPT.test(s)) {
            c.isSubscript = true;
        }
    }
}

module.exports = {
    detectSubscriptsAndSuperscripts
};
