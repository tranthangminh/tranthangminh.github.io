/**
 * export-controls.js - Export card state: PNG scale and print size (mm)
 * Kept in its own localStorage key; these are preferences, not part of a history snapshot.
 * 100% Vanilla JS, Local-First
 */

(function () {
    'use strict';

    const STORAGE_KEY = 'qr_image_to_vector_export';
    const SCALES = [1, 2, 4];
    const MAX_MM = 2000;
    const state = { scale: 2, printMm: 0 };
    let dom = {};

    function load() {
        try {
            const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
            if (SCALES.includes(saved.scale)) state.scale = saved.scale;
            if (saved.printMm >= 0 && saved.printMm <= MAX_MM) state.printMm = saved.printMm;
        } catch (err) {
            console.warn('Failed to load export options:', err);
        }
    }

    function save() {
        try { localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); }
        catch (err) { console.warn('Failed to save export options:', err); }
    }

    function updateUi() {
        dom.scaleButtons.forEach((b) => b.classList.toggle('is-active', Number(b.dataset.scale) === state.scale));
        dom.mmInput.value = state.printMm || '';
        dom.scaleGroup.classList.toggle('is-disabled', state.printMm > 0);
    }

    window.ExportControls = {
        init(elements) {
            dom = elements;
            load();
            dom.scaleButtons.forEach((b) => b.addEventListener('click', () => { state.scale = Number(b.dataset.scale); save(); updateUi(); }));
            dom.mmInput.addEventListener('change', () => {
                const mm = parseFloat(dom.mmInput.value);
                state.printMm = Number.isFinite(mm) && mm > 0 ? Math.min(MAX_MM, Math.round(mm * 10) / 10) : 0;
                save(); updateUi();
            });
            updateUi();
        },

        /** @returns {{scale: number, printMm: number}} */
        getOptions() {
            return { scale: state.scale, printMm: state.printMm };
        }
    };
})();
