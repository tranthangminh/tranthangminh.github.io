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
        sizingMode: 'weighted', // Default: Weighted / Trọng số
        autoRainbow: true
    };
    let history = [];
    let lastWinnerSlice = null;
    let draggedSliceIndex = null;
    let activeUnifiedTab = 'slices';

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
    const tabSliceCountBadge = document.getElementById('tabSliceCountBadge');
    const tabHistoryCountBadge = document.getElementById('tabHistoryCountBadge');
    const historyCardContent = document.getElementById('historyCardContent');
    const tabHistorySlot = document.getElementById('tabHistorySlot');
    const historyPanel = document.getElementById('historyPanel');

    // Tablet & Mobile Unified Tabs Controller
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
        if (typeof updatePanelButtonsUI === 'function') {
            updatePanelButtonsUI();
        }
    }

    if (tabBtnSlices) {
        tabBtnSlices.addEventListener('click', () => switchUnifiedTab('slices'));
    }
    if (tabBtnHistory) {
        tabBtnHistory.addEventListener('click', () => switchUnifiedTab('history'));
    }

    // Slices Card Elements
    const sliceCountBadge = document.getElementById('sliceCountBadge');
    const slicesListEl = document.getElementById('slicesList');
    const bulkEditOpenBtn = document.getElementById('bulkEditOpenBtn');
    const toggleAllSlicesBtn = document.getElementById('toggleAllSlicesBtn');
    const toggleAllIcon = document.getElementById('toggleAllIcon');
    const toggleAllText = document.getElementById('toggleAllText');
    const sortSelect = document.getElementById('sortSelect');

    // Settings Card Elements
    const presetSelect = document.getElementById('presetSelect');
    const presetSelectSettings = document.getElementById('presetSelectSettings');
    const rainbowToggle = document.getElementById('rainbowToggle');
    const eliminationToggle = document.getElementById('eliminationToggle');
    const btnModeEqual = document.getElementById('btnModeEqual');
    const btnModeWeighted = document.getElementById('btnModeWeighted');
    const btnModeEqualWeighted = document.getElementById('btnModeEqualWeighted');
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

        // Check Elimination Mode: Auto-hide slice from wheel
        if (settings.eliminationMode) {
            const target = slices.find(s => s.id === winner.id);
            if (target) {
                target.enabled = false;
                saveState();
                renderSlices();
                wheelEngine.setSlices(slices);
            }
        }

        // Display Winner Modal
        winnerNameEl.textContent = winner.text;
        winnerNameEl.style.color = winner.color || '#e5c158';
        modalRemoveWinnerBtn.style.display = settings.eliminationMode ? 'none' : 'block';
        openModal(winnerModal);
    }

    // --------------------------------------------------------------------------
    // 6. COLOR & RENDER HELPERS
    // --------------------------------------------------------------------------
    function hslToHex(h, s, l) {
        l /= 100;
        const a = (s * Math.min(l, 1 - l)) / 100;
        const f = n => {
            const k = (n + h / 30) % 12;
            const color = l - a * Math.max(Math.min(k - 3, 9 - k, 1), -1);
            return Math.round(255 * color).toString(16).padStart(2, '0');
        };
        return `#${f(0)}${f(8)}${f(4)}`;
    }

    function applyRainbowColors() {
        if (!slices || slices.length === 0) return;
        const total = slices.length;
        slices.forEach((slice, idx) => {
            if (!slice._originalColor) {
                slice._originalColor = slice.color;
            }
            // Evenly distribute from Red (0°) through Yellow, Green, Blue, Violet to Magenta/Pink (315°)
            const hue = total <= 1 ? 0 : Math.round((idx / (total - 1)) * 315);
            slice.color = hslToHex(hue, 85, 52);
        });
    }

    function restoreOriginalColors() {
        slices.forEach((slice, idx) => {
            if (slice._originalColor) {
                slice.color = slice._originalColor;
                delete slice._originalColor;
            } else {
                slice.color = PALETTE[idx % PALETTE.length];
            }
        });
    }

    function updateToggleAllBtnUI() {
        if (!toggleAllSlicesBtn || !toggleAllText || !toggleAllIcon) return;
        const hasDisabled = slices.some(s => s.enabled === false);
        const i18n = window.LuckyWheelI18n;
        if (hasDisabled) {
            toggleAllIcon.textContent = '👁️';
            toggleAllText.textContent = i18n ? i18n.t('slices.showAll') || 'Hiện Hết' : 'Hiện Hết';
            toggleAllSlicesBtn.title = i18n ? i18n.t('slices.showAll') : 'Hiện tất cả các ô';
        } else {
            toggleAllIcon.textContent = '🙈';
            toggleAllText.textContent = i18n ? i18n.t('slices.hideAll') || 'Ẩn Hết' : 'Ẩn Hết';
            toggleAllSlicesBtn.title = i18n ? i18n.t('slices.hideAll') : 'Ẩn tất cả các ô';
        }
    }

    function renderSlices() {
        if (settings.autoRainbow) {
            applyRainbowColors();
        }

        slicesListEl.innerHTML = '';
        if (sliceCountBadge) sliceCountBadge.textContent = `${slices.length}`;
        if (tabSliceCountBadge) tabSliceCountBadge.textContent = `${slices.length}`;

        slices.forEach((slice, index) => {
            const li = document.createElement('li');
            li.className = `slice-item ${slice.enabled === false ? 'is-disabled' : ''}`;
            li.dataset.id = slice.id;
            li.dataset.index = index;
            li.draggable = true;

            const isEqualMode = settings.sizingMode === 'equal';
            const displayWeight = isEqualMode ? 1 : (slice.weight || 1);
            const isRainbowLocked = !!settings.autoRainbow;
            const i18n = window.LuckyWheelI18n;
            const colorTitle = isRainbowLocked
                ? (i18n ? i18n.t('slices.colorLocked') || 'Màu Tự Động đang bật (không thể sửa màu)' : 'Màu Tự Động đang bật (không thể sửa màu)')
                : (i18n ? i18n.t('slices.changeColor') || 'Đổi màu ô' : 'Change color');
            const dragHint = i18n ? i18n.t('slices.dragHint') || 'Nắm kéo để đổi thứ tự' : 'Nắm kéo để đổi thứ tự';

            li.innerHTML = `
                <div class="slice-drag-handle" title="${dragHint}">
                    <span class="drag-grip-icon">⠿</span>
                    <span class="slice-index">${index + 1}</span>
                </div>
                <input type="color" class="input-color slice-color-picker" value="${slice.color}" title="${colorTitle}" ${isRainbowLocked ? 'disabled' : ''}>
                <span class="slice-text" title="${escapeHtml(slice.text)}">${escapeHtml(slice.text)}</span>
                <input type="number" class="slice-weight-input" value="${displayWeight}" min="1" max="100" title="${isEqualMode ? 'Chế độ Chia Đều (Trọng số mặc định 1)' : 'Weight / Trọng số'}" ${isEqualMode ? 'disabled' : ''}>
                <div class="slice-actions">
                    <button type="button" class="btn-item-action btn-toggle" title="${slice.enabled === false ? 'Enable slice' : 'Disable slice'}">
                        ${slice.enabled === false ? '⚪' : '🟢'}
                    </button>
                    <button type="button" class="btn-item-action btn-delete" title="Delete slice">✕</button>
                </div>
            `;

            // Color picker change
            const colorInput = li.querySelector('.slice-color-picker');
            colorInput.addEventListener('click', (e) => {
                if (settings.autoRainbow) {
                    e.preventDefault();
                    e.stopPropagation();
                }
            });
            colorInput.addEventListener('input', (e) => {
                if (settings.autoRainbow) return;
                slice.color = e.target.value;
                slice._originalColor = e.target.value;
                saveState();
                wheelEngine.setSlices(slices);
            });

            // Direct weight edit on item row
            const weightInput = li.querySelector('.slice-weight-input');
            const handleWeightUpdate = (e) => {
                if (settings.sizingMode === 'equal') return;
                let val = parseInt(e.target.value, 10);
                if (isNaN(val) || val < 1) val = 1;
                if (val > 100) val = 100;
                e.target.value = val;
                slice.weight = val;
                saveState();
                wheelEngine.setSlices(slices);
            };
            weightInput.addEventListener('change', handleWeightUpdate);
            weightInput.addEventListener('input', (e) => {
                if (settings.sizingMode === 'equal') return;
                let val = parseInt(e.target.value, 10);
                if (!isNaN(val) && val >= 1 && val <= 100) {
                    slice.weight = val;
                    saveState();
                    wheelEngine.setSlices(slices);
                }
            });

            // Middle-mouse wheel scroll to increment / decrement weight
            weightInput.addEventListener('wheel', (e) => {
                if (settings.sizingMode === 'equal') return;
                e.preventDefault();
                let current = parseInt(weightInput.value, 10) || 1;
                if (e.deltaY < 0) {
                    current = Math.min(100, current + 1);
                } else if (e.deltaY > 0) {
                    current = Math.max(1, current - 1);
                }
                weightInput.value = current;
                slice.weight = current;
                saveState();
                wheelEngine.setSlices(slices);
            }, { passive: false });

            // Inline edit slice text on single click
            const textSpan = li.querySelector('.slice-text');
            textSpan.addEventListener('click', () => {
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

                inlineInput.addEventListener('input', (e) => {
                    const val = e.target.value;
                    if (val.trim()) {
                        slice.text = val;
                        wheelEngine.setSlices(slices);
                    }
                });

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

            // HTML5 Drag and Drop reordering
            li.addEventListener('dragstart', (e) => {
                draggedSliceIndex = index;
                li.classList.add('is-dragging');
                e.dataTransfer.effectAllowed = 'move';
                e.dataTransfer.setData('text/plain', String(index));
            });

            li.addEventListener('dragend', () => {
                draggedSliceIndex = null;
                li.classList.remove('is-dragging');
                slicesListEl.querySelectorAll('.slice-item').forEach(el => {
                    el.classList.remove('drag-over-top', 'drag-over-bottom');
                });
            });

            li.addEventListener('dragover', (e) => {
                e.preventDefault();
                e.dataTransfer.dropEffect = 'move';
                const rect = li.getBoundingClientRect();
                const midpoint = rect.top + rect.height / 2;
                if (e.clientY < midpoint) {
                    li.classList.add('drag-over-top');
                    li.classList.remove('drag-over-bottom');
                } else {
                    li.classList.add('drag-over-bottom');
                    li.classList.remove('drag-over-top');
                }
            });

            li.addEventListener('dragleave', (e) => {
                if (!li.contains(e.relatedTarget)) {
                    li.classList.remove('drag-over-top', 'drag-over-bottom');
                }
            });

            li.addEventListener('drop', (e) => {
                e.preventDefault();
                li.classList.remove('drag-over-top', 'drag-over-bottom');
                if (draggedSliceIndex === null || draggedSliceIndex === undefined) return;
                const fromIdx = draggedSliceIndex;
                const rect = li.getBoundingClientRect();
                const midpoint = rect.top + rect.height / 2;
                let toIdx = e.clientY < midpoint ? index : index + 1;

                if (fromIdx === toIdx || (fromIdx === toIdx - 1 && e.clientY >= midpoint)) return;

                const [movedItem] = slices.splice(fromIdx, 1);
                if (fromIdx < toIdx) {
                    toIdx--;
                }
                slices.splice(toIdx, 0, movedItem);

                if (settings.autoRainbow) {
                    applyRainbowColors();
                }
                saveState();
                renderSlices();
                wheelEngine.setSlices(slices);
            });

            slicesListEl.appendChild(li);
        });

        // Always append the inline auto-add row at the bottom
        appendNewSliceRow();
        updateToggleAllBtnUI();
    }

    /**
     * Bottom Inline Auto-Adding Slice Row
     * - Always ready at bottom
     * - Typing 1 character immediately creates a slice and spawns the next empty row below!
     */
    function appendNewSliceRow() {
        const isEqualMode = settings.sizingMode === 'equal';
        const nextColor = settings.autoRainbow
            ? hslToHex(slices.length <= 0 ? 0 : Math.round((slices.length / Math.max(1, slices.length)) * 315), 85, 52)
            : PALETTE[slices.length % PALETTE.length];
        const placeholderText = window.LuckyWheelI18n ? window.LuckyWheelI18n.t('slices.newPlaceholder') || '+ Nhập để thêm ô mới...' : '+ Nhập để thêm ô mới...';

        const isRainbowLocked = !!settings.autoRainbow;
        const i18n = window.LuckyWheelI18n;
        const newColorTitle = isRainbowLocked
            ? (i18n ? i18n.t('slices.colorLocked') || 'Màu Tự Động đang bật (không thể sửa màu)' : 'Màu Tự Động đang bật (không thể sửa màu)')
            : (i18n ? i18n.t('slices.newColor') || 'Màu ô mới' : 'Màu ô mới');

        const newLi = document.createElement('li');
        newLi.className = 'slice-item slice-item-new';
        newLi.innerHTML = `
            <div class="slice-drag-handle is-new">
                <span class="drag-grip-icon" style="visibility: hidden;">⠿</span>
                <span class="slice-index">+</span>
            </div>
            <input type="color" class="input-color slice-color-picker new-slice-color" value="${nextColor}" title="${newColorTitle}" ${isRainbowLocked ? 'disabled' : ''}>
            <input type="text" class="new-slice-input" placeholder="${placeholderText}" autocomplete="off">
            <input type="number" class="slice-weight-input new-slice-weight" value="1" min="1" max="100" title="${isEqualMode ? 'Chế độ Chia Đều (Trọng số mặc định 1)' : 'Weight / Trọng số'}" ${isEqualMode ? 'disabled' : ''}>
        `;

        const nameInput = newLi.querySelector('.new-slice-input');
        const colorInput = newLi.querySelector('.new-slice-color');
        const weightInput = newLi.querySelector('.new-slice-weight');

        let createdSlice = null;

        nameInput.addEventListener('input', () => {
            const val = nameInput.value;
            if (!createdSlice) {
                if (val.length > 0) {
                    const newId = 's_' + Date.now() + '_' + Math.floor(Math.random() * 1000);
                    createdSlice = {
                        id: newId,
                        text: val,
                        color: colorInput.value,
                        weight: parseInt(weightInput.value, 10) || 1,
                        enabled: true
                    };
                    slices.push(createdSlice);
                    if (settings.autoRainbow) {
                        applyRainbowColors();
                        // Update color picker values for existing items
                        slicesListEl.querySelectorAll('.slice-item:not(.slice-item-new)').forEach(row => {
                            const sId = row.dataset.id;
                            const sl = slices.find(s => s.id === sId);
                            if (sl) {
                                const cp = row.querySelector('.slice-color-picker');
                                if (cp) cp.value = sl.color;
                            }
                        });
                        colorInput.value = createdSlice.color;
                    }
                    saveState();
                    wheelEngine.setSlices(slices);
                    if (sliceCountBadge) sliceCountBadge.textContent = `${slices.length}`;
                    if (tabSliceCountBadge) tabSliceCountBadge.textContent = `${slices.length}`;
                    updateToggleAllBtnUI();

                    newLi.classList.remove('slice-item-new');
                    newLi.dataset.id = newId;

                    // Immediately spawn the next empty input row beneath it!
                    appendNewSliceRow();
                }
            } else {
                createdSlice.text = val;
                saveState();
                wheelEngine.setSlices(slices);
            }
        });

        nameInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                if (createdSlice) {
                    const allInputs = slicesListEl.querySelectorAll('.new-slice-input');
                    const lastInput = allInputs[allInputs.length - 1];
                    if (lastInput && lastInput !== nameInput) {
                        lastInput.focus();
                    } else {
                        renderSlices();
                        const next = slicesListEl.querySelector('.slice-item-new .new-slice-input');
                        if (next) next.focus();
                    }
                }
            }
        });

        nameInput.addEventListener('blur', () => {
            if (createdSlice && !createdSlice.text.trim()) {
                slices = slices.filter(s => s.id !== createdSlice.id);
                saveState();
                wheelEngine.setSlices(slices);
                renderSlices();
            } else if (createdSlice) {
                renderSlices();
            }
        });

        colorInput.addEventListener('click', (e) => {
            if (settings.autoRainbow) {
                e.preventDefault();
                e.stopPropagation();
            }
        });
        colorInput.addEventListener('input', (e) => {
            if (settings.autoRainbow) return;
            if (createdSlice) {
                createdSlice.color = e.target.value;
                createdSlice._originalColor = e.target.value;
                saveState();
                wheelEngine.setSlices(slices);
            }
        });

        weightInput.addEventListener('change', (e) => {
            let val = parseInt(e.target.value, 10);
            if (isNaN(val) || val < 1) val = 1;
            if (val > 100) val = 100;
            e.target.value = val;
            if (createdSlice) {
                createdSlice.weight = val;
                saveState();
                wheelEngine.setSlices(slices);
            }
        });

        weightInput.addEventListener('wheel', (e) => {
            if (isEqualMode) return;
            e.preventDefault();
            let current = parseInt(weightInput.value, 10) || 1;
            if (e.deltaY < 0) current = Math.min(100, current + 1);
            else if (e.deltaY > 0) current = Math.max(1, current - 1);
            weightInput.value = current;
            if (createdSlice) {
                createdSlice.weight = current;
                saveState();
                wheelEngine.setSlices(slices);
            }
        }, { passive: false });

        // Drop handler on bottom row to place dragged item at the end
        newLi.addEventListener('dragover', (e) => {
            e.preventDefault();
            e.dataTransfer.dropEffect = 'move';
            newLi.classList.add('drag-over-top');
        });

        newLi.addEventListener('dragleave', () => {
            newLi.classList.remove('drag-over-top');
        });

        newLi.addEventListener('drop', (e) => {
            e.preventDefault();
            newLi.classList.remove('drag-over-top');
            if (draggedSliceIndex === null || draggedSliceIndex === undefined) return;
            const [movedItem] = slices.splice(draggedSliceIndex, 1);
            slices.push(movedItem);
            if (settings.autoRainbow) {
                applyRainbowColors();
            }
            saveState();
            renderSlices();
            wheelEngine.setSlices(slices);
        });

        slicesListEl.appendChild(newLi);
    }

    function renderHistory() {
        historyListEl.innerHTML = '';
        if (historyCountBadge) historyCountBadge.textContent = `${history.length}`;
        if (tabHistoryCountBadge) tabHistoryCountBadge.textContent = `${history.length}`;

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
        const i18n = window.LuckyWheelI18n;

        if (toggleHistoryBtn) {
            const isHidden = isTabletOrMobile
                ? (isControlsHidden || activeUnifiedTab !== 'history')
                : isHistoryHidden;
            toggleHistoryBtn.classList.toggle('is-panel-hidden', isHidden);
            toggleHistoryBtn.title = isHidden
                ? (i18n ? i18n.t('actions.showHistory') : 'Hiện Lịch Sử')
                : (i18n ? i18n.t('actions.hideHistory') : 'Ẩn Lịch Sử');
        }
        if (toggleControlsBtn) {
            const isHidden = isTabletOrMobile
                ? (isControlsHidden || activeUnifiedTab !== 'slices')
                : isControlsHidden;
            toggleControlsBtn.classList.toggle('is-panel-hidden', isHidden);
            toggleControlsBtn.title = isHidden
                ? (i18n ? i18n.t('actions.showControls') : 'Hiện Cài Đặt')
                : (i18n ? i18n.t('actions.hideControls') : 'Ẩn Cài Đặt');
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
        updateToggleAllBtnUI();
        renderHistory();
        updatePanelButtonsUI();
    });

    if (window.LuckyWheelI18n) {
        window.LuckyWheelI18n.applyTranslations();
        updateLangBtnUI();
        updatePresetOptions();
        updateToggleAllBtnUI();
        updatePanelButtonsUI();
    }

    // Toggle all slices (Show all / Hide all)
    if (toggleAllSlicesBtn) {
        toggleAllSlicesBtn.addEventListener('click', () => {
            const hasDisabled = slices.some(s => s.enabled === false);
            slices.forEach(s => {
                s.enabled = hasDisabled;
            });
            saveState();
            renderSlices();
            wheelEngine.setSlices(slices);
        });
    }

    // Preset selection handler
    const handlePresetChange = (e) => {
        const key = e.target.value;
        if (key && PRESETS[key]) {
            slices = PRESETS[key].slices.map((s, idx) => ({ ...s, id: 's_' + Date.now() + '_' + idx, enabled: true }));
            if (settings.autoRainbow) {
                applyRainbowColors();
            }
            saveState();
            renderSlices();
            wheelEngine.setSlices(slices);
            if (presetSelect) presetSelect.value = '';
            if (presetSelectSettings) presetSelectSettings.value = '';
        }
    };
    if (presetSelect) presetSelect.addEventListener('change', handlePresetChange);
    if (presetSelectSettings) presetSelectSettings.addEventListener('change', handlePresetChange);

    // Sort selection handler (A-Z, Z-A, Weight Descending, Weight Ascending)
    const handleSortChange = (e) => {
        const sortType = e.target.value;
        if (!sortType || slices.length < 2) {
            if (sortSelect) sortSelect.value = '';
            return;
        }

        if (sortType === 'az') {
            slices.sort((a, b) => (a.text || '').localeCompare(b.text || '', 'vi', { sensitivity: 'base', numeric: true }));
        } else if (sortType === 'za') {
            slices.sort((a, b) => (b.text || '').localeCompare(a.text || '', 'vi', { sensitivity: 'base', numeric: true }));
        } else if (sortType === 'weight-desc') {
            slices.sort((a, b) => (b.weight || 1) - (a.weight || 1));
        } else if (sortType === 'weight-asc') {
            slices.sort((a, b) => (a.weight || 1) - (b.weight || 1));
        }

        if (settings.autoRainbow) {
            applyRainbowColors();
        }
        saveState();
        renderSlices();
        wheelEngine.setSlices(slices);
        if (sortSelect) sortSelect.value = '';
    };
    if (sortSelect) sortSelect.addEventListener('change', handleSortChange);

    // Rainbow color mode toggle
    if (rainbowToggle) {
        rainbowToggle.checked = !!settings.autoRainbow;
        rainbowToggle.addEventListener('change', (e) => {
            settings.autoRainbow = e.target.checked;
            if (settings.autoRainbow) {
                applyRainbowColors();
            } else {
                restoreOriginalColors();
            }
            saveState();
            renderSlices();
            wheelEngine.setSlices(slices);
        });
    }

    // Elimination mode toggle
    eliminationToggle.checked = settings.eliminationMode;
    eliminationToggle.addEventListener('change', (e) => {
        settings.eliminationMode = e.target.checked;
        saveState();
    });

    // Sizing mode (Equal vs Weighted vs Equal-Weighted)
    function updateSizingModeUI() {
        const isEqual = settings.sizingMode === 'equal';
        btnModeEqual.classList.toggle('is-active', isEqual);
        btnModeWeighted.classList.toggle('is-active', settings.sizingMode === 'weighted');
        if (btnModeEqualWeighted) {
            btnModeEqualWeighted.classList.toggle('is-active', settings.sizingMode === 'equal_weighted');
        }
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
    if (btnModeEqualWeighted) {
        btnModeEqualWeighted.addEventListener('click', () => {
            settings.sizingMode = 'equal_weighted';
            saveState();
            updateSizingModeUI();
        });
    }

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

        if (settings.autoRainbow) {
            applyRainbowColors();
        }

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
            const target = slices.find(s => s.id === lastWinnerSlice.id);
            if (target) {
                target.enabled = false;
                saveState();
                renderSlices();
                wheelEngine.setSlices(slices);
            }
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

    // Initial render & DOM synchronization
    syncHistoryDOM();
    renderSlices();
    renderHistory();
    updateSizingModeUI();
    updatePanelButtonsUI();

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

                renderSlices();
                renderHistory();
                wheelEngine.setSlices(slices);
            }
        });
    }
});
