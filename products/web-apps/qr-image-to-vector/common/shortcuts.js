/**
 * shortcuts.js - Single Source of Truth for the Keyboard Shortcuts & Gestures list
 * Rendered by the footer Shortcuts dropdown and the Guide modal (last page).
 * Each entry: i18n key, English default text, and `combos` (alternatives; keys inside a combo are joined with "+").
 * 100% Vanilla JS
 */

(function () {
    'use strict';

    const SHORTCUTS = Object.freeze([
        { key: 'hud.newImage', text: 'New image', combos: [['Ctrl', 'V'], ['Drag']] },
        { key: 'hud.bbox', text: 'Move / Resize box', combos: [['Mouse']] },
        { key: 'hud.pan', text: 'Pan canvas', combos: [['Space', 'Drag'], ['Middle Drag']] },
        { key: 'hud.zoom', text: 'Zoom in / out', combos: [['Wheel']] },
        { key: 'hud.view', text: 'Toggle view mode', combos: [['Y']] },
        { key: 'hud.undo', text: 'Undo', combos: [['Ctrl', 'Z']] },
        { key: 'hud.redo', text: 'Redo', combos: [['Ctrl', 'Y']] }
    ]);

    const QrShortcuts = {
        getAll() {
            return SHORTCUTS;
        },

        /** Renders all shortcut rows into the container (labels are translated via data-i18n). */
        renderRows(container) {
            if (!container) return;
            container.innerHTML = SHORTCUTS.map(({ key, text, combos }) => {
                const keys = combos
                    .map((combo) => combo.map((k) => `<kbd>${k}</kbd>`).join('+'))
                    .join('<span class="shortcut-or">/</span>');
                return `<div class="shortcut-row"><span class="shortcut-desc" data-i18n="${key}">${text}</span><span class="shortcut-keys">${keys}</span></div>`;
            }).join('');
            window.QrImageToVectorI18n?.applyTranslations();
        }
    };

    if (typeof window !== 'undefined') window.QrShortcuts = QrShortcuts;
    if (typeof module !== 'undefined' && module.exports) module.exports = { QrShortcuts };
})();
