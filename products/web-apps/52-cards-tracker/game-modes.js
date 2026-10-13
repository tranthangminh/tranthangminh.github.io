/**
 * 52 Cards Tracker - Game Modes Logic Module
 * Tiến Lên (Heo Radar, Tứ Quý Alert, Sort Hand), Blackjack (Soft Ace Odds, New Hand), Poker (Hold'em Outs)
 * Complies with _RULE-web-apps.md (< 500 lines)
 */

(function () {
    'use strict';

    const SUITS_TIENLEN = ["♠", "♣", "♦", "♥"];
    const RANKS_TIENLEN = ["3", "4", "5", "6", "7", "8", "9", "10", "J", "Q", "K", "A", "2"];
    const HEO_IDS = ["2_♠", "2_♣", "2_♦", "2_♥"];
    const SUIT_CLASS_MAP = { '♥': 'heart', '♦': 'diamond', '♠': 'spade', '♣': 'club' };

    class GameModesManager {
        constructor() {
            this.currentMode = 'tienlen';
            this.addModeActive = false;

            this.gameSelect = null;
            this.tienLenPanel = null;
            this.tienLenHandEl = null;
            this.addModeBtn = null;
            this.sortTienLenBtn = null;
            this.heoRadarEl = null;
            this.tuQuyAlertEl = null;

            this.blackjackPanel = null;
            this.blackjackHandEl = null;
            this.blackjackTotalEl = null;
            this.blackjackChanceEl = null;
            this.newBlackjackHandBtn = null;
            this.blackjackHand = [];

            this.pokerPanel = null;
            this.pokerHoleEl = null;
            this.pokerCommunityEl = null;
            this.pokerInfoEl = null;
            this.newPokerHandBtn = null;
            this.pokerHole = [];
            this.pokerCommunity = [];

            this.onCardAction = null;
        }

        init({
            gameSelectEl, tienLenPanelEl, tienLenHandEl, addModeBtnEl, sortTienLenBtnEl, heoRadarEl, tuQuyAlertEl,
            blackjackPanelEl, blackjackHandEl, blackjackTotalEl, blackjackChanceEl, newBlackjackHandBtnEl,
            pokerPanelEl, pokerHoleEl, pokerCommunityEl, pokerInfoEl, newPokerHandBtnEl, onCardAction
        }) {
            this.gameSelect = gameSelectEl;
            this.tienLenPanel = tienLenPanelEl;
            this.tienLenHandEl = tienLenHandEl;
            this.addModeBtn = addModeBtnEl;
            this.sortTienLenBtn = sortTienLenBtnEl;
            this.heoRadarEl = heoRadarEl;
            this.tuQuyAlertEl = tuQuyAlertEl;

            this.blackjackPanel = blackjackPanelEl;
            this.blackjackHandEl = blackjackHandEl;
            this.blackjackTotalEl = blackjackTotalEl;
            this.blackjackChanceEl = blackjackChanceEl;
            this.newBlackjackHandBtn = newBlackjackHandBtnEl;

            this.pokerPanel = pokerPanelEl;
            this.pokerHoleEl = pokerHoleEl;
            this.pokerCommunityEl = pokerCommunityEl;
            this.pokerInfoEl = pokerInfoEl;
            this.newPokerHandBtn = newPokerHandBtnEl;

            this.onCardAction = onCardAction;
            this.bindEvents();
        }

        bindEvents() {
            if (this.gameSelect) this.gameSelect.addEventListener('change', () => this.setMode(this.gameSelect.value));
            if (this.addModeBtn) this.addModeBtn.addEventListener('click', () => this.toggleAddMode());
            if (this.sortTienLenBtn) this.sortTienLenBtn.addEventListener('click', () => this.sortTienLenHand());
            if (this.newBlackjackHandBtn) this.newBlackjackHandBtn.addEventListener('click', () => this.clearBlackjackHand());
            if (this.newPokerHandBtn) this.newPokerHandBtn.addEventListener('click', () => this.clearPokerHand());

            if (this.tienLenHandEl) {
                this.tienLenHandEl.addEventListener('click', (e) => {
                    const cardEl = e.target.closest('.hand-card');
                    if (cardEl && cardEl.dataset.id) this.removeTienLenCard(cardEl);
                });
            }
            if (this.blackjackHandEl) {
                this.blackjackHandEl.addEventListener('click', (e) => {
                    const cardEl = e.target.closest('.hand-card');
                    if (cardEl && cardEl.dataset.id) this.removeBlackjackCard(cardEl.dataset.id);
                });
            }
            const handlePokerClick = (e) => {
                const cardEl = e.target.closest('.hand-card');
                if (cardEl && cardEl.dataset.id) this.removePokerCard(cardEl.dataset.id);
            };
            if (this.pokerHoleEl) this.pokerHoleEl.addEventListener('click', handlePokerClick);
            if (this.pokerCommunityEl) this.pokerCommunityEl.addEventListener('click', handlePokerClick);
        }

        setMode(mode) {
            this.currentMode = mode;
            if (this.gameSelect && this.gameSelect.value !== mode) this.gameSelect.value = mode;
            if (this.tienLenPanel) this.tienLenPanel.style.display = (mode === 'tienlen') ? 'block' : 'none';
            if (this.blackjackPanel) this.blackjackPanel.style.display = (mode === 'blackjack') ? 'block' : 'none';
            if (this.pokerPanel) this.pokerPanel.style.display = (mode === 'poker') ? 'block' : 'none';
            localStorage.setItem('lastGame', mode);
        }

        getMode() { return this.currentMode; }

        toggleAddMode(forcedState) {
            this.addModeActive = typeof forcedState === 'boolean' ? forcedState : !this.addModeActive;
            if (this.addModeBtn) this.addModeBtn.classList.toggle('is-active', this.addModeActive);
            if (window.cardsAudio) window.cardsAudio.playClick();
        }

        isAddMode() { return this.currentMode === 'tienlen' && this.addModeActive; }

        /* ================= TIẾN LÊN LOGIC ================= */
        getTienLenHandIds() {
            if (!this.tienLenHandEl) return [];
            return [...this.tienLenHandEl.querySelectorAll('.hand-card')].map(el => el.dataset.id).filter(Boolean);
        }

        addCardToTienLen(cardId, rank, suit, isRed) {
            if (!this.tienLenHandEl) return false;
            const existingSlot = [...this.tienLenHandEl.querySelectorAll('.hand-card')].find(c => c.dataset.id === cardId);
            if (existingSlot) {
                this.removeTienLenCard(existingSlot);
                return 'removed';
            }
            const emptyCard = [...this.tienLenHandEl.querySelectorAll('.hand-card')].find(c => !c.dataset.id);
            if (!emptyCard) return false;
            this._populateCardSlot(emptyCard, cardId, rank, suit, isRed);
            return 'added';
        }

        removeTienLenCard(cardEl) {
            const cardId = cardEl.dataset.id;
            if (!cardId) return;
            const allSlots = [...this.tienLenHandEl.querySelectorAll('.hand-card')];
            const idx = allSlots.indexOf(cardEl);
            cardEl.removeAttribute('data-id');
            cardEl.innerHTML = `<span class="hand-slot-num">${idx !== -1 ? idx + 1 : ''}</span>`;
            cardEl.className = 'hand-card';
            cardEl.style.opacity = '1';
            if (typeof this.onCardAction === 'function') this.onCardAction(cardId, 'remove');
        }

        sortTienLenHand() {
            if (!this.tienLenHandEl) return;
            const currentCards = this.getTienLenHandIds().map(id => {
                const [rank, suit] = id.split('_');
                return { id, rank, suit, isRed: (suit === '♥' || suit === '♦'), rIdx: RANKS_TIENLEN.indexOf(rank), sIdx: SUITS_TIENLEN.indexOf(suit) };
            });
            if (currentCards.length <= 1) return;
            currentCards.sort((a, b) => a.rIdx !== b.rIdx ? a.rIdx - b.rIdx : a.sIdx - b.sIdx);
            const slots = [...this.tienLenHandEl.querySelectorAll('.hand-card')];
            slots.forEach((slot, idx) => {
                if (idx < currentCards.length) {
                    const c = currentCards[idx];
                    this._populateCardSlot(slot, c.id, c.rank, c.suit, c.isRed);
                } else {
                    slot.removeAttribute('data-id');
                    slot.innerHTML = `<span class="hand-slot-num">${idx + 1}</span>`;
                    slot.className = 'hand-card';
                }
            });
            if (window.cardsAudio) window.cardsAudio.playCardFlip();
            if (typeof this.onCardAction === 'function') this.onCardAction(null, 'sorted');
        }

        clearTienLenHand() {
            if (!this.tienLenHandEl) return;
            this.tienLenHandEl.querySelectorAll('.hand-card').forEach((cardEl, idx) => {
                cardEl.removeAttribute('data-id');
                cardEl.innerHTML = `<span class="hand-slot-num">${idx + 1}</span>`;
                cardEl.className = 'hand-card';
                cardEl.style.opacity = '1';
            });
        }

        updateTienLenHand(isUsedChecker) {
            if (!this.tienLenHandEl) return;
            this.tienLenHandEl.querySelectorAll('.hand-card').forEach(cardEl => {
                if (!cardEl.dataset.id) return;
                const isUsed = typeof isUsedChecker === 'function' ? isUsedChecker(cardEl.dataset.id) : false;
                cardEl.style.opacity = isUsed ? '0.1' : '1';
            });
        }

        updateTienLenRadar(deckManager) {
            if (!this.heoRadarEl || !deckManager) return;
            const handIds = new Set(this.getTienLenHandIds());
            const i18n = window.CardsTrackerI18n;

            const badgesHtml = HEO_IDS.map(id => {
                const [rank, suit] = id.split('_');
                const isRed = (suit === '♥' || suit === '♦');
                let sClass = 'unplayed', sText = i18n ? i18n.t('tienlen.heoUnplayed') : 'Chưa ra';
                if (handIds.has(id)) { sClass = 'in-hand'; sText = i18n ? i18n.t('tienlen.heoInHand') : 'Trong tay'; }
                else if (deckManager.isCardUsed(id)) { sClass = 'played'; sText = i18n ? i18n.t('tienlen.heoPlayed') : 'Đã ra'; }
                return `<div class="heo-badge ${isRed ? 'is-red' : 'is-black'} ${sClass === 'played' ? 'is-played' : ''}"><span class="heo-card-name">${rank}${suit}</span><span class="heo-status ${sClass}">${sText}</span></div>`;
            }).join('');

            this.heoRadarEl.innerHTML = `<div class="heo-radar-header"><span class="heo-radar-title" data-i18n="tienlen.heoRadarTitle">${i18n ? i18n.t('tienlen.heoRadarTitle') : 'Radar 4 Con Heo'}</span></div><div class="heo-items">${badgesHtml}</div>`;

            if (this.tuQuyAlertEl) {
                const intactRanks = RANKS_TIENLEN.filter(rank => {
                    const suitIds = SUITS_TIENLEN.map(s => `${rank}_${s}`);
                    return suitIds.filter(id => !deckManager.isCardUsed(id)).length === 4 && suitIds.filter(id => handIds.has(id)).length < 4;
                });
                if (intactRanks.length > 0) {
                    this.tuQuyAlertEl.className = 'tuquy-alert is-threat';
                    this.tuQuyAlertEl.textContent = i18n ? i18n.t('tienlen.tuQuyThreat', { count: intactRanks.length, ranks: intactRanks.join(', ') }) : `⚠️ Cảnh báo Tứ Quý: ${intactRanks.length} bộ còn nguyên (${intactRanks.join(', ')})`;
                } else {
                    this.tuQuyAlertEl.className = 'tuquy-alert is-safe';
                    this.tuQuyAlertEl.textContent = i18n ? i18n.t('tienlen.tuQuySafe') : '✅ An toàn: Không còn bộ Tứ Quý nguyên vẹn';
                }
            }
        }

        /* ================= BLACKJACK LOGIC ================= */
        handleBlackjackCardClick(cardId) {
            const idx = this.blackjackHand.indexOf(cardId);
            if (idx !== -1) {
                this.removeBlackjackCard(cardId);
                return 'removed';
            }
            if (this.blackjackHand.length >= 5) return false;
            this.blackjackHand.push(cardId);
            return 'added';
        }

        removeBlackjackCard(cardId) {
            const idx = this.blackjackHand.indexOf(cardId);
            if (idx !== -1) {
                this.blackjackHand.splice(idx, 1);
                if (typeof this.onCardAction === 'function') this.onCardAction(cardId, 'remove');
            }
        }

        clearBlackjackHand() {
            this.blackjackHand = [];
            if (window.cardsAudio) window.cardsAudio.playCardReturn();
            if (typeof this.onCardAction === 'function') this.onCardAction(null, 'newHand');
        }

        calculateHandValueFor(ranksList) {
            let total = 0, aceCount = 0;
            ranksList.forEach(rank => {
                if (rank === 'A') { aceCount++; total += 11; }
                else if (['J', 'Q', 'K'].includes(rank)) total += 10;
                else total += (parseInt(rank, 10) || 0);
            });
            while (total > 21 && aceCount > 0) { total -= 10; aceCount--; }
            return total;
        }

        updateBlackjackUI(unusedCardIds) {
            if (!this.blackjackHandEl) return;
            const slots = [...this.blackjackHandEl.querySelectorAll('.hand-card')];
            slots.forEach((slot, i) => {
                const cardId = this.blackjackHand[i];
                if (cardId) {
                    const [rank, suit] = cardId.split('_');
                    this._populateCardSlot(slot, cardId, rank, suit, suit === '♥' || suit === '♦');
                } else {
                    slot.removeAttribute('data-id');
                    slot.innerHTML = `<span class="hand-slot-num">${i + 1}</span>`;
                    slot.className = 'hand-card';
                }
            });

            const handRanks = this.blackjackHand.map(id => id.split('_')[0]);
            const total = this.calculateHandValueFor(handRanks);
            if (this.blackjackTotalEl) {
                this.blackjackTotalEl.textContent = `Total: ${total}`;
                this.blackjackTotalEl.style.color = (total > 21) ? "var(--c-red, #dc2626)" : (total >= 16) ? "var(--c-green, #22c55e)" : "var(--c-yellow, #ffd700)";
            }

            if (!this.blackjackChanceEl) return;
            if (this.blackjackHand.length === 0) {
                this.blackjackChanceEl.innerHTML = `<div class="chance-pill chance-neutral">Safe (≤21): --%</div><div class="chance-pill chance-neutral">Bust (>21): --%</div>`;
                return;
            }

            const unused = unusedCardIds || [];
            let safeCount = 0;
            unused.forEach(id => {
                const rank = id.split('_')[0];
                if (this.calculateHandValueFor([...handRanks, rank]) <= 21) safeCount++;
            });
            const totalUnused = unused.length;
            const safePct = totalUnused ? ((safeCount / totalUnused) * 100).toFixed(1) : '0.0';
            const bustPct = totalUnused ? (100 - parseFloat(safePct)).toFixed(1) : '0.0';

            this.blackjackChanceEl.innerHTML = `<div class="chance-pill chance-safe">Safe (≤21): ${safePct}%</div><div class="chance-pill chance-bust">Bust (>21): ${bustPct}%</div>`;
        }

        /* ================= POKER LOGIC ================= */
        handlePokerCardClick(cardId) {
            let idx = this.pokerHole.indexOf(cardId);
            if (idx !== -1) { this.pokerHole.splice(idx, 1); return 'removed'; }
            idx = this.pokerCommunity.indexOf(cardId);
            if (idx !== -1) { this.pokerCommunity.splice(idx, 1); return 'removed'; }
            if (this.pokerHole.length < 2) { this.pokerHole.push(cardId); return 'added'; }
            if (this.pokerCommunity.length < 5) { this.pokerCommunity.push(cardId); return 'added'; }
            return false;
        }

        removePokerCard(cardId) {
            let idx = this.pokerHole.indexOf(cardId);
            if (idx !== -1) this.pokerHole.splice(idx, 1);
            idx = this.pokerCommunity.indexOf(cardId);
            if (idx !== -1) this.pokerCommunity.splice(idx, 1);
            if (typeof this.onCardAction === 'function') this.onCardAction(cardId, 'remove');
        }

        clearPokerHand() {
            this.pokerHole = [];
            this.pokerCommunity = [];
            if (window.cardsAudio) window.cardsAudio.playCardReturn();
            if (typeof this.onCardAction === 'function') this.onCardAction(null, 'newHand');
        }

        updatePokerUI(deckManager) {
            if (!this.pokerHoleEl || !this.pokerCommunityEl || !deckManager) return;
            const i18n = window.CardsTrackerI18n;

            const holeSlots = [...this.pokerHoleEl.querySelectorAll('.hand-card')];
            holeSlots.forEach((slot, i) => {
                const cardId = this.pokerHole[i];
                if (cardId) {
                    const [rank, suit] = cardId.split('_');
                    this._populateCardSlot(slot, cardId, rank, suit, suit === '♥' || suit === '♦');
                } else {
                    slot.removeAttribute('data-id');
                    slot.innerHTML = `<span class="hand-slot-num">H${i + 1}</span>`;
                    slot.className = 'hand-card';
                }
            });

            const commLabels = ['Flop 1', 'Flop 2', 'Flop 3', 'Turn', 'River'];
            const commSlots = [...this.pokerCommunityEl.querySelectorAll('.hand-card')];
            commSlots.forEach((slot, i) => {
                const cardId = this.pokerCommunity[i];
                if (cardId) {
                    const [rank, suit] = cardId.split('_');
                    this._populateCardSlot(slot, cardId, rank, suit, suit === '♥' || suit === '♦');
                } else {
                    slot.removeAttribute('data-id');
                    slot.innerHTML = `<span class="hand-slot-num">${commLabels[i]}</span>`;
                    slot.className = 'hand-card';
                }
            });

            if (this.pokerInfoEl) {
                const unseen = deckManager.getUnusedCardIds();
                const visible = [...this.pokerHole, ...this.pokerCommunity];
                const suitCounts = { '♠': 0, '♣': 0, '♦': 0, '♥': 0 };
                visible.forEach(id => {
                    const suit = id.split('_')[1];
                    if (suitCounts[suit] !== undefined) suitCounts[suit]++;
                });

                let outsHtml = `<div class="poker-pill">${i18n ? i18n.t('poker.unseenLabel') : 'Lá chưa ra'}: ${unseen.length}/52</div>`;
                const flushSuit = Object.keys(suitCounts).find(s => suitCounts[s] === 4);
                if (flushSuit && unseen.length > 0) {
                    const remainingFlushCards = unseen.filter(id => id.endsWith(`_${flushSuit}`)).length;
                    const pct = ((remainingFlushCards / unseen.length) * 100).toFixed(1);
                    const msg = i18n ? i18n.t('poker.flushDraw', { suit: flushSuit, outs: remainingFlushCards, pct }) : `Chờ Thùng (${flushSuit}): ${remainingFlushCards} outs (${pct}%)`;
                    outsHtml += `<div class="poker-pill is-highlight">${msg}</div>`;
                }
                this.pokerInfoEl.innerHTML = outsHtml;
            }
        }

        _populateCardSlot(slotEl, cardId, rank, suit, isRed) {
            slotEl.dataset.id = cardId;
            const colorClass = isRed ? 'red' : 'black';
            const suitClass = SUIT_CLASS_MAP[suit] || '';
            slotEl.innerHTML = `<div class="card-rank ${colorClass}">${rank}</div><div class="card-suit ${suitClass} ${colorClass}">${suit}</div>`;
            slotEl.className = `hand-card ${colorClass}`;
            slotEl.style.opacity = '1';
        }

        getState() {
            return {
                mode: this.currentMode,
                tienLenHand: this.getTienLenHandIds(),
                blackjackHand: [...this.blackjackHand],
                pokerHole: [...this.pokerHole],
                pokerCommunity: [...this.pokerCommunity]
            };
        }

        restoreState(state) {
            if (!state) return;
            if (state.mode) this.setMode(state.mode);
            this.clearTienLenHand();
            if (Array.isArray(state.tienLenHand)) {
                const slots = [...(this.tienLenHandEl ? this.tienLenHandEl.querySelectorAll('.hand-card') : [])];
                state.tienLenHand.forEach((id, idx) => {
                    if (slots[idx]) {
                        const [rank, suit] = id.split('_');
                        this._populateCardSlot(slots[idx], id, rank, suit, suit === '♥' || suit === '♦');
                    }
                });
            }
            this.blackjackHand = Array.isArray(state.blackjackHand) ? [...state.blackjackHand] : [];
            this.pokerHole = Array.isArray(state.pokerHole) ? [...state.pokerHole] : [];
            this.pokerCommunity = Array.isArray(state.pokerCommunity) ? [...state.pokerCommunity] : [];
        }
    }

    window.gameModesManager = new GameModesManager();
})();
