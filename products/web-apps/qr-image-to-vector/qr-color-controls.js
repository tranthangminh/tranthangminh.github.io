/**
 * qr-color-controls.js - QR Color Mode Controller (1 color / 2 colors / gradient)
 * Owns the color card state: eye color, gradient color, type, angle, per-block and eyes-follow switches.
 * 100% Vanilla JS, Local-First
 */

(function () {
    'use strict';

    const MODES = ['solid', 'duo', 'gradient'];
    const GRAD_TYPES = ['linear', 'radial'];
    const HEX = /^#[0-9A-F]{6}$/i;
    const LOW_CONTRAST_RATIO = 3;
    const DEFAULTS = Object.freeze({
        colorMode: 'solid',
        eyeColor: '#000000',
        gradColor: '#2563EB',
        gradType: 'linear',
        gradAngle: 45,
        gradPerShape: false,
        gradEyes: false
    });

    class QrColorControls {
        constructor() {
            this.state = Object.assign({}, DEFAULTS);
            this.dom = {};
            this.onChange = null;
        }

        init(elements = {}, onChange) {
            this.dom = elements;
            this.onChange = onChange;
            const { tabs = {}, typeButtons = {} } = elements;

            MODES.forEach((mode) => tabs[mode]?.addEventListener('click', () => this.update({ colorMode: mode })));
            GRAD_TYPES.forEach((type) => typeButtons[type]?.addEventListener('click', () => this.update({ gradType: type })));

            DomUtils.syncColorInputs(elements.eyeColorPicker, elements.eyeColorText, () => this.update({ eyeColor: elements.eyeColorPicker.value }));
            DomUtils.syncColorInputs(elements.gradColorPicker, elements.gradColorText, () => this.update({ gradColor: elements.gradColorPicker.value }));
            elements.btnSwapGradColors?.addEventListener('click', () => this.swapGradColors());
            elements.gradAngleSlider?.addEventListener('input', () => this.update({ gradAngle: parseInt(elements.gradAngleSlider.value, 10) }));
            elements.gradPerShapeToggle?.addEventListener('change', () => this.update({ gradPerShape: elements.gradPerShapeToggle.checked }));
            elements.gradEyesToggle?.addEventListener('change', () => this.update({ gradEyes: elements.gradEyesToggle.checked }));

            this.updateUi();
        }

        getOptions() {
            return Object.assign({}, this.state);
        }

        /** True when any color that paints modules is too close to the background for reliable scanning (WCAG contrast ratio) */
        hasLowContrast(fgColor, bgColor) {
            const { colorMode, eyeColor, gradColor, gradEyes } = this.state;
            const painted = [fgColor];
            if (colorMode === 'duo' || (colorMode === 'gradient' && !gradEyes)) painted.push(eyeColor);
            if (colorMode === 'gradient') painted.push(gradColor);
            const bgLum = this._luminance(bgColor);
            return painted.some((hex) => {
                const lum = this._luminance(hex);
                return (Math.max(lum, bgLum) + 0.05) / (Math.min(lum, bgLum) + 0.05) < LOW_CONTRAST_RATIO;
            });
        }

        _luminance(hex) {
            const n = parseInt(String(hex).replace('#', '').padEnd(6, '0').slice(0, 6), 16) || 0;
            const [r, g, b] = [(n >> 16) & 255, (n >> 8) & 255, n & 255].map((v) => {
                const s = v / 255;
                return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
            });
            return 0.2126 * r + 0.7152 * g + 0.0722 * b;
        }

        /** Loads saved settings; missing or invalid fields fall back to defaults (old history stays 1 color) */
        setOptions(saved = {}) {
            const s = Object.assign({}, DEFAULTS, saved);
            this.state = {
                colorMode: MODES.includes(s.colorMode) ? s.colorMode : DEFAULTS.colorMode,
                eyeColor: HEX.test(s.eyeColor) ? s.eyeColor : DEFAULTS.eyeColor,
                gradColor: HEX.test(s.gradColor) ? s.gradColor : DEFAULTS.gradColor,
                gradType: GRAD_TYPES.includes(s.gradType) ? s.gradType : DEFAULTS.gradType,
                gradAngle: Math.max(0, Math.min(360, parseInt(s.gradAngle, 10) || 0)),
                gradPerShape: Boolean(s.gradPerShape),
                gradEyes: Boolean(s.gradEyes)
            };
            this.updateUi();
        }

        /** Gradient color 1 is the main QR color (owned by the fg picker); color 2 is gradColor */
        swapGradColors() {
            const { fgColorPicker, fgColorText } = this.dom;
            if (!fgColorPicker) return;
            const first = fgColorPicker.value;
            fgColorPicker.value = this.state.gradColor;
            if (fgColorText) fgColorText.value = this.state.gradColor.toUpperCase();
            this.update({ gradColor: first });
        }

        update(patch) {
            Object.assign(this.state, patch);
            this.updateUi();
            if (this.onChange) this.onChange();
        }

        updateUi() {
            const { state, dom } = this;
            const isGradient = state.colorMode === 'gradient';
            const setDisabled = (el, disabled) => el?.classList.toggle('is-disabled', disabled);

            MODES.forEach((mode) => dom.tabs?.[mode]?.classList.toggle('is-active', state.colorMode === mode));
            GRAD_TYPES.forEach((type) => dom.typeButtons?.[type]?.classList.toggle('is-active', state.gradType === type));

            if (dom.fgColorLabel) {
                const key = isGradient ? 'controls.gradColor1' : 'controls.fgColor';
                dom.fgColorLabel.setAttribute('data-i18n', key);
                if (window.QrImageToVectorI18n) dom.fgColorLabel.textContent = window.QrImageToVectorI18n.t(key);
            }

            if (dom.eyeColorPicker) { dom.eyeColorPicker.value = state.eyeColor; dom.eyeColorText.value = state.eyeColor.toUpperCase(); }
            if (dom.gradColorPicker) { dom.gradColorPicker.value = state.gradColor; dom.gradColorText.value = state.gradColor.toUpperCase(); }
            if (dom.gradAngleSlider) dom.gradAngleSlider.value = state.gradAngle;
            if (dom.gradAngleBadge) dom.gradAngleBadge.textContent = `${state.gradAngle}°`;
            if (dom.gradPerShapeToggle) dom.gradPerShapeToggle.checked = state.gradPerShape;
            if (dom.gradEyesToggle) dom.gradEyesToggle.checked = state.gradEyes;

            const angleOff = !isGradient || state.gradType === 'radial';
            setDisabled(dom.eyeColorGroup, state.colorMode === 'solid' || (isGradient && state.gradEyes));
            setDisabled(dom.gradColorGroup, !isGradient);
            setDisabled(dom.gradTypeGroup, !isGradient);
            setDisabled(dom.gradAngleGroup, angleOff);
            setDisabled(dom.gradPerShapeGroup, !isGradient);
            setDisabled(dom.gradEyesGroup, !isGradient);
            if (dom.gradAngleSlider) dom.gradAngleSlider.disabled = angleOff;
        }
    }

    if (typeof window !== 'undefined') {
        window.QrColorControls = new QrColorControls();
    }
    if (typeof module !== 'undefined' && module.exports) {
        module.exports = { QrColorControls };
    }
})();
