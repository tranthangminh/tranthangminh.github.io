/**
 * 06-qr-scan-check.js - Scan verification of the rendered QR vector
 * Rasterizes the SVG the way a phone camera would see it and checks it still decodes to the original payload.
 * 100% Vanilla JS, Local-First
 */

(function () {
    'use strict';

    const DEBOUNCE_MS = 400;
    const MIN_SIZE = 400, MAX_SIZE = 1400;
    let timer = 0, runId = 0;

    async function rasterize(svgString, size) {
        const url = URL.createObjectURL(new Blob([svgString], { type: 'image/svg+xml;charset=utf-8' }));
        try {
            const img = new Image();
            await new Promise((resolve, reject) => { img.onload = resolve; img.onerror = reject; img.src = url; });
            const canvas = document.createElement('canvas');
            canvas.width = canvas.height = size;
            const ctx = canvas.getContext('2d', { willReadFrequently: true });
            ctx.fillStyle = '#ffffff'; // scanners see a transparent code on a light backdrop
            ctx.fillRect(0, 0, size, size);
            ctx.drawImage(img, 0, 0, size, size);
            return canvas;
        } finally {
            URL.revokeObjectURL(url);
        }
    }

    async function verify(svgString, expectedText, svgWidth) {
        const size = Math.min(MAX_SIZE, Math.max(MIN_SIZE, Math.round(svgWidth) || MIN_SIZE));
        const result = await window.QrScanner.scan(await rasterize(svgString, size));
        return Boolean(result.success && result.text === expectedText);
    }

    function setState(badge, state) {
        const key = `scan.${state}`;
        badge.hidden = false;
        badge.dataset.state = state;
        badge.setAttribute('data-i18n', key);
        badge.textContent = window.QrImageToVectorI18n ? window.QrImageToVectorI18n.t(key) : state;
    }

    /** Debounced: the newest call wins, so dragging a slider only verifies the final render */
    function schedule(svgString, expectedText, badge, svgWidth) {
        if (!badge || !window.QrScanner || !expectedText) return;
        clearTimeout(timer);
        const id = ++runId;
        if (badge.hidden) setState(badge, 'checking');
        timer = setTimeout(async () => {
            let ok = false;
            try { ok = await verify(svgString, expectedText, svgWidth); }
            catch (err) { console.warn('Scan check failed:', err); }
            if (id === runId) setState(badge, ok ? 'ok' : 'fail');
        }, DEBOUNCE_MS);
    }

    function cancel(badge) {
        clearTimeout(timer);
        runId++;
        if (badge) badge.hidden = true;
    }

    window.QrScanCheck = { verify, schedule, cancel };
})();
