/**
 * 01-qr-scanner.js - QR Image Scanner & Extractor
 * Pipeline Step 01: Scans uploaded raster image, locates and decodes QR payload.
 * Complies with _RULE-web-apps.md (< 500 lines)
 * 100% Vanilla JS, Dual-Engine (Native BarcodeDetector + jsQR fallback)
 */

class QrScanner {
    /**
     * Scan image source and detect QR code
     * @param {HTMLImageElement|HTMLCanvasElement} imageSource
     * @returns {Promise<{success: boolean, text?: string, engine?: string, error?: string}>}
     */
    static async scan(imageSource) {
        if (!imageSource) {
            return { success: false, error: 'NO_IMAGE_PROVIDED' };
        }

        const width = imageSource.naturalWidth || imageSource.width || 0;
        const height = imageSource.naturalHeight || imageSource.height || 0;

        if (width === 0 || height === 0) {
            return { success: false, error: 'INVALID_IMAGE_DIMENSIONS' };
        }

        // Engine 1: Native BarcodeDetector (Chrome, Edge, Opera, Safari iOS 17+, Android)
        if (typeof window !== 'undefined' && 'BarcodeDetector' in window) {
            try {
                const detector = new window.BarcodeDetector({ formats: ['qr_code'] });
                const barcodes = await detector.detect(imageSource);
                if (barcodes && barcodes.length > 0 && barcodes[0].rawValue) {
                    return {
                        success: true,
                        text: barcodes[0].rawValue,
                        engine: 'BarcodeDetector',
                        corners: barcodes[0].cornerPoints || null
                    };
                }
            } catch (err) {
                console.warn('Native BarcodeDetector failed, falling back to jsQR:', err);
            }
        }

        // Engine 2: Pure JS jsQR Fallback (Works on Firefox, Desktop Safari, etc.)
        const jsQrFn = (typeof window !== 'undefined' && window.jsQR) || (typeof jsQR !== 'undefined' ? jsQR : null);
        if (typeof jsQrFn === 'function') {
            try {
                // Downscale large images (e.g. 1080p/4K screenshots) to max 800px for instant scanning without UI freeze
                const MAX_SCAN = 800;
                let scanW = width, scanH = height;
                if (scanW > MAX_SCAN || scanH > MAX_SCAN) {
                    const ratio = Math.min(MAX_SCAN / scanW, MAX_SCAN / scanH);
                    scanW = Math.max(1, Math.round(scanW * ratio));
                    scanH = Math.max(1, Math.round(scanH * ratio));
                }

                const canvas = document.createElement('canvas');
                canvas.width = scanW;
                canvas.height = scanH;
                const ctx = canvas.getContext('2d', { willReadFrequently: true });
                ctx.drawImage(imageSource, 0, 0, scanW, scanH);
                const imgData = ctx.getImageData(0, 0, scanW, scanH);

                const code = jsQrFn(imgData.data, imgData.width, imgData.height, {
                    inversionAttempts: 'attemptBoth'
                });

                if (code && code.data) {
                    return {
                        success: true,
                        text: code.data,
                        engine: 'jsQR',
                        location: code.location || null
                    };
                }
            } catch (err) {
                console.warn('jsQR scan error:', err);
            }
        }

        return {
            success: false,
            error: 'NO_QR_DETECTED'
        };
    }
}

if (typeof window !== 'undefined') {
    window.QrScanner = QrScanner;
}
