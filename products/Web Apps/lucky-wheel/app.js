/**
 * Lucky Wheel - Main Application Controller
 * Handles state management, presets, DOM bindings, and LocalStorage persistence.
 */

document.addEventListener('DOMContentLoaded', () => {
    // --------------------------------------------------------------------------
    // 1. PRESET DEFINITIONS
    // --------------------------------------------------------------------------
    const PRESETS = {
        'food': {
            name: 'Food Picker',
            slices: [
                { text: 'Pizza', color: '#ef4444', weight: 1 },
                { text: 'Sushi', color: '#f97316', weight: 1 },
                { text: 'Burger', color: '#eab308', weight: 1 },
                { text: 'BBQ', color: '#10b981', weight: 1 },
                { text: 'Salad', color: '#06b6d4', weight: 1 },
                { text: 'Ramen', color: '#3b82f6', weight: 1 },
                { text: 'Taco', color: '#8b5cf6', weight: 1 },
                { text: 'Fried Chicken', color: '#ec4899', weight: 1 }
            ]
        },
        'decision': {
            name: 'Decision Maker',
            slices: [
                { text: 'Yes', color: '#10b981', weight: 1 },
                { text: 'No', color: '#ef4444', weight: 1 },
                { text: 'Definitely', color: '#06b6d4', weight: 1 },
                { text: 'Maybe', color: '#f97316', weight: 1 },
                { text: 'Try Again', color: '#eab308', weight: 1 },
                { text: 'Never', color: '#8b5cf6', weight: 1 }
            ]
        },
        'numbers': {
            name: 'Lucky Numbers 1-10',
            slices: [
                { text: '1', color: '#ef4444', weight: 1 },
                { text: '2', color: '#f97316', weight: 1 },
                { text: '3', color: '#eab308', weight: 1 },
                { text: '4', color: '#10b981', weight: 1 },
                { text: '5', color: '#06b6d4', weight: 1 },
                { text: '6', color: '#3b82f6', weight: 1 },
                { text: '7', color: '#8b5cf6', weight: 1 },
                { text: '8', color: '#ec4899', weight: 1 },
                { text: '9', color: '#14b8a6', weight: 1 },
                { text: '10', color: '#f43f5e', weight: 1 }
            ]
        },
        'standup': {
            name: 'Team Standup',
            slices: [
                { text: 'Alex', color: '#ef4444', weight: 1 },
                { text: 'Bob', color: '#f97316', weight: 1 },
                { text: 'Charlie', color: '#eab308', weight: 1 },
                { text: 'Diana', color: '#10b981', weight: 1 },
                { text: 'Edward', color: '#06b6d4', weight: 1 },
                { text: 'Fiona', color: '#3b82f6', weight: 1 }
            ]
        },
        'dice': {
            name: 'Dice Roll (1-6)',
            slices: [
                { text: '1', color: '#ef4444', weight: 1 },
                { text: '2', color: '#f97316', weight: 1 },
                { text: '3', color: '#eab308', weight: 1 },
                { text: '4', color: '#10b981', weight: 1 },
                { text: '5', color: '#06b6d4', weight: 1 },
                { text: '6', color: '#3b82f6', weight: 1 }
            ]
        }
    };

    const PALETTE = [
        '#ef4444', '#f97316', '#eab308', '#10b981', 
        '#06b6d4', '#3b82f6', '#8b5cf6', '#ec4899', 
        '#14b8a6', '#f43f5e'
    ];

    // --------------------------------------------------------------------------
    // 2. STATE MANAGEMENT & STORAGE
    // --------------------------------------------------------------------------
    let slices = [];
    let settings = {
        duration: 5000,
        eliminationMode: false,
        sizingMode: 'equal' // 'equal' | 'weighted'
    };
    let history = [];
    let lastWinnerSlice = null;

    // Load from LocalStorage
    try {
        const savedSlices = localStorage.getItem('lucky_wheel_slices');
        if (savedSlices) {
            slices = JSON.parse(savedSlices);
        } else {
            slices = PRESETS['food'].slices.map((s, idx) => ({ ...s, id: 's_' + Date.now() + '_' + idx, enabled: true }));
        }

        const savedSettings = localStorage.getItem('lucky_wheel_settings');
        if (savedSettings) {
            settings = { ...settings, ...JSON.parse(savedSettings) };
        }

        const savedHistory = localStorage.getItem('lucky_wheel_history');
        if (savedHistory) {
            history = JSON.parse(savedHistory);
        }
    } catch (e) {
        console.warn('LocalStorage error, using defaults', e);
        slices = PRESETS['food'].slices.map((s, idx) => ({ ...s, id: 's_' + Date.now() + '_' + idx, enabled: true }));
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
    // 3. DOM ELEMENTS
    // --------------------------------------------------------------------------
    const wheelCanvas = document.getElementById('wheelCanvas');
    const pointerCanvas = document.getElementById('pointerCanvas');
    const confettiCanvas = document.getElementById('confettiCanvas');

    const centerSpinBtn = document.getElementById('centerSpinBtn');
    const mainSpinBtn = document.getElementById('mainSpinBtn');
    const shuffleBtn = document.getElementById('shuffleBtn');
    const resetBtn = document.getElementById('resetBtn');

    const soundToggleBtn = document.getElementById('soundToggleBtn');
    const fullscreenBtn = document.getElementById('fullscreenBtn');

    // Slices Card Elements
    const sliceCountBadge = document.getElementById('sliceCountBadge');
    const slicesListEl = document.getElementById('slicesList');
    const addSliceForm = document.getElementById('addSliceForm');
    const inputSliceName = document.getElementById('inputSliceName');
    const inputSliceWeight = document.getElementById('inputSliceWeight');
    const inputSliceColor = document.getElementById('inputSliceColor');
    const bulkEditOpenBtn = document.getElementById('bulkEditOpenBtn');

    // Settings Card Elements
    const presetSelect = document.getElementById('presetSelect');
    const presetSelectSettings = document.getElementById('presetSelectSettings');
    const eliminationToggle = document.getElementById('eliminationToggle');
    const btnModeEqual = document.getElementById('btnModeEqual');
    const btnModeWeighted = document.getElementById('btnModeWeighted');
    const durationSlider = document.getElementById('durationSlider');
    const durationVal = document.getElementById('durationVal');

    // History Card Elements
    const historyListEl = document.getElementById('historyList');
    const historyCountBadge = document.getElementById('historyCountBadge');
    const clearHistoryBtn = document.getElementById('clearHistoryBtn');

    // Modals
    const winnerModal = document.getElementById('winnerModal');
    const winnerNameEl = document.getElementById('winnerName');
    const modalSpinAgainBtn = document.getElementById('modalSpinAgainBtn');
    const modalRemoveWinnerBtn = document.getElementById('modalRemoveWinnerBtn');
    const winnerModalCloseBtn = document.getElementById('winnerModalCloseBtn');

    const bulkEditModal = document.getElementById('bulkEditModal');
    const bulkEditTextarea = document.getElementById('bulkEditTextarea');
    const bulkEditApplyBtn = document.getElementById('bulkEditApplyBtn');
    const bulkEditCancelBtn = document.getElementById('bulkEditCancelBtn');
    const bulkEditCloseBtn = document.getElementById('bulkEditCloseBtn');

    // --------------------------------------------------------------------------
    // 4. WHEEL & CONFETTI ENGINE INITIALIZATION
    // --------------------------------------------------------------------------
    const confettiEngine = new window.ConfettiEngine(confettiCanvas);

    const wheelEngine = new window.LuckyWheelEngine(wheelCanvas, {
        pointerCanvas: pointerCanvas,
        sizingMode: settings.sizingMode,
        spinDuration: settings.duration,
        onTick: (speed) => {
            window.soundEngine.playTick(speed);
        },
        onSpinEnd: (winner, winnerIdx) => {
            handleSpinWinner(winner, winnerIdx);
        }
    });

    // Sync wheel with initial slice data
    wheelEngine.setSlices(slices);

    // --------------------------------------------------------------------------
    // 5. SPIN ACTION & WINNER HANDLING
    // --------------------------------------------------------------------------
    function triggerSpin() {
        if (wheelEngine.isSpinning) return;
        const activeSlices = slices.filter(s => s.enabled !== false);
        if (activeSlices.length < 2) {
            alert('Please add at least 2 active slices to spin the wheel!');
            return;
        }

        // Close any open modals
        closeModal(winnerModal);
        closeModal(bulkEditModal);

        mainSpinBtn.disabled = true;
        wheelEngine.spin();
    }

    function handleSpinWinner(winner, winnerIdx) {
        mainSpinBtn.disabled = false;
        lastWinnerSlice = winner;

        // Play celebrations
        window.soundEngine.playWin();
        confettiEngine.fire(160);

        // Record history
        const now = new Date();
        const timeStr = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
        history.unshift({
            id: 'h_' + Date.now(),
            text: winner.text,
            color: winner.color,
            time: timeStr
        });
        if (history.length > 50) history.pop();
        saveState();
        renderHistory();

        // Check Elimination Mode
        if (settings.eliminationMode) {
            // Auto remove slice
            slices = slices.filter(s => s.id !== winner.id);
            saveState();
            renderSlices();
            wheelEngine.setSlices(slices);
        }

        // Display Winner Modal
        winnerNameEl.textContent = winner.text;
        winnerNameEl.style.color = winner.color || '#e5c158';
        modalRemoveWinnerBtn.style.display = settings.eliminationMode ? 'none' : 'block';
        openModal(winnerModal);
    }

    // --------------------------------------------------------------------------
    // 6. RENDER HELPERS
    // --------------------------------------------------------------------------
    function renderSlices() {
        slicesListEl.innerHTML = '';
        sliceCountBadge.textContent = `${slices.length}`;

        slices.forEach((slice, index) => {
            const li = document.createElement('li');
            li.className = `slice-item ${slice.enabled === false ? 'is-disabled' : ''}`;
            li.dataset.id = slice.id;

            li.innerHTML = `
                <input type="color" class="input-color slice-color-picker" value="${slice.color}" title="Change color">
                <span class="slice-text" title="${escapeHtml(slice.text)}">${escapeHtml(slice.text)}</span>
                ${settings.sizingMode === 'weighted' ? `<span class="slice-weight-tag">w: ${slice.weight || 1}</span>` : ''}
                <div class="slice-actions">
                    <button type="button" class="btn-item-action btn-toggle" title="${slice.enabled === false ? 'Enable slice' : 'Disable slice'}">
                        ${slice.enabled === false ? '⚪' : '🟢'}
                    </button>
                    <button type="button" class="btn-item-action btn-delete" title="Delete slice">✕</button>
                </div>
            `;

            // Color picker change
            const colorInput = li.querySelector('.slice-color-picker');
            colorInput.addEventListener('input', (e) => {
                slice.color = e.target.value;
                saveState();
                wheelEngine.setSlices(slices);
            });

            // Inline edit slice text on double click
            const textSpan = li.querySelector('.slice-text');
            textSpan.addEventListener('dblclick', () => {
                const currentText = slice.text;
                const inlineInput = document.createElement('input');
                inlineInput.type = 'text';
                inlineInput.className = 'form-input';
                inlineInput.style.height = '24px';
                inlineInput.style.fontSize = '12px';
                inlineInput.value = currentText;
                textSpan.replaceWith(inlineInput);
                inlineInput.focus();
                inlineInput.select();

                let isDone = false;
                const finishEdit = () => {
                    if (isDone) return;
                    isDone = true;
                    const val = inlineInput.value.trim();
                    if (val) {
                        slice.text = val;
                        saveState();
                        wheelEngine.setSlices(slices);
                    }
                    renderSlices();
                };

                inlineInput.addEventListener('blur', finishEdit);
                inlineInput.addEventListener('keydown', (e) => {
                    if (e.key === 'Enter') {
                        e.preventDefault();
                        finishEdit();
                    } else if (e.key === 'Escape') {
                        isDone = true;
                        renderSlices();
                    }
                });
            });

            // Toggle enable / disable
            const toggleBtn = li.querySelector('.btn-toggle');
            toggleBtn.addEventListener('click', () => {
                slice.enabled = slice.enabled === false ? true : false;
                saveState();
                renderSlices();
                wheelEngine.setSlices(slices);
            });

            // Delete slice
            const deleteBtn = li.querySelector('.btn-delete');
            deleteBtn.addEventListener('click', () => {
                slices = slices.filter(s => s.id !== slice.id);
                saveState();
                renderSlices();
                wheelEngine.setSlices(slices);
            });

            slicesListEl.appendChild(li);
        });

        // Set next input color preview
        inputSliceColor.value = PALETTE[slices.length % PALETTE.length];
    }

    function renderHistory() {
        historyListEl.innerHTML = '';
        historyCountBadge.textContent = `${history.length}`;

        if (history.length === 0) {
            const emptyText = window.LuckyWheelI18n ? window.LuckyWheelI18n.t('history.empty') : 'No spins yet. Give it a spin!';
            historyListEl.innerHTML = `<li class="history-empty" data-i18n="history.empty">${emptyText}</li>`;
            return;
        }

        history.forEach(item => {
            const li = document.createElement('li');
            li.className = 'history-item';
            li.innerHTML = `
                <div class="history-winner-tag">
                    <span class="slice-color-dot" style="background: ${item.color || '#eab308'};"></span>
                    <span>${escapeHtml(item.text)}</span>
                </div>
                <span class="history-time">${item.time}</span>
            `;
            historyListEl.appendChild(li);
        });
    }

    function escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    // --------------------------------------------------------------------------
    // 7. EVENT LISTENERS
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
        renderSlices();
        wheelEngine.setSlices(slices);
    });

    // Reset default
    resetBtn.addEventListener('click', () => {
        if (wheelEngine.isSpinning) return;
        if (confirm('Reset wheel back to default food items?')) {
            slices = PRESETS['food'].slices.map((s, idx) => ({ ...s, id: 's_' + Date.now() + '_' + idx, enabled: true }));
            saveState();
            renderSlices();
            wheelEngine.setSlices(slices);
        }
    });

    // Sound toggle
    function updateSoundUI() {
        const isMuted = window.soundEngine.isMuted;
        soundToggleBtn.innerHTML = isMuted ? '🔇' : '🔊';
        soundToggleBtn.title = isMuted ? 'Unmute Sound' : 'Mute Sound';
        soundToggleBtn.classList.toggle('is-active', !isMuted);
    }
    updateSoundUI();
    soundToggleBtn.addEventListener('click', () => {
        window.soundEngine.toggleMute();
        updateSoundUI();
    });

    // Fullscreen toggle
    fullscreenBtn.addEventListener('click', () => {
        if (!document.fullscreenElement) {
            document.documentElement.requestFullscreen().catch(() => {});
        } else {
            document.exitFullscreen().catch(() => {});
        }
    });

    // Language toggle
    const langToggleBtn = document.getElementById('langToggleBtn');
    function updateLangBtnUI() {
        if (!langToggleBtn || !window.LuckyWheelI18n) return;
        const current = window.LuckyWheelI18n.lang;
        langToggleBtn.innerHTML = current === 'vi' ? '🇬🇧 EN' : '🇻🇳 VI';
        langToggleBtn.title = current === 'vi' ? 'Switch to English' : 'Chuyển sang Tiếng Việt';
    }

    function updatePresetOptions() {
        if (!window.LuckyWheelI18n) return;
        const i18n = window.LuckyWheelI18n;
        const selects = [presetSelect, presetSelectSettings];
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

    window.addEventListener('app-lang-changed', () => {
        updateLangBtnUI();
        updatePresetOptions();
        renderHistory();
    });

    if (window.LuckyWheelI18n) {
        window.LuckyWheelI18n.applyTranslations();
        updateLangBtnUI();
        updatePresetOptions();
    }

    // Add slice form submit
    addSliceForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const text = inputSliceName.value.trim();
        if (!text) return;

        const weight = Math.max(1, parseInt(inputSliceWeight.value, 10) || 1);
        const color = inputSliceColor.value || PALETTE[slices.length % PALETTE.length];

        slices.push({
            id: 's_' + Date.now(),
            text: text,
            color: color,
            weight: weight,
            enabled: true
        });

        inputSliceName.value = '';
        inputSliceWeight.value = '1';
        saveState();
        renderSlices();
        wheelEngine.setSlices(slices);
        inputSliceName.focus();
    });

    // Tab navigation switching for left control panels
    const panelTabs = document.querySelectorAll('.panel-tab');
    const tabPanes = {
        'slices': document.getElementById('paneSlices'),
        'settings': document.getElementById('paneSettings'),
        'history': document.getElementById('paneHistory')
    };

    panelTabs.forEach(tab => {
        tab.addEventListener('click', () => {
            const target = tab.dataset.tab;
            panelTabs.forEach(t => {
                const isActive = t === tab;
                t.classList.toggle('is-active', isActive);
                t.setAttribute('aria-selected', isActive ? 'true' : 'false');
            });
            Object.keys(tabPanes).forEach(key => {
                if (tabPanes[key]) {
                    tabPanes[key].classList.toggle('is-active', key === target);
                }
            });
        });
    });

    // Preset selection handler
    const handlePresetChange = (e) => {
        const key = e.target.value;
        if (key && PRESETS[key]) {
            slices = PRESETS[key].slices.map((s, idx) => ({ ...s, id: 's_' + Date.now() + '_' + idx, enabled: true }));
            saveState();
            renderSlices();
            wheelEngine.setSlices(slices);
            if (presetSelect) presetSelect.value = '';
            if (presetSelectSettings) presetSelectSettings.value = '';
        }
    };
    if (presetSelect) presetSelect.addEventListener('change', handlePresetChange);
    if (presetSelectSettings) presetSelectSettings.addEventListener('change', handlePresetChange);

    // Elimination mode toggle
    eliminationToggle.checked = settings.eliminationMode;
    eliminationToggle.addEventListener('change', (e) => {
        settings.eliminationMode = e.target.checked;
        saveState();
    });

    // Sizing mode (Equal vs Weighted)
    function updateSizingModeUI() {
        btnModeEqual.classList.toggle('is-active', settings.sizingMode === 'equal');
        btnModeWeighted.classList.toggle('is-active', settings.sizingMode === 'weighted');
        wheelEngine.setSizingMode(settings.sizingMode);
        renderSlices();
    }
    btnModeEqual.addEventListener('click', () => {
        settings.sizingMode = 'equal';
        saveState();
        updateSizingModeUI();
    });
    btnModeWeighted.addEventListener('click', () => {
        settings.sizingMode = 'weighted';
        saveState();
        updateSizingModeUI();
    });

    // Duration slider
    durationSlider.value = settings.duration / 1000;
    durationVal.textContent = `${durationSlider.value}s`;
    durationSlider.addEventListener('input', (e) => {
        const sec = e.target.value;
        durationVal.textContent = `${sec}s`;
        settings.duration = sec * 1000;
        wheelEngine.spinDuration = settings.duration;
        saveState();
    });

    // History clear
    clearHistoryBtn.addEventListener('click', () => {
        if (history.length === 0) return;
        if (confirm('Clear all spin history?')) {
            history = [];
            saveState();
            renderHistory();
        }
    });

    // Bulk Edit Modal
    bulkEditOpenBtn.addEventListener('click', () => {
        bulkEditTextarea.value = slices.map(s => {
            return (s.weight && s.weight > 1) ? `${s.text} : ${s.weight}` : s.text;
        }).join('\n');
        openModal(bulkEditModal);
    });

    bulkEditApplyBtn.addEventListener('click', () => {
        const raw = bulkEditTextarea.value.trim();
        if (!raw) {
            alert('Please enter at least one item.');
            return;
        }

        const lines = raw.split('\n').map(l => l.trim()).filter(l => l.length > 0);
        if (lines.length < 2) {
            alert('Please provide at least 2 items.');
            return;
        }

        slices = lines.map((line, idx) => {
            let text = line;
            let weight = 1;
            if (line.includes(':')) {
                const parts = line.split(':');
                text = parts[0].trim();
                weight = Math.max(1, parseInt(parts[1].trim(), 10) || 1);
            }
            return {
                id: 's_' + Date.now() + '_' + idx,
                text: text,
                color: PALETTE[idx % PALETTE.length],
                weight: weight,
                enabled: true
            };
        });

        saveState();
        renderSlices();
        wheelEngine.setSlices(slices);
        closeModal(bulkEditModal);
    });

    bulkEditCancelBtn.addEventListener('click', () => closeModal(bulkEditModal));
    bulkEditCloseBtn.addEventListener('click', () => closeModal(bulkEditModal));

    // Winner Modal Actions
    modalSpinAgainBtn.addEventListener('click', () => {
        closeModal(winnerModal);
        confettiEngine.stop();
        setTimeout(triggerSpin, 250);
    });

    modalRemoveWinnerBtn.addEventListener('click', () => {
        if (lastWinnerSlice) {
            slices = slices.filter(s => s.id !== lastWinnerSlice.id);
            saveState();
            renderSlices();
            wheelEngine.setSlices(slices);
        }
        closeModal(winnerModal);
        confettiEngine.stop();
    });

    winnerModalCloseBtn.addEventListener('click', () => {
        closeModal(winnerModal);
        confettiEngine.stop();
    });

    // Helper modal functions
    function openModal(el) {
        el.classList.add('is-open');
    }
    function closeModal(el) {
        el.classList.remove('is-open');
    }

    // Close modal on backdrop click
    [winnerModal, bulkEditModal].forEach(modal => {
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                closeModal(modal);
                confettiEngine.stop();
            }
        });
    });

    // Spacebar to spin
    window.addEventListener('keydown', (e) => {
        if (e.code === 'Space' && document.activeElement.tagName !== 'INPUT' && document.activeElement.tagName !== 'TEXTAREA') {
            e.preventDefault();
            triggerSpin();
        } else if (e.key === 'Escape') {
            closeModal(winnerModal);
            closeModal(bulkEditModal);
            confettiEngine.stop();
        }
    });

    // Initial render
    renderSlices();
    renderHistory();
    updateSizingModeUI();

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

                renderSlices();
                renderHistory();
                wheelEngine.setSlices(slices);
            }
        });
    }
});
