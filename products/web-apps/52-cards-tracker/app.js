/**
 * 52 Cards Tracker - Main Controller
 * Restored original layout logic with 2-tier local/cloud storage, audio & i18n
 * Complies with _RULE-web-apps.md & _RULE-website.md (< 500 lines)
 */

document.addEventListener('DOMContentLoaded', () => {
    'use strict';

    const APP_ID = 'cards_tracker';

    // 1. Settings & State
    const DEFAULT_SETTINGS = Object.freeze({
        gameMode: 'tienlen',
        soundEnabled: true
    });

    let settings = { ...DEFAULT_SETTINGS };

    // DOM Elements
    const gameSelect = document.getElementById("gameSelect");
    const counterEl = document.getElementById("counter");
    const cardsContainer = document.getElementById("cards");
    const historyEl = document.getElementById("history");

    const tienLenPanel = document.getElementById("tienlen-panel");
    const tienLenHandEl = document.getElementById("tienlen-hand");
    const addModeBtn = document.getElementById("addModeBtn");
    const sortTienLenBtn = document.getElementById("sortTienLenBtn");
    const heoRadarEl = document.getElementById("heoRadar");
    const tuQuyAlertEl = document.getElementById("tuQuyAlert");

    const blackjackPanel = document.getElementById("blackjack-panel");
    const blackjackHandEl = document.getElementById("blackjack-hand");
    const blackjackTotalEl = document.getElementById("blackjack-total");
    const blackjackChanceEl = document.getElementById("blackjack-chance");
    const newBlackjackHandBtn = document.getElementById("newBlackjackHandBtn");

    const pokerPanel = document.getElementById("poker-panel");
    const pokerHoleEl = document.getElementById("poker-hole");
    const pokerCommunityEl = document.getElementById("poker-community");
    const pokerInfoEl = document.getElementById("poker-info");
    const newPokerHandBtn = document.getElementById("newPokerHandBtn");

    const hideBtn = document.getElementById("hideBtn");
    const showBtn = document.getElementById("showBtn");
    const undoBtn = document.getElementById("undoBtn");
    const redoBtn = document.getElementById("redoBtn");

    const soundToggleBtn = document.getElementById("soundToggleBtn");
    const langToggleBtn = document.getElementById("langToggleBtn");

    // 2. Load Settings from LocalStorage
    try {
        const savedSettings = localStorage.getItem(`${APP_ID}_settings`);
        if (savedSettings) {
            settings = { ...DEFAULT_SETTINGS, ...JSON.parse(savedSettings) };
        } else {
            const legacyGame = localStorage.getItem("lastGame");
            if (legacyGame) settings.gameMode = legacyGame;
        }
    } catch (e) {
        console.warn(`[${APP_ID}] Settings load failed`, e);
    }

    // 3. Audio Setup
    if (window.cardsAudio) {
        window.cardsAudio.setEnabled(settings.soundEnabled);
    }
    updateSoundBtn();

    if (soundToggleBtn) {
        soundToggleBtn.addEventListener("click", () => {
            if (window.cardsAudio) {
                settings.soundEnabled = window.cardsAudio.toggle();
                updateSoundBtn();
                saveState();
            }
        });
    }

    function updateSoundBtn() {
        if (!soundToggleBtn) return;
        soundToggleBtn.textContent = settings.soundEnabled ? "🔊" : "🔇";
        soundToggleBtn.classList.toggle("is-muted", !settings.soundEnabled);
    }

    // 4. Language Switcher (CSS Flag Style)
    updateLangBtn();
    if (langToggleBtn) {
        langToggleBtn.addEventListener("click", () => {
            if (window.CardsTrackerI18n) {
                window.CardsTrackerI18n.toggleLang();
                updateLangBtn();
                updateAll();
            }
        });
    }

    function updateLangBtn() {
        if (!langToggleBtn || !window.CardsTrackerI18n) return;
        const currentLang = window.CardsTrackerI18n.getLang();
        const flagSpan = langToggleBtn.querySelector(".lang-flag");
        const codeSpan = langToggleBtn.querySelector(".lang-code");

        if (currentLang === "vi") {
            if (flagSpan) flagSpan.className = "lang-flag lang-flag--en";
            if (codeSpan) codeSpan.textContent = "EN";
            langToggleBtn.setAttribute("data-lang", "en");
        } else {
            if (flagSpan) flagSpan.className = "lang-flag lang-flag--vi";
            if (codeSpan) codeSpan.textContent = "VN";
            langToggleBtn.setAttribute("data-lang", "vi");
        }
    }

    // 5. Initialize Deck & History Submodules
    if (window.deckManager) {
        window.deckManager.init(cardsContainer, (cardId, cardEl) => {
            handleCardClick(cardId, cardEl);
        });
    }

    if (window.historyManager) {
        window.historyManager.init({
            containerEl: historyEl,
            onRemoveCard: (cardId) => {
                if (window.deckManager) window.deckManager.setCardUsed(cardId, false);
                if (window.historyManager) window.historyManager.remove(cardId);
                if (window.cardsAudio) window.cardsAudio.playCardReturn();
                updateAll();
                snapshotState();
            }
        });
    }

    if (window.gameModesManager) {
        window.gameModesManager.init({
            gameSelectEl: gameSelect,
            tienLenPanelEl: tienLenPanel,
            tienLenHandEl: tienLenHandEl,
            addModeBtnEl: addModeBtn,
            sortTienLenBtnEl: sortTienLenBtn,
            heoRadarEl: heoRadarEl,
            tuQuyAlertEl: tuQuyAlertEl,
            blackjackPanelEl: blackjackPanel,
            blackjackHandEl: blackjackHandEl,
            blackjackTotalEl: blackjackTotalEl,
            blackjackChanceEl: blackjackChanceEl,
            newBlackjackHandBtnEl: newBlackjackHandBtn,
            pokerPanelEl: pokerPanel,
            pokerHoleEl: pokerHoleEl,
            pokerCommunityEl: pokerCommunityEl,
            pokerInfoEl: pokerInfoEl,
            newPokerHandBtnEl: newPokerHandBtn,
            onCardAction: (cardId, action) => {
                if (action === 'remove' && cardId) {
                    if (window.deckManager) window.deckManager.setCardUsed(cardId, false);
                    if (window.historyManager) window.historyManager.remove(cardId);
                    if (window.cardsAudio) window.cardsAudio.playCardReturn();
                }
                updateAll();
                snapshotState();
            }
        });
        window.gameModesManager.setMode(settings.gameMode || 'tienlen');
    }

    // 6. Central updateAll() Function
    function updateAll() {
        if (!window.deckManager || !window.historyManager) return;

        // Reset all cards in deck
        window.deckManager.resetAll();

        // Mark used cards based on history
        const historyIds = window.historyManager.getHistoryIds();
        historyIds.forEach(id => {
            window.deckManager.setCardUsed(id, true);
        });

        // Update counter
        updateCounter();

        // Update Game Panels
        if (window.gameModesManager) {
            const mode = window.gameModesManager.getMode();
            if (mode === 'tienlen') {
                window.gameModesManager.updateTienLenHand(id => window.deckManager.isCardUsed(id));
                window.gameModesManager.updateTienLenRadar(window.deckManager);
            } else if (mode === 'blackjack') {
                const unusedIds = window.deckManager.getUnusedCardIds();
                window.gameModesManager.updateBlackjackUI(unusedIds);
            } else if (mode === 'poker') {
                window.gameModesManager.updatePokerUI(window.deckManager);
            }
        }

        // Update Undo / Redo button disabled states
        updateUndoRedoBtns();

        // Save state
        saveState();

        // Apply dynamic translations
        if (window.CardsTrackerI18n) {
            window.CardsTrackerI18n.applyTranslations();
        }
    }

    function updateUndoRedoBtns() {
        if (!undoBtn || !redoBtn || !window.historyManager) return;
        const canUndo = window.historyManager.canUndo();
        const canRedo = window.historyManager.canRedo();
        undoBtn.disabled = !canUndo;
        undoBtn.classList.toggle('is-disabled', !canUndo);
        redoBtn.disabled = !canRedo;
        redoBtn.classList.toggle('is-disabled', !canRedo);
    }

    function updateCounter() {
        if (!counterEl || !window.deckManager) return;
        const usedCount = window.deckManager.getUsedCount();
        counterEl.textContent = `${usedCount} / 52🃏`;
    }

    function handleCardClick(cardId, cardEl) {
        const rank = cardEl.dataset.rank;
        const suit = cardEl.dataset.suit;
        const isRed = cardEl.classList.contains("red");
        const mode = window.gameModesManager ? window.gameModesManager.getMode() : 'tienlen';

        // 1. Tiến Lên: Add Mode Active
        if (mode === 'tienlen' && window.gameModesManager && window.gameModesManager.isAddMode()) {
            const result = window.gameModesManager.addCardToTienLen(cardId, rank, suit, isRed);
            if (result === 'added') {
                cardEl.classList.add("used");
                if (window.historyManager) window.historyManager.add(cardId, rank, suit, isRed);
                if (window.cardsAudio) window.cardsAudio.playCardFlip();
                updateAll();
                snapshotState();
                return;
            } else if (result === 'removed') {
                cardEl.classList.remove("used");
                if (window.historyManager) window.historyManager.remove(cardId);
                if (window.cardsAudio) window.cardsAudio.playCardReturn();
                updateAll();
                snapshotState();
                return;
            }
        }

        // 2. Blackjack Mode: Click to deal or remove
        if (mode === 'blackjack' && window.gameModesManager) {
            const result = window.gameModesManager.handleBlackjackCardClick(cardId);
            if (result === 'added') {
                cardEl.classList.add("used");
                if (window.historyManager) window.historyManager.add(cardId, rank, suit, isRed);
                if (window.cardsAudio) window.cardsAudio.playCardFlip();
                updateAll();
                snapshotState();
                return;
            } else if (result === 'removed') {
                cardEl.classList.remove("used");
                if (window.historyManager) window.historyManager.remove(cardId);
                if (window.cardsAudio) window.cardsAudio.playCardReturn();
                updateAll();
                snapshotState();
                return;
            }
        }

        // 3. Poker Mode: Click to place into Hole / Community
        if (mode === 'poker' && window.gameModesManager) {
            const result = window.gameModesManager.handlePokerCardClick(cardId);
            if (result === 'added') {
                cardEl.classList.add("used");
                if (window.historyManager) window.historyManager.add(cardId, rank, suit, isRed);
                if (window.cardsAudio) window.cardsAudio.playCardFlip();
                updateAll();
                snapshotState();
                return;
            } else if (result === 'removed') {
                cardEl.classList.remove("used");
                if (window.historyManager) window.historyManager.remove(cardId);
                if (window.cardsAudio) window.cardsAudio.playCardReturn();
                updateAll();
                snapshotState();
                return;
            }
        }

        // 4. Standard Deck Toggle
        const isUsed = cardEl.classList.toggle("used");
        if (isUsed) {
            if (window.historyManager) window.historyManager.add(cardId, rank, suit, isRed);
            if (window.cardsAudio) window.cardsAudio.playCardFlip();
        } else {
            if (window.historyManager) window.historyManager.remove(cardId);
            if (window.cardsAudio) window.cardsAudio.playCardReturn();
        }

        updateAll();
        snapshotState();
    }

    // 7. Two-Tier Storage
    function saveState() {
        if (!window.deckManager) return;
        const used = window.deckManager.getUsedCardIds();
        const hands = window.gameModesManager ? window.gameModesManager.getState() : null;

        try {
            localStorage.setItem("usedCards", JSON.stringify(used));
            localStorage.setItem(`${APP_ID}_settings`, JSON.stringify(settings));
            if (hands) localStorage.setItem(`${APP_ID}_hands`, JSON.stringify(hands));
        } catch (e) {
            console.error(`[${APP_ID}] LocalStorage write error`, e);
        }

        // Tier 2: Cloud Sync via SharedAuth
        if (window.SharedAuth && typeof window.SharedAuth.saveData === 'function') {
            window.SharedAuth.saveData({
                settings: settings,
                usedCards: used,
                gameHands: hands
            });
        }
    }

    function loadState() {
        try {
            const used = JSON.parse(localStorage.getItem("usedCards") || "[]");
            used.forEach(id => {
                const [rank, suit] = id.split("_");
                const isRed = (suit === "♥" || suit === "♦");
                if (window.historyManager) window.historyManager.add(id, rank, suit, isRed);
                if (window.deckManager) window.deckManager.setCardUsed(id, true);
            });

            const savedHands = JSON.parse(localStorage.getItem(`${APP_ID}_hands`) || "null");
            if (savedHands && window.gameModesManager) {
                window.gameModesManager.restoreState(savedHands);
            }
        } catch (e) {
            console.warn(`[${APP_ID}] State load error`, e);
        }
        updateCounter();
    }

    // 8. Snapshot State for Undo / Redo (Syncs Hands + Deck)
    function snapshotState() {
        if (!window.historyManager || !window.deckManager) return;
        window.historyManager.snapshot({
            used: window.deckManager.getUsedCardIds(),
            gameHands: window.gameModesManager ? window.gameModesManager.getState() : null
        });
        updateUndoRedoBtns();
    }

    function restoreState(state) {
        if (!state || !window.historyManager || !window.deckManager) return;

        window.historyManager.clear();
        if (Array.isArray(state.history)) {
            state.history.forEach(id => {
                const [rank, suit] = id.split("_");
                const isRed = (suit === "♥" || suit === "♦");
                window.historyManager.add(id, rank, suit, isRed);
            });
        }

        if (state.extra && state.extra.gameHands && window.gameModesManager) {
            window.gameModesManager.restoreState(state.extra.gameHands);
        }

        updateAll();
    }

    // 9. Bottom Controls: Hide, Show, Undo, Redo
    if (hideBtn) {
        hideBtn.addEventListener("click", () => {
            if (!window.deckManager || !window.historyManager) return;
            const unusedIds = window.deckManager.getUnusedCardIds();
            unusedIds.forEach(id => {
                const [rank, suit] = id.split("_");
                const isRed = (suit === "♥" || suit === "♦");
                window.historyManager.add(id, rank, suit, isRed);
            });
            if (window.cardsAudio) window.cardsAudio.playReset();
            updateAll();
            snapshotState();
        });
    }

    if (showBtn) {
        showBtn.addEventListener("click", () => {
            if (!window.historyManager || !window.deckManager) return;
            window.historyManager.clear();
            if (window.gameModesManager) {
                window.gameModesManager.clearTienLenHand();
                window.gameModesManager.clearBlackjackHand();
                window.gameModesManager.clearPokerHand();
            }
            if (window.cardsAudio) window.cardsAudio.playReset();
            updateAll();
            snapshotState();
        });
    }

    if (undoBtn) {
        undoBtn.addEventListener("click", () => {
            if (!window.historyManager) return;
            window.historyManager.undo(state => {
                restoreState(state);
                if (window.cardsAudio) window.cardsAudio.playUndo();
            });
        });
    }

    if (redoBtn) {
        redoBtn.addEventListener("click", () => {
            if (!window.historyManager) return;
            window.historyManager.redo(state => {
                restoreState(state);
                if (window.cardsAudio) window.cardsAudio.playClick();
            });
        });
    }

    // Keyboard Shortcuts
    document.addEventListener("keydown", (e) => {
        if (['INPUT', 'SELECT', 'TEXTAREA'].includes(e.target.tagName)) return;

        if ((e.ctrlKey || e.metaKey) && (e.key === "z" || e.key === "Z")) {
            if (e.shiftKey) {
                if (redoBtn) redoBtn.click();
            } else {
                if (undoBtn) undoBtn.click();
            }
            e.preventDefault();
        } else if ((e.ctrlKey || e.metaKey) && (e.key === "y" || e.key === "Y")) {
            if (redoBtn) redoBtn.click();
            e.preventDefault();
        }
    });

    // 10. Bootstrap App
    loadState();
    if (window.historyManager) {
        window.historyManager.initStack({
            gameHands: window.gameModesManager ? window.gameModesManager.getState() : null
        });
    }
    updateAll();

    // 11. Tier 2: Shared SSO Authentication & Cloud Sync
    if (window.SharedAuth) {
        window.SharedAuth.init({
            appId: APP_ID,
            mountTo: '#sharedAuthSlot',
            onUserChange: (user) => {
                console.log(`[${APP_ID}] Auth status:`, user ? user.email : 'Guest / Local');
            },
            onDataLoaded: (cloudData) => {
                if (!cloudData) return;

                if (cloudData.settings && typeof cloudData.settings === 'object') {
                    settings = { ...DEFAULT_SETTINGS, ...cloudData.settings };
                    if (window.gameModesManager) {
                        window.gameModesManager.setMode(settings.gameMode || 'tienlen');
                    }
                }

                if (Array.isArray(cloudData.usedCards)) {
                    restoreState({
                        history: cloudData.usedCards,
                        extra: { gameHands: cloudData.gameHands || null }
                    });
                }
            }
        });
    }
});
