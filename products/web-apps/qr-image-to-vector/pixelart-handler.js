/**
 * pixelart-handler.js - 8-Bit Pixel Art Bounding Box & Equal Grid Controller
 * Complies with _RULE-web-apps.md (< 500 lines) | 100% Vanilla JS
 */

/** Height reserved above the images for the source pane toolbar; keep equal to the extra `.split-pane-content` top padding in pixelart.css */
const PANE_TOOLBAR_HEIGHT = 32;

/** Keep the ?v= in step with the pipeline scripts the worker imports (it forwards the same query to them) */
const PIXELART_WORKER_URL = './qr-image-to-vector/pipeline/pixelart-worker.js?v=20261103-18';

class PixelArtHandler {
    constructor(appContext) {
        this.app = appContext;
        this.rawImage = null; this.rawImageData = null;
        this.bbox = { x: 0, y: 0, w: 0, h: 0 };
        this.cols = 16; this.rows = 16; this.activeCols = 16; this.activeRows = 16;
        this.maxGridCols = 256; this.maxGridRows = 256;
        this.lockSquare = true; this.cropToBbox = false; this.showGrid = true; this.currentZoom = 1; this.viewMode = 'dual';
        this.detectedColors = 16; this.bestColorCount = 16; this.maxColors = 16;
        this.vectorStyle = 'unified-connected'; this.vectorRadius = 0; this.vectorBlockSize = 10;
        this.vectorBlockGap = 0; this.vectorPadding = 0; this.transparentBg = false; this.bgColor = '#FFFFFF';
        this.layeredSolids = true; this.groupByColor = false; this.enclosureThreshold = 0.70;
        this.greyscale = false; this.hueShift = 0; this.satShift = 0; this.lightShift = 0; this.basePalette = null;
        this.currentPalette = []; this.currentMatrix = null; this.currentCells = null;
        this.undoStack = []; this.redoStack = []; this._isUndoing = false;
        this._renderTimer = null; this._resizeObserver = null;
        this._worker = null; this._workerUnavailable = false; this._workerJobId = 0; this._pendingJobs = new Map(); this._vectorSeq = 0;
        this._pngMeasureSeq = 0; this._pngMeasureTimer = null; this._lastPngSizeStr = '';
        this._initDom(); this._bindEvents(); this._bindColorAdjustEvents();
        this.paletteUi = new PixelArtPaletteUi({
            list: this.paletteList, select: this.paletteSelect, btnEdit: this.btnPaletteEdit, btnMerge: this.btnPaletteMerge, btnReset: this.btnPaletteReset,
            colorInput: this.paletteColorInput, hint: this.paletteHint, colorsGroup: this.colorsSlider?.closest('.control-group')
        }, ({ commit }) => {
            this.processQuantizeAndDebouncedRender();
            if (commit) { this._notifySettingsChanged(); this.pushUndoSnapshot(); }
        });
    }

    _tr(key, fallback) { return window.QrImageToVectorI18n ? window.QrImageToVectorI18n.t(key, fallback) : fallback; }

    _initDom() {
        const $ = (id) => document.getElementById(id);
        const map = { stagePreviewArea: 'stagePreviewArea', settingsGroup: 'pixelArtSettingsGroup', dualWrapper: 'stageDualWrapper', sourcePane: 'dualPaneSource', divider: 'dualPaneDivider', vectorPane: 'dualPaneVector', vectorHeader: 'dualVectorHeader', sourceDimBadge: 'sourceDimBadge', vectorDimBadge: 'vectorDimBadge', gridContainer: 'gridCanvasContainer', svgWrapper: 'svgDisplayWrapper', gridCanvas: 'pixelArtGridCanvas', overlayCanvas: 'pixelArtOverlayCanvas', btnAutoBbox: 'btnPixelArtAutoBbox', btnFullBbox: 'btnPixelArtFullBbox', colsSlider: 'pixelArtColsSlider', colsBadge: 'pixelArtColsBadge', btnColsMinus: 'btnColsMinus', btnColsPlus: 'btnColsPlus', rowsSlider: 'pixelArtRowsSlider', rowsBadge: 'pixelArtRowsBadge', btnRowsMinus: 'btnRowsMinus', btnRowsPlus: 'btnRowsPlus', lockSquareToggle: 'pixelArtLockSquareToggle', cropToBboxToggle: 'pixelArtCropToBboxToggle', btnGridToggle: 'btnPixelArtGridToggle', toolbarLeft: 'pixelArtToolbarLeft', toolbarRight: 'pixelArtToolbarRight', btnAutoGrid: 'btnPixelArtAutoGrid', colorsSlider: 'pixelArtColorsSlider', colorsBadge: 'pixelArtColorsBadge', btnColorsMinus: 'btnColorsMinus', btnColorsPlus: 'btnColorsPlus', groupByColorToggle: 'pixelArtGroupByColorToggle', paletteList: 'pixelArtPaletteList', btnAutoPalette: 'btnPixelArtAutoPalette', radiusSlider: 'pixelArtRadiusSlider', radiusBadge: 'pixelArtRadiusBadge', blockSizeSlider: 'pixelArtBlockSizeSlider', blockSizeBadge: 'pixelArtBlockSizeBadge', blockGapSlider: 'pixelArtGapSlider', blockGapBadge: 'pixelArtGapBadge', layeredToggle: 'pixelArtLayeredToggle', enclosureGroup: 'pixelArtEnclosureGroup', enclosureSlider: 'pixelArtEnclosureSlider', enclosureBadge: 'pixelArtEnclosureBadge', btnToggleViewMode: 'btnToggleViewMode', shortcutsHud: 'stageShortcutsHud', btnToggleShortcutsHud: 'btnToggleShortcutsHud', statsCard: 'pixelArtStatsCard', paStatSource: 'paStatSource', paStatBbox: 'paStatBbox', paStatGrid: 'paStatGrid', paStatColors: 'paStatColors', paStatPixelSize: 'paStatPixelSize', paStatExportDim: 'paStatExportDim', paStatSvgDim: 'paStatSvgDim', paStatSvgSize: 'paStatSvgSize', paStatPngSize: 'paStatPngSize', btnFloatingAutoGrid: 'btnBboxFloatingAutoGrid', greyscaleToggle: 'pixelArtGreyscaleToggle', hueSlider: 'pixelArtHueSlider', hueBadge: 'pixelArtHueBadge', hueGroup: 'pixelArtHueGroup', satSlider: 'pixelArtSatSlider', satBadge: 'pixelArtSatBadge', satGroup: 'pixelArtSatGroup', lightSlider: 'pixelArtLightSlider', lightBadge: 'pixelArtLightBadge', btnResetColorAdjust: 'btnPixelArtResetColorAdjust', paletteSelect: 'pixelArtPaletteSelect', btnPaletteEdit: 'btnPaletteEdit', btnPaletteMerge: 'btnPaletteMerge', btnPaletteReset: 'btnPaletteReset', paletteColorInput: 'pixelArtSwatchColor', paletteHint: 'pixelArtPaletteHint' };
        for (const [k, v] of Object.entries(map)) this[k] = $(v);
    }

