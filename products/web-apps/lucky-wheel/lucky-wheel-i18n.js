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
                title: 'Lucky Wheel'
            },
            tabs: {
                slices: 'Slices',
                settings: 'Settings',
                slicesAndSettings: 'Slices & Settings',
                history: 'History'
            },
            actions: {
                spin: 'SPIN',
                shuffle: 'Shuffle',
                toggleSound: 'Toggle Sound',
                toggleLang: 'Chuyển sang Tiếng Việt',
                toggleHistory: 'Toggle History Panel',
                toggleControls: 'Toggle Settings Panel',
                hideHistory: 'Hide History',
                showHistory: 'Show History',
                hideControls: 'Hide Settings',
                showControls: 'Show Settings'
            },
            slices: {
                quickPreset: '⚡ Preset...',
                sortPlaceholder: '🔃 Sort...',
                sortAZ: '🔤 A → Z',
                sortZA: '🔤 Z → A',
                sortWeightDesc: '⚖️ Weight ↓',
                sortWeightAsc: '⚖️ Weight ↑',
                bulkEdit: 'Bulk Edit',
                placeholder: 'Enter slice name...',
                newPlaceholder: '+ Type to add new slice...',
                add: '+ Add',
                toggleAll: 'Toggle All Slices Visibility',
                showAll: 'Show All',
                hideAll: 'Hide All',
                colorLocked: 'Auto Rainbow is active (color locked)',
                changeColor: 'Change color',
                newColor: 'New slice color',
                dragHint: 'Drag to reorder'
            },
            settings: {
                sectionTitle: '⚙️ Wheel Settings',
                presets: 'Preset Templates',
                presetsDesc: 'Quickly load curated slice lists',
                presetsPlaceholder: 'Select Preset...',
                elimination: 'Elimination Mode',
                eliminationDesc: 'Auto-hide slice after winning',
                rainbow: 'Auto Rainbow Colors',
                rainbowDesc: 'Spread rainbow colors evenly from red to magenta',
                sizing: 'Slice Sizing',
                sizingDesc: 'Equal distribution vs weights',
                equal: 'Equal',
                weighted: 'Weighted',
                equalWeighted: 'Weighted (Equal)',
                duration: 'Spin Duration',
                durationDesc: 'How long the wheel decelerates'
            },
            history: {
                panelTitle: 'History',
                title: 'Recent Winning Results',
                clear: 'Clear History',
                empty: 'No spins yet. Give it a spin!'
            },
            winner: {
                heading: 'Result',
                subtitle: 'WE HAVE A WINNER!',
                spinAgain: 'Spin Again',
                remove: 'Hide This Slice from Wheel',
                hide: 'Hide This Slice from Wheel'
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
                title: 'Vòng Xoay May Mắn'
            },
            tabs: {
                slices: 'Ô Quay',
                settings: 'Cài Đặt',
                slicesAndSettings: 'Ô Quay & Cài Đặt',
                history: 'Lịch Sử'
            },
            actions: {
                spin: 'QUAY',
                shuffle: 'Xáo Trộn',
                toggleSound: 'Bật/Tắt Âm Thanh',
                toggleLang: 'Switch to English',
                toggleHistory: 'Ẩn/Hiện Lịch Sử',
                toggleControls: 'Ẩn/Hiện Cài Đặt',
                hideHistory: 'Ẩn Lịch Sử',
                showHistory: 'Hiện Lịch Sử',
                hideControls: 'Ẩn Cài Đặt',
                showControls: 'Hiện Cài Đặt'
            },
            slices: {
                quickPreset: '⚡ Mẫu có sẵn...',
                sortPlaceholder: '🔃 Sắp xếp...',
                sortAZ: '🔤 A → Z',
                sortZA: '🔤 Z → A',
                sortWeightDesc: '⚖️ Trọng số ↓',
                sortWeightAsc: '⚖️ Trọng số ↑',
                bulkEdit: 'Sửa Hàng Loạt',
                placeholder: 'Nhập tên ô mới...',
                newPlaceholder: '+ Nhập để thêm ô mới...',
                add: '+ Thêm',
                toggleAll: 'Bật/Tắt hiển thị tất cả các ô',
                showAll: 'Hiện Hết',
                hideAll: 'Ẩn Hết',
                colorLocked: 'Màu Tự Động đang bật (không thể sửa màu)',
                changeColor: 'Đổi màu ô',
                newColor: 'Màu ô mới',
                dragHint: 'Nắm kéo để đổi thứ tự'
            },
            settings: {
                sectionTitle: '⚙️ Cài Đặt Vòng Xoay',
                presets: 'Danh Sách Mẫu',
                presetsDesc: 'Nạp nhanh các bộ danh sách phổ biến',
                presetsPlaceholder: 'Chọn danh sách mẫu...',
                elimination: 'Chế Độ Loại Trừ',
                eliminationDesc: 'Tự động ẩn ô vừa trúng thưởng',
                rainbow: 'Màu Tự Động',
                rainbowDesc: 'Chia đều dải màu cầu vồng từ đỏ tới tím hồng',
                sizing: 'Tỷ Lệ Lát Cắt',
                sizingDesc: 'Chia đều góc hoặc theo trọng số',
                equal: 'Chia Đều',
                weighted: 'Trọng Số',
                equalWeighted: 'Trọng Số (Chia Đều)',
                duration: 'Thời Gian Quay',
                durationDesc: 'Thời gian vòng xoay giảm tốc'
            },
            history: {
                panelTitle: 'Lịch Sử',
                title: 'Kết Quả Trúng Thưởng Gần Đây',
                clear: 'Xóa Lịch Sử',
                empty: 'Chưa có lượt quay nào. Hãy thử quay ngay!'
            },
            winner: {
                heading: 'Kết Quả',
                subtitle: 'CHÚC MỪNG CHIẾN THẮNG!',
                spinAgain: 'Quay Tiếp',
                remove: 'Ẩn Ô Này Khỏi Vòng',
                hide: 'Ẩn Ô Này Khỏi Vòng'
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
