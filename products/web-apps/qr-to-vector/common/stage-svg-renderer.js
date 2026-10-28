/**
 * StageSvgRenderer - Unified Vector SVG Display Engine
 * Shared by QR to Vector, Pixel Art (8-Bit), and QR Generator
 */
(function() {
    'use strict';

    const StageSvgRenderer = {
        /**
         * Renders SVG markup into the target wrapper with exact aspect ratio.
         * @param {HTMLElement} wrapper - Target wrapper element (#svgDisplayWrapper)
         * @param {string} svgString - Valid SVG XML string
         * @param {number} width - Natural vector width
         * @param {number} height - Natural vector height
         * @returns {SVGElement|null}
         */
        render(wrapper, svgString, width, height) {
            if (!wrapper || !svgString) return null;
            wrapper.innerHTML = svgString;

            // Allow CSS aspect-ratio to compute width automatically while preserving locked height
            wrapper.style.width = 'auto';

            const w = Math.max(1, Math.round(width || 1));
            const h = Math.max(1, Math.round(height || 1));
            wrapper.style.setProperty('--svg-aspect-ratio', `${w} / ${h}`);

            return wrapper.querySelector('svg');
        },

        /**
         * Resets wrapper contents and CSS aspect ratio.
         * @param {HTMLElement} wrapper
         */
        clear(wrapper) {
            if (!wrapper) return;
            wrapper.innerHTML = '';
            wrapper.style.removeProperty('--svg-aspect-ratio');
            wrapper.style.width = '';
            wrapper.style.height = '';
        }
    };

    if (typeof window !== 'undefined') window.StageSvgRenderer = StageSvgRenderer;
    if (typeof module !== 'undefined' && module.exports) module.exports = { StageSvgRenderer };
})();
