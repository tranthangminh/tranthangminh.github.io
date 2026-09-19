/**
 * Dice Roller - History & Roll Analytics Module
 * Records rolls for any dice type (D6..D20), calculates statistics,
 * and renders clean chronological history cards.
 * Complies with _RULE-web-apps.md (< 500 lines)
 */

class RollHistoryManager {
    constructor() {
        this.history = [];
        this.maxItems = 60;
        this.listContainer = null;
        this.countBadge = null;
        this.avgBadge = null;
        this.onHistoryChangeCallback = null;
    }

    init(options = {}) {
        this.listContainer = document.getElementById('historyList');
        this.countBadge = document.getElementById('historyCountBadge');
        this.avgBadge = document.getElementById('historyAvgBadge');
        this.onHistoryChangeCallback = options.onChange || null;

        if (Array.isArray(options.initialData)) {
            this.history = options.initialData;
        }
        this.render();
    }

    /**
     * Add a newly settled roll record
     * @param {Array<number>} diceResults - Array of individual dice values (e.g. [14, 19])
     * @param {string} diceType - e.g. 'd20', 'd6'
     */
    addRecord(diceResults, diceType = 'd6') {
        if (!Array.isArray(diceResults) || diceResults.length === 0) return null;

        const total = diceResults.reduce((acc, val) => acc + val, 0);

        const record = {
            id: 'roll_' + Date.now() + '_' + Math.random().toString(36).substr(2, 4),
            timestamp: Date.now(),
            diceType: diceType.toUpperCase(),
            diceCount: diceResults.length,
            dice: [...diceResults],
            total: total
        };

        this.history.unshift(record);
        if (this.history.length > this.maxItems) {
            this.history.pop();
        }

        this.render();

        if (typeof this.onHistoryChangeCallback === 'function') {
            this.onHistoryChangeCallback(this.history);
        }

        return record;
    }

    clear() {
        this.history = [];
        this.render();

        if (typeof this.onHistoryChangeCallback === 'function') {
            this.onHistoryChangeCallback(this.history);
        }
    }

    getStats() {
        const totalRolls = this.history.length;
        if (totalRolls === 0) {
            return { count: 0, average: 0 };
        }
        const sum = this.history.reduce((acc, item) => acc + item.total, 0);
        const avg = (sum / totalRolls).toFixed(1);
        return { count: totalRolls, average: avg };
    }

    render() {
        const stats = this.getStats();
        if (this.countBadge) {
            this.countBadge.textContent = String(stats.count);
        }
        if (this.avgBadge) {
            this.avgBadge.textContent = stats.count > 0 ? stats.average : '--';
        }

        if (!this.listContainer) return;

        if (this.history.length === 0) {
            const emptyText = window.DiceRollerI18n ? window.DiceRollerI18n.t('history.empty') : 'No rolls yet.';
            this.listContainer.innerHTML = `<li class="history-empty">${emptyText}</li>`;
            return;
        }

        const html = this.history.map(item => {
            const timeStr = new Date(item.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
            const typeLabel = `${item.diceCount}${item.diceType || 'D6'}`;

            const diceBadges = item.dice.map(val => `
                <span class="history-pip-badge">
                    <span class="pip-num">${val}</span>
                </span>
            `).join('');

            return `
                <li class="history-item">
                    <div class="history-item-top">
                        <div class="history-type-tag">${typeLabel}</div>
                        <div class="history-item-total">
                            <span class="total-label">Σ</span>
                            <span class="total-val">${item.total}</span>
                        </div>
                    </div>
                    <div class="history-item-bottom">
                        <div class="history-item-dice">${diceBadges}</div>
                        <span class="history-time">${timeStr}</span>
                    </div>
                </li>
            `;
        }).join('');

        this.listContainer.innerHTML = html;
    }
}

// Global Singleton
window.rollHistoryManager = new RollHistoryManager();
