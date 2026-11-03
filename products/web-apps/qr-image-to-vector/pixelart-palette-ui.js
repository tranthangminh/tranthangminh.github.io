/**
 * pixelart-palette-ui.js - Palette card controller for Pixel Art: preset picker, swatch selection, recolor and merge
 * Owns the palette edit state; the handler asks it to quantize and to draw swatches.
 * 100% Vanilla JS
 */

class PixelArtPaletteUi {
    /**
     * @param {Object} dom - list, select, btnEdit, btnMerge, btnReset, colorInput, hint, colorsGroup
     * @param {Function} onChange - Called after any edit so the handler can re-render; receives {commit: boolean}
     */
    constructor(dom, onChange) {
        this.dom = dom;
        this.onChange = onChange;
        this.preset = '';
        this.edits = { merges: [], colors: {} };
        this.selected = null; // baseHex of the selected swatch
        this.mergeMode = false;
        this._bind();
        this._syncUi();
    }

    _tr(key, fallback) { return window.QrImageToVectorI18n ? window.QrImageToVectorI18n.t(key, fallback) : fallback; }

    _bind() {
        const { select, btnEdit, btnMerge, btnReset, colorInput, list } = this.dom;
        select?.addEventListener('change', () => {
            this.preset = select.value;
            this.edits = { merges: [], colors: {} };
            this._clearSelection();
            this.onChange({ commit: true });
        });
        btnEdit?.addEventListener('click', () => {
            if (!this.selected) return;
            const current = this._current(this.selected);
            if (colorInput && current) { colorInput.value = current.hex.toLowerCase(); colorInput.click(); }
        });
        colorInput?.addEventListener('input', () => {
            if (!this.selected) return;
            this.edits.colors[this.selected] = colorInput.value.toUpperCase();
            this.onChange({ commit: false });
        });
        colorInput?.addEventListener('change', () => this.onChange({ commit: true }));
        btnMerge?.addEventListener('click', () => {
            if (!this.selected) return;
            this.mergeMode = !this.mergeMode;
            this._syncUi();
        });
        btnReset?.addEventListener('click', () => {
            this.edits = { merges: [], colors: {} };
            this._clearSelection();
            this.onChange({ commit: true });
        });
        list?.addEventListener('click', (e) => {
            const swatch = e.target.closest('.pixelart-palette-swatch');
            if (swatch) this._onSwatch(swatch.dataset.base);
        });
    }

    _current(baseHex) { return (this.palette || []).find((p) => p.baseHex === baseHex); }

    _onSwatch(baseHex) {
        if (this.mergeMode && this.selected && baseHex !== this.selected) {
            this.edits.merges.push([this.selected, baseHex]);
            delete this.edits.colors[this.selected];
            this._clearSelection();
            this.onChange({ commit: true });
            return;
        }
        this.selected = baseHex;
        this.mergeMode = false;
        this.render(this.palette);
    }

    _clearSelection() { this.selected = null; this.mergeMode = false; }

    hasEdits() { return this.edits.merges.length > 0 || Object.keys(this.edits.colors).length > 0; }

    /** Quantize (auto or preset) then apply merges and recolors */
    quantize(cells, cols, rows, maxColors) {
        const preset = PixelArtPaletteEdit.PRESETS[this.preset];
        const quant = preset ? PixelArtQuantizer.quantizeToPalette(cells, preset.colors) : PixelArtQuantizer.quantize(cells, cols, rows, { maxColors });
        return PixelArtPaletteEdit.apply(quant.palette, quant.matrix, this.edits);
    }

    /** @param {Array<Object>} palette - Palette as displayed (after HSL adjust) */
    render(palette) {
        this.palette = palette || [];
        const { list } = this.dom;
        if (!list) return;
        if (this.selected && !this._current(this.selected)) this._clearSelection();
        list.textContent = '';
        for (const item of this.palette) {
            const swatch = document.createElement('button');
            swatch.type = 'button';
            swatch.className = 'pixelart-palette-swatch' + (item.baseHex === this.selected ? ' is-selected' : '');
            swatch.dataset.base = item.baseHex;
            swatch.style.backgroundColor = item.hex;
            swatch.title = `${item.hex} (${item.count.toLocaleString()} px)`;
            swatch.setAttribute('aria-label', this._tr('pixelart.swatchLabel', 'Color {hex}').replace('{hex}', item.hex));
            swatch.setAttribute('aria-pressed', String(item.baseHex === this.selected));
            list.appendChild(swatch);
        }
        this._syncUi();
    }

    _syncUi() {
        const { select, btnEdit, btnMerge, btnReset, hint, colorsGroup } = this.dom;
        if (select) select.value = this.preset;
        if (btnEdit) btnEdit.disabled = !this.selected;
        if (btnMerge) { btnMerge.disabled = !this.selected || (this.palette || []).length < 2; btnMerge.classList.toggle('is-active', this.mergeMode); }
        if (btnReset) btnReset.disabled = !this.hasEdits();
        if (hint) hint.textContent = this.mergeMode ? this._tr('pixelart.mergeHint', 'Pick the color to merge into') : '';
        colorsGroup?.classList.toggle('is-disabled', Boolean(this.preset));
    }

    getState() {
        return { preset: this.preset, merges: this.edits.merges.map((m) => [...m]), colors: { ...this.edits.colors } };
    }

    setState(state = {}) {
        this.preset = PixelArtPaletteEdit.PRESETS[state.preset] ? state.preset : '';
        this.edits = { merges: Array.isArray(state.merges) ? state.merges.map((m) => [...m]) : [], colors: { ...(state.colors || {}) } };
        this._clearSelection();
        this._syncUi();
    }

    reset() { this.setState({}); }
}

if (typeof window !== 'undefined') {
    window.PixelArtPaletteUi = PixelArtPaletteUi;
}
