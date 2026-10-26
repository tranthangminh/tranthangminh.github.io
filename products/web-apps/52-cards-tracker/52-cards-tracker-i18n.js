/**
 * 52 Cards Tracker - App-Scoped Bilingual Dictionary (i18n)
 * Complies with _RULE-web-apps.md (< 500 lines)
 * Shared state via localStorage key: 'portfolio-lang'
 */

(function () {
    'use strict';

    const STORAGE_KEY = 'portfolio-lang';

    const TRANSLATIONS = {
        'en': {
            brand: {
                title: '52 Cards Tracker',
                documentTitle: '52 Cards Tracker - Card Counter & Odds Assistant | Tran Thang Minh',
                tagline: 'Standard 52-card deck tracker & game odds'
            },
            auth: {
                signIn: 'Sign in',
                setup: 'Setup Sync',
                syncNow: 'Sync Now',
                cloudSetup: 'Cloud Setup',
                signOut: 'Sign Out'
            },
            gameModes: {
                label: 'Game Mode',
                tienlen: 'Tiến Lên',
                blackjack: 'Blackjack',
                poker: 'Poker'
            },
            deck: {
                title: '52-Card Deck',
                counterLabel: 'Cards Dealt',
                remainingLabel: 'Remaining',
                spades: 'Spades',
                clubs: 'Clubs',
                diamonds: 'Diamonds',
                hearts: 'Hearts',
                suitStatus: 'Suits Left',
                allCards: 'All 52'
            },
            tienlen: {
                title: 'Tiến Lên Hand (13 cards)',
                addModeBtn: 'Add to Hand',
                addModeActive: 'Adding... (Click cards)',
                sortBtn: 'Sort Hand',
                heoRadarTitle: '2s Radar (Heo)',
                heoInHand: 'In Hand',
                heoPlayed: 'Played',
                heoUnplayed: 'In Play',
                tuQuyThreat: '⚠️ Tứ Quý Threat: {count} intact ranks ({ranks})',
                tuQuySafe: '✅ Safe: No intact 4-of-a-kind threats',
                clearHand: 'Clear Hand',
                handEmptyHint: 'Turn on "Add to Hand" and click cards to fill hand.'
            },
            blackjack: {
                title: 'Blackjack Hand (5 cards)',
                newHandBtn: 'New Hand',
                handTotal: 'Hand Total',
                safeChance: 'Safe (≤21)',
                bustChance: 'Bust (>21)',
                drawFirst: 'Draw card to calculate odds',
                blackjackHit: 'Blackjack! (21)',
                fiveDragon: 'Five Dragon (5 Cards ≤21)',
                busted: 'Busted (>21)',
                hint: 'Track dealt cards and calculate next draw probability.'
            },
            poker: {
                title: 'Poker Texas Hold\'em',
                holeTitle: 'Hole Cards (2 cards)',
                communityTitle: 'Community Board (5 cards)',
                flop: 'Flop',
                turn: 'Turn',
                river: 'River',
                newHandBtn: 'New Hand',
                unseenLabel: 'Unseen Cards',
                flushDraw: 'Flush Draw ({suit}): {outs} outs ({pct}%)',
                straightDraw: 'Straight Draw: {outs} outs ({pct}%)',
                standardOdds: 'Remaining deck: {count} cards'
            },
            history: {
                title: 'Deal History',
                count: 'Dealt',
                clear: 'Clear',
                clearConfirm: 'Clear all card tracking history?',
                empty: 'No cards dealt yet. Click any card on table to start tracking!'
            },
            controls: {
                hideAll: 'Hide All',
                showAll: 'Reset All',
                undo: 'Undo',
                redo: 'Redo',
                soundToggle: 'Toggle Sound'
            }
        },
        'vi': {
            brand: {
                title: 'Bộ Đếm Bài 52 Lá',
                documentTitle: '52 Cards Tracker - Đếm & Theo Dõi Bài 52 Lá | Trần Thắng Minh',
                tagline: 'Theo dõi bài đã đánh & tính toán xác suất'
            },
            auth: {
                signIn: 'Đăng nhập',
                setup: 'Cấu hình đồng bộ',
                syncNow: 'Đồng bộ ngay',
                cloudSetup: 'Cài đặt Cloud',
                signOut: 'Đăng xuất'
            },
            gameModes: {
                label: 'Chế Độ Chơi',
                tienlen: 'Tiến Lên',
                blackjack: 'Blackjack',
                poker: 'Poker'
            },
            deck: {
                title: 'Bộ Bài 52 Lá',
                counterLabel: 'Đã Đánh',
                remainingLabel: 'Còn Lại',
                spades: 'Bích',
                clubs: 'Chuồn',
                diamonds: 'Rô',
                hearts: 'Cơ',
                suitStatus: 'Chất Còn Lại',
                allCards: 'Toàn Bộ 52'
            },
            tienlen: {
                title: 'Bài Trên Tay (13 lá)',
                addModeBtn: 'Thêm Vào Tay',
                addModeActive: 'Đang chọn... (Nhấp lá bài)',
                sortBtn: 'Sắp Xếp Bài',
                heoRadarTitle: 'Radar 4 Con Heo',
                heoInHand: 'Trong tay',
                heoPlayed: 'Đã ra',
                heoUnplayed: 'Chưa ra',
                tuQuyThreat: '⚠️ Cảnh báo Tứ Quý: {count} bộ còn nguyên ({ranks})',
                tuQuySafe: '✅ An toàn: Không còn bộ Tứ Quý nguyên vẹn',
                clearHand: 'Xóa Bài Tay',
                handEmptyHint: 'Bật "Thêm Vào Tay" và nhấp lá bài để nạp vào tay.'
            },
            blackjack: {
                title: 'Bài Trên Tay (5 lá)',
                newHandBtn: 'Ván Mới',
                handTotal: 'Tổng Điểm',
                safeChance: 'An toàn (≤21)',
                bustChance: 'Quắc (>21)',
                drawFirst: 'Rút lá bài để tính xác suất',
                blackjackHit: 'Xì Dách! (21 điểm)',
                fiveDragon: 'Ngũ Linh (5 lá ≤21)',
                busted: 'Quắc bài (>21 điểm)',
                hint: 'Hiển thị bài đã rút và tính xác suất bốc tiếp an toàn.'
            },
            poker: {
                title: 'Poker Texas Hold\'em',
                holeTitle: 'Bài Tẩy (2 lá)',
                communityTitle: 'Bài Chung (5 lá)',
                flop: 'Flop',
                turn: 'Turn',
                river: 'River',
                newHandBtn: 'Ván Mới',
                unseenLabel: 'Lá chưa ra',
                flushDraw: 'Chờ Thùng ({suit}): {outs} outs ({pct}%)',
                straightDraw: 'Chờ Sảnh: {outs} outs ({pct}%)',
                standardOdds: 'Còn lại trong bộ: {count} lá'
            },
            history: {
                title: 'Lịch Sử Đánh',
                count: 'Đã ra',
                clear: 'Xóa',
                clearConfirm: 'Mày có chắc muốn xóa sạch toàn bộ lịch sử đánh bài?',
                empty: 'Chưa có lá bài nào được đánh. Nhấp vào bất kỳ lá bài nào trên bàn để bắt đầu!'
            },
            controls: {
                hideAll: 'Ẩn Hết',
                showAll: 'Làm Mới',
                undo: 'Hoàn Tác',
                redo: 'Làm Lại',
                soundToggle: 'Bật/Tắt Âm Thanh'
            }
        }
    };

    class CardsTrackerI18n {
        constructor() {
            this.lang = this.getStoredLang();
            if (typeof document !== 'undefined') {
                if (document.readyState === 'loading') {
                    document.addEventListener('DOMContentLoaded', () => this.applyTranslations());
                } else {
                    this.applyTranslations();
                }
            }
        }

        getStoredLang() {
            try {
                const stored = localStorage.getItem(STORAGE_KEY);
                return stored === 'en' ? 'en' : 'vi';
            } catch (e) {
                return 'vi';
            }
        }

        getLang() {
            return this.lang;
        }

        setLang(newLang) {
            this.lang = newLang === 'en' ? 'en' : 'vi';
            try {
                localStorage.setItem(STORAGE_KEY, this.lang);
            } catch (e) {}

            this.applyTranslations();
            if (typeof window !== 'undefined' && window.dispatchEvent) {
                window.dispatchEvent(new CustomEvent('app-lang-changed', { detail: { lang: this.lang } }));
            }
        }

        toggleLang() {
            const target = this.lang === 'vi' ? 'en' : 'vi';
            this.setLang(target);
            return this.lang;
        }

        t(keyPath, params = {}) {
            if (!keyPath) return '';
            const parts = keyPath.split('.');
            let obj = TRANSLATIONS[this.lang] || TRANSLATIONS['vi'];
            for (const p of parts) {
                if (!obj || typeof obj !== 'object') return keyPath;
                obj = obj[p];
            }
            if (typeof obj !== 'string') return keyPath;

            let result = obj;
            Object.keys(params).forEach(k => {
                result = result.replace(new RegExp(`\\{${k}\\}`, 'g'), params[k]);
            });
            return result;
        }

        applyTranslations() {
            if (typeof document === 'undefined') return;

            document.querySelectorAll('[data-i18n]').forEach(el => {
                const key = el.dataset.i18n;
                const translated = this.t(key);
                if (translated && translated !== key) {
                    el.textContent = translated;
                }
            });

            document.querySelectorAll('[data-i18n-placeholder]').forEach(el => {
                const key = el.dataset.i18nPlaceholder;
                const translated = this.t(key);
                if (translated && translated !== key) {
                    el.placeholder = translated;
                }
            });

            const docTitle = this.t('brand.documentTitle');
            if (docTitle && docTitle !== 'brand.documentTitle') {
                document.title = docTitle;
            }

            document.documentElement.lang = this.lang;
        }
    }

    window.CardsTrackerI18n = new CardsTrackerI18n();
})();
