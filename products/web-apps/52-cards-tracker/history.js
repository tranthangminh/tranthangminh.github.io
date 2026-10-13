/**
 * 52 Cards Tracker - History & Undo/Redo Engine
 * Preserves original history-card structure and click-to-remove behavior
 * Complies with _RULE-web-apps.md (< 500 lines)
 */

(function () {
    'use strict';

    const MAX_UNDO = 50;

    class HistoryManager {
        constructor() {
            this.container = null;
            this.onRemoveCard = null;
            this.undoStack = [];
            this.redoStack = [];
        }

        init({ containerEl, onRemoveCard }) {
            this.container = containerEl;
            this.onRemoveCard = onRemoveCard;
            this.undoStack = [];
            this.redoStack = [];
        }

        getHistoryIds() {
            if (!this.container) return [];
            return [...this.container.querySelectorAll(".history-card")].map(el => el.dataset.id);
        }

        add(cardId, rank, suit, isRed) {
            if (!this.container) return;
            if (this.container.querySelector(`.history-card[data-id="${cardId}"]`)) return;

            const div = document.createElement("div");
            div.className = "history-card";
            div.dataset.id = cardId;

            let suitClass = "";
            switch (suit) {
                case "♥": suitClass = "heart"; break;
                case "♦": suitClass = "diamond"; break;
                case "♠": suitClass = "spade"; break;
                case "♣": suitClass = "club"; break;
            }

            const colorClass = isRed ? "red" : "black";

            div.innerHTML = `
                <div class="card-rank ${colorClass}">${rank}</div>
                <div class="card-suit ${suitClass} ${colorClass}">${suit}</div>
            `;

            div.addEventListener("click", () => {
                if (typeof this.onRemoveCard === 'function') {
                    this.onRemoveCard(cardId);
                }
            });

            this.container.appendChild(div);
        }

        remove(cardId) {
            if (!this.container) return;
            const item = this.container.querySelector(`.history-card[data-id="${cardId}"]`);
            if (item) item.remove();
        }

        clear() {
            if (this.container) this.container.innerHTML = "";
        }

        /* Snapshot State for Undo/Redo */
        snapshot(extraData = {}) {
            const history = this.getHistoryIds();
            this.undoStack.push({
                history: history,
                extra: JSON.parse(JSON.stringify(extraData))
            });

            this.redoStack = [];

            if (this.undoStack.length > MAX_UNDO) {
                this.undoStack.shift();
            }
        }

        initStack(extraData = {}) {
            this.undoStack = [];
            this.redoStack = [];
            this.snapshot(extraData);
        }

        undo(restoreCallback) {
            if (this.undoStack.length <= 1) return null;

            const current = this.undoStack.pop();
            this.redoStack.push(current);

            const prev = this.undoStack[this.undoStack.length - 1];
            if (typeof restoreCallback === 'function') {
                restoreCallback(prev);
            }
            return prev;
        }

        redo(restoreCallback) {
            if (this.redoStack.length === 0) return null;

            const next = this.redoStack.pop();
            this.undoStack.push(next);

            if (typeof restoreCallback === 'function') {
                restoreCallback(next);
            }
            return next;
        }

        canUndo() {
            return this.undoStack.length > 1;
        }

        canRedo() {
            return this.redoStack.length > 0;
        }
    }

    window.historyManager = new HistoryManager();
})();
