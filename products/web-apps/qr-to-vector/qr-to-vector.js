/**
 * QR to Vector - Main App Controller
 * Complies with _RULE-web-apps.md (< 500 lines)
 * 100% Vanilla JS, Local-First, Zero Bloatware
 */

(function () {
    'use strict';

    const SETTINGS_STORAGE_KEY = 'qr_to_vector_settings';
    const DEFAULT_SETTINGS = Object.freeze({
        mode: 'unified-connected',
        cornerRadius: 50,
        blockSize: 10, // Default 10px
        fgColor: '#000000',
        bgColor: '#FFFFFF',
        transparentBg: false,
        outerPadding: 3,
        blockGap: 0
    });

    let currentAppMode = 'convert'; // 'convert' | 'generate'
    let currentSubMode = 'qr'; // 'qr' | 'pixelart'
    let currentImage = null, currentFileName = 'qr-code', currentMatrixData = null;
    let currentSvgData = null, currentDecodedText = '', currentZoom = 1;
    let currentMode = DEFAULT_SETTINGS.mode, pixelArtHandler = null, viewportCtrl = null, isProcessingImage = false;

    const $ = (id) => document.getElementById(id);
    const tabModeConvert = $('tabModeConvert'), tabModeGenerate = $('tabModeGenerate'), stageSubmodePill = $('stageSubmodePill'), btnSubmodeQr = $('btnSubmodeQr'), btnSubmodePixelArt = $('btnSubmodePixelArt'), stageActionBar = $('stageActionBar');
    const generatorCard = $('generatorCard'), fileInput = $('fileInput'), stageViewport = $('stageViewport'), stagePreviewArea = $('stagePreviewArea'), svgDisplayWrapper = $('svgDisplayWrapper'), stageEmptyState = $('stageEmptyState'), btnUploadImageToolbar = $('btnUploadImageToolbar');
    const btnModeConnected = $('btnModeUnifiedConnected'), btnModeSeparated = $('btnModeUnifiedSeparated'), btnModeBlocks = $('btnModeBlocks');
    const radiusLabel = $('radiusLabel'), radiusBadge = $('radiusBadge'), radiusSlider = $('radiusSlider'), blockSizeSlider = $('blockSizeSlider'), blockSizeBadge = $('blockSizeBadge');
    const fgColorPicker = $('fgColorPicker'), fgColorText = $('fgColorText'), bgColorPicker = $('bgColorPicker'), bgColorText = $('bgColorText'), transparentBgToggle = $('transparentBgToggle'), bgPickerWrapper = $('bgPickerWrapper');
    const btnResetDefaults = $('btnResetDefaults'), outerPaddingSlider = $('outerPaddingSlider'), outerPaddingBadge = $('outerPaddingBadge'), blockGapSlider = $('blockGapSlider'), blockGapBadge = $('blockGapBadge'), blockGapGroup = $('blockGapGroup');
    const qrDecodedBanner = $('qrDecodedBanner'), qrDecodedTag = $('qrDecodedTag'), qrDecodedText = $('qrDecodedText'), btnOpenQrUrl = $('btnOpenQrUrl'), btnCopyQrText = $('btnCopyQrText');
    const qrDetailsCard = $('qrDetailsCard'), statQrType = $('statQrType'), statQrLength = $('statQrLength'), qrDecodedFullText = $('qrDecodedFullText');
    const statsCard = $('statsCard'), statDimensions = $('statDimensions'), statGrid = $('statGrid'), statElements = $('statElements');
    const btnDownloadSvg = $('btnDownloadSvg'), btnDownloadPng = $('btnDownloadPng'), btnCopySvg = $('btnCopySvg'), zoomLevelBadge = $('zoomLevelBadge'), toast = $('toast'), langToggleBtn = $('langToggleBtn');

    function init() {
        loadSettings();
        initLogoHandler();
        initPixelArtHandler();
        initViewportController();
        bindEvents();
        initGenerator();
        initHistory();
        hideStage();
    }

    const on = (el, evt, handler) => { if (el) el.addEventListener(evt, handler); };

    function initViewportController() {
        if (!window.StageViewportController || !stageViewport || !stagePreviewArea) return;
        viewportCtrl = new window.StageViewportController(stageViewport, stagePreviewArea, (scale) => {
            currentZoom = scale;
            if (zoomLevelBadge) zoomLevelBadge.textContent = `${Math.round(scale * 100)}%`;
            if (currentSubMode === 'pixelart') pixelArtHandler?.onZoomChange(scale);
        });
    }

    function initPixelArtHandler() {
        if (!window.PixelArtHandler) return;
        pixelArtHandler = new window.PixelArtHandler({
            getVectorSettings: () => getVectorizeOptions(),
            displaySvg: (svgString, w, h) => {
                currentSvgData = { svgString, width: w, height: h };
                svgDisplayWrapper.innerHTML = svgString;
                if (w && h) svgDisplayWrapper.style.setProperty('--svg-aspect-ratio', `${w} / ${h}`);
                showStage();
            },
            setViewportTargets: (targets) => { viewportCtrl?.setTargets(targets); }
        });
    }

    function initLogoHandler() {
        if (!window.QrLogoHandler) return;
        window.QrLogoHandler.init({
            logoInput: $('logoFileInput'), btnUploadLogo: $('btnUploadLogo'), btnRemoveLogo: $('btnRemoveLogo'),
            logoCard: $('logoCard'), logoPreview: $('logoPreviewBox'), logoThumb: $('logoThumb'), logoNameLabel: $('logoFileName'),
            logoBlocksSlider: $('logoBlocksSlider'), logoBlocksBadge: $('logoBlocksBadge'),
            logoScaleSlider: $('logoScaleSlider'), logoScaleBadge: $('logoScaleBadge'), logoSettingsGroup: $('logoSettingsGroup')
        }, () => {
            reconstructAndVectorize();
            if (currentAppMode === 'convert' && currentSubMode === 'qr') window.HistoryManager?.updateActiveSettings(getVectorizeOptions());
        });
    }

    function initGenerator() {
        if (!window.QrGeneratorUi) return;
        window.QrGeneratorUi.init({
            typesList: $('genTypesList'), formContainer: $('genFormContainer')
        }, (payload, activeType) => {
            if (!payload || currentAppMode !== 'generate') return;
            currentDecodedText = payload; currentFileName = `qr-${activeType}`; reconstructAndVectorize(); showStage();
        });
    }

    function bindEvents() {
        on(tabModeConvert, 'click', () => setAppMode('convert')); on(tabModeGenerate, 'click', () => setAppMode('generate'));
        on(btnSubmodeQr, 'click', () => setSubMode('qr')); on(btnSubmodePixelArt, 'click', () => setSubMode('pixelart'));

        on(langToggleBtn, 'click', () => {
            if (window.QrToVectorI18n) {
                window.QrToVectorI18n.toggleLang(); syncModeUi();
                updateOuterPaddingBadge(parseInt(outerPaddingSlider?.value || 3, 10));
                if (window.QrGeneratorUi) window.QrGeneratorUi.refreshI18n();
                pixelArtHandler?.refreshStats?.();
            }
        });

        const setMode = (mode) => {
            if (currentMode === mode) return;
            currentMode = mode;
            btnModeConnected?.classList.toggle('is-active', mode === 'unified-connected');
            btnModeSeparated?.classList.toggle('is-active', mode === 'unified-separated');
            btnModeBlocks?.classList.toggle('is-active', mode === 'blocks');
            syncModeUi(); saveSettings(); triggerVectorize();
        };

        [btnModeConnected, btnModeSeparated, btnModeBlocks].forEach((b, i) => {
            on(b, 'click', () => setMode(['unified-connected', 'unified-separated', 'blocks'][i]));
        });

        on(radiusSlider, 'input', () => { if (radiusBadge) radiusBadge.textContent = `${radiusSlider.value}%`; saveSettings(); triggerVectorize(); });
        on(blockSizeSlider, 'input', () => { if (blockSizeBadge) blockSizeBadge.textContent = `${blockSizeSlider.value}px`; saveSettings(); triggerVectorize(); });
        DomUtils.syncColorInputs(fgColorPicker, fgColorText, () => { saveSettings(); triggerVectorize(); });
        DomUtils.syncColorInputs(bgColorPicker, bgColorText, () => { saveSettings(); triggerVectorize(); });
        on(transparentBgToggle, 'change', () => {
            if (bgPickerWrapper) { bgPickerWrapper.style.opacity = transparentBgToggle.checked ? '0.35' : '1'; bgPickerWrapper.style.pointerEvents = transparentBgToggle.checked ? 'none' : 'auto'; }
            saveSettings(); triggerVectorize();
        });
        on(outerPaddingSlider, 'input', () => { updateOuterPaddingBadge(parseInt(outerPaddingSlider.value, 10)); saveSettings(); triggerVectorize(); });
        on(blockGapSlider, 'input', () => { if (blockGapBadge) blockGapBadge.textContent = `${blockGapSlider.value}%`; saveSettings(); triggerVectorize(); });

        on(btnResetDefaults, 'click', resetToDefaults);

        on(btnCopyQrText, 'click', () => {
            if (!currentDecodedText) return;
            navigator.clipboard.writeText(currentDecodedText).then(() => {
                showToast(window.QrToVectorI18n?.t('qrContent.copied') || 'Đã sao chép nội dung QR!');
            });
        });

        // Stage Dropzone, Click & Paste Events via Common DomUtils
        DomUtils.bindDropAndPaste({
            stageViewport, fileInput, stageEmptyState, btnUploadToolbar: btnUploadImageToolbar,
            onFileLoaded: (file, isPaste) => {
                if (isPaste && currentAppMode !== 'convert') setAppMode('convert');
                handleFile(file);
            }
        });

        on(btnDownloadSvg, 'click', downloadSvg); on(btnDownloadPng, 'click', downloadPng); on(btnCopySvg, 'click', copySvg);
        on($('btnZoomIn'), 'click', () => viewportCtrl ? viewportCtrl.zoomIn() : setZoom(currentZoom + 0.25));
        on($('btnZoomOut'), 'click', () => viewportCtrl ? viewportCtrl.zoomOut() : setZoom(currentZoom - 0.25));
        on($('btnZoomReset'), 'click', () => viewportCtrl ? viewportCtrl.reset(1) : setZoom(1));
        on($('btnToggleGrid'), 'click', () => stageViewport?.classList.toggle('has-checkerboard'));
    }

    function setAppMode(appMode) {
        if (currentAppMode === appMode) return;
        currentAppMode = appMode;
        tabModeConvert?.classList.toggle('is-active', appMode === 'convert');
        tabModeGenerate?.classList.toggle('is-active', appMode === 'generate');

        if (generatorCard) generatorCard.style.display = appMode === 'generate' ? 'flex' : 'none';
        const qrGroup = $('qrSettingsGroup');
        const pixelArtGroup = $('pixelArtSettingsGroup');

        if (appMode === 'generate') {
            if (pixelArtGroup) pixelArtGroup.style.display = 'none';
            if (qrGroup) qrGroup.style.display = 'flex';
            pixelArtHandler?.deactivate();
            if (stageSubmodePill) stageSubmodePill.style.display = 'none';
            if (stageEmptyState) stageEmptyState.style.display = 'none';
            if (window.QrGeneratorUi) window.QrGeneratorUi.triggerCurrent();
        } else {
            if (currentImage) {
                setSubMode(currentSubMode, true);
            } else {
                if (qrGroup) qrGroup.style.display = 'none';
                if (pixelArtGroup) pixelArtGroup.style.display = 'none';
                pixelArtHandler?.deactivate();
                hideStage();
            }
        }
    }

    function setSubMode(subMode, forceRefresh = false) {
        if (currentAppMode === 'generate') return;
        if (!forceRefresh && currentSubMode === subMode) return;
        currentSubMode = subMode;

        btnSubmodeQr?.classList.toggle('is-active', subMode === 'qr');
        btnSubmodePixelArt?.classList.toggle('is-active', subMode === 'pixelart');

        const qrGroup = $('qrSettingsGroup'), pixelArtGroup = $('pixelArtSettingsGroup');

        if (subMode === 'pixelart') {
            if (qrGroup) qrGroup.style.display = 'none';
            if (pixelArtGroup) pixelArtGroup.style.display = 'flex';
            if (qrDecodedBanner) qrDecodedBanner.classList.remove('is-active');
            if (qrDetailsCard) qrDetailsCard.style.display = 'none';
            if (statsCard) statsCard.style.display = 'none';
            pixelArtHandler?.activate();
            if (currentImage) {
                if (!pixelArtHandler.rawImage || pixelArtHandler.rawImage !== currentImage) {
                    pixelArtHandler.loadImage(currentImage);
                } else {
                    pixelArtHandler.renderGridCanvas();
                    pixelArtHandler.renderVector();
                }
                showStage();
            } else { hideStage(); }
        } else {
            if (pixelArtGroup) pixelArtGroup.style.display = 'none';
            if (qrGroup) qrGroup.style.display = 'flex';
            pixelArtHandler?.deactivate();
            if (currentImage) {
                if (currentDecodedText) {
                    if (!currentMatrixData) reconstructAndVectorize();
                    displayDecodedInfo(currentDecodedText);
                    if (qrDetailsCard) qrDetailsCard.style.display = 'block';
                    if (statsCard) statsCard.style.display = 'block';
                    showStage(); triggerVectorize();
                } else if (!isProcessingImage) {
                    processUploadedImage(true);
                }
            } else { hideStage(); }
        }
    }

    function loadSettings(override) {
        let saved = override || null;
        if (!saved) {
            try { const raw = localStorage.getItem(SETTINGS_STORAGE_KEY); if (raw) saved = JSON.parse(raw); }
            catch (err) { console.warn('Failed to load settings:', err); }
        }
        const s = Object.assign({}, DEFAULT_SETTINGS, saved || {});
        currentMode = (s.mode === 'blocks' || s.mode === 'unified-separated') ? s.mode : 'unified-connected';
        btnModeConnected?.classList.toggle('is-active', currentMode === 'unified-connected');
        btnModeSeparated?.classList.toggle('is-active', currentMode === 'unified-separated');
        btnModeBlocks?.classList.toggle('is-active', currentMode === 'blocks');

        const radius = Math.max(0, Math.min(100, parseInt(s.cornerRadius, 10) ?? 50));
        if (radiusSlider) { radiusSlider.value = radius; if (radiusBadge) radiusBadge.textContent = `${radius}%`; }
        const bs = Math.max(10, Math.min(40, parseInt(s.blockSize, 10) || 16));
        if (blockSizeSlider) { blockSizeSlider.value = bs; if (blockSizeBadge) blockSizeBadge.textContent = `${bs}px`; }
        const fg = /^#[0-9A-F]{6}$/i.test(s.fgColor) ? s.fgColor : '#000000';
        if (fgColorPicker) { fgColorPicker.value = fg; if (fgColorText) fgColorText.value = fg.toUpperCase(); }
        const bg = /^#[0-9A-F]{6}$/i.test(s.bgColor) ? s.bgColor : '#FFFFFF';
        if (bgColorPicker) { bgColorPicker.value = bg; if (bgColorText) bgColorText.value = bg.toUpperCase(); }
        const isTrans = Boolean(s.transparentBg);
        if (transparentBgToggle) transparentBgToggle.checked = isTrans;
        if (bgPickerWrapper) { bgPickerWrapper.style.opacity = isTrans ? '0.35' : '1'; bgPickerWrapper.style.pointerEvents = isTrans ? 'none' : 'auto'; }
        const pad = Math.max(0, Math.min(10, parseInt(s.outerPadding, 10) ?? 3));
        if (outerPaddingSlider) { outerPaddingSlider.value = pad; updateOuterPaddingBadge(pad); }
        const gap = Math.max(0, Math.min(40, parseInt(s.blockGap, 10) || 0));
        if (blockGapSlider) { blockGapSlider.value = gap; if (blockGapBadge) blockGapBadge.textContent = `${gap}%`; }
        syncModeUi();
    }

    function saveSettings() {
        try {
            const opts = getVectorizeOptions();
            localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(opts));
            if (currentAppMode === 'convert' && currentSubMode === 'qr') window.HistoryManager?.updateActiveSettings(opts);
        } catch (err) { console.warn('Failed to save settings:', err); }
    }

    function resetToDefaults() {
        try { localStorage.removeItem(SETTINGS_STORAGE_KEY); }
        catch (err) { console.warn('Failed to reset settings:', err); }
        loadSettings(DEFAULT_SETTINGS);
        saveSettings();
        triggerVectorize();
        showToast(window.QrToVectorI18n?.t('controls.resetDefaults') || 'Đã đặt lại mặc định');
    }

    function syncModeUi() {
        updateRadiusLabels();
        if (blockGapGroup) {
            const isBlocks = currentMode === 'blocks';
            blockGapGroup.style.opacity = isBlocks ? '1' : '0.4';
            blockGapGroup.style.pointerEvents = isBlocks ? 'auto' : 'none';
        }
    }

    function updateRadiusLabels() {
        const i18n = window.QrToVectorI18n;
        if (!i18n || !radiusLabel) return;
        radiusLabel.textContent = (currentMode === 'blocks')
            ? i18n.t('controls.radiusBlocks')
            : i18n.t('controls.radiusUnified');
    }

    function updateOuterPaddingBadge(val) {
        if (!outerPaddingBadge) return;
        const i18n = window.QrToVectorI18n;
        const pattern = i18n?.t?.('controls.outerPaddingBlocks');
        outerPaddingBadge.textContent = (pattern && pattern.includes('{n}'))
            ? pattern.replace('{n}', val)
            : `${val} ${val === 1 ? 'block' : 'blocks'}`;
    }

    function handleFile(file) {
        if (!file || !file.type.startsWith('image/')) {
            showToast('Vui lòng chọn một file ảnh hợp lệ (PNG, JPG, WEBP)!');
            return;
        }
        if (file.name) currentFileName = file.name.replace(/\.[^/.]+$/, '');
        const reader = new FileReader();
        reader.onload = (e) => {
            const img = new Image();
            img.onload = () => {
                currentImage = img;
                if (currentAppMode !== 'convert') setAppMode('convert');
                processUploadedImage();
            };
            img.src = e.target.result;
        };
        reader.readAsDataURL(file);
    }

    function getVectorizeOptions() {
        const logoOpts = window.QrLogoHandler ? window.QrLogoHandler.getOptions() : {};
        const bs = parseInt(blockSizeSlider?.value || 10, 10);
        return {
            mode: currentMode, style: currentMode,
            radius: parseInt(radiusSlider?.value || 50, 10),
            cornerRadius: parseInt(radiusSlider?.value || 50, 10),
            blockSize: bs, moduleResolution: bs,
            fgColor: fgColorPicker?.value || '#000000',
            bgColor: bgColorPicker?.value || '#FFFFFF',
            transparentBg: Boolean(transparentBgToggle?.checked),
            outerPadding: parseInt(outerPaddingSlider?.value || 3, 10),
            blockGap: parseInt(blockGapSlider?.value || 0, 10),
            logoData: logoOpts.logoData, logoScale: logoOpts.logoScale
        };
    }

    async function processUploadedImage(forceQrOnly = false) {
        if (!currentImage || isProcessingImage) return;
        isProcessingImage = true;
        showToast(window.QrToVectorI18n?.t('qrContent.scanning') || 'Đang quét và nhận diện ảnh...');
        await new Promise(r => setTimeout(r, 20));

        try {
            const scanResult = await QrScanner.scan(currentImage);
            if (scanResult.success && scanResult.text) {
                currentDecodedText = scanResult.text;
                reconstructAndVectorize();
                setSubMode('qr', true);
                window.HistoryManager?.record({ name: currentFileName, type: 'qr', img: currentImage, decodedText: currentDecodedText, settings: getVectorizeOptions() });
                showToast(window.QrToVectorI18n?.t('qrContent.scanSuccess') || 'Đã quét và bóc tách mã QR thành công!');
                return;
            }

            if (forceQrOnly) {
                showToast(window.QrToVectorI18n?.t('qrContent.noQrFound') || 'Không tìm thấy mã QR trong ảnh!');
                return;
            }

            // Fallback: No QR found -> Smart Auto-Switch to Pixel Art!
            setSubMode('pixelart', true);
            window.HistoryManager?.record({ name: currentFileName, type: 'pixelart', img: currentImage, decodedText: '', settings: pixelArtHandler ? pixelArtHandler.getSettingsSnapshot() : {} });
            showToast('Không phát hiện mã QR. Đã tự động chuyển sang chế độ Pixel Art (8-Bit)!');
        } catch (err) {
            console.error('QR / Image Processing Error:', err);
            if (!forceQrOnly) setSubMode('pixelart', true);
            else showToast('Lỗi xử lý: ' + err.message);
        } finally {
            isProcessingImage = false;
        }
    }

    function reconstructAndVectorize() {
        if (!currentDecodedText) return;
        try {
            const logoOpts = window.QrLogoHandler ? window.QrLogoHandler.getOptions() : {};
            currentMatrixData = QrMatrixGenerator.generate(currentDecodedText, {
                hasLogo: logoOpts.hasLogo,
                logoBlocks: logoOpts.logoBlocks
            });
            if (window.QrLogoHandler && currentMatrixData?.cols) {
                window.QrLogoHandler.syncMatrixParity(currentMatrixData.cols);
            }
            displayDecodedInfo(currentDecodedText);
            triggerVectorize();
        } catch (err) {
            console.error('Matrix generation error:', err);
        }
    }

    function showStage() {
        [btnDownloadSvg, btnDownloadPng, btnCopySvg].forEach(b => { if (b) b.disabled = false; });
        if (stageEmptyState) stageEmptyState.style.display = 'none';
        if (stagePreviewArea) stagePreviewArea.style.display = 'flex';
        if (stageActionBar) stageActionBar.style.display = 'flex';
        if (stageSubmodePill) stageSubmodePill.style.display = (currentAppMode === 'convert' && currentImage && currentDecodedText) ? 'inline-flex' : 'none';
        if (statsCard) statsCard.style.display = (currentSubMode === 'pixelart' || currentAppMode === 'pixelart') ? 'none' : 'block';
    }

    function hideStage() {
        if (stagePreviewArea) stagePreviewArea.style.display = 'none';
        if (stageActionBar) stageActionBar.style.display = 'none';
        if (stageSubmodePill) stageSubmodePill.style.display = 'none';
        if (stageEmptyState) stageEmptyState.style.display = 'flex';
        [btnDownloadSvg, btnDownloadPng, btnCopySvg].forEach(b => { if (b) b.disabled = true; });
        if (statsCard) statsCard.style.display = 'none';
        const paCard = $('pixelArtStatsCard'); if (paCard) paCard.style.display = 'none';
        if (qrDecodedBanner) qrDecodedBanner.classList.remove('is-active');
        if (qrDetailsCard) qrDetailsCard.style.display = 'none';
        if (currentAppMode === 'convert' && !currentImage) {
            const qrGroup = $('qrSettingsGroup'), pixelArtGroup = $('pixelArtSettingsGroup');
            if (qrGroup) qrGroup.style.display = 'none';
            if (pixelArtGroup) pixelArtGroup.style.display = 'none';
        }
    }

    function displayDecodedInfo(text) {
        const isUrl = /^https?:\/\/[^\s]+$/i.test(text);
        if (qrDecodedTag) qrDecodedTag.textContent = isUrl ? 'URL' : 'TEXT';
        if (qrDecodedText) qrDecodedText.textContent = text;
        if (btnOpenQrUrl) { btnOpenQrUrl.href = isUrl ? text : '#'; btnOpenQrUrl.style.display = isUrl ? 'inline-flex' : 'none'; }
        if (qrDecodedBanner) qrDecodedBanner.classList.add('is-active');
        if (qrDetailsCard) qrDetailsCard.style.display = 'block';
        if (statQrType) statQrType.textContent = isUrl ? 'URL' : 'Text';
        if (statQrLength) statQrLength.textContent = `${text.length} chars`;
        if (qrDecodedFullText) qrDecodedFullText.textContent = text;
    }

    function triggerVectorize() {
        if (currentSubMode === 'pixelart' && currentAppMode !== 'generate') {
            pixelArtHandler?.renderVector();
            return;
        }
        if (!currentMatrixData) return;
        try {
            const result = QrVectorizer.vectorizeMatrix(currentMatrixData, getVectorizeOptions());
            renderVectorResult(result);
        } catch (err) {
            console.error('Vectorize error:', err);
        }
    }

    function renderVectorResult(result) {
        currentSvgData = result;
        svgDisplayWrapper.innerHTML = result.svgString;
        if (result?.width && result?.height) {
            svgDisplayWrapper.style.setProperty('--svg-aspect-ratio', `${result.width} / ${result.height}`);
        }
        if (statDimensions) statDimensions.textContent = `${result.width} × ${result.height} px`;
        if (statGrid) statGrid.textContent = `${result.gridCols} × ${result.gridRows} (${result.moduleCount} mod)`;
        if (statElements) statElements.textContent = result.shapeCount.toLocaleString();
    }

    function setZoom(val) {
        if (viewportCtrl) { viewportCtrl.reset(val); return; }
        currentZoom = Math.max(0.25, Math.min(4, Math.round(val * 100) / 100));
        svgDisplayWrapper.style.transform = `scale(${currentZoom})`;
        if (zoomLevelBadge) zoomLevelBadge.textContent = `${Math.round(currentZoom * 100)}%`;
    }

    function downloadSvg() { window.StageExporter?.downloadSvg(currentSvgData?.svgString || svgDisplayWrapper.innerHTML, currentFileName, currentSubMode === 'pixelart' ? '8bit' : currentMode, showToast); }
    function downloadPng() { window.StageExporter?.downloadPng(currentSvgData?.svgString || svgDisplayWrapper.innerHTML, currentFileName, currentSubMode === 'pixelart' ? '8bit' : currentMode, showToast, 1); }
    function copySvg() { window.StageExporter?.copySvg(currentSvgData?.svgString || svgDisplayWrapper.innerHTML, showToast); }

    function initHistory() {
        if (!window.HistoryManager) return;
        window.HistoryManager.init({
            gridId: 'historyGrid', emptyId: 'historyEmpty', cardId: 'historyCard',
            onRestore: (item) => restoreHistoryItem(item), onToast: (msg) => showToast(msg)
        });
    }

    function restoreHistoryItem(item) {
        if (!item || (!item.fullImage && !item.thumbnail)) return;
        const img = new Image();
        img.onload = () => {
            currentImage = img; currentFileName = item.name || 'restored';
            if (item.type === 'qr') {
                setAppMode('convert'); currentSubMode = 'qr'; currentDecodedText = item.decodedText || '';
                if (item.settings) loadSettings(item.settings);
                showStage(); reconstructAndVectorize();
            } else {
                setAppMode('convert');
                currentSubMode = 'pixelart';
                btnSubmodeQr?.classList.remove('is-active');
                btnSubmodePixelArt?.classList.add('is-active');
                const qg = $('qrSettingsGroup'), pg = $('pixelArtSettingsGroup');
                if (qg) qg.style.display = 'none';
                if (pg) pg.style.display = 'flex';
                if (qrDecodedBanner) qrDecodedBanner.classList.remove('is-active');
                if (qrDetailsCard) qrDetailsCard.style.display = 'none';
                if (statsCard) statsCard.style.display = 'none';
                pixelArtHandler?.activate();
                pixelArtHandler?.restoreSnapshot(img, item.settings || {});
                showStage();
            }
            showToast(window.QrToVectorI18n?.lang?.startsWith('vi') ? 'Đã khôi phục từ lịch sử!' : 'Restored from history!');
        };
        img.src = item.fullImage || item.thumbnail;
    }

    function showToast(text) { if (window.DomUtils) window.DomUtils.showToast(toast, text); }

    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
    else init();
})();