    _bindEvents() {
        const on = (el, ev, fn) => el?.addEventListener(ev, fn);
        on(this.btnAutoBbox, 'click', () => this.autoDetectBbox(true));
        on(this.btnFullBbox, 'click', () => this.setFullBbox(true));
        on(this.btnFloatingAutoGrid, 'click', () => { this.autoEstimateGrid(true); this._hideFloatingAutoGridBtn(); });
        on(this.colsSlider, 'input', () => this.setCols(parseInt(this.colsSlider.value, 10) || 16));
        on(this.btnColsMinus, 'click', () => { this.setCols(this.cols - 1); this.pushUndoSnapshot(); }); on(this.btnColsPlus, 'click', () => { this.setCols(this.cols + 1); this.pushUndoSnapshot(); });
        on(this.rowsSlider, 'input', () => this.setRows(parseInt(this.rowsSlider.value, 10) || 16));
        on(this.btnRowsMinus, 'click', () => { this.setRows(this.rows - 1); this.pushUndoSnapshot(); }); on(this.btnRowsPlus, 'click', () => { this.setRows(this.rows + 1); this.pushUndoSnapshot(); });
        on(this.lockSquareToggle, 'change', () => { this.lockSquare = this.lockSquareToggle.checked; if (this.lockSquare) this._syncLockedRowsFromCols(); this._notifySettingsChanged(); this.pushUndoSnapshot(); });
        on(this.cropToBboxToggle, 'change', () => { this.cropToBbox = this.cropToBboxToggle.checked; this._updateGridLimits(); if (this.lockSquare) this._syncLockedRowsFromCols(); this._syncContentDimensions(); this.processGridAndSample(); this._notifySettingsChanged(); this.pushUndoSnapshot(); });
        on(this.btnGridToggle, 'click', () => { this.showGrid = !this.showGrid; this._syncGridToggleUi(); this.renderGridCanvas(); this._notifySettingsChanged(); this.pushUndoSnapshot(); });
        on(this.btnAutoGrid, 'click', () => this.autoEstimateGrid(true));
        on(this.colorsSlider, 'input', () => this.setMaxColors(parseInt(this.colorsSlider.value, 10) || 16));
        on(this.btnColorsMinus, 'click', () => { this.setMaxColors(this.maxColors - 1); this.pushUndoSnapshot(); }); on(this.btnColorsPlus, 'click', () => { this.setMaxColors(this.maxColors + 1); this.pushUndoSnapshot(); });
        on(this.groupByColorToggle, 'change', () => { this.groupByColor = Boolean(this.groupByColorToggle.checked); this.renderVector(); this._notifySettingsChanged(); this.pushUndoSnapshot(); });
        on(this.btnAutoPalette, 'click', () => this.autoDetectPaletteOnly());
        on(this.btnToggleViewMode, 'click', () => this.toggleViewMode());

        on(document.getElementById('btnUndo'), 'click', () => this.undo()); on(document.getElementById('btnRedo'), 'click', () => this.redo());
        [this.colsSlider, this.rowsSlider, this.colorsSlider, this.radiusSlider, this.blockSizeSlider, this.blockGapSlider, this.enclosureSlider].forEach(s => on(s, 'change', () => this.pushUndoSnapshot()));

        window.addEventListener('keydown', (e) => {
            if (this.dualWrapper && !this.dualWrapper.classList.contains('is-split-screen')) return;
            if (this._isTextEntry(e.target)) return;
            if (e.ctrlKey || e.metaKey) {
                if (e.key === 'z' || e.key === 'Z') { e.preventDefault(); if (e.shiftKey) this.redo(); else this.undo(); return; }
                if (e.key === 'y' || e.key === 'Y') { e.preventDefault(); this.redo(); return; }
            }
            if (e.key === 'y' || e.key === 'Y') { e.preventDefault(); this.toggleViewMode(); }
        });

        on(this.radiusSlider, 'input', () => { this.vectorRadius = parseInt(this.radiusSlider.value, 10) || 0; if (this.radiusBadge) this.radiusBadge.textContent = `${this.vectorRadius}%`; this.debouncedRenderVector(); this._notifySettingsChanged(); });
        on(this.blockSizeSlider, 'input', () => { this.vectorBlockSize = parseInt(this.blockSizeSlider.value, 10) || 10; if (this.blockSizeBadge) this.blockSizeBadge.textContent = `${this.vectorBlockSize}px`; this.debouncedRenderVector(); this._notifySettingsChanged(); });
        on(this.blockGapSlider, 'input', () => { this.vectorBlockGap = parseInt(this.blockGapSlider.value, 10) || 0; if (this.blockGapBadge) this.blockGapBadge.textContent = `${this.vectorBlockGap}%`; this._syncLayeredUi(); this.debouncedRenderVector(); this._notifySettingsChanged(); });
        on(this.layeredToggle, 'change', () => {
            this.layeredSolids = this.layeredToggle.checked;
            this._syncLayeredUi();
            this.debouncedRenderVector(); this._notifySettingsChanged(); this.pushUndoSnapshot();
        });
        on(this.enclosureSlider, 'input', () => { const pct = parseInt(this.enclosureSlider.value, 10) || 70; this.enclosureThreshold = pct / 100; if (this.enclosureBadge) this.enclosureBadge.textContent = `${pct}%`; this.debouncedRenderVector(); this._notifySettingsChanged(); });

        if (window.PixelArtGridCanvas?.attachBboxController) {
            window.PixelArtGridCanvas.attachBboxController({
                overlayCanvas: this.overlayCanvas, gridCanvas: this.gridCanvas, getImage: () => this.rawImage, getBbox: () => this.bbox,
                setBbox: (b) => { this.bbox = b; },
                onBboxChange: () => { this._hideFloatingAutoGridBtn(); this._updateGridLimits(); this.renderGridCanvas(); this.debouncedSampleAndRender(); },
                onBboxCommit: () => { this._updateGridLimits(); if (!this._isRestoring && this.lockSquare) this._syncLockedRowsFromCols(); this.processGridAndSample(); this._notifySettingsChanged(); this._showFloatingAutoGridBtn(); this.pushUndoSnapshot(); }
            });
        }

        if (typeof MutationObserver !== 'undefined' && this.gridContainer) {
            new MutationObserver(() => this._schedulePositionToolbar()).observe(this.gridContainer, { attributes: true, attributeFilter: ['style'] });
        }

        if (typeof ResizeObserver !== 'undefined' && this.sourcePane) {
            this._resizeObserver = new ResizeObserver(() => {
                if (this.dualWrapper?.classList.contains('is-split-screen')) this._syncContentDimensions();
                this._schedulePositionToolbar();
            });
            this._resizeObserver.observe(this.sourcePane);
        }
    }

