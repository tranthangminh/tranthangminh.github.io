/**
 * locales.js — Design-Power Pack by Max
 * Centralized Internationalization (i18n) Engine for English (EN) & Tiếng Việt (VI).
 */

(function () {
  'use strict';

  const STORAGE_KEY = 'maxLanguage';
  const DEFAULT_LANG = 'en';

  const TRANSLATIONS = {
    en: {
      header: {
        switchPopup: 'Switch to Popup',
        openSidepanel: 'Open in Side Panel',
        toggleTheme: 'Toggle Theme',
        switchToDark: 'Switch to Dark Theme',
        switchToLight: 'Switch to Light Theme',
        changelog: 'Changelog',
        langToggle: 'Switch Language (Tiếng Việt)',
        langBadge: 'EN'
      },
      tabs: {
        colorpicker: 'Color Picker',
        screencapture: 'Screen Capture',
        downloader: 'Downloader',
        tools: 'Tools/Features'
      },
      common: {
        close: 'Close',
        copy: 'Copy',
        copied: 'Copied!',
        download: 'Download',
        delete: 'Delete',
        view: 'View',
        openTab: 'Open Tab',
        clearAll: 'Clear All',
        search: 'Search',
        preview: 'Preview',
        cancel: 'Cancel',
        save: 'Save',
        reset: 'Reset',
        items: 'items',
        item: 'item',
        filter: 'Filter',
        all: 'All',
        none: 'None',
        selected: 'selected',
        selectAll: 'Select All',
        deselectAll: 'Deselect All',
        rescan: 'Rescan Resources',
        col1: '1 Column',
        col2: '2 Columns',
        col3: '3 Columns',
        copiedClipboard: 'Copied to clipboard!',
        auto: 'Auto'
      },
      colorpicker: {
        pickColor: 'Pick Color',
        paletteStudio: 'Palette Studio',
        colorHistory: 'Color History',
        emptyHistory: 'No colors picked yet. Click "Pick Color" to start.',
        contrastRatio: 'Contrast Ratio',
        copiedHex: 'HEX Copied!',
        copiedRgb: 'RGB Copied!',
        copiedHsl: 'HSL Copied!',
        copiedCmyk: 'CMYK Copied!',
        clickCopyHex: 'Click to copy HEX',
        deleteColor: 'Delete color',
        copyHex: 'Copy HEX',
        copyHsl: 'Copy HSL',
        copyRgb: 'Copy RGB',
        copyCmyk: 'Copy CMYK',
        historyCleared: 'History cleared!',
        colorRemoved: 'Color removed',
        copied: 'Copied: {0}',
        pickedCopied: 'Picked & Copied: {0}',
        pickedColor: 'Picked color: {0}',
        eyeDropperNotSupported: 'EyeDropper is not supported in this browser.'
      },
      screencapture: {
        areaCapture: 'Custom Area',
        visibleCapture: 'Visible Area',
        fullCapture: 'Full Page',
        recorder: 'Screen Recorder',
        historyTitle: 'Capture History',
        emptyHistory: 'No recent screen captures',
        scaleLabel: 'Resolution Scaling:',
        formatLabel: 'Image Format:',
        limitLabel: 'Dimension Limits (px):',
        resTitle: 'Resolution:',
        maxLimitTitle: 'Max Limit:',
        maxLimitNote: 'Output image dimensions will be restricted by Max Limit.',
        maxLimitTooltip: 'Output image dimensions will be restricted by Max Limit. Set 0 to disable.',
        captureScreen: 'Capture Screen',
        captureTip: 'Tip: Side Panel narrows page. Switch to Popup Mode for full width.',
        shortcutHint: 'Shortcuts active: Alt+Shift+Z (Area), Alt+Shift+X (Visible), Alt+Shift+C (Full), Alt+Shift+V (Record)',
        areaDesc: 'Drag to crop region',
        visibleDesc: 'Capture current view',
        fullDesc: 'Auto-scroll page',
        recordDesc: 'Record tab / screen',
        fileAccessWarning: '⚠️ To preview local files directly in original quality, please enable <strong>"Allow access to file URLs"</strong> in <a href="#" id="open-extensions-link">extension settings</a>.',
        activeTabNotFound: 'Active tab not found.',
        systemPageRestricted: 'Cannot capture Chrome system pages or Chrome Web Store due to browser security restrictions. Please try on a normal webpage!',
        downloadSuccess: 'Screenshot downloaded successfully!',
        downloadFailed: 'Download failed. Please try again!',
        historyCleared: 'Capture history cleared',
        unableCopyImage: 'Unable to copy image',
        fileNotFound: 'File not found in downloads.',
        savedDownloads: 'Saved to Downloads',
        enableFileAccess: 'Enable file access to preview'
      },
      downloader: {
        imagesTab: 'Images',
        vectorsTab: 'Vectors',
        videosTab: 'Videos',
        soundsTab: 'Sounds',
        emptyImages: 'No images found on this page.',
        emptyVectors: 'No vector SVG elements found on this page.',
        emptyVideos: 'No HTML5 videos found on this page.',
        emptySounds: 'No audio tracks found on this page.',
        scanning: 'Scanning page...',
        scanningImages: 'Scanning page for images...',
        scanningVectors: 'Scanning page for vectors...',
        scanningVideos: 'Scanning page for videos...',
        scanningSounds: 'Scanning page for sounds...',
        downloadSelected: 'Download',
        selectAll: 'Select All',
        allLayouts: 'All Layouts',
        square: 'Square',
        wide: 'Wide',
        tall: 'Tall',
        sortLabel: 'Sort:',
        sortDefault: 'Default',
        sortType: 'Type',
        sortSize: 'Size',
        sortResolution: 'Resolution',
        sortDuration: 'Duration',
        countImagesZero: '0 images found',
        countVectorsZero: '0 vectors found',
        countVideosZero: '0 videos found',
        countSoundsZero: '0 sounds found',
        foundImages: '{0} images found',
        foundImagesOf: '{0} of {1} images found',
        foundVectors: '{0} vectors found',
        foundVectorsOf: '{0} of {1} vectors found',
        foundVideos: '{0} videos found',
        foundSounds: '{0} sounds found',
        noImagesSearch: 'No images found matching your search.',
        noVectorsSearch: 'No vectors found matching your search.',
        previewImage: 'Preview image',
        copyImageClipboard: 'Copy image to clipboard',
        openNewTab: 'Open in new tab',
        downloadImmediate: 'Download immediately',
        previewVector: 'Preview vector',
        copySvgCode: 'Copy SVG Code',
        downloadSvgFile: 'Download SVG file',
        scrubVideo: 'Scrub video',
        copyVideoUrl: 'Copy video URL',
        downloadVideoFile: 'Download video file',
        scrubAudio: 'Scrub audio'
      },
      tools: {
        contextSection: 'Right-Click Context Menu',
        saveAsTypeTitle: 'Save Image As Type...',
        saveAsTypeDesc: 'Save web images as JPG, PNG, WebP, GIF, or PDF',
        searchMasterTitle: 'Search Image on...',
        searchMasterDesc: 'Reverse search web images via Yandex or TinEye',
        captureToolsTitle: 'Screen Capture Tools',
        captureToolsDesc: 'Capture screen areas, full page, or record video',
        pageOverlaysSection: 'Page Overlays & Utilities',
        speedControllerTitle: 'Video / Sound Controller',
        speedControllerDesc: 'Floating speed & sound controls with shortcuts for web media',
        directStudioTitle: 'Auto-Open Image Studio',
        directStudioDesc: 'Automatically open direct image links in MAX Studio',
        floatingToolsTitle: 'Floating Quick Tools',
        floatingToolsDesc: 'Floating button on page edge for instant capture, recording & color picking',
        supportMax: 'Support MAX Development',
        donateTitle: 'Enjoying MAX?',
        donateDesc: 'If MAX saves you time, consider buying me a coffee ☕ — it helps keep the tool free and updated!',
        donateBtn: 'Support on Ko-fi'
      },
      colorstudio: {
        title: 'Color Studio',
        addColor: '+ Add Color',
        saveColorTip: 'Save color to Color History',
        dragSpectrum: 'Drag to pick Saturation & Brightness',
        dragHue: 'Drag to pick Hue (0° - 360°)',
        new: 'new',
        newColor: 'New Selected Color',
        current: 'current',
        currentColor: 'Click to Reset to Original Color'
      },
      changelog: {
        title: 'Version Changelog',
        badgeFeature: 'New Feature',
        badgeTweak: 'Feature Tweak & Improvement',
        badgeBug: 'Bug Fix',
        badgeOptimize: 'Performance Optimization',
        badgeOther: 'Other Updates'
      },
      editor: {
        select: 'Select (A)',
        brush: 'Brush Tool (B)',
        shapes: 'Shapes (M)',
        text: 'Text Tool (T)',
        undo: 'Undo (Ctrl+Z)',
        redo: 'Redo (Ctrl+Y)',
        clear: 'Clear Canvas',
        stop: 'Stop',
        stopDrawing: 'Stop Drawing',
        close: 'Close (Esc)',
        toggleTheme: 'Toggle Studio Theme',
        hideHud: 'Hide HUD (H)',
        copyEdited: 'Copy<br>Edited',
        downloadEdited: 'Download<br>Edited',
        searchOn: 'Search Image on:',
        searchYandex: 'Search on Yandex',
        openTab: 'Open Tab',
        copy: 'Copy',
        download: 'Download',
        shortcutsActive: 'All shortcuts & image controls remain active',
        polygon: 'Polygon (M)',
        ellipse: 'Ellipse (O)',
        linePath: 'Line Path (P)',
        shapeType: 'Shape Type',
        brushSize: 'Brush Size',
        brushColor: 'Brush Color',
        textColor: 'Text Color',
        strokeColor: 'Stroke Color',
        bgColor: 'Background Color',
        rotateObject: 'Rotate Object',
        scaleObject: 'Scale Object',
        deleteObject: 'Delete Object',
        bold: 'Toggle Bold',
        italic: 'Toggle Italic',
        underline: 'Toggle Underline',
        align: 'Text Alignment',
        discardTitle: 'Discard Unsaved Changes?',
        discardMessage: 'You have unsaved annotations. Closing will discard your edits.',
        discardKeep: 'Keep Editing',
        discardConfirm: 'Discard & Close',
        showHud: 'Show HUD (H)',
        switchToDark: 'Switch to Dark Theme',
        switchToLight: 'Switch to Light Theme',
        chipSelect: 'A: Select',
        chipBrush: 'B: Brush',
        chipText: 'T: Text',
        chipPolygon: 'M: Polygon',
        chipEllipse: 'O: Ellipse',
        chipLinePath: 'P: Line Path',
        chipHideHud: 'H: Hide HUD',
        chipCopyEdited: 'Ctrl C: Copy Edited',
        chipPan: 'Middle: Pan',
        chipZoom: 'Scroll: Zoom',
        chipFastZoom: 'DblClick: Fast Zoom',
        chipZoom100: '1: 100%',
        chipFitScreen: '2: Fit Screen',
        chipClose: 'ESC: Close',
        popoverBrushSettings: 'BRUSH SETTINGS',
        popoverStrokeSize: 'STROKE SIZE',
        popoverPolygonSides: 'POLYGON SIDES',
        popoverBgColor: 'BACKGROUND COLOR',
        popoverTextColor: 'TEXT COLOR',
        popoverStrokeColor: 'STROKE COLOR',
        fixedToScreen: 'Fixed to Screen',
        fixedToImage: 'Fixed to Image',
        on: 'On',
        off: 'Off',
        setTransparent: 'Set Transparent',
        customColorPicker: 'Custom Color Picker',
        toggleSizeMode: 'Toggle Size Mode',
        toggleLazyMouse: 'Toggle Smooth Lazy Mouse',
        polygonSidesTooltip: 'Polygon Sides Count (Hover for slider, click to edit)',
        toastDownloaded: 'Downloaded edited image!',
        toastCopied: 'Copied edited image to clipboard!',
        toastFailedCopy: 'Failed to copy image to clipboard',
        toastClipboardNotSupported: 'Clipboard API not supported'
      },
      recordBar: {
        dragToMove: 'Drag to move',
        pause: 'Pause',
        resume: 'Resume',
        stopAndSave: 'Stop & Save',
        minimize: 'Minimize Bar (Fade Bar)',
        pauseResume: 'Pause / Resume',
        stopSaveVideo: 'Stop & Save Video'
      },
      recorder: {
        title: 'Screen Recorder',
        modeSection: 'RECORDING MODE',
        modeTab: 'Chrome Tab',
        modeTabSub: 'Active browser tab',
        modeScreen: 'Entire Screen',
        modeScreenSub: 'Entire desktop screen',
        modeWindow: 'Window',
        modeWindowSub: 'Application window',
        modeCamera: 'Webcam Only',
        modeCameraSub: 'Camera feed only',
        inputsSection: 'INPUTS & SETTINGS',
        sysSound: 'System Sound',
        sysSoundSub: 'Tab & system audio',
        microphone: 'Microphone',
        defaultMic: 'Default Microphone',
        webcamCamera: 'Webcam Camera',
        defaultCam: 'Default Camera',
        format: 'Format',
        formatSub: 'Output extension',
        startRecording: 'Start Recording',
        recordingLive: 'RECORDING LIVE',
        liveFeed: 'LIVE FEED',
        pause: 'Pause',
        resume: 'Resume',
        stopAndSave: 'Stop & Save',
        cancel: 'Cancel',
        pauseResume: 'Pause / Resume',
        stopSaveVideo: 'Stop & Save Video'
      },
      contextMenu: {
        yandex: '🔎 Search Image on Yandex',
        tineye: '🔎 Search Image on TinEye',
        captureArea: '📸 Capture Custom Area',
        captureVisible: '📸 Capture Visible',
        captureFull: '📸 Capture Full Page',
        captureRecord: '🔴 Record Screen Video',
        savePng: '🖼️ Save Image as PNG',
        saveJpg: '🖼️ Save Image as JPG',
        saveWebp: '🖼️ Save Image as WebP',
        saveGif: '🖼️ Save Image as GIF',
        savePdf: '📄 Save Image as PDF'
      }
    },
    vi: {
      header: {
        switchPopup: 'Chuyển sang dạng Popup',
        openSidepanel: 'Mở dạng thanh bên (Side Panel)',
        toggleTheme: 'Đổi giao diện Sáng / Tối',
        switchToDark: 'Chuyển sang giao diện Tối',
        switchToLight: 'Chuyển sang giao diện Sáng',
        changelog: 'Nhật ký phiên bản',
        langToggle: 'Chuyển sang Tiếng Anh (English)',
        langBadge: 'VI'
      },
      tabs: {
        colorpicker: 'Chấm Màu',
        screencapture: 'Chụp Màn Hình',
        downloader: 'Tải xuống',
        tools: 'Công Cụ'
      },
      common: {
        close: 'Đóng',
        copy: 'Sao chép',
        copied: 'Đã sao chép!',
        download: 'Tải về',
        delete: 'Xóa',
        view: 'Xem',
        openTab: 'Mở tab mới',
        clearAll: 'Xóa tất cả',
        search: 'Tìm kiếm',
        preview: 'Xem trước',
        cancel: 'Hủy',
        save: 'Lưu',
        reset: 'Đặt lại',
        items: 'mục',
        item: 'mục',
        filter: 'Lọc',
        all: 'Tất cả',
        none: 'Bỏ chọn',
        selected: 'đã chọn',
        selectAll: 'Chọn tất cả',
        deselectAll: 'Bỏ chọn tất cả',
        rescan: 'Quét lại tài nguyên',
        col1: '1 Cột',
        col2: '2 Cột',
        col3: '3 Cột',
        copiedClipboard: 'Đã sao chép vào bộ nhớ tạm!',
        auto: 'Tự động'
      },
      colorpicker: {
        pickColor: 'Chấm màu',
        paletteStudio: 'Studio Phối Màu',
        colorHistory: 'Lịch sử Màu',
        emptyHistory: 'Chưa có màu nào được chấm. Nhấn "Chấm màu" để bắt đầu.',
        contrastRatio: 'Tỉ lệ tương phản',
        copiedHex: 'Đã chép mã HEX!',
        copiedRgb: 'Đã chép mã RGB!',
        copiedHsl: 'Đã chép mã HSL!',
        copiedCmyk: 'Đã chép mã CMYK!',
        clickCopyHex: 'Nhấp để chép mã HEX',
        deleteColor: 'Xóa màu này',
        copyHex: 'Chép HEX',
        copyHsl: 'Chép HSL',
        copyRgb: 'Chép RGB',
        copyCmyk: 'Chép CMYK',
        historyCleared: 'Đã xóa lịch sử màu!',
        colorRemoved: 'Đã xóa màu',
        copied: 'Đã sao chép: {0}',
        pickedCopied: 'Đã chấm & sao chép: {0}',
        pickedColor: 'Đã chấm màu: {0}',
        eyeDropperNotSupported: 'Trình duyệt không hỗ trợ công cụ EyeDropper.'
      },
      screencapture: {
        areaCapture: 'Vùng Tùy Chọn',
        visibleCapture: 'Vùng Hiển Thị',
        fullCapture: 'Toàn Trang',
        recorder: 'Quay Màn Hình',
        historyTitle: 'Lịch sử chụp ảnh',
        emptyHistory: 'Chưa có ảnh chụp màn hình nào',
        scaleLabel: 'Tỉ lệ độ phân giải:',
        formatLabel: 'Định dạng ảnh:',
        limitLabel: 'Giới hạn kích thước (px):',
        resTitle: 'Độ phân giải:',
        maxLimitTitle: 'Giới hạn tối đa:',
        maxLimitNote: 'Kích thước ảnh xuất ra sẽ được giới hạn bởi thông số này.',
        maxLimitTooltip: 'Kích thước ảnh xuất ra sẽ bị giới hạn. Đặt 0 để tắt.',
        captureScreen: 'Bắt đầu chụp',
        captureTip: 'Mẹo: Thanh bên thu hẹp trang. Đổi sang dạng Popup để lấy độ rộng tối đa.',
        shortcutHint: 'Phím tắt: Alt+Shift+Z (Vùng chọn), Alt+Shift+X (Hiển thị), Alt+Shift+C (Toàn trang), Alt+Shift+V (Quay)',
        areaDesc: 'Kéo chuột để chọn vùng chụp',
        visibleDesc: 'Chụp phần màn hình đang hiển thị',
        fullDesc: 'Tự động cuộn chụp trang',
        recordDesc: 'Quay Video Tab / Màn Hình',
        fileAccessWarning: '⚠️ Để xem trước tệp cục bộ ở chất lượng gốc, vui lòng bật <strong>"Cho phép truy cập vào các URL tệp"</strong> trong <a href="#" id="open-extensions-link">cài đặt tiện ích</a>.',
        activeTabNotFound: 'Không tìm thấy thẻ hoạt động.',
        systemPageRestricted: 'Không thể chụp trang hệ thống Chrome hoặc Chrome Web Store do chính sách bảo mật. Vui lòng thử trên trang web thông thường!',
        downloadSuccess: 'Đã tải ảnh chụp màn hình thành công!',
        downloadFailed: 'Tải về thất bại. Vui lòng thử lại!',
        historyCleared: 'Đã xóa lịch sử chụp màn hình',
        unableCopyImage: 'Không thể sao chép hình ảnh',
        fileNotFound: 'Không tìm thấy tệp trong thư mục tải về.',
        savedDownloads: 'Đã lưu vào Tải về',
        enableFileAccess: 'Bật quyền URL tệp để xem trước'
      },
      downloader: {
        imagesTab: 'Hình ảnh',
        vectorsTab: 'Vector',
        videosTab: 'Video',
        soundsTab: 'Âm thanh',
        emptyImages: 'Không tìm thấy hình ảnh nào trên trang này.',
        emptyVectors: 'Không tìm thấy tệp vector nào trên trang này.',
        emptyVideos: 'Không tìm thấy video HTML5 nào trên trang này.',
        emptySounds: 'Không tìm thấy tệp âm thanh nào trên trang này.',
        scanning: 'Đang quét trang...',
        scanningImages: 'Đang quét hình ảnh trên trang...',
        scanningVectors: 'Đang quét vector SVG trên trang...',
        scanningVideos: 'Đang quét video HTML5 trên trang...',
        scanningSounds: 'Đang quét tệp âm thanh trên trang...',
        downloadSelected: 'Tải về',
        selectAll: 'Chọn tất cả',
        allLayouts: 'Tất cả bố cục',
        square: 'Hình vuông',
        wide: 'Khung ngang',
        tall: 'Khung dọc',
        sortLabel: 'Sắp xếp:',
        sortDefault: 'Mặc định',
        sortType: 'Định dạng',
        sortSize: 'Dung lượng',
        sortResolution: 'Độ phân giải',
        sortDuration: 'Thời lượng',
        countImagesZero: '0 hình ảnh',
        countVectorsZero: '0 vector',
        countVideosZero: '0 video',
        countSoundsZero: '0 âm thanh',
        foundImages: 'Tìm thấy {0} hình ảnh',
        foundImagesOf: 'Tìm thấy {0} / {1} hình ảnh',
        foundVectors: 'Tìm thấy {0} vector',
        foundVectorsOf: 'Tìm thấy {0} / {1} vector',
        foundVideos: 'Tìm thấy {0} video',
        foundSounds: 'Tìm thấy {0} âm thanh',
        noImagesSearch: 'Không tìm thấy hình ảnh nào phù hợp với tìm kiếm.',
        noVectorsSearch: 'Không tìm thấy vector nào phù hợp với tìm kiếm.',
        previewImage: 'Xem trước hình ảnh',
        copyImageClipboard: 'Sao chép ảnh vào bộ nhớ tạm',
        openNewTab: 'Mở trong tab mới',
        downloadImmediate: 'Tải về ngay',
        previewVector: 'Xem trước vector',
        copySvgCode: 'Sao chép mã SVG',
        downloadSvgFile: 'Tải tệp SVG',
        scrubVideo: 'Tua video',
        copyVideoUrl: 'Sao chép liên kết video',
        downloadVideoFile: 'Tải tệp video',
        scrubAudio: 'Tua âm thanh'
      },
      tools: {
        contextSection: 'Menu Chuột Phải',
        saveAsTypeTitle: 'Lưu ảnh theo định dạng...',
        saveAsTypeDesc: 'Lưu ảnh web dưới dạng JPG, PNG, WebP, GIF, hoặc PDF',
        searchMasterTitle: 'Tìm kiếm ảnh trên...',
        searchMasterDesc: 'Tìm ảnh đảo ngược qua Yandex hoặc TinEye',
        captureToolsTitle: 'Công cụ chụp & quay màn hình',
        captureToolsDesc: 'Chụp vùng tùy chọn, toàn trang, hoặc quay video',
        pageOverlaysSection: 'Tiện Ích & Bảng Điều Khiển Nổi',
        speedControllerTitle: 'Bộ điều khiển Video & Âm thanh',
        speedControllerDesc: 'Bảng điều khiển tốc độ & âm lượng nổi trên web',
        directStudioTitle: 'Tự động mở Image Studio',
        directStudioDesc: 'Tự động mở ảnh xem trực tiếp trong MAX Studio',
        floatingToolsTitle: 'Nút Tiện Ích Nổi',
        floatingToolsDesc: 'Nút tròn nổi ở mép màn hình giúp chụp ảnh, quay video và lấy màu tức thì',
        supportMax: 'Ủng hộ phát triển MAX',
        donateTitle: 'Bạn thích MAX chứ?',
        donateDesc: 'Nếu MAX giúp bạn tiết kiệm thời gian, hãy mời tác giả một ly cà phê ☕ nhé!',
        donateBtn: 'Ủng hộ qua Ko-fi'
      },
      colorstudio: {
        title: 'Studio Phối Màu',
        addColor: '+ Thêm màu',
        saveColorTip: 'Lưu màu vào Lịch sử màu',
        dragSpectrum: 'Kéo để chọn Độ bão hòa & Độ sáng',
        dragHue: 'Kéo để chọn Hue (0° - 360°)',
        new: 'mới',
        newColor: 'Màu mới chọn',
        current: 'hiện tại',
        currentColor: 'Nhấp để hoàn lại màu gốc'
      },
      changelog: {
        title: 'Nhật ký phiên bản',
        badgeFeature: 'Tính năng mới',
        badgeTweak: 'Cải tiến & Tinh chỉnh',
        badgeBug: 'Sửa lỗi',
        badgeOptimize: 'Tối ưu hóa hiệu năng',
        badgeOther: 'Cập nhật khác'
      },
      editor: {
        select: 'Chọn (A)',
        brush: 'Cọ vẽ (B)',
        shapes: 'Hình khối (M)',
        text: 'Chèn chữ (T)',
        undo: 'Hoàn tác (Ctrl+Z)',
        redo: 'Làm lại (Ctrl+Y)',
        clear: 'Xóa tất cả',
        stop: 'Dừng',
        stopDrawing: 'Dừng vẽ',
        close: 'Đóng (Esc)',
        toggleTheme: 'Đổi giao diện Studio',
        hideHud: 'Ẩn thanh công cụ (H)',
        copyEdited: 'Sao chép<br>Ảnh',
        downloadEdited: 'Tải về<br>Ảnh',
        searchOn: 'Tìm ảnh trên:',
        searchYandex: 'Tìm trên Yandex',
        openTab: 'Mở tab',
        copy: 'Sao chép',
        download: 'Tải về',
        shortcutsActive: 'Mọi phím tắt & điều khiển ảnh vẫn đang hoạt động',
        polygon: 'Hình đa giác (M)',
        ellipse: 'Hình bầu dục (O)',
        linePath: 'Vẽ đường thẳng (P)',
        shapeType: 'Kiểu hình khối',
        brushSize: 'Kích cỡ nét cọ',
        brushColor: 'Màu nét vẽ',
        textColor: 'Màu chữ',
        strokeColor: 'Màu viền',
        bgColor: 'Màu nền',
        rotateObject: 'Xoay đối tượng',
        scaleObject: 'Co giãn đối tượng',
        deleteObject: 'Xóa đối tượng',
        bold: 'Bật/Tắt in đậm',
        italic: 'Bật/Tắt in nghiêng',
        underline: 'Bật/Tắt gạch chân',
        align: 'Canh lề văn bản',
        discardTitle: 'Hủy các thay đổi chưa lưu?',
        discardMessage: 'Bạn có các nét vẽ chưa lưu. Đóng lại sẽ làm mất các chỉnh sửa này.',
        discardKeep: 'Tiếp tục chỉnh sửa',
        discardConfirm: 'Hủy & Đóng lại',
        showHud: 'Hiện thanh công cụ (H)',
        switchToDark: 'Chuyển sang giao diện Tối',
        switchToLight: 'Chuyển sang giao diện Sáng',
        chipSelect: 'A: Chọn',
        chipBrush: 'B: Cọ vẽ',
        chipText: 'T: Viết chữ',
        chipPolygon: 'M: Đa giác',
        chipEllipse: 'O: Bầu dục',
        chipLinePath: 'P: Đoạn thẳng',
        chipHideHud: 'H: Ẩn thanh công cụ',
        chipCopyEdited: 'Ctrl C: Sao chép ảnh',
        chipPan: 'Chuột giữa: Kéo ảnh',
        chipZoom: 'Cuộn chuột: Thu phóng',
        chipFastZoom: 'Nhấp đúp: Phóng nhanh',
        chipZoom100: '1: 100%',
        chipFitScreen: '2: Vừa khung',
        chipClose: 'ESC: Đóng',
        popoverBrushSettings: 'CÀI ĐẶT CỌ VẼ',
        popoverStrokeSize: 'KÍCH THƯỚC NÉT VẼ',
        popoverPolygonSides: 'SỐ CẠNH ĐA GIÁC',
        popoverBgColor: 'MÀU NỀN',
        popoverTextColor: 'MÀU CHỮ',
        popoverStrokeColor: 'MÀU ĐƯỜNG VIỀN',
        fixedToScreen: 'Cố định theo màn hình',
        fixedToImage: 'Cố định theo ảnh',
        on: 'Bật',
        off: 'Tắt',
        setTransparent: 'Đặt nền trong suốt',
        customColorPicker: 'Bộ chọn màu tùy chỉnh',
        toggleSizeMode: 'Đổi chế độ kích cỡ',
        toggleLazyMouse: 'Bật/Tắt làm mượt chuột',
        polygonSidesTooltip: 'Số cạnh đa giác (Rê chuột để chỉnh thanh trượt, nhấp để sửa)',
        toastDownloaded: 'Đã tải ảnh đã chỉnh sửa!',
        toastCopied: 'Đã sao chép ảnh đã chỉnh sửa vào clipboard!',
        toastFailedCopy: 'Không thể sao chép ảnh vào clipboard',
        toastClipboardNotSupported: 'Trình duyệt không hỗ trợ Clipboard API'
      },
      recordBar: {
        dragToMove: 'Kéo để di chuyển',
        pause: 'Tạm dừng',
        resume: 'Tiếp tục',
        stopAndSave: 'Dừng & Lưu',
        minimize: 'Thu nhỏ thanh điều khiển',
        pauseResume: 'Tạm dừng / Tiếp tục',
        stopSaveVideo: 'Dừng & Lưu Video'
      },
      recorder: {
        title: 'Quay video màn hình',
        modeSection: 'CHẾ ĐỘ QUAY',
        modeTab: 'Tab Chrome',
        modeTabSub: 'Tab trình duyệt đang xem',
        modeScreen: 'Toàn màn hình',
        modeScreenSub: 'Toàn bộ màn hình desktop',
        modeWindow: 'Cửa sổ ứng dụng',
        modeWindowSub: 'Cửa sổ phần mềm riêng lẻ',
        modeCamera: 'Chỉ Webcam',
        modeCameraSub: 'Chỉ ghi hình từ webcam',
        inputsSection: 'ÂM THANH & CÀI ĐẶT',
        sysSound: 'Âm thanh hệ thống',
        sysSoundSub: 'Âm thanh tab & máy tính',
        microphone: 'Microphone',
        defaultMic: 'Micro mặc định',
        webcamCamera: 'Webcam Camera',
        defaultCam: 'Camera mặc định',
        format: 'Định dạng',
        formatSub: 'Định dạng tệp video',
        startRecording: 'Bắt đầu quay',
        recordingLive: 'ĐANG QUAY TRỰC TIẾP',
        liveFeed: 'HÌNH ẢNH TRỰC TIẾP',
        pause: 'Tạm dừng',
        resume: 'Tiếp tục',
        stopAndSave: 'Dừng & Lưu',
        cancel: 'Hủy',
        pauseResume: 'Tạm dừng / Tiếp tục',
        stopSaveVideo: 'Dừng & Lưu Video'
      },
      contextMenu: {
        yandex: '🔎 Tìm ảnh trên Yandex',
        tineye: '🔎 Tìm ảnh trên TinEye',
        captureArea: '📸 Chụp vùng tùy chọn',
        captureVisible: '📸 Chụp vùng hiển thị',
        captureFull: '📸 Chụp toàn trang',
        captureRecord: '🔴 Quay video màn hình',
        savePng: '🖼️ Lưu ảnh dạng PNG',
        saveJpg: '🖼️ Lưu ảnh dạng JPG',
        saveWebp: '🖼️ Lưu ảnh dạng WebP',
        saveGif: '🖼️ Lưu ảnh dạng GIF',
        savePdf: '📄 Lưu ảnh dạng PDF'
      }
    }
  };

  let currentLang = DEFAULT_LANG;

  function resolvePath(obj, pathStr) {
    if (!obj || !pathStr) return null;
    const parts = pathStr.split('.');
    let cur = obj;
    for (const p of parts) {
      if (cur && typeof cur === 'object' && p in cur) {
        cur = cur[p];
      } else {
        return null;
      }
    }
    return cur;
  }

  function t(pathStr, fallback = '', params = null) {
    let val = resolvePath(TRANSLATIONS[currentLang], pathStr);
    if (val === null || val === undefined) {
      val = resolvePath(TRANSLATIONS[DEFAULT_LANG], pathStr);
    }
    if (val === null || val === undefined) {
      val = fallback || pathStr;
    }
    if (params && typeof val === 'string') {
      if (Array.isArray(params)) {
        params.forEach((param, i) => {
          val = val.replace(new RegExp(`\\{${i}\\}`, 'g'), String(param));
        });
      } else if (typeof params === 'object') {
        Object.keys(params).forEach(k => {
          val = val.replace(new RegExp(`\\{${k}\\}`, 'g'), String(params[k]));
        });
      }
    }
    return val;
  }

  function getLanguage() {
    return currentLang;
  }

  function applyTranslations(root = document) {
    if (!root) return;

    // 1. Text elements [data-i18n] and [data-i18n-html]
    const textEls = root.querySelectorAll('[data-i18n], [data-i18n-html]');
    textEls.forEach(el => {
      const key = el.getAttribute('data-i18n') || el.getAttribute('data-i18n-html');
      const translated = t(key);
      if (translated && translated !== key) {
        if (el.hasAttribute('data-i18n-html')) {
          el.innerHTML = translated;
        } else {
          el.textContent = translated;
        }
      }
    });

    // 2. Title tooltips [data-i18n-title]
    const titleEls = root.querySelectorAll('[data-i18n-title]');
    titleEls.forEach(el => {
      const key = el.getAttribute('data-i18n-title');
      const translated = t(key);
      if (translated && translated !== key) {
        el.title = translated;
      }
    });

    // 3. Placeholders [data-i18n-placeholder]
    const placeholderEls = root.querySelectorAll('[data-i18n-placeholder]');
    placeholderEls.forEach(el => {
      const key = el.getAttribute('data-i18n-placeholder');
      const translated = t(key);
      if (translated && translated !== key) {
        el.placeholder = translated;
      }
    });

    // 4. Update Header Language Toggle if present
    const langBtn = document.getElementById('lang-toggle-btn');
    if (langBtn) {
      // When current is English -> show VN flag (to switch to Vietnamese); when current is Vietnamese -> show EN flag
      const showEnFlag = currentLang === 'vi';
      const flagSrc = showEnFlag ? 'svg/lang-EN.svg' : 'svg/lang-VN.svg';
      const flagAlt = showEnFlag ? 'EN' : 'VI';
      langBtn.innerHTML = `<img class="lang-flag-icon" src="${flagSrc}" alt="${flagAlt}">`;
      langBtn.title = t('header.langToggle');
    }

    // 5. Update Theme Toggle title if present
    const themeBtn = document.getElementById('theme-toggle-btn');
    if (themeBtn) {
      const isLight = document.documentElement.getAttribute('data-theme') === 'light';
      themeBtn.title = isLight ? t('header.switchToDark') : t('header.switchToLight');
    }

    // Set document lang attribute
    if (document.documentElement) {
      document.documentElement.setAttribute('lang', currentLang);
    }
  }

  function setLanguage(newLang, callback) {
    if (newLang !== 'en' && newLang !== 'vi') return;
    currentLang = newLang;

    if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
      chrome.storage.local.set({ [STORAGE_KEY]: newLang }, () => {
        applyTranslations(document);
        window.dispatchEvent(new CustomEvent('maxLanguageChanged', { detail: { lang: newLang } }));
        if (typeof callback === 'function') callback(newLang);
      });
    } else {
      localStorage.setItem(STORAGE_KEY, newLang);
      applyTranslations(document);
      window.dispatchEvent(new CustomEvent('maxLanguageChanged', { detail: { lang: newLang } }));
      if (typeof callback === 'function') callback(newLang);
    }
  }

  function toggleLanguage() {
    const next = currentLang === 'en' ? 'vi' : 'en';
    setLanguage(next);
  }

  function detectBrowserLocale() {
    let detected = '';
    if (typeof chrome !== 'undefined' && chrome.i18n && typeof chrome.i18n.getUILanguage === 'function') {
      try {
        detected = chrome.i18n.getUILanguage();
      } catch (_) {}
    }
    if (!detected && typeof navigator !== 'undefined') {
      detected = (navigator.languages && navigator.languages[0]) || navigator.language || '';
    }
    return (detected && detected.toLowerCase().startsWith('vi')) ? 'vi' : 'en';
  }

  function init(callback) {
    function onResolved(lang) {
      currentLang = (lang === 'vi' || lang === 'en') ? lang : DEFAULT_LANG;
      applyTranslations(document);
      if (typeof callback === 'function') callback(currentLang);
    }

    if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
      chrome.storage.local.get([STORAGE_KEY], (res) => {
        if (res && res[STORAGE_KEY]) {
          onResolved(res[STORAGE_KEY]);
        } else {
          // Detect user browser / system preference on first run and persist it
          const browserLang = detectBrowserLocale();
          chrome.storage.local.set({ [STORAGE_KEY]: browserLang });
          onResolved(browserLang);
        }
      });

      // Synchronize changes across multiple tabs / popups
      if (!window._hasMaxLanguageStorageListener) {
        window._hasMaxLanguageStorageListener = true;
        chrome.storage.onChanged.addListener((changes, area) => {
          if (area === 'local' && changes[STORAGE_KEY]) {
            currentLang = changes[STORAGE_KEY].newValue || DEFAULT_LANG;
            applyTranslations(document);
            window.dispatchEvent(new CustomEvent('maxLanguageChanged', { detail: { lang: currentLang } }));
          }
        });
      }
    } else {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        onResolved(saved);
      } else {
        const browserLang = detectBrowserLocale();
        try { localStorage.setItem(STORAGE_KEY, browserLang); } catch (_) {}
        onResolved(browserLang);
      }
    }
  }

  // Export to global scope
  window.i18n = {
    t,
    getLanguage,
    setLanguage,
    toggleLanguage,
    applyTranslations,
    init,
    TRANSLATIONS
  };

  // Auto-init on DOM readiness
  if (typeof document !== 'undefined') {
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', () => init());
    } else {
      init();
    }
  }
})();
