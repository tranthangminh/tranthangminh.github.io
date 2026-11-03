/**
 * QR/Image to Vector - App-Scoped Bilingual Dictionary (i18n)
 * Complies with _RULE-web-apps.md (< 500 lines)
 * Shared state via localStorage key: 'portfolio-lang'
 */

(function () {
    const STORAGE_KEY = 'portfolio-lang';

    const TRANSLATIONS = {
        'en': {
            brand: {
                title: 'QR/Image to Vector',
                documentTitle: 'Convert QR/Image to Vector SVG & Generate QR Online Free | Trần Thắng Minh',
                privacy: 'Privacy'
            },
            tabs: {
                convert: 'Convert QR/Image to Vector',
                generate: 'Create QR', 
                submodeQr: 'QR Code',
                submodePixelArt: 'Pixel Art (8-Bit)'
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
                    eventTitle: 'Meeting, Birthday, Conference...',
                    location: 'City, venue or online link...',
                    lastName: 'Doe',
                    address: '123 Main St, City',
                    note: 'Description or reminder...'
                }
            },
            controls: {
                heading: 'Vector Settings', ecc: 'Error correction', 
                styleUnifiedConnected: 'Connected',
                styleUnifiedSeparated: 'Separated',
                styleBlocks: 'Discrete Blocks',
                radiusUnified: 'Corner Radius',
                radiusBlocks: 'Corner Radius',
                blockSize: 'Block Size (px)', 
                fgColor: 'QR Color',
                bgColor: 'Background',
                transparentBg: 'Transparent background',
                logoHeading: 'Center Logo',
                uploadLogo: 'Upload Logo (Image/SVG)',
                removeLogo: 'Remove Logo',
                outerPadding: 'Outer Padding (Margin)',
                outerPaddingBlocks: '{n} blocks',
                blockGap: 'Block Spacing (Gap)',
                logoBlocks: 'Logo Area (Blocks)', 
                logoScale: 'Logo Inner Scale',
                resetDefaults: 'Reset default settings',
                colorHeading: 'QR Color', colorSolid: '1 Color', colorDuo: '2 Colors', colorGradient: 'Gradient',
                eyeColor: 'Corner Color (Eyes)', gradColor1: 'Gradient Color 1', gradColor2: 'Gradient Color 2',
                gradLinear: 'Linear', gradRadial: 'Radial (from center)', gradAngle: 'Gradient Angle',
                gradPerShape: 'One color per vector shape', gradEyes: 'Corners follow gradient'
            },
            qrContent: {
                
                copy: 'Copy',
                copied: 'Copied QR content!',
                open: 'Open Link',
                scanning: 'Scanning image for QR code...',
                scanSuccess: 'QR code detected successfully!',
                noQrFound: 'No QR code detected in image! Please upload a clearer photo.'
            },
            stats: {
                heading: 'Vector Specs', exportDim: 'Export Size', pixelSize: 'Pixel Block Size',
                gridResolution: 'Grid Resolution', vectorElements: 'Vector Contours', qrLength: 'Length', qrContent: 'QR Content'
            },
            actions: { downloadSvg: 'Download Vector', downloadPng: 'Download Image', copySvg: 'Copy Vector', copied: 'Copied to clipboard!' },
            pixelart: {
                 gridHeading: 'Object Bounding Box & Grid', 
                autoBbox: 'Find Object', fullBbox: 'Select Image',  autoGrid: 'Auto Grid', cols: 'Columns', rows: 'Rows',
                lockSquare: 'Lock Ratio', cropToBbox: 'Crop to Frame', groupByColor: 'Group by Color',
                colorHeading: 'Palette & Color Limit', vectorHeading: '8-Bit Vector Styling', maxColors: 'Number of Colors',  pixelSize: 'Pixel Block Size', autoPalette: 'Auto Colors',
                sourcePaneTitle: 'Source Image & Grid', vectorPaneTitle: 'Result Vector SVG', 
                layeredSolids: 'Layered Solid Underlays', enclosureThreshold: 'Underlay Enclosure Threshold',
                statsHeading: 'Pixel Art Specs', statSource: 'Source Image', statBbox: 'Crop Area', statGrid: 'Grid Resolution',
                statColors: 'Colors', statPixelSize: 'Pixel Block Size', statExportDim: 'Export Size', statSvgSize: 'SVG Size', statPngSize: 'PNG Size',
                bestTag: 'Best', swatchLabel: 'Color {hex}', presetLabel: 'Palette preset', presetAuto: 'Auto (from image)', editColor: 'Edit color', mergeInto: 'Merge into...', resetEdits: 'Reset edits', mergeHint: 'Pick the color to merge into',
                colorAdjustHeading: 'Color Adjust (HSL)', resetColorAdjust: 'Reset', greyscale: 'Greyscale',
                hue: 'Hue', saturation: 'Saturation', lightness: 'Lightness'
            },
            guide: {
                btnTitle: 'Guide', heading: 'Pixel Art to Vector Conversion Guide',
                step1Title: 'Select the object', step1Desc: 'Drag the box around the character or subject.',
                step2Title: 'Match the grid', step2Desc: 'Adjust Columns & Rows until each cell fits one pixel block.',
                step3Title: 'Pick the colors', step3Desc: 'Lower the color count until it is clean but still looks right.',
                step4Title: 'Fine-tune', step4Desc: 'Optionally tweak corner radius, spacing and colors.',
                reopenHint: 'Reopen this guide anytime with the Guide button below',
                back: 'Back', next: 'Next', understood: 'Got it', close: 'Close',
                altStep1: 'Step 1: Select Object', altStep2: 'Step 2: Adjust grid', altStep3: 'Step 3: Adjust Color Count', altStep4: 'Step 4: Extra customization'
            },
            hud: {
                title: 'Shortcuts & Gestures', titleShort: 'Shortcuts',
                undo: 'Undo',
                pan: 'Pan canvas',
                zoom: 'Zoom in / out',
                view: 'Toggle view mode',
                newImage: 'New image',
                redo: 'Redo',
                bbox: 'Move / Resize box'
            },
            preview: {
                
                
                
                
                
                emptyTitle: 'Drag & Drop or Click to Choose Image',
                emptyModeQrTitle: 'QR Code to Vector QR', emptyModeQrDesc: 'Supports PNG, JPG, JPEG, WEBP',
                emptyModePixelTitle: '8-Bit Image to 8-Bit Vector', emptyModePixelDesc: 'Supports PNG, JPG, JPEG, WEBP, GIF',
                emptyOr: 'or', emptyGenTitle: 'Create Vector QR',
                emptyGenTypeTitle: '9 Data Types', emptyGenTypeDesc: 'URL, Wi-Fi, Email, Phone, SMS, Text, vCard, Event, MeCard',
                emptyGenVectorTitle: 'Vector Graphics', emptyGenVectorDesc: 'Clean SVG, center logo, colors'
            },
            history: {
                heading: 'Recent History', clearAll: 'Clear all', empty: 'No history yet',
                newTitle: 'New image', deleteTitle: 'Remove from history', deleted: 'History item deleted!', cleared: 'All history cleared!',
                confirmDelete: 'Are you sure you want to delete this item from history?',
                confirmClear: 'Are you sure you want to clear all history?'
            },
            messages: {
                lowContrast: 'Low contrast between the QR colors and the background: the code may be hard to scan.',
                invalidImage: 'Please choose a valid image file (PNG, JPG, WEBP)!',
                noQrFallback: 'No QR code detected. Switched to Pixel Art (8-Bit) mode automatically!',
                processingError: 'Processing error: ',
                activeDeleted: 'Active item deleted, returned to empty state!',
                restored: 'Restored from history!',
                gridClamped: 'Grid automatically reduced to a safe size (≤ 256 cells) to prevent memory overflow',
                undone: 'Undone (Undo)', redone: 'Redone (Redo)',
                logoUnsupported: 'GIF and PDF formats are not supported for logos!',
                logoInvalid: 'Please choose a vector (SVG) or image file (PNG, JPG, WEBP, AVIF, BMP, ICO)!'
            },
            units: { chars: 'chars', blocks: 'blocks', colors: 'colors', fullImage: 'Full image' },
            export: { heading: 'Export', pngScale: 'PNG size', printWidth: 'Print width (mm)', auto: 'Auto', printHint: 'Empty: keep pixel size. With a print size: the SVG is written in exact mm and the PNG is exported at 300 DPI.' },
            batch: { heading: 'Batch export (ZIP)', placeholder: 'One QR content per line', fromText: 'Create from list', fromImages: 'Pick QR images', progress: 'Processing {done}/{total}...', done: '{ok} SVG files in ZIP', skipped: '{n} skipped', noneConverted: 'No QR could be converted.', nothingToDo: 'Nothing to convert yet.' },
            sideTabs: { settings: 'Settings', info: 'Specs' },
            scan: { checking: 'Checking scan...', ok: 'Scannable', fail: 'Not scannable' },
            logo: { centerOdd: 'Odd center', centerEven: 'Even center', blocksBadge: '{n} blocks\n{tag}' },
            tooltips: {
                gridToggle: 'Show / hide grid', panMode: 'Move mode: drag with one finger', eccL: 'Level L: recovers about 7% damage (smallest code)', eccM: 'Level M: recovers about 15% damage', eccQ: 'Level Q: recovers about 25% damage', eccH: 'Level H: recovers about 30% damage (densest code)', swapGradColors: 'Swap gradient colors 1 and 2',
                autoBbox: 'Auto-detect object', fullBbox: 'Select the whole image', autoGrid: 'Auto-calculate columns & rows',
                colorsMinus: 'Remove 1 color', colorsPlus: 'Add 1 color', colsMinus: 'Remove 1 column', colsPlus: 'Add 1 column', rowsMinus: 'Remove 1 row', rowsPlus: 'Add 1 row',
                shortcuts: 'View keyboard shortcuts', guide: 'View the Pixel Art to Vector guide',
                undo: 'Undo (Ctrl+Z)', redo: 'Redo (Ctrl+Y)', checkerboard: 'Checkerboard background',
                viewMode: 'Switch view: Split / Source / Vector (Y key)'
            }
        },
        'vi': {
            brand: {
                title: 'Chuyển QR/Ảnh Sang Vector',
                documentTitle: 'Chuyển QR/Ảnh Sang Vector (SVG) & Tạo Mã QR Online Miễn Phí | Trần Thắng Minh',
                privacy: 'Quyền riêng tư'
            },
            tabs: {
                convert: 'Chuyển QR/Ảnh sang Vector',
                generate: 'Tạo Mã QR', 
                submodeQr: 'Mã QR',
                submodePixelArt: 'Pixel Art (8-Bit)'
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
                    eventTitle: 'Họp mặt, Sinh nhật, Hội thảo...',
                    location: 'Hà Nội, TP.HCM hoặc online link...',
                    lastName: 'Trần Thắng',
                    address: '123 Nguyễn Huệ, Q.1, TP.HCM',
                    note: 'Mô tả hoặc ghi nhớ...'
                }
            },
            controls: {
                heading: 'Tùy Chỉnh Vector', ecc: 'Mức sửa lỗi', 
                styleUnifiedConnected: 'Dính Điểm',
                styleUnifiedSeparated: 'Tách Điểm',
                styleBlocks: 'Block Rời',
                radiusUnified: 'Bo Góc',
                radiusBlocks: 'Bo Góc',
                blockSize: 'Kích Thước Block', 
                fgColor: 'Màu mã QR',
                bgColor: 'Màu nền',
                transparentBg: 'Nền trong suốt',
                logoHeading: 'Chèn Logo Trung Tâm',
                uploadLogo: 'Tải Logo (Ảnh / Vector SVG)',
                removeLogo: 'Xóa logo',
                outerPadding: 'Viền Đệm Ngoài (Margin)',
                outerPaddingBlocks: '{n} block',
                blockGap: 'Khoảng hở Pixel Block',
                logoBlocks: 'Vùng Chiếm Của Logo', 
                logoScale: 'Tỷ Lệ Logo Trong Khối',
                resetDefaults: 'Đặt lại mặc định',
                colorHeading: 'Màu Mã QR', colorSolid: '1 Màu', colorDuo: '2 Màu', colorGradient: 'Gradient',
                eyeColor: 'Màu 3 góc', gradColor1: 'Màu gradient 1', gradColor2: 'Màu gradient 2',
                gradLinear: 'Tuyến tính', gradRadial: 'Tròn (từ tâm)', gradAngle: 'Góc gradient',
                gradPerShape: 'Mỗi khối vector 1 màu', gradEyes: 'Mắt theo gradient'
            },
            qrContent: {
                
                copy: 'Sao chép',
                copied: 'Đã sao chép nội dung QR!',
                open: 'Mở liên kết',
                scanning: 'Đang quét mã QR trong ảnh...',
                scanSuccess: 'Đã quét và bóc tách mã QR thành công!',
                noQrFound: 'Không tìm thấy mã QR trong ảnh! Hãy chọn ảnh chụp rõ nét hơn.'
            },
            stats: {
                heading: 'Thông Số Vector', exportDim: 'Kích thước xuất', pixelSize: 'Kích thước Pixel Block',
                gridResolution: 'Độ phân giải lưới', vectorElements: 'Đường bao vector', qrLength: 'Độ dài', qrContent: 'Nội dung QR'
            },
            actions: { downloadSvg: 'Tải Vector', downloadPng: 'Tải Ảnh', copySvg: 'Copy Vector', copied: 'Đã sao chép vào bộ nhớ tạm!' },
            pixelart: {
                 gridHeading: 'Khung Đối Tượng & Lưới Pixel', 
                autoBbox: 'Tìm Object', fullBbox: 'Chọn Ảnh',  autoGrid: 'Lưới Tự Động', cols: 'Số Cột', rows: 'Số Hàng',
                lockSquare: 'Khóa Tỷ Lệ', cropToBbox: 'Cắt theo Khung', groupByColor: 'Gộp nhóm cùng màu',
                colorHeading: 'Bảng Màu & Lọc Số Màu', vectorHeading: 'Kiểu Khối Vector 8-Bit', maxColors: 'Số Lượng Màu',  pixelSize: 'Kích thước Pixel Block', autoPalette: 'Tự Động',
                sourcePaneTitle: 'Ảnh Gốc & Lưới Thực Tế', vectorPaneTitle: 'Vector SVG Kết Quả', 
                layeredSolids: 'Xếp tầng vector lót đáy (Solid Layers)', enclosureThreshold: 'Độ bọc lót đáy (Ngưỡng chu vi)',
                statsHeading: 'Thông Số Pixel Art', statSource: 'Ảnh gốc', statBbox: 'Vùng chọn', statGrid: 'Độ phân giải lưới',
                statColors: 'Số màu', statPixelSize: 'Kích thước Pixel Block', statExportDim: 'Kích thước xuất', statSvgSize: 'Dung lượng SVG', statPngSize: 'Dung lượng PNG',
                bestTag: 'Đẹp', swatchLabel: 'Màu {hex}', presetLabel: 'Bảng màu mẫu', presetAuto: 'Tự động (theo ảnh)', editColor: 'Sửa màu', mergeInto: 'Gộp vào...', resetEdits: 'Hoàn nguyên', mergeHint: 'Chọn màu muốn gộp vào',
                colorAdjustHeading: 'Chỉnh Màu (HSL)', resetColorAdjust: 'Đặt lại', greyscale: 'Ảnh xám (Greyscale)',
                hue: 'Sắc độ (Hue)', saturation: 'Độ bão hòa', lightness: 'Độ sáng'
            },
            guide: {
                btnTitle: 'Hướng Dẫn', heading: 'Hướng Dẫn Bóc Tách Pixel Art Sang Vector',
                step1Title: 'Chọn đối tượng', step1Desc: 'Kéo khung bao quanh nhân vật hoặc chủ thể.',
                step2Title: 'Khớp lưới', step2Desc: 'Chỉnh Số Cột & Số Hàng cho mỗi ô lưới vừa đúng một pixel block.',
                step3Title: 'Chọn số màu', step3Desc: 'Giảm số màu cho tới khi gọn mà vẫn đẹp.',
                step4Title: 'Tinh chỉnh', step4Desc: 'Tùy ý chỉnh bo góc, khoảng hở và màu sắc.',
                reopenHint: 'Mở lại hướng dẫn bất cứ lúc nào bằng nút Hướng Dẫn bên dưới',
                back: 'Quay lại', next: 'Tiếp', understood: 'Đã hiểu', close: 'Đóng',
                altStep1: 'Bước 1: Chọn Object', altStep2: 'Bước 2: Điều chỉnh lưới', altStep3: 'Bước 3: Chỉnh Số Lượng Màu', altStep4: 'Bước 4: Tùy chỉnh thêm'
            },
            hud: {
                title: 'Phím Tắt & Thao Tác', titleShort: 'Phím Tắt',
                undo: 'Hoàn tác',
                pan: 'Di chuyển vùng nhìn',
                zoom: 'Thu phóng',
                view: 'Đổi 3 chế độ xem',
                newImage: 'Ảnh mới',
                redo: 'Làm lại',
                bbox: 'Kéo / Resize box'
            },
            preview: {
                
                
                
                
                
                emptyTitle: 'Kéo thả hoặc Nhấp để chọn ảnh',
                emptyModeQrTitle: 'Ảnh Mã QR sang Vector QR', emptyModeQrDesc: 'Hỗ trợ PNG, JPG, JPEG, WEBP',
                emptyModePixelTitle: 'Ảnh 8-Bit sang 8-Bit Vector', emptyModePixelDesc: 'Hỗ trợ PNG, JPG, JPEG, WEBP, GIF',
                emptyOr: 'hoặc', emptyGenTitle: 'Tạo Mã QR',
                emptyGenTypeTitle: '9 Kiểu Dữ Liệu', emptyGenTypeDesc: 'URL, Wi-Fi, Email, Gọi điện, SMS, Văn bản, vCard, Sự kiện, MeCard',
                emptyGenVectorTitle: 'Đồ Họa Vector', emptyGenVectorDesc: 'SVG sắc nét, logo tâm, bo góc'
            },
            history: {
                heading: 'Lịch Sử Ảnh', clearAll: 'Xóa hết', empty: 'Chưa có lịch sử',
                newTitle: 'Ảnh mới', deleteTitle: 'Xóa khỏi lịch sử', deleted: 'Đã xóa mục khỏi lịch sử!', cleared: 'Đã xóa toàn bộ lịch sử!',
                confirmDelete: 'Bạn có chắc chắn muốn xóa ảnh này khỏi lịch sử không?',
                confirmClear: 'Bạn có chắc chắn muốn xóa toàn bộ lịch sử ảnh không?'
            },
            messages: {
                lowContrast: 'Màu mã QR và màu nền có độ tương phản thấp, mã có thể khó quét.',
                invalidImage: 'Vui lòng chọn một file ảnh hợp lệ (PNG, JPG, WEBP)!',
                noQrFallback: 'Không phát hiện mã QR. Đã tự động chuyển sang chế độ Pixel Art (8-Bit)!',
                processingError: 'Lỗi xử lý: ',
                activeDeleted: 'Đã xóa ảnh đang mở, trở về màn hình chờ!',
                restored: 'Đã khôi phục từ lịch sử!',
                gridClamped: 'Đã tự động chỉnh lưới về mức an toàn (≤ 256 ô) để chống tràn bộ nhớ',
                undone: 'Đã hoàn tác (Undo)', redone: 'Đã làm lại (Redo)',
                logoUnsupported: 'Định dạng GIF và PDF không được hỗ trợ cho logo!',
                logoInvalid: 'Vui lòng chọn file vector (SVG) hoặc ảnh (PNG, JPG, WEBP, AVIF, BMP, ICO)!'
            },
            units: { chars: 'ký tự', blocks: 'ô', colors: 'màu', fullImage: 'Toàn ảnh' },
            export: { heading: 'Xuất File', pngScale: 'Cỡ PNG', printWidth: 'Cỡ in (mm)', auto: 'Auto', printHint: 'Để trống: giữ cỡ pixel. Có cỡ in: SVG ghi đúng mm, PNG xuất ở 300 DPI.' },
            batch: { heading: 'Xuất hàng loạt (ZIP)', placeholder: 'Mỗi dòng một nội dung QR', fromText: 'Tạo từ danh sách', fromImages: 'Chọn nhiều ảnh QR', progress: 'Đang xử lý {done}/{total}...', done: '{ok} file SVG trong ZIP', skipped: 'bỏ qua {n}', noneConverted: 'Không chuyển được mã QR nào.', nothingToDo: 'Chưa có gì để chuyển.' },
            sideTabs: { settings: 'Cài đặt', info: 'Thông số' },
            scan: { checking: 'Đang kiểm tra quét...', ok: 'Quét được', fail: 'Không quét được' },
            logo: { centerOdd: 'Tâm lẻ', centerEven: 'Tâm chẵn', blocksBadge: '{n} blocks\n{tag}' },
            tooltips: {
                gridToggle: 'Hiện / ẩn lưới', panMode: 'Chế độ di chuyển: kéo bằng một ngón', eccL: 'Mức L: sửa được khoảng 7% hư hại (mã nhỏ nhất)', eccM: 'Mức M: sửa được khoảng 15% hư hại', eccQ: 'Mức Q: sửa được khoảng 25% hư hại', eccH: 'Mức H: sửa được khoảng 30% hư hại (mã dày nhất)', swapGradColors: 'Đổi chỗ màu gradient 1 và 2',
                autoBbox: 'Tự động nhận diện đối tượng', fullBbox: 'Chọn toàn bộ khung ảnh', autoGrid: 'Tự động tính số cột & hàng',
                colorsMinus: 'Giảm 1 màu', colorsPlus: 'Tăng 1 màu', colsMinus: 'Giảm 1 cột', colsPlus: 'Tăng 1 cột', rowsMinus: 'Giảm 1 hàng', rowsPlus: 'Tăng 1 hàng',
                shortcuts: 'Xem danh sách phím tắt', guide: 'Xem hướng dẫn chuyển ảnh Pixel Art sang Vector',
                undo: 'Hoàn tác (Ctrl+Z)', redo: 'Làm lại (Ctrl+Y)', checkerboard: 'Lưới caro nền',
                viewMode: 'Chuyển chế độ xem: Song song / Ảnh gốc / Vector (Phím Y)'
            }
        }
    };

    class QrImageToVectorI18n {
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

            // Sliders are labelled by a sibling span, so mirror that text as their accessible name
            document.querySelectorAll('.control-group input[type="range"]').forEach((slider) => {
                const label = slider.closest('.control-group').querySelector('.control-label-row > span:first-child');
                if (label) slider.setAttribute('aria-label', label.textContent.trim());
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

    if (typeof window !== 'undefined') window.QrImageToVectorI18n = new QrImageToVectorI18n();
    if (typeof module !== 'undefined' && module.exports) module.exports = { QrImageToVectorI18n };
})();