    /** True only for fields where typing owns the keyboard; sliders, switches and buttons must not block Ctrl+Z / Y. */
    _isTextEntry(el) {
        if (!el) return false;
        if (el.isContentEditable || el.tagName === 'TEXTAREA' || el.tagName === 'SELECT') return true;
        return el.tagName === 'INPUT' && !['range', 'checkbox', 'radio', 'button', 'color'].includes(el.type);
    }

    _syncLayeredUi() {
        const flatBlocks = this.vectorBlockGap > 0, layeredOff = flatBlocks || !this.layeredSolids;
        this.layeredToggle?.closest('.control-group')?.classList.toggle('is-disabled', flatBlocks);
        if (this.enclosureGroup) this.enclosureGroup.classList.toggle('is-disabled', layeredOff);
        if (this.enclosureSlider) this.enclosureSlider.disabled = layeredOff;
    }

    _bindColorAdjustEvents() {
        const on = (el, ev, fn) => el?.addEventListener(ev, fn);
        on(this.greyscaleToggle, 'change', () => { this.greyscale = this.greyscaleToggle.checked; this._syncColorAdjustUi(); this._applyColorAdjust(); this.pushUndoSnapshot(); });
        [['hueSlider', 'hueShift'], ['satSlider', 'satShift'], ['lightSlider', 'lightShift']].forEach(([slider, key]) => {
            on(this[slider], 'input', () => { this[key] = parseInt(this[slider].value, 10) || 0; this._syncColorAdjustUi(); this._applyColorAdjust(); });
            on(this[slider], 'change', () => this.pushUndoSnapshot());
        });
        on(this.btnResetColorAdjust, 'click', () => { this._resetColorAdjustState(); this._syncColorAdjustUi(); this._applyColorAdjust(); this.pushUndoSnapshot(); });
    }

    _resetColorAdjustState() { this.greyscale = false; this.hueShift = 0; this.satShift = 0; this.lightShift = 0; }

    _syncColorAdjustUi() {
        if (this.greyscaleToggle) this.greyscaleToggle.checked = this.greyscale;
        if (this.hueSlider) this.hueSlider.value = this.hueShift;
        if (this.hueBadge) this.hueBadge.textContent = `${this.hueShift}°`;
        if (this.satSlider) this.satSlider.value = this.satShift;
        if (this.satBadge) this.satBadge.textContent = `${this.satShift}`;
        if (this.lightSlider) this.lightSlider.value = this.lightShift;
        if (this.lightBadge) this.lightBadge.textContent = `${this.lightShift}`;
        [this.hueGroup, this.satGroup].forEach(g => g?.classList.toggle('is-disabled', this.greyscale));
        if (this.hueSlider) this.hueSlider.disabled = this.greyscale;
        if (this.satSlider) this.satSlider.disabled = this.greyscale;
    }

    _adjustedPalette(base) {
        return PixelArtColorAdjust.apply(base, { greyscale: this.greyscale, hue: this.hueShift, saturation: this.satShift, lightness: this.lightShift });
    }

    _applyColorAdjust() {
        if (!this.basePalette) return;
        this.currentPalette = this._adjustedPalette(this.basePalette); this._renderPaletteSwatches();
        this.debouncedRenderVector(); this._notifySettingsChanged();
    }

    _showFloatingAutoGridBtn() {
        if (!this.btnFloatingAutoGrid || !this.rawImage) return;
        clearTimeout(this._floatingBtnTimer);
        this.btnFloatingAutoGrid.style.display = 'inline-flex';
        void this.btnFloatingAutoGrid.offsetWidth;
        this.btnFloatingAutoGrid.classList.add('is-visible');
        this._floatingBtnTimer = setTimeout(() => this._hideFloatingAutoGridBtn(), 5000);
    }

    _hideFloatingAutoGridBtn() {
        clearTimeout(this._floatingBtnTimer);
        if (!this.btnFloatingAutoGrid) return;
        this.btnFloatingAutoGrid.classList.remove('is-visible');
        setTimeout(() => { if (!this.btnFloatingAutoGrid?.classList.contains('is-visible')) this.btnFloatingAutoGrid.style.display = 'none'; }, 250);
    }

    _notifySettingsChanged() {
        if (this._isRestoring) return;
        if (window.HistoryManager?.updateActiveSettings) window.HistoryManager.updateActiveSettings(this.getSettingsSnapshot());
    }

    _onBboxChanged() {
        this._updateGridLimits();
        if (!this._isRestoring && this.lockSquare) this._syncLockedRowsFromCols();
        this._syncContentDimensions(); this.processGridAndSample(); this._notifySettingsChanged();
    }

