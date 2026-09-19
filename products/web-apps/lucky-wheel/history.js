/**
 * Lucky Wheel - History Module (Per-Preset Spin History)
 * Complies with _RULE-web-apps.md & _RULE-website.md
 */

window.LuckyWheelHistory = (function () {
    const MAX_HISTORY_PER_PRESET = 50;

    let historyMap = {};
    let currentPresetId = 'prizes';
    let currentPresetName = '🎁 Vòng Quay Trúng Thưởng';
    let saveStateCallback = null;

    let historyListEl = null;
    let historyCountBadge = null;
    let tabHistoryCountBadge = null;
    let clearHistoryBtn = null;
    let historyPresetNameEl = null;

    function init(options) {
        currentPresetId = options.presetId || 'prizes';
        currentPresetName = options.presetName || '🎁 Vòng Quay Trúng Thưởng';
        saveStateCallback = options.saveState || function () {};

        if (Array.isArray(options.history)) {
            historyMap = { [currentPresetId]: options.history };
        } else if (options.history && typeof options.history === 'object') {
            historyMap = { ...options.history };
        } else {
            historyMap = {};
        }

        historyListEl = document.getElementById('historyList');
        historyCountBadge = document.getElementById('historyCountBadge');
        tabHistoryCountBadge = document.getElementById('tabHistoryCountBadge');
        clearHistoryBtn = document.getElementById('clearHistoryBtn');
        historyPresetNameEl = document.getElementById('historyPresetTitle') || document.getElementById('historyPresetName');

        if (clearHistoryBtn) {
            clearHistoryBtn.addEventListener('click', () => {
                const currentList = getCurrentHistory();
                if (currentList.length === 0) return;
                const i18n = window.LuckyWheelI18n;
                const confirmMsg = i18n ? i18n.t('history.clearConfirmPreset') : 'Are you sure you want to clear spin history for this preset?';
                if (confirm(confirmMsg)) {
                    historyMap[currentPresetId || 'default'] = [];
                    saveStateCallback();
                    renderHistory();
                }
            });
        }

        renderHistory();
    }

    function getCurrentHistory() {
        const pid = currentPresetId || 'default';
        if (!Array.isArray(historyMap[pid])) {
            historyMap[pid] = [];
        }
        return historyMap[pid];
    }

    function setPreset(presetId, presetName) {
        currentPresetId = presetId || 'default';
        if (presetName) {
            currentPresetName = presetName;
        }
        renderHistory();
    }

    function updatePresetName(presetName) {
        if (presetName) {
            currentPresetName = presetName;
            if (historyPresetNameEl) {
                historyPresetNameEl.textContent = currentPresetName;
            }
        }
    }

    function renderHistory() {
        if (historyPresetNameEl && currentPresetName) {
            historyPresetNameEl.textContent = currentPresetName;
        }

        const currentList = getCurrentHistory();
        if (!historyListEl) return;
        historyListEl.innerHTML = '';
        if (historyCountBadge) historyCountBadge.textContent = `${currentList.length}`;
        if (tabHistoryCountBadge) tabHistoryCountBadge.textContent = `${currentList.length}`;

        if (currentList.length === 0) {
            const emptyText = window.LuckyWheelI18n ? window.LuckyWheelI18n.t('history.empty') : 'No spins yet for this preset. Give it a spin!';
            historyListEl.innerHTML = `<li class="history-empty" data-i18n="history.empty">${emptyText}</li>`;
            return;
        }

        currentList.forEach(item => {
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

    function recordHistory(winner) {
        const currentList = getCurrentHistory();
        const now = new Date();
        const timeStr = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
        currentList.unshift({
            id: 'h_' + Date.now(),
            text: winner.text,
            color: winner.color,
            time: timeStr
        });
        if (currentList.length > MAX_HISTORY_PER_PRESET) {
            currentList.length = MAX_HISTORY_PER_PRESET;
        }
        saveStateCallback();
        renderHistory();
    }

    function deletePresetHistory(presetId) {
        if (historyMap && historyMap[presetId]) {
            delete historyMap[presetId];
            saveStateCallback();
            if (currentPresetId === presetId) {
                renderHistory();
            }
        }
    }

    function escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    function getHistoryMap() {
        return historyMap;
    }

    function setHistoryMap(newMap) {
        if (Array.isArray(newMap)) {
            historyMap = { [currentPresetId || 'prizes']: newMap };
        } else if (newMap && typeof newMap === 'object') {
            historyMap = { ...newMap };
        } else {
            historyMap = {};
        }
        renderHistory();
    }

    // Backwards-compatible methods
    function setHistory(newHistory) {
        setHistoryMap(newHistory);
    }

    function getHistory() {
        return getCurrentHistory();
    }

    return {
        init,
        setPreset,
        updatePresetName,
        renderHistory,
        recordHistory,
        deletePresetHistory,
        getHistoryMap,
        setHistoryMap,
        setHistory,
        getHistory
    };
})();
