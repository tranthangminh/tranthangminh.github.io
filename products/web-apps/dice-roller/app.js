/**
 * Dice Roller - Main Application Controller
 * Connects 3D Polyhedral Engine, Physics, Audio, History, 2-Tier Local/Cloud Storage & SSO.
 * Complies with _RULE-web-apps.md (< 500 lines)
 */

document.addEventListener('DOMContentLoaded', () => {
    const APP_ID = 'dice_roller';

    // 1. Immutable Default Settings
    const DEFAULT_SETTINGS = Object.freeze({
        diceCount: 2,
        diceType: 'd6',
        theme: 'ivory',
        soundEnabled: true
    });

    let settings = { ...DEFAULT_SETTINGS };
    let rollHistory = [];
    let isRolling = false;

    // 2. Tier 1: LocalStorage with Safe Merge
    try {
        const savedSettings = localStorage.getItem(`${APP_ID}_settings`);
        if (savedSettings) {
            settings = { ...DEFAULT_SETTINGS, ...JSON.parse(savedSettings) };
        }
        const VALID_DICE_TYPES = ['d6', 'd8', 'd10', 'd12', 'd20'];
        if (!VALID_DICE_TYPES.includes(settings.diceType)) {
            settings.diceType = 'd6';
        }
        const savedHistory = localStorage.getItem(`${APP_ID}_history`);
        if (savedHistory) {
            rollHistory = JSON.parse(savedHistory);
        }
    } catch (e) {
        console.warn(`[${APP_ID}] LocalStorage read failed, fallback to defaults`, e);
    }

    // 3. Two-Tier Atomic Save Function
    function saveState() {
        try {
            localStorage.setItem(`${APP_ID}_settings`, JSON.stringify(settings));
            localStorage.setItem(`${APP_ID}_history`, JSON.stringify(rollHistory));
        } catch (e) {
            console.error(`[${APP_ID}] LocalStorage write error`, e);
        }

        // Tier 2: Cloud Sync (Debounced 600ms by SharedAuth)
        if (window.SharedAuth && typeof window.SharedAuth.saveData === 'function') {
            window.SharedAuth.saveData({
                settings: settings,
                history: rollHistory
            });
        }
    }

    // 4. Initialize Core Submodules
    const mainStage = document.getElementById('mainStage');
    const canvasContainer = document.getElementById('diceCanvasContainer');
    const stageTopHud = document.querySelector('.stage-top-hud');
    const stageBottomHud = document.getElementById('stageBottomHud');

    if (window.dice3DEngine) {
        window.dice3DEngine.currentTheme = settings.theme;
        window.dice3DEngine.init(canvasContainer);
        window.dice3DEngine.setDiceType(settings.diceType, 6);
    }

    if (window.rollHistoryManager) {
        window.rollHistoryManager.init({
            initialData: rollHistory,
            onChange: (newHistory) => {
                rollHistory = newHistory;
                saveState();
            }
        });
    }

    // 5. DOM References
    const resultTotal = document.getElementById('resultTotal');
    const resultBreakdown = document.getElementById('resultBreakdown');

    const btnCountMinus = document.getElementById('btnCountMinus');
    const btnCountPlus = document.getElementById('btnCountPlus');
    const countChips = document.querySelectorAll('.count-chip');
    const typeChips = document.querySelectorAll('.type-chip');
    const themeBtns = document.querySelectorAll('.theme-btn');

    const soundToggleBtn = document.getElementById('soundToggleBtn');
    const langToggleBtn = document.getElementById('langToggleBtn');
    const clearHistoryBtn = document.getElementById('clearHistoryBtn');

    // Prevent clicking on HUDs from triggering roll on mainStage
    if (stageTopHud) {
        stageTopHud.addEventListener('click', (e) => e.stopPropagation());
    }
    if (stageBottomHud) {
        stageBottomHud.addEventListener('click', (e) => e.stopPropagation());
    }

    // 6. UI Synchronization
    function updateTypeUI() {
        typeChips.forEach(chip => {
            if (chip.dataset.type === settings.diceType) {
                chip.classList.add('is-active');
            } else {
                chip.classList.remove('is-active');
            }
        });
    }

    function updateCountUI() {
        countChips.forEach(chip => {
            const count = parseInt(chip.dataset.count, 10);
            if (count === settings.diceCount) {
                chip.classList.add('is-active');
            } else {
                chip.classList.remove('is-active');
            }
        });

        if (window.dicePhysics) {
            window.dicePhysics.activeCount = settings.diceCount;
        }
    }

    function updateThemeUI() {
        themeBtns.forEach(btn => {
            if (btn.dataset.theme === settings.theme) {
                btn.classList.add('is-active');
            } else {
                btn.classList.remove('is-active');
            }
        });
    }

    function updateSoundUI() {
        if (!soundToggleBtn || !window.soundEngine) return;
        const muted = window.soundEngine.isMuted;
        if (muted) {
            soundToggleBtn.classList.add('is-muted');
            soundToggleBtn.textContent = '🔇';
        } else {
            soundToggleBtn.classList.remove('is-muted');
            soundToggleBtn.textContent = '🔊';
        }
    }

    function setDiceType(newType) {
        if (settings.diceType !== newType) {
            settings.diceType = newType;
            updateTypeUI();
            if (window.dice3DEngine) {
                window.dice3DEngine.setDiceType(settings.diceType, 6);
            }
            saveState();
        }
    }

    function setDiceCount(newCount) {
        const clamped = Math.max(1, Math.min(6, newCount));
        if (settings.diceCount !== clamped) {
            settings.diceCount = clamped;
            updateCountUI();
            saveState();
        }
    }

    function setDiceTheme(newTheme) {
        if (settings.theme !== newTheme) {
            settings.theme = newTheme;
            updateThemeUI();
            if (window.dice3DEngine) {
                window.dice3DEngine.setTheme(settings.theme);
            }
            saveState();
        }
    }

    // 7. Roll Execution Workflow
    function triggerRoll() {
        if (isRolling) return;
        isRolling = true;

        if (resultTotal) resultTotal.textContent = '--';
        if (resultBreakdown) {
            const rollStatus = window.DiceRollerI18n ? window.DiceRollerI18n.t('results.statusRolling') : 'Rolling...';
            resultBreakdown.innerHTML = `<span class="hud-awaiting">${rollStatus}</span>`;
        }

        // Throw in Cannon.js physics
        window.dicePhysics.throwDice(settings.diceCount, (results) => {
            onRollSettled(results);
        });
    }

    function onRollSettled(results) {
        isRolling = false;

        const total = results.reduce((a, b) => a + b, 0);

        if (resultTotal) {
            resultTotal.textContent = String(total);
        }

        if (resultBreakdown) {
            const pipSymbols = ['', '⚀', '⚁', '⚂', '⚃', '⚄', '⚅'];
            resultBreakdown.innerHTML = results.map(val => {
                const icon = settings.diceType === 'd6' ? (pipSymbols[val] || '') + ' ' : '';
                return `<span class="hud-die-chip">${icon}${val}</span>`;
            }).join('');
        }

        // Fanfare for rare match (e.g. all dice show same value)
        const allSame = results.length > 1 && results.every(v => v === results[0]);
        if (allSame && window.soundEngine) {
            window.soundEngine.playFanfare();
        }

        // Record in History with dice type
        if (window.rollHistoryManager) {
            window.rollHistoryManager.addRecord(results, settings.diceType);
        }
    }

    // 8. Event Wiring
    if (mainStage) {
        mainStage.addEventListener('click', triggerRoll);
    }

    window.addEventListener('keydown', (e) => {
        if (e.code === 'Space' && e.target === document.body) {
            e.preventDefault();
            triggerRoll();
        }
    });

    typeChips.forEach(chip => {
        chip.addEventListener('click', () => {
            setDiceType(chip.dataset.type);
        });
    });

    if (btnCountMinus) {
        btnCountMinus.addEventListener('click', () => setDiceCount(settings.diceCount - 1));
    }
    if (btnCountPlus) {
        btnCountPlus.addEventListener('click', () => setDiceCount(settings.diceCount + 1));
    }

    countChips.forEach(chip => {
        chip.addEventListener('click', () => {
            const c = parseInt(chip.dataset.count, 10);
            setDiceCount(c);
        });
    });

    themeBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            setDiceTheme(btn.dataset.theme);
        });
    });

    if (soundToggleBtn) {
        soundToggleBtn.addEventListener('click', () => {
            if (window.soundEngine) {
                window.soundEngine.toggleMute();
                updateSoundUI();
            }
        });
    }

    if (langToggleBtn) {
        langToggleBtn.addEventListener('click', () => {
            if (window.DiceRollerI18n) {
                const newLang = window.DiceRollerI18n.toggleLang();
                const flagEl = langToggleBtn.querySelector('.lang-flag');
                const codeEl = langToggleBtn.querySelector('.lang-code');
                if (newLang === 'en') {
                    if (flagEl) { flagEl.className = 'lang-flag lang-flag--vi'; }
                    if (codeEl) { codeEl.textContent = 'VN'; }
                    langToggleBtn.dataset.lang = 'vi';
                } else {
                    if (flagEl) { flagEl.className = 'lang-flag lang-flag--en'; }
                    if (codeEl) { codeEl.textContent = 'EN'; }
                    langToggleBtn.dataset.lang = 'en';
                }
            }
        });
    }

    if (clearHistoryBtn) {
        clearHistoryBtn.addEventListener('click', () => {
            const confirmMsg = window.DiceRollerI18n ? window.DiceRollerI18n.t('history.clearConfirm') : 'Clear history?';
            if (window.confirm(confirmMsg)) {
                if (window.rollHistoryManager) {
                    window.rollHistoryManager.clear();
                }
            }
        });
    }

    // 9. Initialize Tier 2 Cloud Sync & Firebase SSO
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
                    updateTypeUI();
                    updateCountUI();
                    updateThemeUI();
                    if (window.dice3DEngine) {
                        window.dice3DEngine.setDiceType(settings.diceType, 6);
                        window.dice3DEngine.setTheme(settings.theme);
                    }
                }

                if (Array.isArray(cloudData.history)) {
                    rollHistory = cloudData.history;
                    if (window.rollHistoryManager) {
                        window.rollHistoryManager.init({
                            initialData: rollHistory,
                            onChange: (newHistory) => {
                                rollHistory = newHistory;
                                saveState();
                            }
                        });
                    }
                }

                saveState();
            }
        });
    }

    // Initial UI apply
    updateTypeUI();
    updateCountUI();
    updateThemeUI();
    updateSoundUI();
});