    _updateGridLimits() {
        if (!this.rawImage) return;
        const imgW = this.rawImage.naturalWidth || this.rawImage.width || 32, imgH = this.rawImage.naturalHeight || this.rawImage.height || 32;
        const bw = Math.max(1, this.bbox?.w || imgW), bh = Math.max(1, this.bbox?.h || imgH), BASE = 256;
        if (this.cropToBbox) {
            this.maxGridCols = (bw >= bh) ? BASE : Math.max(1, Math.round(BASE * (bw / bh)));
            this.maxGridRows = (bw >= bh) ? Math.max(1, Math.round(BASE * (bh / bw))) : BASE;
        } else {
            this.maxGridCols = Math.max(1, Math.min(BASE, Math.floor(BASE * (bw / imgW))));
            this.maxGridRows = Math.max(1, Math.min(BASE, Math.floor(BASE * (bh / imgH))));
        }
        if (this.colsSlider) this.colsSlider.max = this.maxGridCols;
        if (this.rowsSlider) this.rowsSlider.max = this.maxGridRows;
        let clamped = false;
        if (this.cols > this.maxGridCols) { this.cols = this.maxGridCols; clamped = true; }
        if (this.rows > this.maxGridRows) { this.rows = this.maxGridRows; clamped = true; }
        if (!this._isRestoring && this.lockSquare) this._syncLockedRowsFromCols();
        this._updateColsBadge(); this._updateRowsBadge();
        if (clamped && !this._isRestoring && !this._isUndoing && this.app?.showToast) {
            this.app.showToast(this._tr('messages.gridClamped', 'Grid automatically reduced to a safe size (≤ 256 cells) to prevent memory overflow'));
        }
    }

    autoDetectBbox(reprocess = true) {
        if (!this.rawImageData) return;
        this.bbox = PixelArtGridDetector.detectObjectBoundingBox(this.rawImageData);
        if (reprocess) { this._updateGridLimits(); this.autoEstimateGrid(false); this._syncContentDimensions(); this.processGridAndSample(); this.pushUndoSnapshot(); }
    }

    setFullBbox(reprocess = true) {
        if (!this.rawImage) return;
        this.bbox = { x: 0, y: 0, w: this.rawImage.naturalWidth || this.rawImage.width, h: this.rawImage.naturalHeight || this.rawImage.height };
        if (reprocess) { this._updateGridLimits(); this.autoEstimateGrid(false); this._syncContentDimensions(); this.processGridAndSample(); this.pushUndoSnapshot(); }
    }

    autoEstimateGrid(reprocess = true) {
        if (!this.rawImageData) return;
        this._updateGridLimits();
        const est = PixelArtGridDetector.estimateGridForBBox(this.rawImageData, this.bbox);
        this.cols = Math.max(1, Math.min(this.maxGridCols, est.cols));
        this.rows = Math.max(1, Math.min(this.maxGridRows, est.rows));
        if (!this._isRestoring && this.lockSquare) this._syncLockedRowsFromCols();
        this._updateColsBadge(); this._updateRowsBadge();
        if (reprocess) { this.processGridAndSample(); this.pushUndoSnapshot(); }
    }

    setCols(val, triggerRender = true) {
        this.cols = Math.max(1, Math.min(this.maxGridCols || 256, val));
        this.activeCols = this.cols; this._updateColsBadge();
        if (!this._isRestoring && this.lockSquare) this._syncLockedRowsFromCols();
        if (triggerRender) this.debouncedSampleAndRender();
        this._notifySettingsChanged();
    }

    setRows(val, triggerRender = true) {
        this.rows = Math.max(1, Math.min(this.maxGridRows || 256, val));
        this.activeRows = this.rows; this._updateRowsBadge();
        if (this.lockSquare) this._syncLockedColsFromRows();
        if (triggerRender) this.debouncedSampleAndRender();
        this._notifySettingsChanged();
    }

    _syncLockedRowsFromCols() {
        const bw = this.bbox?.w || (this.rawImage?.naturalWidth || 1), bh = this.bbox?.h || (this.rawImage?.naturalHeight || 1);
        if (!bw || !bh) return;
        this.rows = Math.max(1, Math.min(this.maxGridRows || 256, Math.round(this.cols * (bh / bw))));
        this.activeRows = this.rows; this._updateRowsBadge();
    }

    _syncLockedColsFromRows() {
        const bw = this.bbox?.w || (this.rawImage?.naturalWidth || 1), bh = this.bbox?.h || (this.rawImage?.naturalHeight || 1);
        if (!bw || !bh) return;
        this.cols = Math.max(1, Math.min(this.maxGridCols || 256, Math.round(this.rows * (bw / bh))));
        this.activeCols = this.cols; this._updateColsBadge();
    }

    _updateColsBadge() { if (this.colsSlider) { this.colsSlider.max = this.maxGridCols || 256; this.colsSlider.value = this.cols; } if (this.colsBadge) this.colsBadge.textContent = `${this.cols}`; }
    _updateRowsBadge() { if (this.rowsSlider) { this.rowsSlider.max = this.maxGridRows || 256; this.rowsSlider.value = this.rows; } if (this.rowsBadge) this.rowsBadge.textContent = `${this.rows}`; }

    _setupImageBuffer(img) {
        this.rawImage = img;
        const w = img.naturalWidth || img.width, h = img.naturalHeight || img.height, canvas = document.createElement('canvas');
        canvas.width = w; canvas.height = h;
        const ctx = canvas.getContext('2d');
        ctx.imageSmoothingEnabled = false; ctx.drawImage(img, 0, 0, w, h);
        this.rawImageData = ctx.getImageData(0, 0, w, h);
    }

    loadImage(img) {
        this.undoStack = []; this.redoStack = [];
        this._resetColorAdjustState(); this._syncColorAdjustUi(); this.paletteUi.reset();
        this._setupImageBuffer(img);
        this.autoDetectBbox(false); this._updateGridLimits();
        this.autoEstimateGrid(false); this._syncContentDimensions();
        this.processGridAndSample(); this.autoDetectPaletteOnly(true);
        this.pushUndoSnapshot();
    }

    onZoomChange(scale) {
        this.currentZoom = scale || 1;
        this.renderGridCanvas();
    }

