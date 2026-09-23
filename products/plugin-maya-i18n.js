(function () {
    'use strict';

    if (!window.sharedI18n || typeof window.sharedI18n.registerTranslations !== 'function') {
        return;
    }

    var vi = {
        mayaPlugin: {
            breadcrumb: 'Maya',
            title: 'Maya Tools',
            badge: '3D Workflow',
            summary: 'Trong Maya, mình ưu tiên các tool phục vụ thao tác dựng hình, dọn scene và tăng tốc những bước kỹ thuật lặp đi lặp lại để pipeline 3D gọn hơn và ít lỗi vặt hơn.',
            f1: 'Hỗ trợ clean scene, đổi tên object và gom nhóm cấu trúc file gọn hơn.',
            f2: 'Tăng tốc thao tác modeling, setup nhanh các bước kỹ thuật hay dùng.',
            f3: 'Giúp quá trình làm việc ổn định hơn khi phải xử lý nhiều asset trong cùng một dự án.',
            downloadLabel: 'Tải Xuống .ZIP',
            downloadUnit: 'lượt tải'
        }
    };

    var en = {
        mayaPlugin: {
            breadcrumb: 'Maya',
            title: 'Maya Tools',
            badge: '3D Workflow',
            summary: 'In Maya, I prioritize tools designed for modeling operations, scene cleanup, and accelerating repetitive technical steps to keep 3D pipelines leaner and reduce friction.',
            f1: 'Assists with scene cleanup, object renaming, and streamlining outliner hierarchies.',
            f2: 'Accelerates modeling workflows and quickly sets up recurring technical configurations.',
            f3: 'Maintains pipeline consistency when managing numerous assets across production projects.',
            downloadLabel: 'Download .ZIP',
            downloadUnit: 'downloads'
        }
    };

    window.sharedI18n.registerTranslations('vi', vi);
    window.sharedI18n.registerTranslations('en', en);
})();
