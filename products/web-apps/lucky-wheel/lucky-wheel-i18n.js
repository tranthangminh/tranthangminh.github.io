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
                documentTitle: 'Lucky Wheel - Random Picker & Decision Maker'
            },
            auth: {
                signIn: 'Sign in',
                setup: 'Setup Sync',
                syncNow: 'Sync Now',
                cloudSetup: 'Cloud Setup',
                signOut: 'Sign Out'
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
                togglePanel: 'Control Panel'
            },
            slices: {
                quickPreset: '⚡ Preset Template...',
                sortPlaceholder: '🔃 Sort...',
                sortAZ: '🔤 A → Z',
                sortZA: '🔤 Z → A',
                sortWeightDesc: '⚖️ Weight ↓',
                sortWeightAsc: '⚖️ Weight ↑',
                bulkEdit: 'Bulk Edit',
                placeholder: 'Enter slice name...',
                newPlaceholder: '+ Type to add new slice...',
                add: '+ Add',
                showAll: 'Show All',
                hideAll: 'Hide All'
            },
            settings: {
                sectionTitle: '⚙️ Wheel Settings',
                presets: 'Preset Templates',
                presetsDesc: 'Quickly load curated slice lists',
                presetsPlaceholder: 'Select Preset...',
                elimination: 'Hide After Won',
                eliminationDesc: 'Auto-hide slice after winning',
                rainbow: 'Auto Rainbow Colors',
                rainbowDesc: 'Spread rainbow colors evenly from red to magenta',
                displayMode: 'Display Mode',
                mode2D: '2D Flat',
                mode3DTilt: '3D Tilt',
                mode3DCylinder: '3D Cylinder',
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
                clearConfirm: 'Are you sure you want to clear all spin history?',
                clearConfirmPreset: 'Are you sure you want to clear spin history for this preset?',
                forPreset: 'Preset: ',
                empty: 'No spins yet for this preset. Give it a spin!'
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
                apply: 'Apply Slices',
                emptyAlert: 'Please enter at least one item.',
                minAlert: 'Please provide at least 2 items.'
            },
            alerts: {
                minSlices: 'Please add at least 2 active slices to spin the wheel!'
            },
            presetsList: {
                prizes: '🎁 Prize Draw (Weighted)',
                food: '🍕 Food Picker',
                decision: '🤔 Decision Maker (Yes / No)',
                numbers: '🔢 Lucky Numbers 1-10',
                standup: '👥 Team Standup',
                dice: '🎲 Dice Roll (1-6)'
            },
            presets: {
                newPreset: 'Save Preset',
                editPreset: 'Rename / Manage',
                customGroup: 'Your Presets',
                defaultGroup: 'Default Presets',
                modalCreateHeading: '💾 Save Current Slices as New Preset',
                modalEditHeading: '✏️ Rename / Manage Preset',
                nameLabel: 'Preset Name:',
                namePlaceholder: 'e.g. Office Lunch, Raffle...',
                slicesWillSave: 'current slices will be saved into this preset.',
                quotaLabel: 'Quota used:',
                quotaMax: '(Max 10 presets per account)',
                save: 'Save Preset',
                update: 'Update Name',
                cancel: 'Cancel',
                delete: 'Delete Preset',
                deleteConfirm: 'Are you sure you want to delete this preset?',
                limitReached: 'You have reached the maximum limit of 10 presets. Please delete an older preset to save a new one!',
                nameRequired: 'Please enter a name for the preset!',
                selectCustomToEdit: 'Please select one of your custom presets from the list to rename or delete.'
            }
        },
        'vi': {
            brand: {
                title: 'Vòng Xoay May Mắn',
                documentTitle: 'Vòng Xoay May Mắn - Vòng Quay Ngẫu Nhiên & Quyết Định'
            },
            auth: {
                signIn: 'Đăng nhập',
                setup: 'Cấu hình Cloud',
                syncNow: 'Đồng bộ ngay',
                cloudSetup: 'Cài đặt Cloud',
                signOut: 'Đăng xuất'
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
                togglePanel: 'Bảng Điều Khiển'
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
                showAll: 'Hiện Hết',
                hideAll: 'Ẩn Hết'
            },
            settings: {
                sectionTitle: '⚙️ Cài Đặt Vòng Xoay',
                presets: 'Danh Sách Mẫu',
                presetsDesc: 'Nạp nhanh các bộ danh sách phổ biến',
                presetsPlaceholder: 'Chọn danh sách mẫu...',
                elimination: 'Ẩn sau khi trúng',
                eliminationDesc: 'Tự động ẩn ô vừa trúng thưởng',
                rainbow: 'Màu Tự Động',
                rainbowDesc: 'Chia đều dải màu cầu vồng từ đỏ tới tím hồng',
                displayMode: 'Chế Độ Hiển Thị',
                mode2D: '2D Phẳng',
                mode3DTilt: '3D Nghiêng',
                mode3DCylinder: '3D Khối Trụ',
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
                clearConfirm: 'Bạn có chắc chắn muốn xóa toàn bộ lịch sử quay?',
                clearConfirmPreset: 'Bạn có chắc chắn muốn xóa lịch sử quay của mẫu này không?',
                forPreset: 'Mẫu: ',
                empty: 'Chưa có lượt quay nào cho mẫu này. Hãy thử quay ngay!'
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
                apply: 'Áp Dụng',
                emptyAlert: 'Vui lòng nhập ít nhất một dòng.',
                minAlert: 'Vui lòng nhập ít nhất 2 ô.'
            },
            alerts: {
                minSlices: 'Vui lòng bật ít nhất 2 ô để có thể quay vòng!'
            },
            presetsList: {
                prizes: '🎁 Vòng Quay Trúng Thưởng',
                food: '🍕 Hôm Nay Ăn Gì',
                decision: '🤔 Chọn Lựa (Có / Không)',
                numbers: '🔢 Số May Mắn 1-10',
                standup: '👥 Chọn Người Báo Cáo',
                dice: '🎲 Xúc Xắc (1-6)'
            },
            presets: {
                newPreset: 'Lưu Mẫu',
                editPreset: 'Sửa / Đổi Tên',
                customGroup: 'Mẫu Của Bạn',
                defaultGroup: 'Mẫu Mặc Định',
                modalCreateHeading: '💾 Lưu Các Ô Hiện Tại Thành Mẫu Mới',
                modalEditHeading: '✏️ Đổi Tên / Quản Lý Mẫu',
                nameLabel: 'Tên Mẫu:',
                namePlaceholder: 'Ví dụ: Ăn trưa văn phòng, Bốc thăm...',
                slicesWillSave: 'ô hiện tại sẽ được lưu vào mẫu này.',
                quotaLabel: 'Đã dùng:',
                quotaMax: '(Tối đa 10 mẫu / tài khoản)',
                save: 'Lưu Mẫu',
                update: 'Cập Nhật Tên',
                cancel: 'Hủy',
                delete: 'Xóa Mẫu',
                deleteConfirm: 'Bạn có chắc chắn muốn xóa mẫu này không?',
                limitReached: 'Bạn đã đạt giới hạn tối đa 10 mẫu. Vui lòng xóa bớt mẫu cũ để lưu mẫu mới!',
                nameRequired: 'Vui lòng nhập tên cho mẫu!',
                selectCustomToEdit: 'Vui lòng chọn một mẫu tự tạo từ danh sách để sửa hoặc xóa.'
            }
        }
    };

    class LuckyWheelI18n {
        constructor() {
            this.translations = TRANSLATIONS;
            this.lang = this.getStoredLang();
            if (typeof document !== 'undefined') {
                if (document.readyState === 'loading') {
                    document.addEventListener('DOMContentLoaded', () => {
                        this.applyTranslations();
                    });
                } else {
                    this.applyTranslations();
                }
            }
        }

        getStoredLang() {
            try {
                const stored = localStorage.getItem(STORAGE_KEY);
                return stored === 'en' ? 'en' : 'vi'; // Default to Vietnamese per _RULE-website.md
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

            // Translate optgroup / label attributes
            document.querySelectorAll('[data-i18n-label]').forEach(el => {
                const key = el.dataset.i18nLabel;
                const translated = this.t(key);
                if (translated && translated !== key) {
                    el.label = translated;
                }
            });

            // Update document title
            const docTitle = this.t('brand.documentTitle');
            if (docTitle && docTitle !== 'brand.documentTitle') {
                document.title = docTitle;
            }

            // Update html lang attribute
            document.documentElement.lang = this.lang;
        }
    }

    window.LuckyWheelI18n = new LuckyWheelI18n();
})();