    _sampleCells() {
        if (!this.rawImageData) return;
        if (this.cropToBbox) {
            this.currentCells = PixelArtGridDetector.sampleCellsFromBBox(this.rawImageData, this.bbox, this.cols, this.rows).cells;
            this.activeCols = this.cols; this.activeRows = this.rows;
        } else {
            const res = PixelArtGridDetector.sampleCellsFullProjected(this.rawImageData, this.bbox, this.cols, this.rows);
            this.currentCells = res.cells; this.activeCols = res.cols; this.activeRows = res.rows;
        }
        if (this.sourceDimBadge) this.sourceDimBadge.textContent = `${this.activeCols} × ${this.activeRows} cells`;
    }

    _updatePaletteMetrics(resetToBest = false) {
        if (!this.currentCells || !window.PixelArtQuantizer?.detectOptimalSettings) return;
        const opt = window.PixelArtQuantizer.detectOptimalSettings(this.currentCells, this.activeCols || this.cols, this.activeRows || this.rows);
        this.detectedColors = opt.totalDetectedColors || 16; this.bestColorCount = opt.optimalColors || this.detectedColors;
        this.maxColors = resetToBest ? this.bestColorCount : Math.max(1, Math.min(this.detectedColors, this.maxColors || this.bestColorCount));
        this._updateColorsBadge();
    }

    autoDetectPaletteOnly(skipResample = false) {
        if (!skipResample) this._sampleCells();
        this._updatePaletteMetrics(true);
        this.processQuantizeAndDebouncedRender();
        if (!skipResample) this.pushUndoSnapshot();
    }

    setMaxColors(val, triggerRender = true) {
        this.maxColors = Math.max(1, Math.min(this.detectedColors || 16, val));
        this._updateColorsBadge();
        if (triggerRender) this.processQuantizeAndDebouncedRender();
        this._notifySettingsChanged();
    }

    _updateColorsBadge() {
        if (this.colorsSlider) { this.colorsSlider.min = 1; this.colorsSlider.max = this.detectedColors || 16; this.colorsSlider.value = this.maxColors; }
        if (this.colorsBadge) {
            const det = this.detectedColors || 16, best = this.bestColorCount || det;
            this.colorsBadge.textContent = `${this.maxColors}/${det}\n${this._tr('pixelart.bestTag', 'Best')}:${best}`;
        }
    }

    debouncedSampleAndRender() { clearTimeout(this._renderTimer); this._renderTimer = setTimeout(() => this.processGridAndSample(), 60); }
    processGridAndSample() { this._sampleCells(); this.renderGridCanvas(); this._updatePaletteMetrics(false); this.processQuantizeAndDebouncedRender(); }

    processQuantizeAndDebouncedRender() {
        const c = this.activeCols || this.cols, r = this.activeRows || this.rows;
        if (!this.currentCells || c === 0) return;
        const quant = this.paletteUi.quantize(this.currentCells, c, r, this.maxColors);
        this.basePalette = quant.palette; this.currentPalette = this._adjustedPalette(quant.palette);
        this.currentMatrix = quant.matrix; this._renderPaletteSwatches();
        const activeColors = quant.palette.filter(p => !p.isTransparent).length;
        if (this.vectorDimBadge) this.vectorDimBadge.textContent = `${activeColors} ${this._tr('units.colors', 'colors')} (${c * this.vectorBlockSize}×${r * this.vectorBlockSize}px)`;
        this.debouncedRenderVector();
    }

    debouncedRenderVector() { clearTimeout(this._renderTimer); this._renderTimer = setTimeout(() => this.renderVector(), 80); }

    _renderPaletteSwatches() { this.paletteUi?.render(this.currentPalette); }

    renderVector() {
        const c = this.activeCols || this.cols, r = this.activeRows || this.rows;
        if (!this.currentMatrix || !this.currentPalette) return;
        const style = (this.vectorBlockGap > 0) ? 'blocks' : 'unified-connected';
        const options = {
            style, radius: this.vectorRadius, blockSize: this.vectorBlockSize,
            outerPadding: this.vectorPadding, blockGap: this.vectorBlockGap, bgColor: this.bgColor,
            transparentBg: this.transparentBg, layeredSolids: this.layeredSolids && !(this.vectorBlockGap > 0), groupByColor: Boolean(this.groupByColor), enclosureThreshold: this.enclosureThreshold
        };
        const seq = ++this._vectorSeq;
        // A newer render supersedes this one, so a slow result never overwrites a fresher preview
        this._vectorize(this.currentMatrix, c, r, this.currentPalette, options).then((svgString) => {
            if (seq === this._vectorSeq) this._showVector(svgString, c, r);
        });
    }

    _showVector(svgString, c, r) {
        this._lastSvgString = svgString; const pad = Math.max(0, this.vectorPadding || 0);
        this.app.displaySvg(svgString, (c + pad * 2) * this.vectorBlockSize, (r + pad * 2) * this.vectorBlockSize);
        this._syncVectorSize();
        this._updateStats(svgString);
    }

    /** Vectorizes in a Web Worker so big grids never freeze the UI; falls back to the main thread when workers are unavailable */
    _vectorize(matrix, cols, rows, palette, options) {
        const worker = this._getWorker();
        if (!worker) return Promise.resolve(PixelArtVectorizer.vectorize(matrix, cols, rows, palette, options));
        return new Promise((resolve) => {
            const id = ++this._workerJobId;
            this._pendingJobs.set(id, { resolve, args: [matrix, cols, rows, palette, options] });
            worker.postMessage({ id, matrix, cols, rows, palette, options });
        });
    }

