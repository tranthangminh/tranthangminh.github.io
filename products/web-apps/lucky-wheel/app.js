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
    let history = [];
    let lastWinnerSlice = null;
    let activeUnifiedTab = 'slices';

    // Load from LocalStorage
    try {
        const savedSlices = localStorage.getItem('lucky_wheel_slices');
        if (savedSlices) {
            slices = JSON.parse(savedSlices);
        } else if (PRESETS['food']) {
            slices = PRESETS['food'].slices.map((s, idx) => ({ ...s, id: 's_' + Date.now() + '_' + idx, enabled: true }));
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
            history = JSON.parse(savedHistory);
        }
    } catch (e) {
        console.warn('LocalStorage error, using defaults', e);
        if (PRESETS['food']) {
            slices = PRESETS['food'].slices.map((s, idx) => ({ ...s, id: 's_' + Date.now() + '_' + idx, enabled: true }));
        }
    }

    function saveState() {
        try {
            localStorage.setItem('lucky_wheel_slices', JSON.stringify(slices));
            localStorage.setItem('lucky_wheel_settings', JSON.stringify(settings));
            localStorage.setItem('lucky_wheel_history', JSON.stringify(history));
        } catch (e) {
            console.error('Failed to save to localStorage', e);
        }

        // Synchronize with Cloud if signed in
        if (window.SharedAuth && typeof window.SharedAuth.saveData === 'function') {
            window.SharedAuth.saveData({
                slices: slices,
                settings: settings,
                history: history
            });
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

    // Panel collapse & toggle buttons (in wheel-controls)
    const toggleHistoryBtn = document.getElementById('toggleHistoryBtn');
    const toggleControlsBtn = document.getElementById('toggleControlsBtn');

    const appLayout = document.querySelector('.app-layout');
    const soundToggleBtn = document.getElementById('soundToggleBtn');

    // Tablet & Mobile Unified Tabs Elements
    const tabBtnSlices = document.getElementById('tabBtnSlices');
    const tabBtnHistory = document.getElementById('tabBtnHistory');
    const tabPaneSlices = document.getElementById('tabPaneSlices');
    const tabPaneHistory = document.getElementById('tabPaneHistory');
    const historyCardContent = document.getElementById('historyCardContent');
    const tabHistorySlot = document.getElementById('tabHistorySlot');
    const historyPanel = document.getElementById('historyPanel');

    // Settings Card Elements
    const rainbowToggle = document.getElementById('rainbowToggle');
    const eliminationToggle = document.getElementById('eliminationToggle');
    const btnDisplay2D = document.getElementById('btnDisplay2D');
    const btnDisplay3DTilt = document.getElementById('btnDisplay3DTilt');
    const btnDisplay3DCylinder = document.getElementById('btnDisplay3DCylinder');
    const btnModeEqual = document.getElementById('btnModeEqual');
    const btnModeWeighted = document.getElementById('btnModeWeighted');
    const btnModeEqualWeighted = document.getElementById('btnModeEqualWeighted');
    const durationSlider = document.getElementById('durationSlider');
    const durationVal = document.getElementById('durationVal');
    const presetSelect = document.getElementById('presetSelect');
    const presetSelectSettings = document.getElementById('presetSelectSettings');
    const sortSelect = document.getElementById('sortSelect');
    const wheelStage = document.getElementById('wheelStage');

    // --------------------------------------------------------------------------
    // 3. TABLET & MOBILE UNIFIED TABS CONTROLLER
    // --------------------------------------------------------------------------
    function syncHistoryDOM() {
        const isTabletOrMobile = window.innerWidth < 1200;
        if (!historyCardContent || !historyPanel || !tabHistorySlot) return;
        if (isTabletOrMobile) {
            if (historyCardContent.parentElement !== tabHistorySlot) {
                tabHistorySlot.appendChild(historyCardContent);
            }
        } else {
            if (historyCardContent.parentElement !== historyPanel) {
                historyPanel.appendChild(historyCardContent);
            }
            if (tabPaneSlices) {
                tabPaneSlices.style.display = 'flex';
            }
            if (tabPaneHistory) {
                tabPaneHistory.style.display = 'none';
            }
        }
    }

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
        syncHistoryDOM();
        updatePanelButtonsUI();
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

    // --------------------------------------------------------------------------
    // 5. SUB-MODULES INITIALIZATION
    // --------------------------------------------------------------------------
    if (window.LuckyWheelHistory) {
        window.LuckyWheelHistory.init({
            history: history,
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

        mainSpinBtn.disabled = true;
        wheelEngine.spin();
    }

    function handleSpinWinner(winner, winnerIdx) {
        mainSpinBtn.disabled = false;
        lastWinnerSlice = winner;

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
    // Spin buttons
    mainSpinBtn.addEventListener('click', triggerSpin);
    centerSpinBtn.addEventListener('click', triggerSpin);
    wheelCanvas.addEventListener('click', (e) => {
        // Only trigger if clicked inside hub radius
        const rect = wheelCanvas.getBoundingClientRect();
        const x = e.clientX - rect.left - rect.width / 2;
        const y = e.clientY - rect.top - rect.height / 2;
        const dist = Math.sqrt(x * x + y * y);
        if (dist <= rect.width * 0.18) {
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

    function updatePresetOptions() {
        if (!window.LuckyWheelI18n) return;
        const i18n = window.LuckyWheelI18n;
        const selects = [presetSelect, presetSelectSettings, sortSelect];
        selects.forEach(sel => {
            if (!sel) return;
            const opts = sel.querySelectorAll('option');
            opts.forEach(opt => {
                if (opt.dataset.i18n) {
                    opt.textContent = i18n.t(opt.dataset.i18n);
                }
            });
        });
    }

    if (langToggleBtn) {
        langToggleBtn.addEventListener('click', () => {
            if (window.LuckyWheelI18n) {
                window.LuckyWheelI18n.toggleLang();
            }
        });
    }

    function updatePanelButtonsUI() {
        if (!appLayout) return;
        const isTabletOrMobile = window.innerWidth < 1200;
        const isHistoryHidden = appLayout.classList.contains('hide-history');
        const isControlsHidden = appLayout.classList.contains('hide-controls');

        if (toggleHistoryBtn) {
            const isHidden = isTabletOrMobile
                ? (isControlsHidden || activeUnifiedTab !== 'history')
                : isHistoryHidden;
            toggleHistoryBtn.classList.toggle('is-panel-hidden', isHidden);
        }
        if (toggleControlsBtn) {
            const isHidden = isTabletOrMobile
                ? (isControlsHidden || activeUnifiedTab !== 'slices')
                : isControlsHidden;
            toggleControlsBtn.classList.toggle('is-panel-hidden', isHidden);
        }
    }

    function toggleHistory() {
        if (!appLayout) return;
        const isTabletOrMobile = window.innerWidth < 1200;
        if (isTabletOrMobile) {
            if (appLayout.classList.contains('hide-controls')) {
                appLayout.classList.remove('hide-controls');
                switchUnifiedTab('history');
            } else if (activeUnifiedTab === 'history') {
                appLayout.classList.add('hide-controls');
            } else {
                switchUnifiedTab('history');
            }
        } else {
            appLayout.classList.toggle('hide-history');
        }
        updatePanelButtonsUI();
    }

    function toggleControls() {
        if (!appLayout) return;
        const isTabletOrMobile = window.innerWidth < 1200;
        if (isTabletOrMobile) {
            if (appLayout.classList.contains('hide-controls')) {
                appLayout.classList.remove('hide-controls');
                switchUnifiedTab('slices');
            } else if (activeUnifiedTab === 'slices') {
                appLayout.classList.add('hide-controls');
            } else {
                switchUnifiedTab('slices');
            }
        } else {
            appLayout.classList.toggle('hide-controls');
        }
        updatePanelButtonsUI();
    }

    if (toggleHistoryBtn) {
        toggleHistoryBtn.addEventListener('click', toggleHistory);
    }

    if (toggleControlsBtn) {
        toggleControlsBtn.addEventListener('click', toggleControls);
    }

    // Responsive DOM Synchronization on resize
    window.addEventListener('resize', () => {
        syncHistoryDOM();
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
        if (window.LuckyWheelHistory) window.LuckyWheelHistory.renderHistory();
        if (wheelEngine) wheelEngine.draw();
        updatePanelButtonsUI();
    });

    // Preset selection handler
    const handlePresetChange = (e) => {
        const key = e.target.value;
        if (key && PRESETS[key]) {
            slices = PRESETS[key].slices.map((s, idx) => ({ ...s, id: 's_' + Date.now() + '_' + idx, enabled: true }));
            if (settings.autoRainbow && window.LuckyWheelSlices) {
                window.LuckyWheelSlices.applyRainbowColors();
            }
            saveState();
            if (window.LuckyWheelSlices) {
                window.LuckyWheelSlices.setSlices(slices);
            }
            wheelEngine.setSlices(slices);
            if (presetSelect) presetSelect.value = '';
            if (presetSelectSettings) presetSelectSettings.value = '';
        }
    };
    if (presetSelect) presetSelect.addEventListener('change', handlePresetChange);
    if (presetSelectSettings) presetSelectSettings.addEventListener('change', handlePresetChange);

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

    // Display mode (2D Flat vs 3D Tilt vs 3D Cylinder)
    function updateDisplayModeUI() {
        const mode = settings.displayMode || '2d';
        if (btnDisplay2D) btnDisplay2D.classList.toggle('is-active', mode === '2d');
        if (btnDisplay3DTilt) btnDisplay3DTilt.classList.toggle('is-active', mode === '3d_tilt');
        if (btnDisplay3DCylinder) btnDisplay3DCylinder.classList.toggle('is-active', mode === '3d_cylinder');

        if (wheelStage) {
            wheelStage.classList.remove('mode-2d', 'mode-3d-tilt', 'mode-3d-cylinder');
            const classSuffix = mode === '3d_tilt' ? '3d-tilt' : mode === '3d_cylinder' ? '3d-cylinder' : '2d';
            wheelStage.classList.add(`mode-${classSuffix}`);
        }

        wheelEngine.setDisplayMode(mode);
    }
    if (btnDisplay2D) {
        btnDisplay2D.addEventListener('click', () => {
            settings.displayMode = '2d';
            saveState();
            updateDisplayModeUI();
        });
    }
    if (btnDisplay3DTilt) {
        btnDisplay3DTilt.addEventListener('click', () => {
            settings.displayMode = '3d_tilt';
            saveState();
            updateDisplayModeUI();
        });
    }
    if (btnDisplay3DCylinder) {
        btnDisplay3DCylinder.addEventListener('click', () => {
            settings.displayMode = '3d_cylinder';
            saveState();
            updateDisplayModeUI();
        });
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

    // Initial render & DOM synchronization
    syncHistoryDOM();
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
                if (Array.isArray(cloudData.history)) {
                    history = cloudData.history;
                }

                if (window.LuckyWheelSlices) window.LuckyWheelSlices.setSlices(slices);
                if (window.LuckyWheelHistory) window.LuckyWheelHistory.setHistory(history);
                wheelEngine.setSlices(slices);
            }
        });
    }
});
