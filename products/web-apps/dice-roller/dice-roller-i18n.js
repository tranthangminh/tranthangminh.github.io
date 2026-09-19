/**
 * Dice Roller - App-Scoped Bilingual Dictionary (i18n)
 * Complies with _RULE-web-apps.md (< 500 lines)
 * Shared state via localStorage key: 'portfolio-lang'
 */

(function () {
    const STORAGE_KEY = 'portfolio-lang';

    const TRANSLATIONS = {
        'en': {
            brand: {
                title: '3D Dice Roller',
                documentTitle: '3D Dice Roller - Polyhedral Physics Simulation'
            },
            auth: {
                signIn: 'Sign in',
                setup: 'Setup Sync',
                syncNow: 'Sync Now',
                cloudSetup: 'Cloud Setup',
                signOut: 'Sign Out'
            },
            controls: {
                diceType: 'Dice Type',
                diceCount: 'Quantity',
                diceTheme: 'Dice Material',
                themeIvory: 'Classic Ivory',
                themeDark: 'Dark Obsidian',
                themeRuby: 'Crimson Ruby',
                tapToRollHint: '💡 Click tray or press SPACE to roll'
            },
            results: {
                currentResult: 'Current Result',
                totalScore: 'TOTAL',
                awaitingRoll: 'Click tray to roll...',
                statusRolling: 'Rolling...'
            },
            history: {
                panelTitle: 'Roll History',
                clear: 'Clear',
                clearConfirm: 'Clear all roll history?',
                empty: 'No rolls recorded yet. Click tray to roll!',
                totalRolls: 'Rolls',
                average: 'Avg'
            }
        },
        'vi': {
            brand: {
                title: 'Đổ Xí Ngầu 3D',
                documentTitle: 'Đổ Xí Ngầu 3D - Xí Ngầu Đa Diện Chân Thực'
            },
            auth: {
                signIn: 'Đăng nhập',
                setup: 'Cấu hình đồng bộ',
                syncNow: 'Đồng bộ ngay',
                cloudSetup: 'Cài đặt Cloud',
                signOut: 'Đăng xuất'
            },
            controls: {
                diceType: 'Loại Xí Ngầu',
                diceCount: 'Số Lượng',
                diceTheme: 'Chất Liệu Xí Ngầu',
                themeIvory: 'Hạt Ngà',
                themeDark: 'Đá Đen',
                themeRuby: 'Hồng Ngọc',
                tapToRollHint: '💡 Nhấp vào khay hoặc bấm SPACE để đổ'
            },
            results: {
                currentResult: 'Kết Quả',
                totalScore: 'TỔNG',
                awaitingRoll: 'Nhấp khay để đổ...',
                statusRolling: 'Đang lắc...'
            },
            history: {
                panelTitle: 'Lịch Sử Đổ',
                clear: 'Xóa',
                clearConfirm: 'Mày có chắc muốn xóa sạch lịch sử đổ xí ngầu?',
                empty: 'Chưa có lượt đổ nào. Nhấp vào khay để lắc!',
                totalRolls: 'Lượt đổ',
                average: 'Điểm TB'
            }
        }
    };

    class DiceRollerI18n {
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

        t(keyPath) {
            if (!keyPath) return '';
            const parts = keyPath.split('.');
            let obj = TRANSLATIONS[this.lang] || TRANSLATIONS['vi'];
            for (const p of parts) {
                if (!obj || typeof obj !== 'object') return keyPath;
                obj = obj[p];
            }
            return typeof obj === 'string' ? obj : keyPath;
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

    window.DiceRollerI18n = new DiceRollerI18n();
})();