    _getWorker() {
        if (this._worker || this._workerUnavailable) return this._worker;
        try {
            this._worker = new Worker(PIXELART_WORKER_URL);
            this._worker.onmessage = ({ data }) => {
                const job = this._pendingJobs.get(data.id);
                if (!job) return;
                this._pendingJobs.delete(data.id);
                job.resolve(data.error ? PixelArtVectorizer.vectorize(...job.args) : data.svg);
            };
            this._worker.onerror = (err) => {
                console.warn('Pixel Art worker failed, using the main thread:', err.message);
                this._workerUnavailable = true; this._worker = null;
                this._pendingJobs.forEach((job) => job.resolve(PixelArtVectorizer.vectorize(...job.args)));
                this._pendingJobs.clear();
            };
        } catch (err) {
            console.warn('Pixel Art worker unavailable, using the main thread:', err);
            this._workerUnavailable = true; this._worker = null;
        }
        return this._worker;
    }
    toggleViewMode(targetMode = null) {
        if (!this.dualWrapper) return;
        const modes = ['dual', 'source', 'vector'];
        this.viewMode = (targetMode && modes.includes(targetMode)) ? targetMode : modes[(modes.indexOf(this.viewMode) + 1) % modes.length];
        this.dualWrapper.className = `stage-dual-wrapper is-split-screen view-mode-${this.viewMode}`;
        this.btnToggleViewMode?.firstElementChild.setAttribute('class', `icon-mask icon-${{ dual: 'split', source: 'left', vector: 'right' }[this.viewMode]}-view`);
        this._syncContentDimensions();
    }

    _syncContentDimensions() {
        if (!this.rawImage) return;
        const imgW = this.rawImage.naturalWidth || this.rawImage.width || 32, imgH = this.rawImage.naturalHeight || this.rawImage.height || 32;
        const activePane = (this.viewMode === 'vector') ? this.vectorPane : this.sourcePane;
        const paneW = activePane?.clientWidth || (window.innerWidth * (this.viewMode === 'dual' ? 0.5 : 1.0) - 200);
        const paneH = (activePane?.clientHeight || (window.innerHeight - 150)) - 36 - PANE_TOOLBAR_HEIGHT, pad = 48, maxW = Math.max(120, paneW - pad), maxH = Math.max(120, paneH - pad);
        const fit = (asp) => (maxW / maxH > asp) ? [Math.round(maxH * asp), Math.round(maxH)] : [maxW, Math.round(maxW / asp)];
        const [baseW, baseH] = fit(imgW / imgH);
        if (this.gridContainer) { this.gridContainer.style.width = `${baseW}px`; this.gridContainer.style.height = `${baseH}px`; }
        this._fitScale = baseH / imgH;
        this._syncVectorSize();
        this.renderGridCanvas();
    }

    /** Keeps the vector at the same on-screen scale and position as the source image: when cropped, only the bbox region is shown, so the vector is bbox.h * scale tall and sits where the bbox sits in the source pane (offset from the pane center, scaled with zoom by the viewport controller). */
    _syncVectorSize() {
        if (!this.svgWrapper || !this.rawImage || !this._fitScale) return;
        const imgW = this.rawImage.naturalWidth || this.rawImage.width || 32, imgH = this.rawImage.naturalHeight || this.rawImage.height || 32;
        const cropped = Boolean(this.cropToBbox && this.bbox?.h);
        const srcH = cropped ? Math.min(this.bbox.h, imgH) : imgH;
        const rows = Math.max(1, this.activeRows || this.rows), pad = Math.max(0, this.vectorPadding || 0);
        this.svgWrapper.style.height = `${(srcH * this._fitScale * (rows + pad * 2)) / rows}px`;
        this.svgWrapper.style.width = 'auto';
        const aligned = cropped && this.viewMode === 'dual';
        this.app?.setViewportOffset?.(this.svgWrapper, aligned ? (this.bbox.x + this.bbox.w / 2 - imgW / 2) * this._fitScale : 0, aligned ? (this.bbox.y + this.bbox.h / 2 - imgH / 2) * this._fitScale : 0);
    }

    renderGridCanvas() {
        if (!this.gridCanvas || !this.rawImage) return;
        if (window.PixelArtGridCanvas) {
            window.PixelArtGridCanvas.render(this.gridCanvas, this.overlayCanvas, this.rawImage, this.bbox, this.cols, this.rows, { zoom: this.currentZoom, cropToBbox: this.cropToBbox, showGrid: this.showGrid !== false });
        }
        this._schedulePositionToolbar();
    }

    _schedulePositionToolbar() {
        if (this._toolbarFrame) return;
        this._toolbarFrame = requestAnimationFrame(() => { this._toolbarFrame = 0; this._positionToolbar(); });
    }

    /** Pins the toolbar groups just outside the image's top corners (left group top-left, right group top-right). The image sits in a zoomed/panned container, so positions come from screen coordinates; button size never scales. */
    _positionToolbar() {
        const { toolbarLeft: left, toolbarRight: right, overlayCanvas } = this;
        const host = left?.parentElement?.parentElement;
        if (!left || !right || !host || !overlayCanvas) return;
        const o = overlayCanvas.getBoundingClientRect(), p = host.getBoundingClientRect();
        if (!o.width || !p.width) return;
        const GAP = 6, EDGE = 4, lw = left.offsetWidth, rw = right.offsetWidth, h = left.offsetHeight;
        const top = Math.max(EDGE, Math.min(o.top - p.top - h - GAP, p.height - h - EDGE));
        const leftX = Math.max(EDGE, Math.min(o.left - p.left, p.width - lw - EDGE));
        const rightX = Math.max(leftX + lw + GAP, Math.min(o.right - p.left - rw, p.width - rw - EDGE));
        left.style.left = `${leftX}px`; left.style.top = `${top}px`;
        right.style.left = `${rightX}px`; right.style.top = `${top}px`;
    }

    _syncGridToggleUi() {
        if (!this.btnGridToggle) return;
        this.btnGridToggle.classList.toggle('is-active', this.showGrid !== false);
        this.btnGridToggle.setAttribute('aria-pressed', String(this.showGrid !== false));
    }

    activate() {
        if (this.settingsGroup) this.settingsGroup.style.display = 'flex';
        if (this.statsCard) this.statsCard.style.display = 'block';
        if (this.stagePreviewArea) { this.stagePreviewArea.classList.add('is-split-mode'); this.stagePreviewArea.style.transform = 'none'; }
        if (this.dualWrapper) this.dualWrapper.classList.add('is-split-screen');
        [this.sourcePane, this.vectorPane, this.vectorHeader, this.divider].forEach(el => { if (el) el.style.display = 'flex'; });
        if (this.btnToggleViewMode) this.btnToggleViewMode.style.display = 'inline-flex';
        if (this.app?.setViewportTargets && this.gridContainer && this.svgWrapper) this.app.setViewportTargets([this.gridContainer, this.svgWrapper]);
        this._syncContentDimensions(); this._updateStats(this._lastSvgString);
        this._updateUndoRedoUi();
        window.PixelArtGuide?.checkAutoPopup();
    }

