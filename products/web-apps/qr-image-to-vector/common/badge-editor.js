/**
 * badge-editor.js - Editable Value Badges for Range Sliders
 * Every `.control-value-badge` drives the range slider in its `.control-group`:
 *  - Click / Tab to type a number (units optional, out-of-range values snap to the nearest limit).
 *  - Mouse wheel over the badge steps the value (wheel up = increase).
 * Changes are applied through the slider's own `input` / `change` events, so every existing handler keeps working.
 * 100% Vanilla JS
 */

(function () {
    'use strict';

    const BADGE_SELECTOR = '.control-value-badge';
    const WHEEL_CHANGE_DELAY = 350;

    const changeTimers = new WeakMap();
    let editing = null;

    const getSlider = (badge) => badge.closest('.control-group')?.querySelector('input[type="range"]') || null;

    const getStep = (slider) => {
        const step = parseFloat(slider.step);
        return step > 0 ? step : 1;
    };

    /** Parses the first number in typed text ("50%", "12 px", "-30deg"); returns null when there is none. */
    function parseTyped(text) {
        const match = String(text).replace(',', '.').match(/[-+]?\d*\.?\d+/);
        return match ? parseFloat(match[0]) : null;
    }

    /** Snaps to the slider step grid and clamps into [min, max] (max rounded down to a valid step). */
    function clampToSlider(slider, value) {
        const min = parseFloat(slider.min), max = parseFloat(slider.max), step = getStep(slider);
        const lo = Number.isFinite(min) ? min : 0;
        const hi = Number.isFinite(max) ? max : 100;
        const hiAligned = lo + Math.floor((hi - lo) / step) * step;
        const snapped = lo + Math.round((value - lo) / step) * step;
        return Math.max(lo, Math.min(hiAligned, snapped));
    }

    function emit(slider, type) {
        slider.dispatchEvent(new Event(type, { bubbles: true }));
    }

    function setSliderValue(slider, value) {
        slider.value = value;
        emit(slider, 'input');
    }

    function scheduleChange(slider) {
        clearTimeout(changeTimers.get(slider));
        changeTimers.set(slider, setTimeout(() => emit(slider, 'change'), WHEEL_CHANGE_DELAY));
    }

    function startEdit(badge) {
        const slider = getSlider(badge);
        if (!slider || slider.disabled || (editing && editing.badge === badge)) return;
        finishEdit(true);
        editing = { badge, slider, original: badge.textContent };
        badge.textContent = String(slider.value);
        badge.contentEditable = 'true';
        badge.classList.add('is-editing');
        badge.focus();
        const range = document.createRange();
        range.selectNodeContents(badge);
        const selection = window.getSelection();
        selection.removeAllRanges();
        selection.addRange(range);
    }

    function finishEdit(commit) {
        if (!editing) return;
        const { badge, slider, original } = editing;
        editing = null;
        const typed = parseTyped(badge.textContent);
        badge.removeAttribute('contenteditable');
        badge.classList.remove('is-editing');
        window.getSelection()?.removeAllRanges();

        if (commit && typed !== null) {
            const next = clampToSlider(slider, typed);
            if (next !== Number(slider.value)) {
                setSliderValue(slider, next);
                scheduleChange(slider);
                return;
            }
        }
        badge.textContent = original;
    }

    function onWheel(e) {
        const badge = e.target.closest?.(BADGE_SELECTOR);
        if (!badge) return;
        const slider = getSlider(badge);
        if (!slider || slider.disabled) return;
        e.preventDefault();
        if (editing) finishEdit(true);

        const current = Number(slider.value);
        const next = clampToSlider(slider, current + (e.deltaY < 0 ? 1 : -1) * getStep(slider));
        if (next === current) return;
        setSliderValue(slider, next);
        scheduleChange(slider);
    }

    function onKeyDown(e) {
        if (!editing || e.target !== editing.badge) return;
        e.stopPropagation();
        if (e.key === 'Enter') {
            e.preventDefault();
            finishEdit(true);
        } else if (e.key === 'Escape') {
            e.preventDefault();
            finishEdit(false);
        }
    }

    function init() {
        document.querySelectorAll(BADGE_SELECTOR).forEach((badge) => { badge.tabIndex = 0; });

        document.addEventListener('mousedown', (e) => {
            const badge = e.target.closest?.(BADGE_SELECTOR);
            if (!badge || e.button !== 0 || (editing && editing.badge === badge)) return;
            e.preventDefault();
            startEdit(badge);
        });
        document.addEventListener('focusin', (e) => {
            const badge = e.target.closest?.(BADGE_SELECTOR);
            if (badge) startEdit(badge);
        });
        document.addEventListener('focusout', (e) => {
            if (editing && e.target === editing.badge) finishEdit(true);
        });
        document.addEventListener('keydown', onKeyDown, true);
        document.addEventListener('keyup', (e) => {
            if (editing && e.target === editing.badge) e.stopPropagation();
        }, true);
        document.addEventListener('wheel', onWheel, { passive: false });
    }

    if (typeof window !== 'undefined') {
        window.BadgeEditor = { init, parseTyped, clampToSlider };
        if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
        else init();
    }
    if (typeof module !== 'undefined' && module.exports) module.exports = { parseTyped, clampToSlider };
})();
