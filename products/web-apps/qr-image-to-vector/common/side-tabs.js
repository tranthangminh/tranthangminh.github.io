/**
 * side-tabs.js - Switches the merged side panel between Settings and Specs/History
 * Below 1250px the two panels share one grid cell; CSS shows one of them from the layout's data-side-tab.
 * 100% Vanilla JS, Local-First
 */

(function () {
    'use strict';

    const STORAGE_KEY = 'qr_image_to_vector_side_tab';
    const TABS = ['settings', 'info'];

    function init() {
        const layout = document.querySelector('.app-layout');
        const buttons = [...document.querySelectorAll('.side-tab')];
        if (!layout || !buttons.length) return;

        const show = (tab, persist) => {
            layout.dataset.sideTab = tab;
            buttons.forEach((b) => {
                const active = b.dataset.sideTab === tab;
                b.classList.toggle('is-active', active);
                b.setAttribute('aria-selected', String(active));
            });
            if (persist) {
                try { localStorage.setItem(STORAGE_KEY, tab); }
                catch (err) { console.warn('Failed to save side tab:', err); }
            }
        };

        let saved = 'settings';
        try { saved = localStorage.getItem(STORAGE_KEY) || saved; }
        catch (err) { console.warn('Failed to load side tab:', err); }

        show(TABS.includes(saved) ? saved : 'settings', false);
        buttons.forEach((b) => b.addEventListener('click', () => show(b.dataset.sideTab, true)));
    }

    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
    else init();
})();