    deactivate() {
        this._hideFloatingAutoGridBtn();
        if (this.settingsGroup) this.settingsGroup.style.display = 'none'; if (this.statsCard) this.statsCard.style.display = 'none';
        if (this.stagePreviewArea) this.stagePreviewArea.classList.remove('is-split-mode');
        if (this.dualWrapper) { this.dualWrapper.classList.remove('is-split-screen', 'view-mode-dual', 'view-mode-source', 'view-mode-vector'); this.viewMode = 'dual'; }
        [this.sourcePane, this.divider, this.vectorHeader, this.btnToggleViewMode].forEach(el => { if (el) el.style.display = 'none'; });
        if (this.gridContainer) { this.gridContainer.style.width = ''; this.gridContainer.style.height = ''; this.gridContainer.style.transform = 'none'; }
        if (this.svgWrapper) { this.app?.setViewportOffset?.(this.svgWrapper, 0, 0); window.StageSvgRenderer?.clear(this.svgWrapper); this.svgWrapper.style.height = ''; this.svgWrapper.style.transform = 'none'; }
        if (this.app?.setViewportTargets && this.stagePreviewArea) this.app.setViewportTargets([this.stagePreviewArea]);
        this._updateUndoRedoUi();
    }

    reset() {
        this._vectorSeq++; this.rawImage = null; this.undoStack = []; this.redoStack = []; this._lastSvgString = '';
        if (this.gridCanvas) { const ctx = this.gridCanvas.getContext('2d'); if (ctx) ctx.clearRect(0, 0, this.gridCanvas.width, this.gridCanvas.height); }
        this.deactivate();
    }

    refreshStats() { this._updateColorsBadge(); this._updateStats(this._lastSvgString); }

    _updateStats(svg) {
        if (!this.statsCard || !this.rawImage) return;
        const nw = this.rawImage.naturalWidth || this.rawImage.width || 0, nh = this.rawImage.naturalHeight || this.rawImage.height || 0;
        const c = this.activeCols || this.cols || 1, r = this.activeRows || this.rows || 1;
        const bw = Math.round(this.bbox?.w || nw), bh = Math.round(this.bbox?.h || nh);
        const exportW = c * this.vectorBlockSize + 2 * this.vectorPadding, exportH = r * this.vectorBlockSize + 2 * this.vectorPadding, dimStr = `${exportW} × ${exportH} px`;
        if (this.paStatSource) this.paStatSource.textContent = `${nw} × ${nh} px`;
        if (this.paStatBbox) this.paStatBbox.textContent = this.cropToBbox ? `${bw} × ${bh} px` : this._tr('units.fullImage', 'Full image');
        if (this.paStatGrid) this.paStatGrid.textContent = `${c} × ${r} (${(c * r).toLocaleString()} ${this._tr('units.blocks', 'blocks')})`;
        if (this.paStatColors) this.paStatColors.textContent = `${this.currentPalette ? this.currentPalette.length : 0} ${this._tr('units.colors', 'colors')}`;
        if (this.paStatPixelSize) this.paStatPixelSize.textContent = `${this.vectorBlockSize || 10} px`;
        if (this.paStatExportDim) this.paStatExportDim.textContent = dimStr;
        if (this.paStatSvgDim) this.paStatSvgDim.textContent = dimStr;
        if (this.paStatSvgSize) { const b = svg ? new TextEncoder().encode(svg).length : 0; this.paStatSvgSize.textContent = b > 0 ? (b < 1024 ? `~${b} B` : (b < 1048576 ? `~${(b / 1024).toFixed(1)} KB` : `~${(b / 1048576).toFixed(1)} MB`)) : '--'; }
        if (this.paStatPngSize) this.paStatPngSize.textContent = this._lastPngSizeStr || '~...';
        this._measurePngSize(svg, exportW, exportH);
    }

    _measurePngSize(svg, targetW, targetH) {
        if (!svg || typeof document === 'undefined') return;
        const seq = ++this._pngMeasureSeq;
        clearTimeout(this._pngMeasureTimer);
        this._pngMeasureTimer = setTimeout(() => {
            try {
                const img = new Image(), blob = new Blob([svg], { type: 'image/svg+xml;charset=utf-8' }), url = URL.createObjectURL(blob);
                img.onload = () => {
                    URL.revokeObjectURL(url);
                    if (seq !== this._pngMeasureSeq) return;
                    const canvas = document.createElement('canvas'); canvas.width = targetW; canvas.height = targetH;
                    const ctx = canvas.getContext('2d'); if (!ctx) return;
                    ctx.imageSmoothingEnabled = false; ctx.drawImage(img, 0, 0, targetW, targetH);
                    canvas.toBlob((b) => {
                        if (seq !== this._pngMeasureSeq || !b) return;
                        const sz = b.size < 1024 ? `${b.size} B` : (b.size < 1048576 ? `${(b.size / 1024).toFixed(1)} KB` : `${(b.size / 1048576).toFixed(1)} MB`);
                        this._lastPngSizeStr = `~${sz}`;
                        if (this.paStatPngSize) this.paStatPngSize.textContent = `~${sz}`;
                    }, 'image/png');
                };
                img.onerror = () => URL.revokeObjectURL(url); img.src = url;
            } catch (err) { console.warn('PNG measure skipped:', err); }
        }, 120);
    }

    pushUndoSnapshot() {
        if (this._isRestoring || this._isUndoing) return;
        const s = this.getSettingsSnapshot(), top = this.undoStack[this.undoStack.length - 1];
        if (top && JSON.stringify(top) === JSON.stringify(s)) return;
        this.undoStack.push(s);
        if (this.undoStack.length > 25) this.undoStack.shift();
        this.redoStack = []; this._updateUndoRedoUi();
    }

