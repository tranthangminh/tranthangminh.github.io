/**
 * Lucky Wheel - Main Application Controller
 * Handles state management, DOM bindings, module coordination, and LocalStorage persistence.
 */

document.addEventListener('DOMContentLoaded', () => {
    const PRESETS = window.LuckyWheelPresets ? window.LuckyWheelPresets.PRESETS : {};
    const PALETTE = window.LuckyWheelPresets ? window.LuckyWheelPresets.PALETTE : [];

    // --------------------------------------------------------------------------
    // 1. STATE MANAGEMENT & STORAGE
    // --------------------------------------------------------------------------
    let slices = [];
    let settings = {
        duration: 5000,
        eliminationMode: false,
        sizingMode: 'weighted', // Default: Weighted / Trọng số
        displayMode: '2d', // Default: '2d' | '3d_tilt' | '3d_cylinder'
        autoRainbow: true
    };
    let history = {};
    let currentPresetId = 'prizes';
    let lastWinnerSlice = null;
    let activeUnifiedTab = 'slices';

    const MAX_CUSTOM_PRESETS = 10;
    let customPresets = [];
    let currentEditingPresetId = null;

    // Load from LocalStorage
    try {
        const savedPresetId = localStorage.getItem('lucky_wheel_current_preset_id');
        if (savedPresetId) {
            currentPresetId = savedPresetId;
        }

        const savedSlices = localStorage.getItem('lucky_wheel_slices');
        if (savedSlices) {
            slices = JSON.parse(savedSlices);
        } else if (PRESETS[currentPresetId]) {
            slices = PRESETS[currentPresetId].slices.map((s, idx) => ({ ...s, id: 's_' + Date.now() + '_' + idx, enabled: true }));
        } else if (PRESETS['prizes']) {
            slices = PRESETS['prizes'].slices.map((s, idx) => ({ ...s, id: 's_' + Date.now() + '_' + idx, enabled: true }));
        }

        const savedSettings = localStorage.getItem('lucky_wheel_settings');
        if (savedSettings) {
            settings = { ...settings, ...JSON.parse(savedSettings) };
        }

        // Apply updated defaults v3 (eliminationMode: false, sizingMode: 'weighted', duration: 5000, autoRainbow: true)
        const hasDefaultsV3 = localStorage.getItem('lucky_wheel_defaults_v3');
        if (!hasDefaultsV3) {
            settings.eliminationMode = false;
            settings.sizingMode = 'weighted';
            settings.duration = 5000;
            settings.autoRainbow = true;
            localStorage.setItem('lucky_wheel_defaults_v3', 'true');
        }

        const savedHistory = localStorage.getItem('lucky_wheel_history');
        if (savedHistory) {
            const parsedHist = JSON.parse(savedHistory);
            if (Array.isArray(parsedHist)) {
                history = { [currentPresetId]: parsedHist };
            } else if (parsedHist && typeof parsedHist === 'object') {
                history = parsedHist;
            }
        }

        const savedCustomPresets = localStorage.getItem('lucky_wheel_custom_presets');
        if (savedCustomPresets) {
            const parsed = JSON.parse(savedCustomPresets);
            if (Array.isArray(parsed)) {
                customPresets = parsed.slice(0, MAX_CUSTOM_PRESETS);
            }
        }
    } catch (e) {
        console.warn('LocalStorage error, using defaults', e);
        if (PRESETS['prizes']) {
            slices = PRESETS['prizes'].slices.map((s, idx) => ({ ...s, id: 's_' + Date.now() + '_' + idx, enabled: true }));
        }
    }

    function getPresetDisplayName(pid) {
        const i18n = window.LuckyWheelI18n;
        if (!pid) return i18n ? i18n.t('presets.customGroup') : 'Tùy chỉnh';
        if (pid.startsWith('cp_')) {
            const cp = customPresets.find(p => p.id === pid);
            return cp ? cp.name : (i18n ? i18n.t('presets.customGroup') : 'Mẫu Của Bạn');
        }
        if (PRESETS[pid]) {
            return i18n ? i18n.t('presetsList.' + pid) : PRESETS[pid].name;
        }
        return pid;
    }

    function saveState() {
        const historyData = window.LuckyWheelHistory ? window.LuckyWheelHistory.getHistoryMap() : history;

        // Auto-sync slices into the active custom preset
        if (currentPresetId && currentPresetId.startsWith('cp_')) {
            const activeCP = customPresets.find(p => p.id === currentPresetId);
            if (activeCP) {
                activeCP.slices = JSON.parse(JSON.stringify(slices));
                updateCustomPresetOptionText(currentPresetId, activeCP.name, slices.length);
            }
        }

        try {
            localStorage.setItem('lucky_wheel_slices', JSON.stringify(slices));
            localStorage.setItem('lucky_wheel_settings', JSON.stringify(settings));
            localStorage.setItem('lucky_wheel_history', JSON.stringify(historyData));
            localStorage.setItem('lucky_wheel_custom_presets', JSON.stringify(customPresets));
            localStorage.setItem('lucky_wheel_current_preset_id', currentPresetId);
        } catch (e) {
            console.error('Failed to save to localStorage', e);
        }

        // Synchronize with Cloud if signed in
        if (window.SharedAuth && typeof window.SharedAuth.saveData === 'function') {
            window.SharedAuth.saveData({
                slices: slices,
                settings: settings,
                history: historyData,
                customPresets: customPresets,
                currentPresetId: currentPresetId
            });
        }
    }

    // Update the text of a single custom preset <option> without resetting the whole dropdown
    function updateCustomPresetOptionText(presetId, name, count) {
        const optgroup = document.getElementById('customPresetsOptgroup');
        if (!optgroup) return;
        const opt = optgroup.querySelector(`option[value="${presetId}"]`);
        if (opt) {
            opt.textContent = `⭐ ${name} (${count})`;
        }
    }


    // --------------------------------------------------------------------------
    // 2. DOM ELEMENTS
    // --------------------------------------------------------------------------
    const wheelCanvas = document.getElementById('wheelCanvas');
    const pointerCanvas = document.getElementById('pointerCanvas');

    const centerSpinBtn = document.getElementById('centerSpinBtn');
    const mainSpinBtn = document.getElementById('mainSpinBtn');
    const shuffleBtn = document.getElementById('shuffleBtn');

    // Panel collapse & toggle button (in wheel-controls)
    const togglePanelBtn = document.getElementById('togglePanelBtn');

    const appLayout = document.querySelector('.app-layout');
    const soundToggleBtn = document.getElementById('soundToggleBtn');

    // Unified Tabs Elements (Slices & Settings / History)
    const tabBtnSlices = document.getElementById('tabBtnSlices');
    const tabBtnHistory = document.getElementById('tabBtnHistory');
    const tabPaneSlices = document.getElementById('tabPaneSlices');
    const tabPaneHistory = document.getElementById('tabPaneHistory');

    // Settings Card Elements
    const rainbowToggle = document.getElementById('rainbowToggle');
    const eliminationToggle = document.getElementById('eliminationToggle');
    const btnModeEqual = document.getElementById('btnModeEqual');
    const btnModeWeighted = document.getElementById('btnModeWeighted');
    const btnModeEqualWeighted = document.getElementById('btnModeEqualWeighted');
    const durationSlider = document.getElementById('durationSlider');
    const durationVal = document.getElementById('durationVal');
    const presetSelect = document.getElementById('presetSelect');
    const customPresetsOptgroup = document.getElementById('customPresetsOptgroup');
    const defaultPresetsOptgroup = document.getElementById('defaultPresetsOptgroup');
    const editPresetBtn = document.getElementById('editPresetBtn');
    const newPresetBtn = document.getElementById('newPresetBtn');

    // Preset Modal Elements
    const presetModal = document.getElementById('presetModal');
    const presetModalHeading = document.getElementById('presetModalHeading');
    const presetModalCloseBtn = document.getElementById('presetModalCloseBtn');
    const presetCancelBtn = document.getElementById('presetCancelBtn');
    const presetSaveBtn = document.getElementById('presetSaveBtn');
    const presetDeleteBtn = document.getElementById('presetDeleteBtn');
    const presetNameInput = document.getElementById('presetNameInput');
    const presetQuotaCount = document.getElementById('presetQuotaCount');
    const presetSlicesCount = document.getElementById('presetSlicesCount');
    const presetAlertMsg = document.getElementById('presetAlertMsg');

    const presetSelectSettings = document.getElementById('presetSelectSettings');
    const sortSelect = document.getElementById('sortSelect');
    const wheelStage = document.getElementById('wheelStage');

    // --------------------------------------------------------------------------
    // 3. UNIFIED TABS CONTROLLER (Slices & Settings / History)
    // --------------------------------------------------------------------------
    function switchUnifiedTab(tab) {
        activeUnifiedTab = tab;
        if (tabBtnSlices) {
            tabBtnSlices.classList.toggle('is-active', tab === 'slices');
            tabBtnSlices.setAttribute('aria-selected', tab === 'slices' ? 'true' : 'false');
        }
        if (tabBtnHistory) {
            tabBtnHistory.classList.toggle('is-active', tab === 'history');
            tabBtnHistory.setAttribute('aria-selected', tab === 'history' ? 'true' : 'false');
        }
        if (tabPaneSlices) {
            tabPaneSlices.style.display = tab === 'slices' ? 'flex' : 'none';
            tabPaneSlices.classList.toggle('is-active', tab === 'slices');
        }
        if (tabPaneHistory) {
            tabPaneHistory.style.display = tab === 'history' ? 'flex' : 'none';
            tabPaneHistory.classList.toggle('is-active', tab === 'history');
        }
    }

    if (tabBtnSlices) {
        tabBtnSlices.addEventListener('click', () => switchUnifiedTab('slices'));
    }
    if (tabBtnHistory) {
        tabBtnHistory.addEventListener('click', () => switchUnifiedTab('history'));
    }

    // --------------------------------------------------------------------------
    // 4. WHEEL ENGINE INITIALIZATION
    // --------------------------------------------------------------------------
    const wheelEngine = new window.LuckyWheelEngine(wheelCanvas, {
        pointerCanvas: pointerCanvas,
        sizingMode: settings.sizingMode,
        displayMode: settings.displayMode || '2d',
        spinDuration: settings.duration,
        onTick: (speed) => {
            window.soundEngine.playTick(speed);
        },
        onSpinEnd: (winner, winnerIdx) => {
            handleSpinWinner(winner, winnerIdx);
        }
    });
    window.wheelEngine = wheelEngine;

    // --------------------------------------------------------------------------
    // 5. SUB-MODULES INITIALIZATION
    // --------------------------------------------------------------------------
    if (window.LuckyWheelHistory) {
        window.LuckyWheelHistory.init({
            history: history,
            presetId: currentPresetId,
            presetName: getPresetDisplayName(currentPresetId),
            saveState: saveState
        });
    }

    if (window.LuckyWheelSlices) {
        window.LuckyWheelSlices.init({
            slices: slices,
            settings: settings,
            wheelEngine: wheelEngine,
            saveState: saveState,
            PALETTE: PALETTE
        });
    }

    if (window.LuckyWheelWinnerModal) {
        window.LuckyWheelWinnerModal.init({
            onSpinAgain: triggerSpin,
            onHideWinner: (winner) => {
                const target = slices.find(s => s.id === winner.id);
                if (target) {
                    target.enabled = false;
                    saveState();
                    if (window.LuckyWheelSlices) window.LuckyWheelSlices.renderSlices();
                    wheelEngine.setSlices(slices);
                }
            }
        });
    }

    // Sync wheel with initial slice data
    wheelEngine.setSlices(slices);

    // --------------------------------------------------------------------------
    // 6. SPIN ACTION & WINNER HANDLING
    // --------------------------------------------------------------------------
    function triggerSpin() {
        if (wheelEngine.isSpinning) return;
        const activeSlices = slices.filter(s => s.enabled !== false);
        if (activeSlices.length < 2) {
            const alertMsg = window.LuckyWheelI18n ? window.LuckyWheelI18n.t('alerts.minSlices') : 'Please add at least 2 active slices to spin the wheel!';
            alert(alertMsg);
            return;
        }

        // Close any open modals
        if (window.LuckyWheelWinnerModal) window.LuckyWheelWinnerModal.close();
        const bulkEditModal = document.getElementById('bulkEditModal');
        if (bulkEditModal) bulkEditModal.classList.remove('is-open');

        if (mainSpinBtn) mainSpinBtn.disabled = true;
        if (centerSpinBtn) centerSpinBtn.disabled = true;
        const casinoRing = document.getElementById('casinoLightsRing');
        const casinoCenter = document.getElementById('casinoCenterLights');
        if (casinoRing) {
            casinoRing.classList.remove('is-winning');
            casinoRing.classList.add('is-spinning');
        }
        if (casinoCenter) {
            casinoCenter.classList.remove('is-winning');
            casinoCenter.classList.add('is-spinning');
        }
        document.body.classList.add('wheel-is-spinning');
        wheelEngine.spin();
    }

    function handleSpinWinner(winner, winnerIdx) {
        if (mainSpinBtn) mainSpinBtn.disabled = false;
        if (centerSpinBtn) centerSpinBtn.disabled = false;
        document.body.classList.remove('wheel-is-spinning');
        lastWinnerSlice = winner;

        const casinoRing = document.getElementById('casinoLightsRing');
        const casinoCenter = document.getElementById('casinoCenterLights');
        if (casinoRing) {
            casinoRing.classList.remove('is-spinning');
            casinoRing.classList.add('is-winning');
            setTimeout(() => {
                casinoRing.classList.remove('is-winning');
            }, 3500);
        }
        if (casinoCenter) {
            casinoCenter.classList.remove('is-spinning');
            casinoCenter.classList.add('is-winning');
            setTimeout(() => {
                casinoCenter.classList.remove('is-winning');
            }, 3500);
        }

        // Play celebrations
        window.soundEngine.playWin();

        // Record history
        if (window.LuckyWheelHistory) {
            window.LuckyWheelHistory.recordHistory(winner);
        }

        // Check Elimination Mode: Auto-hide slice from wheel
        if (settings.eliminationMode) {
            const target = slices.find(s => s.id === winner.id);
            if (target) {
                target.enabled = false;
                saveState();
                if (window.LuckyWheelSlices) window.LuckyWheelSlices.renderSlices();
                wheelEngine.setSlices(slices);
            }
        }

        // Display Winner Modal
        if (window.LuckyWheelWinnerModal) {
            window.LuckyWheelWinnerModal.show(winner, settings.eliminationMode);
        }
    }

    // --------------------------------------------------------------------------
    // 7. EVENT LISTENERS & TOOLBAR ACTIONS
    // --------------------------------------------------------------------------
    if (mainSpinBtn) mainSpinBtn.addEventListener('click', triggerSpin);
    if (centerSpinBtn) centerSpinBtn.addEventListener('click', triggerSpin);
    wheelCanvas.addEventListener('click', (e) => {
        // Only trigger if clicked inside hub radius
        const rect = wheelCanvas.getBoundingClientRect();
        const x = e.clientX - rect.left - rect.width / 2;
        const y = e.clientY - rect.top - rect.height / 2;
        const dist = Math.sqrt(x * x + y * y);
        if (dist <= rect.width * 0.20) {
            triggerSpin();
        }
    });

    // Shuffle
    shuffleBtn.addEventListener('click', () => {
        if (wheelEngine.isSpinning) return;
        for (let i = slices.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [slices[i], slices[j]] = [slices[j], slices[i]];
        }
        saveState();
        if (window.LuckyWheelSlices) window.LuckyWheelSlices.renderSlices();
        wheelEngine.setSlices(slices);
    });

    // Sound toggle
    function updateSoundUI() {
        const isMuted = window.soundEngine.isMuted;
        soundToggleBtn.innerHTML = isMuted ? '🔇' : '🔊';
        soundToggleBtn.classList.toggle('is-active', !isMuted);
    }
    updateSoundUI();
    soundToggleBtn.addEventListener('click', () => {
        window.soundEngine.toggleMute();
        updateSoundUI();
    });

    // Language toggle
    const langToggleBtn = document.getElementById('langToggleBtn');
    function updateLangBtnUI() {
        if (!langToggleBtn || !window.LuckyWheelI18n) return;
        const current = window.LuckyWheelI18n.lang;
        const nextLang = current === 'en' ? 'vi' : 'en';
        const nextCode = nextLang === 'en' ? 'EN' : 'VN';
        const flagClass = nextLang === 'en' ? 'lang-flag--en' : 'lang-flag--vi';

        langToggleBtn.setAttribute('data-lang', nextLang);
        langToggleBtn.setAttribute('aria-label', nextLang === 'en' ? 'Switch to English' : 'Chuyển sang Tiếng Việt');
        langToggleBtn.innerHTML = `
            <span class="lang-flag ${flagClass}" aria-hidden="true"></span>
            <span class="lang-code">${nextCode}</span>
        `;
    }

    function updateEditPresetBtnState() {
        if (!editPresetBtn || !presetSelect) return;
        const val = presetSelect.value;
        const isCustom = !!(val && val.startsWith('cp_'));
        editPresetBtn.disabled = !isCustom;
    }

    function updatePresetOptions() {
        const i18n = window.LuckyWheelI18n;
        const selects = [presetSelect, presetSelectSettings, sortSelect];
        selects.forEach(sel => {
            if (!sel) return;
            const opts = sel.querySelectorAll('option');
            opts.forEach(opt => {
                if (opt.dataset.i18n && i18n) {
                    opt.textContent = i18n.t(opt.dataset.i18n);
                }
            });
        });

        // Update Custom Presets Optgroup
        if (customPresetsOptgroup) {
            const curVal = presetSelect ? presetSelect.value : '';
            customPresetsOptgroup.label = i18n ? i18n.t('presets.customGroup') : 'Mẫu Của Bạn';
            customPresetsOptgroup.innerHTML = '';
            if (customPresets.length === 0) {
                customPresetsOptgroup.style.display = 'none';
            } else {
                customPresetsOptgroup.style.display = '';
                customPresets.forEach(cp => {
                    const opt = document.createElement('option');
                    opt.value = cp.id;
                    opt.textContent = `⭐ ${cp.name} (${cp.slices ? cp.slices.length : 0})`;
                    customPresetsOptgroup.appendChild(opt);
                });
            }
            if (presetSelect) presetSelect.value = curVal;
        }

        // Update Default Presets Optgroup
        if (defaultPresetsOptgroup && i18n) {
            defaultPresetsOptgroup.label = i18n.t('presets.defaultGroup');
        }

        // Ensure current preset is selected in dropdown
        if (presetSelect && currentPresetId) {
            presetSelect.value = currentPresetId;
        }

        updateEditPresetBtnState();
    }

    if (langToggleBtn) {
        langToggleBtn.addEventListener('click', () => {
            if (window.LuckyWheelI18n) {
                window.LuckyWheelI18n.toggleLang();
            }
        });
    }

    function updatePanelButtonsUI() {
        if (!appLayout || !togglePanelBtn) return;
        const isControlsHidden = appLayout.classList.contains('hide-controls');
        togglePanelBtn.classList.toggle('is-panel-hidden', isControlsHidden);
    }

    function togglePanel() {
        if (!appLayout) return;
        appLayout.classList.toggle('hide-controls');
        updatePanelButtonsUI();

        // Trigger wheelEngine resize when animation completes so canvas remains sharp and centered
        setTimeout(() => {
            if (wheelEngine) wheelEngine.resize();
        }, 440);
    }

    if (togglePanelBtn) {
        togglePanelBtn.addEventListener('click', togglePanel);
    }

    if (wheelStage) {
        wheelStage.addEventListener('transitionend', () => {
            if (wheelEngine) wheelEngine.resize();
        });
    }

    // Responsive synchronization on resize
    window.addEventListener('resize', () => {
        updatePanelButtonsUI();
    });

    window.addEventListener('app-lang-changed', () => {
        updateLangBtnUI();
        updatePresetOptions();
        updateSoundUI();
        if (window.LuckyWheelSlices) {
            window.LuckyWheelSlices.updateToggleAllBtnUI();
            window.LuckyWheelSlices.renderSlices();
        }
        if (window.LuckyWheelHistory) {
            window.LuckyWheelHistory.updatePresetName(getPresetDisplayName(currentPresetId));
            window.LuckyWheelHistory.renderHistory();
        }
        if (wheelEngine) wheelEngine.draw();
        updatePanelButtonsUI();
    });

    // Preset selection handler
    const handlePresetChange = (e) => {
        const key = e.target.value;
        if (!key) {
            updateEditPresetBtnState();
            return;
        }

        currentPresetId = key;

        // Custom preset selected
        if (key.startsWith('cp_')) {
            const cp = customPresets.find(p => p.id === key);
            if (cp && Array.isArray(cp.slices) && cp.slices.length > 0) {
                slices = JSON.parse(JSON.stringify(cp.slices));
                if (settings.autoRainbow && window.LuckyWheelSlices) {
                    window.LuckyWheelSlices.applyRainbowColors();
                }
                saveState();
                if (window.LuckyWheelSlices) {
                    window.LuckyWheelSlices.setSlices(slices);
                }
                wheelEngine.setSlices(slices);
            }
            if (window.LuckyWheelHistory) {
                window.LuckyWheelHistory.setPreset(currentPresetId, getPresetDisplayName(currentPresetId));
            }
            updateEditPresetBtnState();
            return;
        }

        // Default preset selected
        if (PRESETS[key]) {
            slices = PRESETS[key].slices.map((s, idx) => ({ ...s, id: 's_' + Date.now() + '_' + idx, enabled: true }));
            if (settings.autoRainbow && window.LuckyWheelSlices) {
                window.LuckyWheelSlices.applyRainbowColors();
            }
            saveState();
            if (window.LuckyWheelSlices) {
                window.LuckyWheelSlices.setSlices(slices);
            }
            wheelEngine.setSlices(slices);
            if (window.LuckyWheelHistory) {
                window.LuckyWheelHistory.setPreset(currentPresetId, getPresetDisplayName(currentPresetId));
            }
            updateEditPresetBtnState();
        }
    };
    if (presetSelect) presetSelect.addEventListener('change', handlePresetChange);
    if (presetSelectSettings) presetSelectSettings.addEventListener('change', handlePresetChange);

    // --------------------------------------------------------------------------
    // 3.5 CUSTOM PRESET CONTROLLER & MODAL
    // --------------------------------------------------------------------------
    function openPresetModal(mode, presetId = null) {
        if (!presetModal) return;
        const i18n = window.LuckyWheelI18n;
        currentEditingPresetId = presetId;
        if (presetAlertMsg) {
            presetAlertMsg.style.display = 'none';
            presetAlertMsg.textContent = '';
        }
        if (presetQuotaCount) presetQuotaCount.textContent = customPresets.length;

        if (mode === 'create') {
            if (customPresets.length >= MAX_CUSTOM_PRESETS) {
                alert(i18n ? i18n.t('presets.limitReached') : 'Bạn đã đạt giới hạn tối đa 10 mẫu. Vui lòng xóa bớt mẫu cũ để lưu mẫu mới!');
                return;
            }
            if (presetModalHeading) {
                presetModalHeading.textContent = i18n ? i18n.t('presets.modalCreateHeading') : '💾 Lưu Các Ô Hiện Tại Thành Mẫu Mới';
            }
            if (presetDeleteBtn) presetDeleteBtn.style.display = 'none';
            if (presetSaveBtn) {
                presetSaveBtn.textContent = i18n ? i18n.t('presets.save') : 'Lưu Mẫu';
            }
            if (presetSlicesCount) presetSlicesCount.textContent = slices.length;
            if (presetNameInput) {
                presetNameInput.value = '';
            }
        } else if (mode === 'edit') {
            const targetPreset = customPresets.find(p => p.id === presetId);
            if (!targetPreset) return;

            if (presetModalHeading) {
                presetModalHeading.textContent = i18n ? i18n.t('presets.modalEditHeading') : '✏️ Đổi Tên / Quản Lý Mẫu';
            }
            if (presetDeleteBtn) presetDeleteBtn.style.display = 'inline-block';
            if (presetSaveBtn) {
                presetSaveBtn.textContent = i18n ? i18n.t('presets.update') : 'Cập Nhật Tên';
            }
            if (presetSlicesCount) presetSlicesCount.textContent = targetPreset.slices ? targetPreset.slices.length : 0;
            if (presetNameInput) {
                presetNameInput.value = targetPreset.name || '';
            }
        }

        presetModal.classList.add('is-open');
        setTimeout(() => {
            if (presetNameInput) {
                presetNameInput.focus();
                presetNameInput.select();
            }
        }, 50);
    }

    function closePresetModal() {
        if (!presetModal) return;
        presetModal.classList.remove('is-open');
        currentEditingPresetId = null;
    }

    function handleSavePreset() {
        const i18n = window.LuckyWheelI18n;
        const name = presetNameInput ? presetNameInput.value.trim() : '';
        if (!name) {
            if (presetAlertMsg) {
                presetAlertMsg.textContent = i18n ? i18n.t('presets.nameRequired') : 'Vui lòng nhập tên cho mẫu!';
                presetAlertMsg.style.display = 'block';
            }
            if (presetNameInput) presetNameInput.focus();
            return;
        }

        if (currentEditingPresetId) {
            const target = customPresets.find(p => p.id === currentEditingPresetId);
            if (target) {
                target.name = name;
                if (currentEditingPresetId === currentPresetId && window.LuckyWheelHistory) {
                    window.LuckyWheelHistory.updatePresetName(name);
                }
                saveState();
                updatePresetOptions();
                if (presetSelect) presetSelect.value = currentEditingPresetId;
                updateEditPresetBtnState();
            }
        } else {
            if (customPresets.length >= MAX_CUSTOM_PRESETS) {
                if (presetAlertMsg) {
                    presetAlertMsg.textContent = i18n ? i18n.t('presets.limitReached') : 'Bạn đã đạt giới hạn tối đa 10 mẫu!';
                    presetAlertMsg.style.display = 'block';
                }
                return;
            }
            const newPreset = {
                id: 'cp_' + Date.now(),
                name: name,
                createdAt: Date.now(),
                slices: JSON.parse(JSON.stringify(slices))
            };
            customPresets.push(newPreset);
            currentPresetId = newPreset.id;
            if (window.LuckyWheelHistory) {
                window.LuckyWheelHistory.setPreset(currentPresetId, newPreset.name);
            }
            saveState();
            updatePresetOptions();
            if (presetSelect) presetSelect.value = newPreset.id;
            updateEditPresetBtnState();
        }
        closePresetModal();
    }

    function handleDeletePreset() {
        if (!currentEditingPresetId) return;
        const i18n = window.LuckyWheelI18n;
        const confirmMsg = i18n ? i18n.t('presets.deleteConfirm') : 'Bạn có chắc chắn muốn xóa mẫu này không?';
        if (!confirm(confirmMsg)) return;

        if (window.LuckyWheelHistory) {
            window.LuckyWheelHistory.deletePresetHistory(currentEditingPresetId);
        }
        customPresets = customPresets.filter(p => p.id !== currentEditingPresetId);
        if (currentPresetId === currentEditingPresetId) {
            currentPresetId = 'prizes';
            if (window.LuckyWheelHistory) {
                window.LuckyWheelHistory.setPreset('prizes', getPresetDisplayName('prizes'));
            }
        }
        saveState();
        updatePresetOptions();
        if (presetSelect) presetSelect.value = currentPresetId;
        updateEditPresetBtnState();
        closePresetModal();
    }

    if (newPresetBtn) {
        newPresetBtn.addEventListener('click', () => {
            const i18n = window.LuckyWheelI18n;
            if (customPresets.length >= MAX_CUSTOM_PRESETS) {
                alert(i18n ? i18n.t('presets.limitReached') : 'Bạn đã đạt giới hạn tối đa 10 mẫu. Vui lòng xóa bớt mẫu cũ để lưu mẫu mới!');
                return;
            }
            openPresetModal('create');
        });
    }

    if (editPresetBtn) {
        editPresetBtn.addEventListener('click', () => {
            const i18n = window.LuckyWheelI18n;
            const currentVal = presetSelect ? presetSelect.value : '';
            if (currentVal && currentVal.startsWith('cp_')) {
                openPresetModal('edit', currentVal);
            } else if (customPresets.length > 0) {
                openPresetModal('edit', customPresets[0].id);
            } else {
                alert(i18n ? i18n.t('presets.selectCustomToEdit') : 'Vui lòng chọn một mẫu tự tạo từ danh sách để sửa hoặc xóa.');
            }
        });
    }

    if (presetSaveBtn) presetSaveBtn.addEventListener('click', handleSavePreset);
    if (presetDeleteBtn) presetDeleteBtn.addEventListener('click', handleDeletePreset);
    if (presetCancelBtn) presetCancelBtn.addEventListener('click', closePresetModal);
    if (presetModalCloseBtn) presetModalCloseBtn.addEventListener('click', closePresetModal);
    if (presetModal) {
        presetModal.addEventListener('click', (e) => {
            if (e.target === presetModal) closePresetModal();
        });
    }
    if (presetNameInput) {
        presetNameInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                handleSavePreset();
            }
        });
    }
    window.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && presetModal && presetModal.classList.contains('is-open')) {
            closePresetModal();
        }
    });

    // Rainbow color mode toggle
    if (rainbowToggle) {
        rainbowToggle.checked = !!settings.autoRainbow;
        rainbowToggle.addEventListener('change', (e) => {
            settings.autoRainbow = e.target.checked;
            if (window.LuckyWheelSlices) {
                if (settings.autoRainbow) {
                    window.LuckyWheelSlices.applyRainbowColors();
                } else {
                    window.LuckyWheelSlices.restoreOriginalColors();
                }
                window.LuckyWheelSlices.renderSlices();
            }
            saveState();
            wheelEngine.setSlices(slices);
        });
    }

    // Elimination mode toggle
    if (eliminationToggle) {
        eliminationToggle.checked = settings.eliminationMode;
        eliminationToggle.addEventListener('change', (e) => {
            settings.eliminationMode = e.target.checked;
            saveState();
        });
    }

    // Display mode (Standard 2D)
    function updateDisplayModeUI() {
        if (wheelStage) {
            wheelStage.classList.remove('mode-3d-tilt', 'mode-3d-cylinder');
            wheelStage.classList.add('mode-2d');
        }
        if (wheelEngine) {
            wheelEngine.setDisplayMode('2d');
        }
    }

    // Sizing mode (Equal vs Weighted vs Equal-Weighted)
    function updateSizingModeUI() {
        const isEqual = settings.sizingMode === 'equal';
        if (btnModeEqual) btnModeEqual.classList.toggle('is-active', isEqual);
        if (btnModeWeighted) btnModeWeighted.classList.toggle('is-active', settings.sizingMode === 'weighted');
        if (btnModeEqualWeighted) {
            btnModeEqualWeighted.classList.toggle('is-active', settings.sizingMode === 'equal_weighted');
        }
        wheelEngine.setSizingMode(settings.sizingMode);
        if (window.LuckyWheelSlices) window.LuckyWheelSlices.renderSlices();
    }
    if (btnModeEqual) {
        btnModeEqual.addEventListener('click', () => {
            settings.sizingMode = 'equal';
            saveState();
            updateSizingModeUI();
        });
    }
    if (btnModeWeighted) {
        btnModeWeighted.addEventListener('click', () => {
            settings.sizingMode = 'weighted';
            saveState();
            updateSizingModeUI();
        });
    }
    if (btnModeEqualWeighted) {
        btnModeEqualWeighted.addEventListener('click', () => {
            settings.sizingMode = 'equal_weighted';
            saveState();
            updateSizingModeUI();
        });
    }

    // Duration slider
    if (durationSlider) {
        durationSlider.value = settings.duration / 1000;
        if (durationVal) durationVal.textContent = `${durationSlider.value}s`;
        durationSlider.addEventListener('input', (e) => {
            const sec = e.target.value;
            if (durationVal) durationVal.textContent = `${sec}s`;
            settings.duration = sec * 1000;
            wheelEngine.spinDuration = settings.duration;
            saveState();
        });
    }

    // Spacebar to spin
    window.addEventListener('keydown', (e) => {
        if (e.code === 'Space' && document.activeElement.tagName !== 'INPUT' && document.activeElement.tagName !== 'TEXTAREA') {
            e.preventDefault();
            triggerSpin();
        }
    });

    // Sync language UI on boot
    if (window.LuckyWheelI18n) {
        window.LuckyWheelI18n.applyTranslations();
        updateLangBtnUI();
        updatePresetOptions();
        updateSoundUI();
    }

    // Initial render
    if (window.LuckyWheelSlices) window.LuckyWheelSlices.renderSlices();
    if (window.LuckyWheelHistory) window.LuckyWheelHistory.renderHistory();
    updateSizingModeUI();
    updateDisplayModeUI();
    updatePanelButtonsUI();

    // Re-draw wheel once Montserrat font is loaded
    if (document.fonts) {
        document.fonts.ready.then(() => {
            if (wheelEngine) wheelEngine.draw();
        });
    }

    // --------------------------------------------------------------------------
    // 8. UNIVERSAL SHARED AUTHENTICATION & CLOUD SYNC INITIALIZATION
    // --------------------------------------------------------------------------
    if (window.SharedAuth) {
        window.SharedAuth.init({
            appId: 'lucky_wheel',
            mountTo: '#sharedAuthSlot',
            onUserChange: (user) => {
                if (user) {
                    console.log('[LuckyWheel] Logged in as:', user.displayName || user.email);
                } else {
                    console.log('[LuckyWheel] Running in local offline mode.');
                }
            },
            onDataLoaded: (cloudData) => {
                if (!cloudData) return;

                // Safely merge cloud slices
                if (Array.isArray(cloudData.slices) && cloudData.slices.length >= 2) {
                    slices = cloudData.slices;
                }

                // Safely merge cloud settings
                if (cloudData.settings && typeof cloudData.settings === 'object') {
                    settings = { ...settings, ...cloudData.settings };
                    if (eliminationToggle) eliminationToggle.checked = settings.eliminationMode;
                    if (rainbowToggle) rainbowToggle.checked = !!settings.autoRainbow;
                    if (durationSlider) {
                        durationSlider.value = settings.duration / 1000;
                        if (durationVal) durationVal.textContent = `${durationSlider.value}s`;
                    }
                    if (wheelEngine) wheelEngine.spinDuration = settings.duration;
                    updateSizingModeUI();
                }

                // Safely merge cloud history
                if (cloudData.history) {
                    if (window.LuckyWheelHistory) {
                        window.LuckyWheelHistory.setHistoryMap(cloudData.history);
                    }
                }

                // Safely merge cloud custom presets
                if (Array.isArray(cloudData.customPresets)) {
                    customPresets = cloudData.customPresets.slice(0, MAX_CUSTOM_PRESETS);
                    try {
                        localStorage.setItem('lucky_wheel_custom_presets', JSON.stringify(customPresets));
                    } catch (e) {}
                    updatePresetOptions();
                }

                // Safely restore current preset from cloud
                if (cloudData.currentPresetId) {
                    currentPresetId = cloudData.currentPresetId;
                    if (window.LuckyWheelHistory) {
                        window.LuckyWheelHistory.setPreset(currentPresetId, getPresetDisplayName(currentPresetId));
                    }
                    if (presetSelect) presetSelect.value = currentPresetId;
                    updateEditPresetBtnState();
                }

                if (window.LuckyWheelSlices) window.LuckyWheelSlices.setSlices(slices);
                wheelEngine.setSlices(slices);
            }
        });
    }
});
