/**
 * stage-exporter.js - Centralized SVG & PNG Exporter and Clipboard Manager
 * Shared across QR Convert, QR Generate, and 8-Bit Pixel Art modes.
 * Complies with _RULE-web-apps.md (< 500 lines)
 * 100% Vanilla JS
 */

class StageExporter {
    /**
     * Download current vector as SVG file
     * @param {string} svgString
     * @param {string} fileName
     * @param {string} modeSuffix
     * @param {Function} [onToast]
     */
    static downloadSvg(svgString, fileName = 'vector', modeSuffix = '', onToast) {
        if (!svgString) return;
        const blob = new Blob([svgString], { type: 'image/svg+xml;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        const suffix = modeSuffix ? `-${modeSuffix}` : '';
        link.download = `${fileName}${suffix}.svg`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
        if (onToast) {
            onToast(window.QrToVectorI18n ? window.QrToVectorI18n.t('actions.downloadSvg') : 'Đã tải file SVG!');
        }
    }

    /**
     * Download current vector rendered as high-res PNG
     * @param {string} svgString
     * @param {string} fileName
     * @param {string} modeSuffix
     * @param {Function} [onToast]
     * @param {number} [scale=1]
     */
    static downloadPng(svgString, fileName = 'vector', modeSuffix = '', onToast, scale = 1) {
        if (!svgString) return;
        const suffix = modeSuffix ? `-${modeSuffix}` : '';
        const targetName = `${fileName}${suffix}.png`;
        if (window.PngExporter) {
            window.PngExporter.exportSvg(svgString, targetName, scale)
                .then(() => {
                    if (onToast) {
                        onToast(window.QrToVectorI18n ? window.QrToVectorI18n.t('actions.downloadPng') : 'Đã tải ảnh PNG!');
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
                onToast(window.QrToVectorI18n ? window.QrToVectorI18n.t('actions.copied') : 'Đã sao chép mã SVG!');
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