    undo() {
        if (this.undoStack.length <= 1) return;
        this.redoStack.push(this.undoStack.pop());
        const prev = this.undoStack[this.undoStack.length - 1];
        if (!prev) return;
        this._isUndoing = true;
        try { this.restoreSnapshot(this.rawImage, prev, false); this.app?.showToast?.(this._tr('messages.undone', 'Undone (Undo)')); }
        finally { this._isUndoing = false; this._updateUndoRedoUi(); }
    }

    redo() {
        if (this.redoStack.length === 0) return;
        const next = this.redoStack.pop();
        this.undoStack.push(next);
        this._isUndoing = true;
        try { this.restoreSnapshot(this.rawImage, next, false); this.app?.showToast?.(this._tr('messages.redone', 'Redone (Redo)')); }
        finally { this._isUndoing = false; this._updateUndoRedoUi(); }
    }

    _updateUndoRedoUi() {
        const u = document.getElementById('btnUndo'), r = document.getElementById('btnRedo');
        const isActive = Boolean(this.dualWrapper?.classList.contains('is-split-screen'));
        if (u) u.disabled = !isActive || this.undoStack.length <= 1;
        if (r) r.disabled = !isActive || this.redoStack.length === 0;
    }

    getSettingsSnapshot() {
        const b = this.bbox ? { x: Math.round(this.bbox.x), y: Math.round(this.bbox.y), w: Math.round(this.bbox.w), h: Math.round(this.bbox.h) } : null;
        return {
            cols: Math.round(this.cols || 16), rows: Math.round(this.rows || 16), lockSquare: Boolean(this.lockSquare), cropToBbox: Boolean(this.cropToBbox),
            showGrid: Boolean(this.showGrid), groupByColor: Boolean(this.groupByColor), bbox: b, maxColors: this.maxColors || 16,
            vectorStyle: this.vectorStyle || 'unified-connected', vectorRadius: this.vectorRadius ?? 0, vectorBlockSize: this.vectorBlockSize || 10,
            vectorBlockGap: this.vectorBlockGap ?? 0, vectorPadding: this.vectorPadding ?? 0, transparentBg: Boolean(this.transparentBg),
            greyscale: Boolean(this.greyscale), hueShift: this.hueShift || 0, satShift: this.satShift || 0, lightShift: this.lightShift || 0,
            bgColor: this.bgColor || '#ffffff', layeredSolids: Boolean(this.layeredSolids), enclosureThreshold: this.enclosureThreshold ?? 0.7,
            paletteEdits: this.paletteUi.getState()
        };
    }

    restoreSnapshot(img, s = {}, resetHistory = false) {
        if (!img) return;
        if (resetHistory) { this.undoStack = []; this.redoStack = []; }
        this._isRestoring = true;
        try {
            this._setupImageBuffer(img);
            const w = img.naturalWidth || img.width || 32, h = img.naturalHeight || img.height || 32;
            this.bbox = s.bbox ? { x: Math.round(s.bbox.x), y: Math.round(s.bbox.y), w: Math.round(s.bbox.w), h: Math.round(s.bbox.h) } : { x: 0, y: 0, w, h };
            this.cropToBbox = (s.cropToBbox !== undefined) ? Boolean(s.cropToBbox) : true;
            if (this.cropToBboxToggle) this.cropToBboxToggle.checked = this.cropToBbox;
            this.showGrid = (s.showGrid !== undefined) ? Boolean(s.showGrid) : true;
            this._syncGridToggleUi();
            this.groupByColor = (s.groupByColor !== undefined) ? Boolean(s.groupByColor) : false;
            if (this.groupByColorToggle) this.groupByColorToggle.checked = this.groupByColor;
            this.lockSquare = (s.lockSquare !== undefined) ? Boolean(s.lockSquare) : true;
            if (this.lockSquareToggle) this.lockSquareToggle.checked = this.lockSquare;
            this.cols = Math.round(s.cols || 16); this.rows = Math.round(s.rows || 16);
            this.activeCols = this.cols; this.activeRows = this.rows;
            this._updateGridLimits(); this._updateColsBadge(); this._updateRowsBadge();
            if (s.vectorRadius !== undefined) { this.vectorRadius = s.vectorRadius; if (this.radiusSlider) this.radiusSlider.value = s.vectorRadius; if (this.radiusBadge) this.radiusBadge.textContent = `${s.vectorRadius}%`; }
            if (s.vectorBlockSize) { this.vectorBlockSize = s.vectorBlockSize; if (this.blockSizeSlider) this.blockSizeSlider.value = s.vectorBlockSize; if (this.blockSizeBadge) this.blockSizeBadge.textContent = `${s.vectorBlockSize}px`; }
            if (s.vectorBlockGap !== undefined) { this.vectorBlockGap = s.vectorBlockGap; if (this.blockGapSlider) this.blockGapSlider.value = s.vectorBlockGap; if (this.blockGapBadge) this.blockGapBadge.textContent = `${s.vectorBlockGap}%`; }
            if (s.layeredSolids !== undefined) {
                this.layeredSolids = s.layeredSolids; if (this.layeredToggle) this.layeredToggle.checked = s.layeredSolids;
            }
            if (s.enclosureThreshold !== undefined) { this.enclosureThreshold = s.enclosureThreshold; const pct = Math.round(s.enclosureThreshold * 100); if (this.enclosureSlider) this.enclosureSlider.value = pct; if (this.enclosureBadge) this.enclosureBadge.textContent = `${pct}%`; }
            this._syncLayeredUi();
            this.greyscale = Boolean(s.greyscale); this.hueShift = s.hueShift || 0; this.satShift = s.satShift || 0; this.lightShift = s.lightShift || 0;
            this._syncColorAdjustUi();
            this.paletteUi.setState(s.paletteEdits);
            this._syncContentDimensions(); this._sampleCells(); this.renderGridCanvas();
            this.maxColors = s.maxColors || 16; this._updateColorsBadge();
            clearTimeout(this._renderTimer); this.processQuantizeAndDebouncedRender();
        } finally { this._isRestoring = false; }
        if (resetHistory) this.pushUndoSnapshot();
        this._updateUndoRedoUi();
    }
}

if (typeof window !== 'undefined') window.PixelArtHandler = PixelArtHandler;
if (typeof module !== 'undefined' && module.exports) module.exports = { PixelArtHandler };
