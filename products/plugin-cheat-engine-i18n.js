(function () {
    'use strict';

    if (!window.sharedI18n || typeof window.sharedI18n.registerTranslations !== 'function') {
        return;
    }

    var vi = {
        cheatEnginePlugin: {
            breadcrumb: 'Cheat Engine',
            title: 'My Cheat Tables',
            badge: 'Cheat Engine',
            summary: 'Với Cheat Engine, mình chỉ tập trung vào việc cheat game Steam và PC trong những trường hợp cần thử nghiệm nhanh hoặc kiểm tra trực tiếp dữ liệu đang chạy trong game.',
            f1: 'Tổng hợp các bảng Cheat Table (.CT) tự tạo cho nhiều tựa game trên Steam và PC.',
            f2: 'Tìm kiếm nhanh theo tên game và tải trực tiếp file .CT.',
            tableTitle: 'Danh Sách Cheat Table',
            tableNote: 'Bấm vào từng file để tải xuống.',
            count: '{{count}} file',
            searchPlaceholder: 'Tìm game hoặc tên file...',
            empty: 'Không tìm thấy file phù hợp.'
        }
    };

    var en = {
        cheatEnginePlugin: {
            breadcrumb: 'Cheat Engine',
            title: 'My Cheat Tables',
            badge: 'Cheat Engine',
            summary: 'With Cheat Engine, I focus on game modding and memory editing for Steam and PC games when rapid testing or live in-game data verification is needed.',
            f1: 'Curated collection of custom Cheat Tables (.CT) for various Steam and PC titles.',
            f2: 'Quickly search by game title and directly download .CT files.',
            tableTitle: 'Cheat Table List',
            tableNote: 'Click any file to download.',
            count: '{{count}} files',
            searchPlaceholder: 'Search game or file name...',
            empty: 'No matching files found.'
        }
    };

    window.sharedI18n.registerTranslations('vi', vi);
    window.sharedI18n.registerTranslations('en', en);
})();
