/**
 * stage-exporter.js - Centralized SVG & PNG Exporter and Clipboard Manager
 * Shared across QR Convert, QR Generate, and 8-Bit Pixel Art modes.
 * Complies with _RULE-web-apps.md (< 500 lines)
 * 100% Vanilla JS
 */

class StageExporter {
    /** PNG resolution used when a print size (mm) is set */
    static PRINT_DPI = 300;

    /**
     * Give the SVG a physical size (mm) while keeping its viewBox, so it prints at that size in vector tools
     * @param {string} svgString
     * @param {number} mm - Width in millimetres; 0 or less leaves the SVG untouched
     * @returns {string}
     */
    static withPrintSize(svgString, mm) {
        if (!(mm > 0)) return svgString;
        const svgEl = new DOMParser().parseFromString(svgString, 'image/svg+xml').documentElement;
        const [, , vbW, vbH] = (svgEl.getAttribute('viewBox') || '').trim().split(/[\s,]+/).map(parseFloat);
        if (!(vbW > 0 && vbH > 0)) return svgString;
        svgEl.setAttribute('width', `${mm}mm`);
        svgEl.setAttribute('height', `${+(mm * vbH / vbW).toFixed(3)}mm`);
        return new XMLSerializer().serializeToString(svgEl);
    }

    /** Trigger a browser download for a Blob */
    static downloadBlob(blob, fileName) {
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = fileName;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
    }

    /**
     * Download current vector as SVG file
     * @param {string} svgString
     * @param {string} fileName
     * @param {string} modeSuffix
     * @param {Function} [onToast]
     * @param {number} [printMm=0] - Physical width in mm for the exported file (0 = keep pixel size)
     */
    static downloadSvg(svgString, fileName = 'vector', modeSuffix = '', onToast, printMm = 0) {
        if (!svgString) return;
        const suffix = modeSuffix ? `-${modeSuffix}` : '';
        StageExporter.downloadBlob(new Blob([StageExporter.withPrintSize(svgString, printMm)], { type: 'image/svg+xml;charset=utf-8' }), `${fileName}${suffix}.svg`);
        if (onToast) {
            onToast(window.QrImageToVectorI18n ? window.QrImageToVectorI18n.t('actions.downloadSvg') : 'SVG file downloaded!');
        }
    }

    /**
     * Download current vector rendered as high-res PNG
     * @param {string} svgString
     * @param {string} fileName
     * @param {string} modeSuffix
     * @param {Function} [onToast]
     * @param {number} [scale=1]
     * @param {number} [printMm=0] - Physical width in mm; when set the PNG is rendered at PRINT_DPI instead of using scale
     */
    static downloadPng(svgString, fileName = 'vector', modeSuffix = '', onToast, scale = 1, printMm = 0) {
        if (!svgString) return;
        const suffix = modeSuffix ? `-${modeSuffix}` : '';
        const targetName = `${fileName}${suffix}.png`;
        const targetWidthPx = printMm > 0 ? Math.round(printMm / 25.4 * StageExporter.PRINT_DPI) : 0;
        if (window.PngExporter) {
            window.PngExporter.exportSvg(svgString, targetName, scale, targetWidthPx)
                .then(() => {
                    if (onToast) {
                        onToast(window.QrImageToVectorI18n ? window.QrImageToVectorI18n.t('actions.downloadPng') : 'PNG image downloaded!');
                    }
                })
                .catch(err => console.error('PNG export error:', err));
        }
    }

    /**
     * Copy raw SVG markup to clipboard
     * @param {string} svgString
     * @param {Function} [onToast]
     */
    static copySvg(svgString, onToast) {
        if (!svgString) return;
        navigator.clipboard.writeText(svgString).then(() => {
            if (onToast) {
                onToast(window.QrImageToVectorI18n ? window.QrImageToVectorI18n.t('actions.copied') : 'SVG markup copied!');
            }
        }).catch(err => {
            console.error('Clipboard copy error:', err);
        });
    }
}

if (typeof window !== 'undefined') {
    window.StageExporter = StageExporter;
}
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { StageExporter };
}
