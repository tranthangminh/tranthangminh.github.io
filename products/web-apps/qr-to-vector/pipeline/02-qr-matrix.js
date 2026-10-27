/**
 * 02-qr-matrix.js - Mathematical QR Module Matrix Reconstructor
 * Pipeline Step 02: Generates a 100% pure, noise-free, distortion-free N x N module matrix.
 * Supports auto-elevation to Level H and center module reservation for logos.
 * Complies with _RULE-web-apps.md (< 500 lines)
 * 100% Vanilla JS, Mathematical Matrix Generator
 */

class QrMatrixGenerator {
    /**
     * Reconstruct pure boolean module matrix from decoded text payload
     * @param {string} text - Payload to encode
     * @param {Object} [options={}] - Options for ECC and logo clearance
     * @returns {{matrix: Uint8Array, cols: number, rows: number, text: string, logoBox: Object|null}}
     */
    static generate(text, options = {}) {
        if (!text || typeof text !== 'string') {
            throw new Error('QR payload text is required');
        }

        const {
            eccLevel = 'M',
            hasLogo = false,
            logoBlocks = 5
        } = typeof options === 'string' ? { eccLevel: options } : options;

        let qrcodeFn = (typeof window !== 'undefined' && window.qrcode) || (typeof qrcode !== 'undefined' ? qrcode : null);
        if (!qrcodeFn && typeof require === 'function') {
            try { qrcodeFn = require('./lib-qrcode.js'); }
            catch (err) { console.warn('CommonJS require lib-qrcode failed, relying on globals:', err); }
        }
        if (typeof qrcodeFn !== 'function') {
            throw new Error('QR matrix engine (lib-qrcode) is not initialized');
        }

        // Ensure 100% full UTF-8 Unicode support (properly encodes Vietnamese diacritics)
        if (qrcodeFn.stringToBytesFuncs && qrcodeFn.stringToBytesFuncs['UTF-8']) {
            qrcodeFn.stringToBytes = qrcodeFn.stringToBytesFuncs['UTF-8'];
        }

        // When a center logo is present, automatically enforce Level H (30% error correction)
        const effectiveEcc = hasLogo ? 'H' : (eccLevel || 'M');

        // typeNumber = 0: auto-detect smallest QR version (1 to 40) that fits text
        const qr = qrcodeFn(0, effectiveEcc);
        qr.addData(text);
        qr.make();

        const count = qr.getModuleCount();
        const totalModules = count * count;
        const matrix = new Uint8Array(totalModules);

        for (let r = 0; r < count; r++) {
            const rowOffset = r * count;
            for (let c = 0; c < count; c++) {
                matrix[rowOffset + c] = qr.isDark(r, c) ? 1 : 0;
            }
        }

        let logoBox = null;
        if (hasLogo && logoBlocks > 0) {
            // Safe clamp for logo area: max ~28% of module count
            const maxSafeK = Math.max(3, Math.floor(count * 0.28));
            const k = Math.min(Math.max(2, Math.round(logoBlocks)), maxSafeK);

            const startX = Math.floor((count - k) / 2);
            const startY = Math.floor((count - k) / 2);

            for (let r = startY; r < startY + k; r++) {
                for (let c = startX; c < startX + k; c++) {
                    matrix[r * count + c] = 0;
                }
            }

            logoBox = {
                startX,
                startY,
                k,
                count
            };
        }

        return {
            matrix,
            cols: count,
            rows: count,
            text,
            eccLevel: effectiveEcc,
            logoBox
        };
    }
}

if (typeof window !== 'undefined') {
    window.QrMatrixGenerator = QrMatrixGenerator;
}
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { QrMatrixGenerator };
}
