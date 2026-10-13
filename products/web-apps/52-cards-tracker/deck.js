/**
 * 52 Cards Tracker - Deck Management Module
 * Restores original 13-column grid structure with theme tokens
 * Complies with _RULE-web-apps.md (< 500 lines)
 */

(function () {
    'use strict';

    // Order: Spades (♠), Clubs (♣), Diamonds (♦), Hearts (♥)
    const SUITS = ["♠", "♣", "♦", "♥"];
    const RANKS = ["A", "2", "3", "4", "5", "6", "7", "8", "9", "10", "J", "Q", "K"];

    class DeckManager {
        constructor() {
            this.container = null;
            this.onCardClick = null;
            this.cards = new Map(); // id -> { id, rank, suit, isRed, el }
        }

        init(containerEl, onCardClick) {
            this.container = containerEl;
            this.onCardClick = onCardClick;
            this.cards.clear();
            this.render();
        }

        render() {
            if (!this.container) return;
            this.container.innerHTML = '';

            SUITS.forEach(suit => {
                RANKS.forEach(rank => {
                    const card = document.createElement("div");
                    card.className = "card";
                    card.innerHTML = `<span class="rank">${rank}</span><span class="suit">${suit}</span>`;

                    const cardId = `${rank}_${suit}`;
                    card.dataset.id = cardId;
                    card.dataset.rank = rank;
                    card.dataset.suit = suit;

                    const isRed = (suit === "♥" || suit === "♦");
                    if (isRed) {
                        card.classList.add("red");
                    } else {
                        card.classList.add("black");
                    }

                    card.addEventListener("click", () => {
                        if (typeof this.onCardClick === 'function') {
                            this.onCardClick(cardId, card);
                        }
                    });

                    this.container.appendChild(card);
                    this.cards.set(cardId, {
                        id: cardId,
                        rank: rank,
                        suit: suit,
                        isRed: isRed,
                        el: card
                    });
                });
            });
        }

        setCardUsed(cardId, isUsed) {
            const card = this.cards.get(cardId);
            if (!card) return;
            if (isUsed) {
                card.el.classList.add("used");
            } else {
                card.el.classList.remove("used");
            }
        }

        isCardUsed(cardId) {
            const card = this.cards.get(cardId);
            return card ? card.el.classList.contains("used") : false;
        }

        toggleCard(cardId) {
            const card = this.cards.get(cardId);
            if (!card) return false;
            const isUsed = card.el.classList.toggle("used");
            return isUsed;
        }

        getUsedCardIds() {
            const used = [];
            this.cards.forEach((card, id) => {
                if (card.el.classList.contains("used")) {
                    used.push(id);
                }
            });
            return used;
        }

        getUnusedCardIds() {
            const unused = [];
            this.cards.forEach((card, id) => {
                if (!card.el.classList.contains("used")) {
                    unused.push(id);
                }
            });
            return unused;
        }

        resetAll() {
            this.cards.forEach(card => {
                card.el.classList.remove("used");
            });
        }

        useAll() {
            this.cards.forEach(card => {
                card.el.classList.add("used");
            });
        }

        syncFromIds(usedIds) {
            const set = new Set(usedIds || []);
            this.cards.forEach((card, id) => {
                if (set.has(id)) {
                    card.el.classList.add("used");
                } else {
                    card.el.classList.remove("used");
                }
            });
        }

        getUsedCount() {
            return this.getUsedCardIds().length;
        }
    }

    window.deckManager = new DeckManager();
    window.DECK_SUITS = SUITS;
    window.DECK_RANKS = RANKS;
})();
