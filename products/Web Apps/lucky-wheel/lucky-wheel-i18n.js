/**
 * Lucky Wheel - App-Scoped Bilingual Dictionary (i18n)
 * Complies with _RULE-web-apps.md & _RULE-website.md
 * Shared state via localStorage key: 'portfolio-lang'
 */

(function () {
    const STORAGE_KEY = 'portfolio-lang';

    const TRANSLATIONS = {
        'en': {
            brand: {
                title: 'Lucky Wheel',
                subtitle: 'Random Picker & Decision Maker'
            },
            tabs: {
                slices: 'Slices',
                settings: 'Settings',
                history: 'History'
            },
            actions: {
                spin: 'SPIN',
                shuffle: 'Shuffle',
                reset: 'Reset',
                toggleSound: 'Toggle Sound',
                toggleFullscreen: 'Toggle Fullscreen',
                toggleLang: 'Chuyển sang Tiếng Việt'
            },
            slices: {
                quickPreset: '⚡ Load Preset Template...',
                bulkEdit: 'Bulk Edit',
                placeholder: 'Enter slice name...',
                add: '+ Add',
                hint: '💡 Double-click any slice name to rename it directly.'
            },
            settings: {
                presets: 'Preset Templates',
                presetsDesc: 'Quickly load curated slice lists',
                presetsPlaceholder: 'Select Preset...',
                elimination: 'Elimination Mode',
                eliminationDesc: 'Auto-remove slice after winning',
                sizing: 'Slice Sizing',
                sizingDesc: 'Equal distribution vs weights',
                equal: 'Equal',
                weighted: 'Weighted',
                duration: 'Spin Duration',
                durationDesc: 'How long the wheel decelerates'
            },
            history: {
                title: 'Recent Winning Results',
                clear: 'Clear History',
                empty: 'No spins yet. Give it a spin!'
            },
            winner: {
                heading: 'Result',
                subtitle: 'WE HAVE A WINNER!',
                spinAgain: 'Spin Again',
                remove: 'Remove This Winner'
            },
            bulk: {
                heading: 'Bulk Edit Slices',
                placeholder: 'Enter one slice per line\nOptionally specify weight: Item Name : 2',
                hint: 'Tip: Format as Name or Name : Weight (one item per line).',
                cancel: 'Cancel',
                apply: 'Apply Slices'
            },
            presetsList: {
                food: '🍕 Food Picker',
                decision: '🤔 Decision Maker (Yes / No)',
                numbers: '🔢 Lucky Numbers 1-10',
                standup: '👥 Team Standup',
                dice: '🎲 Dice Roll (1-6)'
            }
        },
        'vi': {
            brand: {
                title: 'Vòng Xoay May Mắn',
                subtitle: 'Quay Số Ngẫu Nhiên & Ra Quyết Định'
            },
            tabs: {
                slices: 'Ô Quay',
                settings: 'Cài Đặt',
                history: 'Lịch Sử'
            },
            actions: {
                spin: 'QUAY',
                shuffle: 'Xáo Trộn',
                reset: 'Mặc Định',
                toggleSound: 'Bật/Tắt Âm Thanh',
                toggleFullscreen: 'Toàn Màn Hình',
                toggleLang: 'Switch to English'
            },
            slices: {
                quickPreset: '⚡ Nạp danh sách mẫu...',
                bulkEdit: 'Sửa Hàng Loạt',
                placeholder: 'Nhập tên ô mới...',
                add: '+ Thêm',
                hint: '💡 Nhấp đúp vào tên ô bất kỳ để đổi tên trực tiếp.'
            },
            settings: {
                presets: 'Danh Sách Mẫu',
                presetsDesc: 'Nạp nhanh các bộ danh sách phổ biến',
                presetsPlaceholder: 'Chọn danh sách mẫu...',
                elimination: 'Chế Độ Loại Trừ',
                eliminationDesc: 'Tự động xóa ô vừa trúng thưởng',
                sizing: 'Tỷ Lệ Lát Cắt',
                sizingDesc: 'Chia đều góc hoặc theo trọng số',
                equal: 'Chia Đều',
                weighted: 'Trọng Số',
                duration: 'Thời Gian Quay',
                durationDesc: 'Thời gian vòng xoay giảm tốc'
            },
            history: {
                title: 'Kết Quả Trúng Thưởng Gần Đây',
                clear: 'Xóa Lịch Sử',
                empty: 'Chưa có lượt quay nào. Hãy thử quay ngay!'
            },
            winner: {
                heading: 'Kết Quả',
                subtitle: 'CHÚC MỪNG CHIẾN THẮNG!',
                spinAgain: 'Quay Tiếp',
                remove: 'Xóa Ô Này Khỏi Vòng'
            },
            bulk: {
                heading: 'Chỉnh Sửa Hàng Loạt',
                placeholder: 'Nhập mỗi ô một dòng\nCó thể thêm trọng số: Tên ô : 2',
                hint: 'Gợi ý: Định dạng Tên hoặc Tên : Trọng_số (mỗi ô một dòng).',
                cancel: 'Hủy',
                apply: 'Áp Dụng'
            },
            presetsList: {
                food: '🍕 Hôm Nay Ăn Gì',
                decision: '🤔 Chọn Lựa (Có / Không)',
                numbers: '🔢 Số May Mắn 1-10',
                standup: '👥 Chọn Người Báo Cáo',
                dice: '🎲 Xúc Xắc (1-6)'
            }
        }
    };

    class LuckyWheelI18n {
        constructor() {
            this.lang = this.getStoredLang();
        }

        getStoredLang() {
            try {
                const stored = localStorage.getItem(STORAGE_KEY);
                return stored === 'vi' ? 'vi' : 'en';
            } catch (e) {
                return 'en';
            }
        }

        setLang(newLang) {
            this.lang = newLang === 'vi' ? 'vi' : 'en';
            try {
                localStorage.setItem(STORAGE_KEY, this.lang);
            } catch (e) {}

            this.applyTranslations();
            window.dispatchEvent(new CustomEvent('app-lang-changed', { detail: { lang: this.lang } }));
        }

        toggleLang() {
            const target = this.lang === 'en' ? 'vi' : 'en';
            this.setLang(target);
            return this.lang;
        }

        t(keyPath) {
            const parts = keyPath.split('.');
            let obj = TRANSLATIONS[this.lang] || TRANSLATIONS['en'];
            for (const p of parts) {
                if (!obj || typeof obj !== 'object') return keyPath;
                obj = obj[p];
            }
            return typeof obj === 'string' ? obj : keyPath;
        }

        applyTranslations() {
            // Translate text content
            document.querySelectorAll('[data-i18n]').forEach(el => {
                const key = el.dataset.i18n;
                const translated = this.t(key);
                if (translated && translated !== key) {
                    el.textContent = translated;
                }
            });

            // Translate placeholder
            document.querySelectorAll('[data-i18n-placeholder]').forEach(el => {
                const key = el.dataset.i18nPlaceholder;
                const translated = this.t(key);
                if (translated && translated !== key) {
                    el.placeholder = translated;
                }
            });

            // Translate title tooltip
            document.querySelectorAll('[data-i18n-title]').forEach(el => {
                const key = el.dataset.i18nTitle;
                const translated = this.t(key);
                if (translated && translated !== key) {
                    el.title = translated;
                }
            });

            // Update html lang attribute
            document.documentElement.lang = this.lang;
        }
    }

    window.LuckyWheelI18n = new LuckyWheelI18n();
})();
