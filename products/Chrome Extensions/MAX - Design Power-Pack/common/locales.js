/**
 * locales.js — MAX Design Power-Pack
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
        copiedClipboard: 'Copied to clipboard!'
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
        copiedCmyk: 'CMYK Copied!'
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
        fileAccessWarning: '⚠️ To preview local files directly in original quality, please enable <strong>"Allow access to file URLs"</strong> in <a href="#" id="open-extensions-link">extension settings</a>.'
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
        sortDuration: 'Duration'
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
        title: 'Version Changelog'
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
        switchToLight: 'Switch to Light Theme'
      }
    },
    vi: {
      header: {
        switchPopup: 'Chuyển sang dạng Popup',
        openSidepanel: 'Mở dạng thanh bên (Side Panel)',
        toggleTheme: 'Đổi giao diện Sáng / Tối',
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
        copiedClipboard: 'Đã sao chép vào bộ nhớ tạm!'
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
        copiedCmyk: 'Đã chép mã CMYK!'
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
        fileAccessWarning: '⚠️ Để xem trước tệp cục bộ ở chất lượng gốc, vui lòng bật <strong>"Cho phép truy cập vào các URL tệp"</strong> trong <a href="#" id="open-extensions-link">cài đặt tiện ích</a>.'
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
        sortDuration: 'Thời lượng'
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
        supportMax: 'Ủng hộ phát triển MAX',
        donateTitle: 'Bạn thích MAX chứ?',
        donateDesc: 'Nếu MAX giúp bạn tiết kiệm thời gian, hãy mời tác giả một ly cà phê ☕ nhé!',
        donateBtn: 'Ủng hộ qua Ko-fi'
      },
      colorstudio: {
        title: 'Color Studio',
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
        title: 'Nhật ký phiên bản'
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
        switchToLight: 'Chuyển sang giao diện Sáng'
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

  function t(pathStr, fallback = '') {
    const val = resolvePath(TRANSLATIONS[currentLang], pathStr);
    if (val !== null && val !== undefined) return val;
    const defVal = resolvePath(TRANSLATIONS[DEFAULT_LANG], pathStr);
    if (defVal !== null && defVal !== undefined) return defVal;
    return fallback || pathStr;
  }

  function getLanguage() {
    return currentLang;
  }

  function applyTranslations(root = document) {
    if (!root) return;

    // 1. Text elements [data-i18n]
    const textEls = root.querySelectorAll('[data-i18n]');
    textEls.forEach(el => {
      const key = el.getAttribute('data-i18n');
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
      langBtn.textContent = currentLang.toUpperCase();
      langBtn.title = t('header.langToggle');
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
          // Detect user browser preference
          const browserLang = (typeof navigator !== 'undefined' && navigator.language && navigator.language.startsWith('vi')) ? 'vi' : 'en';
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
      onResolved(saved || DEFAULT_LANG);
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
