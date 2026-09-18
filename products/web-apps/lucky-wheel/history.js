/**
 * Lucky Wheel - History Module
 * (Separated from app.js)
 */

window.LuckyWheelHistory = (function () {
    let history = [];
    let saveStateCallback = null;

    let historyListEl = null;
    let historyCountBadge = null;
    let tabHistoryCountBadge = null;
    let clearHistoryBtn = null;

    function init(options) {
        history = options.history || [];
        saveStateCallback = options.saveState || function () {};

        historyListEl = document.getElementById('historyList');
        historyCountBadge = document.getElementById('historyCountBadge');
        tabHistoryCountBadge = document.getElementById('tabHistoryCountBadge');
        clearHistoryBtn = document.getElementById('clearHistoryBtn');

        if (clearHistoryBtn) {
            clearHistoryBtn.addEventListener('click', () => {
                if (history.length === 0) return;
                const i18n = window.LuckyWheelI18n;
                const confirmMsg = i18n ? i18n.t('history.clearConfirm') : 'Clear all spin history?';
                if (confirm(confirmMsg)) {
                    history.length = 0;
                    saveStateCallback();
                    renderHistory();
                }
            });
        }

        renderHistory();
    }

    function renderHistory() {
        if (!historyListEl) return;
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

    function recordHistory(winner) {
        const now = new Date();
        const timeStr = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
        history.unshift({
            id: 'h_' + Date.now(),
            text: winner.text,
            color: winner.color,
            time: timeStr
        });
        if (history.length > 50) history.pop();
        saveStateCallback();
        renderHistory();
    }

    function escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    function setHistory(newHistory) {
        history = newHistory;
        renderHistory();
    }

    function getHistory() {
        return history;
    }

    return {
        init,
        renderHistory,
        recordHistory,
        setHistory,
        getHistory
    };
})();
