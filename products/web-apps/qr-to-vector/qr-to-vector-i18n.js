/**
 * QR to Vector - App-Scoped Bilingual Dictionary (i18n)
 * Complies with _RULE-web-apps.md (< 500 lines)
 * Shared state via localStorage key: 'portfolio-lang'
 */

(function () {
    const STORAGE_KEY = 'portfolio-lang';

    const TRANSLATIONS = {
        'en': {
            brand: {
                title: 'QR to Vector SVG',
                documentTitle: 'Convert & Generate QR Vector SVG Online Free | Tran Thang Minh'
            },
            tabs: {
                convert: 'Convert Image to Vector',
                generate: 'Create New QR',
                pixelart: '8-Bit Vector',
                submodeQr: 'QR Code',
                submodePixelArt: 'Pixel Art (8-Bit)'
            },
            upload: {
                title: 'Upload QR Image',
                dropzone: 'Drag & drop QR image here, click to browse, or paste with Ctrl + V',
                supported: 'Supports PNG, JPG, JPEG, WEBP',
                changeImage: 'Choose another image'
            },
            generator: {
                heading: 'QR Code Payload',
                types: {
                    url: 'URL',
                    raw: 'Text',
                    phone: 'Phone',
                    sms: 'SMS',
                    wifi: 'Wi-Fi',
                    email: 'Email',
                    event: 'Event',
                    vcard: 'vCard',
                    mecard: 'MeCard'
                },
                fields: {
                    url: 'Website Address (URL)',
                    rawText: 'Plain Text',
                    phoneNumber: 'Phone Number',
                    smsBody: 'SMS Message',
                    wifiSsid: 'Network Name (SSID)',
                    wifiPassword: 'Wi-Fi Password',
                    wifiAuth: 'Encryption',
                    wifiNoPass: 'No Password (Open)',
                    wifiHidden: 'Hidden Network (SSID)',
                    emailTo: 'Recipient Email',
                    emailSubject: 'Subject',
                    emailBody: 'Message Body',
                    eventTitle: 'Event Title',
                    startDate: 'Start Date',
                    startTime: 'Start Time',
                    endDate: 'End Date',
                    endTime: 'End Time',
                    location: 'Location',
                    eventDesc: 'Description',
                    firstName: 'First Name',
                    lastName: 'Last Name',
                    fullName: 'Full Name',
                    organization: 'Company / Org',
                    jobTitle: 'Job Title',
                    phoneNumber: 'Phone Number',
                    email: 'Email',
                    website: 'Website',
                    address: 'Street Address',
                    note: 'Notes'
                },
                placeholders: {
                    rawText: 'Enter any text, code, or notes...',
                    smsBody: 'SMS message text...',
                    emailSubject: 'Email subject...',
                    emailBody: 'Email message body...',
                    eventTitle: 'Meeting, Birthday, Conference...'
                }
            },
            controls: {
                heading: 'Vector Settings',
                styleMode: 'Render Style',
                styleUnifiedConnected: 'Connected',
                styleUnifiedSeparated: 'Separated',
                styleBlocks: 'Discrete Blocks',
                radiusUnified: 'Corner Radius',
                radiusBlocks: 'Corner Radius',
                blockSize: 'Block Size (px)',
                threshold: 'Threshold (Contrast)',
                autoThreshold: 'Auto Otsu',
                invert: 'Invert colors (Light on dark QR)',
                fgColor: 'QR Color',
                bgColor: 'Background',
                transparentBg: 'Transparent background',
                logoHeading: 'Center Logo',
                uploadLogo: 'Upload Logo (Image/SVG)',
                removeLogo: 'Remove Logo',
                moreSettings: 'More Settings',
                outerPadding: 'Outer Padding (Margin)',
                outerPaddingBlocks: '{n} blocks',
                blockGap: 'Block Spacing (Gap)',
                logoBlocks: 'Logo Area (Blocks)',
                logoBlocksCount: '{n} blocks',
                logoScale: 'Logo Inner Scale',
                resetDefaults: 'Reset default settings'
            },
            qrContent: {
                bannerTitle: 'QR Code Content',
                copy: 'Copy',
                copied: 'Copied QR content!',
                open: 'Open Link',
                scanning: 'Scanning image for QR code...',
                scanSuccess: 'QR code detected successfully!',
                noQrFound: 'No QR code detected in image! Please upload a clearer photo.',
                cardTitle: 'Decoded QR Data',
                typeUrl: 'Web URL',
                typeText: 'Plain Text'
            },
            stats: {
                heading: 'Vector Details',
                dimensions: 'Dimensions',
                gridResolution: 'QR Grid',
                vectorElements: 'Vector contours',
                fileType: 'Vector SVG (Path)',
                qualityNote: '100% loss-free scalable vector, ready for print & design software.'
            },
            actions: {
                downloadSvg: 'Download Vector (.svg)',
                downloadPng: 'Download PNG Image',
                copySvg: 'Copy SVG Code',
                copied: 'Copied to clipboard!'
            },
            pixelart: {
                heading: '8-Bit Pixel Settings',
                gridHeading: 'Object Bounding Box & Grid',
                bboxHeading: 'Object Bounding Box',
                autoBbox: 'Auto Object',
                fullBbox: 'Full Image',
                bboxBounds: 'Bounding Box (X, Y, W, H)',
                gridCountHeading: 'Grid Columns & Rows',
                autoGrid: 'Auto Grid',
                cols: 'Columns (Cols)',
                rows: 'Rows (Rows)',
                lockSquare: 'Lock square aspect (1:1)',
                cropToBbox: 'Crop as Bounding Box',
                colorHeading: 'Palette & Color Limit',
                vectorHeading: '8-Bit Vector Styling',
                maxColors: 'Number of Colors',
                palette: 'Color Palette',
                pixelSize: 'Pixel Size',
                autoPalette: 'Auto Colors',
                sourcePaneTitle: 'Source Image & Grid',
                vectorPaneTitle: 'Result Vector SVG',
                viewModeDual: 'View Mode: Split Dual (50/50) [Y]',
                viewModeSource: 'View Mode: Source & Grid Only [Y]',
                viewModeVector: 'View Mode: Vector SVG Only [Y]',
                layeredSolids: 'Layered Solid Underlays',
                enclosureThreshold: 'Underlay Enclosure Threshold',
                statsHeading: 'Pixel Art Specs',
                statSource: 'Source Image',
                statBbox: 'Crop Area',
                statGrid: 'Grid Resolution',
                statColors: 'Colors',
                statPixelSize: 'Pixel Size',
                statExportDim: 'Export Size',
                statSvgSize: 'SVG Size',
                statPngSize: 'PNG Size'
            },
            hud: {
                title: '⌨️ Shortcuts & Gestures',
                pan: 'Pan (Space + Left Drag / Middle)',
                zoom: 'Zoom (Wheel / + -)',
                view: 'Toggle Views (Y)',
                bbox: 'Move / Resize Box',
                reset: 'Reset Zoom (0)'
            },
            preview: {
                heading: 'Vector Preview',
                zoomIn: 'Zoom in',
                zoomOut: 'Zoom out',
                resetZoom: 'Reset (100%)',
                toggleGrid: 'Checkerboard grid',
                emptyTitle: 'Drag & Drop or Click to Choose Image',
                emptyModeQrTitle: 'QR Code to Vector QR', emptyModeQrDesc: 'Supports PNG, JPG, JPEG, WEBP',
                emptyModePixelTitle: '8-Bit Image to 8-Bit Vector', emptyModePixelDesc: 'Supports PNG, JPG, JPEG, WEBP, GIF'
            },
            history: {
                heading: 'Recent History', clearAll: 'Clear all', empty: 'No history yet'
            }
        },
        'vi': {
            brand: {
                title: 'Chuyển QR Sang Vector',
                documentTitle: 'Chuyển & Tạo Mã QR Vector (SVG) Online Miễn Phí | Trần Thắng Minh'
            },
            tabs: {
                convert: 'Chuyển Đổi Ảnh',
                generate: 'Tạo Mã QR Mới',
                pixelart: '8-Bit Vector',
                submodeQr: 'Mã QR',
                submodePixelArt: 'Pixel Art (8-Bit)'
            },
            upload: {
                title: 'Tải Lên Ảnh QR',
                dropzone: 'Kéo thả ảnh QR vào đây, nhấp để chọn file hoặc dán ảnh bằng phím Ctrl + V',
                supported: 'Hỗ trợ định dạng PNG, JPG, JPEG, WEBP',
                changeImage: 'Chọn ảnh khác'
            },
            generator: {
                heading: 'Dữ Liệu Mã QR',
                types: {
                    url: 'URL',
                    raw: 'Văn bản',
                    phone: 'Gọi điện',
                    sms: 'SMS',
                    wifi: 'Wi-Fi',
                    email: 'Email',
                    event: 'Sự kiện',
                    vcard: 'vCard',
                    mecard: 'MeCard'
                },
                fields: {
                    url: 'Địa chỉ Web (URL)',
                    rawText: 'Văn bản thuần',
                    phoneNumber: 'Số điện thoại',
                    smsBody: 'Nội dung tin nhắn',
                    wifiSsid: 'Tên mạng (SSID)',
                    wifiPassword: 'Mật khẩu Wi-Fi',
                    wifiAuth: 'Bảo mật',
                    wifiNoPass: 'Không mật khẩu',
                    wifiHidden: 'Mạng ẩn (Hidden SSID)',
                    emailTo: 'Địa chỉ Email nhận',
                    emailSubject: 'Tiêu đề Email',
                    emailBody: 'Nội dung Email',
                    eventTitle: 'Tên sự kiện',
                    startDate: 'Ngày bắt đầu',
                    startTime: 'Giờ bắt đầu',
                    endDate: 'Ngày kết thúc',
                    endTime: 'Giờ kết thúc',
                    location: 'Địa điểm',
                    eventDesc: 'Ghi chú mô tả',
                    firstName: 'Tên',
                    lastName: 'Họ & Tên đệm',
                    fullName: 'Họ và tên',
                    organization: 'Công ty / Tổ chức',
                    jobTitle: 'Chức danh',
                    phoneNumber: 'Số điện thoại',
                    email: 'Email',
                    website: 'Website',
                    address: 'Địa chỉ',
                    note: 'Ghi chú'
                },
                placeholders: {
                    rawText: 'Nhập bất kỳ văn bản, mã số, ghi chú...',
                    smsBody: 'Nội dung tin nhắn...',
                    emailSubject: 'Tiêu đề thư...',
                    emailBody: 'Nội dung thư...',
                    eventTitle: 'Họp mặt, Sinh nhật, Hội thảo...'
                }
            },
            controls: {
                heading: 'Tùy Chỉnh Vector',
                styleMode: 'Kiểu Hiển Thị',
                styleUnifiedConnected: 'Dính Giao Điểm',
                styleUnifiedSeparated: 'Tách Giao Điểm',
                styleBlocks: 'Từng Block Rời',
                radiusUnified: 'Bo Góc Khối',
                radiusBlocks: 'Bo Góc Từng Block',
                blockSize: 'Kích Thước Block',
                threshold: 'Độ Tương Phản (Ngưỡng)',
                autoThreshold: 'Tự động (Otsu)',
                invert: 'Đảo ngược màu (Mã sáng trên nền tối)',
                fgColor: 'Màu mã QR',
                bgColor: 'Màu nền',
                transparentBg: 'Nền trong suốt',
                logoHeading: 'Chèn Logo Trung Tâm',
                uploadLogo: 'Tải Logo (Ảnh / Vector SVG)',
                removeLogo: 'Xóa logo',
                moreSettings: 'Cài Đặt Mở Rộng',
                outerPadding: 'Viền Đệm Ngoài (Margin)',
                outerPaddingBlocks: '{n} block',
                blockGap: 'Khoảng Cách Giữa Các Block',
                logoBlocks: 'Vùng Chiếm Của Logo',
                logoBlocksCount: '{n} blocks',
                logoScale: 'Tỷ Lệ Logo Trong Khối',
                resetDefaults: 'Đặt lại mặc định'
            },
            qrContent: {
                bannerTitle: 'Nội Dung Mã QR',
                copy: 'Sao chép',
                copied: 'Đã sao chép nội dung QR!',
                open: 'Mở liên kết',
                scanning: 'Đang quét mã QR trong ảnh...',
                scanSuccess: 'Đã quét và bóc tách mã QR thành công!',
                noQrFound: 'Không tìm thấy mã QR trong ảnh! Hãy chọn ảnh chụp rõ nét hơn.',
                cardTitle: 'Dữ Liệu Giải Mã',
                typeUrl: 'Đường dẫn Web (URL)',
                typeText: 'Văn bản thuần'
            },
            stats: {
                heading: 'Thông Số Vector',
                dimensions: 'Kích thước',
                gridResolution: 'Lưới ma trận',
                vectorElements: 'Đường bao vector',
                fileType: 'Đồ họa Vector SVG',
                qualityNote: 'Vector phóng to không giới hạn, không vỡ hạt, sẵn sàng in ấn và thiết kế.'
            },
            actions: {
                downloadSvg: 'Tải File Vector (.svg)',
                downloadPng: 'Tải Ảnh PNG',
                copySvg: 'Sao Chép Mã SVG',
                copied: 'Đã sao chép vào bộ nhớ tạm!'
            },
            pixelart: {
                heading: 'Cài Đặt 8-Bit Pixel',
                gridHeading: 'Khung Đối Tượng & Lưới Pixel',
                bboxHeading: 'Khung Đối Tượng (Bounding Box)',
                autoBbox: 'Tự Động Object',
                fullBbox: 'Toàn Ảnh',
                bboxBounds: 'Tọa Độ Vùng Chọn (X, Y, W, H)',
                gridCountHeading: 'Số Lưới Ngang & Dọc',
                autoGrid: 'Tự Động Lưới',
                cols: 'Số Cột (Cols)',
                rows: 'Số Hàng (Rows)',
                lockSquare: 'Khóa tỷ lệ ô vuông (1:1)',
                cropToBbox: 'Cắt theo Bounding Box',
                colorHeading: 'Bảng Màu & Lọc Số Màu',
                vectorHeading: 'Kiểu Khối Vector 8-Bit',
                maxColors: 'Số Lượng Màu',
                palette: 'Bảng Màu',
                pixelSize: 'Pixel size',
                autoPalette: 'Tự Động',
                sourcePaneTitle: 'Ảnh Gốc & Lưới Thực Tế',
                vectorPaneTitle: 'Vector SVG Kết Quả',
                viewModeDual: 'Chế độ xem: Song song (50/50) [Y]',
                viewModeSource: 'Chế độ xem: Chỉ ảnh gốc & lưới [Y]',
                viewModeVector: 'Chế độ xem: Chỉ Vector SVG [Y]',
                layeredSolids: 'Xếp tầng vector lót đáy (Solid Layers)',
                enclosureThreshold: 'Độ bọc lót đáy (Ngưỡng chu vi)',
                statsHeading: 'Thông Số Pixel Art',
                statSource: 'Ảnh gốc',
                statBbox: 'Vùng chọn',
                statGrid: 'Độ phân giải lưới',
                statColors: 'Số màu',
                statPixelSize: 'Pixel size',
                statExportDim: 'Kích thước xuất',
                statSvgSize: 'Dung lượng SVG',
                statPngSize: 'Dung lượng PNG'
            },
            hud: {
                title: '⌨️ Phím Tắt & Thao Tác',
                pan: 'Di chuyển (Space + Chuột trái / Chuột giữa)',
                zoom: 'Thu phóng (Cuộn chuột / + -)',
                view: 'Đổi 3 chế độ xem (Phím Y)',
                bbox: 'Nắm / Kéo Bounding Box',
                reset: 'Reset Zoom (Phím 0)'
            },
            preview: {
                heading: 'Xem Trước Vector',
                zoomIn: 'Phóng to',
                zoomOut: 'Thu nhỏ',
                resetZoom: 'Mặc định (100%)',
                toggleGrid: 'Lưới caro nền',
                emptyTitle: 'Kéo thả hoặc Nhấp để chọn ảnh',
                emptyModeQrTitle: 'Ảnh Mã QR sang Vector QR', emptyModeQrDesc: 'Hỗ trợ PNG, JPG, JPEG, WEBP',
                emptyModePixelTitle: 'Ảnh 8bit sang 8bit Vector', emptyModePixelDesc: 'Hỗ trợ PNG, JPG, JPEG, WEBP, GIF'
            },
            history: {
                heading: 'Lịch Sử Ảnh', clearAll: 'Xóa hết', empty: 'Chưa có lịch sử'
            }
        }
    };

    class QrToVectorI18n {
        constructor() {
            this.lang = this.detectInitialLang();
            this.initListeners();
        }

        detectInitialLang() {
            if (typeof window !== 'undefined' && window.localStorage) {
                const saved = localStorage.getItem(STORAGE_KEY);
                if (saved === 'vi' || saved === 'en') return saved;
            }
            if (typeof document !== 'undefined' && document.documentElement.lang) {
                const docLang = document.documentElement.lang.toLowerCase();
                if (docLang.startsWith('vi')) return 'vi';
                if (docLang.startsWith('en')) return 'en';
            }
            return 'vi';
        }

        initListeners() {
            if (typeof window === 'undefined') return;

            window.addEventListener('storage', (e) => {
                if (e.key === STORAGE_KEY && (e.newValue === 'vi' || e.newValue === 'en')) {
                    this.setLang(e.newValue, false);
                }
            });

            document.addEventListener('DOMContentLoaded', () => {
                this.applyTranslations();
                this.updateToggleButton();
            });
        }

        t(path, fallback = '') {
            const keys = path.split('.');
            let val = TRANSLATIONS[this.lang];
            for (const k of keys) {
                if (val && typeof val === 'object' && k in val) {
                    val = val[k];
                } else {
                    return fallback || path;
                }
            }
            return typeof val === 'string' ? val : (fallback || path);
        }

        setLang(newLang, shouldPersist = true) {
            if (newLang !== 'vi' && newLang !== 'en') return;
            this.lang = newLang;
            if (shouldPersist && typeof window !== 'undefined' && window.localStorage) {
                try {
                    localStorage.setItem(STORAGE_KEY, newLang);
                } catch (err) {
                    console.warn('Failed to save language preference:', err);
                }
            }
            if (typeof document !== 'undefined') {
                document.documentElement.lang = newLang;
            }
            this.applyTranslations();
            this.updateToggleButton();
        }

        toggleLang() {
            const next = this.lang === 'vi' ? 'en' : 'vi';
            this.setLang(next, true);
        }

        applyTranslations() {
            if (typeof document === 'undefined') return;

            document.querySelectorAll('[data-i18n]').forEach((el) => {
                const key = el.getAttribute('data-i18n');
                if (key) {
                    const text = this.t(key);
                    if (text && text !== key) el.textContent = text;
                }
            });

            document.querySelectorAll('[data-i18n-attr]').forEach((el) => {
                const mapping = el.getAttribute('data-i18n-attr');
                if (!mapping) return;
                mapping.split(';').forEach((pair) => {
                    const [attr, key] = pair.split(':').map((s) => s.trim());
                    if (attr && key) {
                        const val = this.t(key);
                        if (val && val !== key) el.setAttribute(attr, val);
                    }
                });
            });

            const docTitle = this.t('brand.documentTitle');
            if (docTitle && docTitle !== 'brand.documentTitle') document.title = docTitle;
        }

        updateToggleButton() {
            const btn = document.getElementById('langToggleBtn');
            if (!btn) return;
            const isVi = this.lang === 'vi';
            btn.setAttribute('data-lang', isVi ? 'en' : 'vi');
            btn.setAttribute('aria-label', isVi ? 'Switch to English' : 'Chuyển sang Tiếng Việt');
            const flag = btn.querySelector('.lang-flag');
            if (flag) flag.className = `lang-flag lang-flag--${isVi ? 'en' : 'vi'}`;
            const code = btn.querySelector('.lang-code');
            if (code) code.textContent = isVi ? 'EN' : 'VI';
        }
    }

    if (typeof window !== 'undefined') window.QrToVectorI18n = new QrToVectorI18n();
    if (typeof module !== 'undefined' && module.exports) module.exports = { QrToVectorI18n };
})();
