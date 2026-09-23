(function () {
    'use strict';

    if (!window.sharedI18n || typeof window.sharedI18n.registerTranslations !== 'function') {
        return;
    }

    var vi = {
        artist: {
            breadcrumbHome: 'Trang Chủ',
            breadcrumbCurrent: 'Họa Sĩ',
            sectionTitle: 'Thông tin cơ bản',
            summary: 'Mình làm việc ở cả hai hướng 2D và 3D, tập trung vào bố cục, cảm xúc thị giác và tính ứng dụng thực tế. Quy trình luôn ưu tiên việc lên ý tưởng rõ ràng, giữ chất lượng đầu ra ổn định và tối ưu để có thể tái sử dụng cho nhiều dự án khác nhau.',
            tabs: {
                tab2d: '2D',
                tab3d: '3D',
                groupAriaLabel: 'Chọn nhóm tác phẩm'
            },
            galleryAriaLabel: 'Bộ sưu tập họa sĩ'
        }
    };

    var en = {
        artist: {
            breadcrumbHome: 'Home',
            breadcrumbCurrent: 'Artist',
            sectionTitle: 'Basic Information',
            summary: 'I work in both 2D and 3D domains, focusing on composition, visual emotion, and practical usability. The workflow always prioritizes clear conceptualization, consistent output quality, and optimization for reusability across multiple projects.',
            tabs: {
                tab2d: '2D',
                tab3d: '3D',
                groupAriaLabel: 'Select artwork category'
            },
            galleryAriaLabel: 'Artist Portfolio Gallery'
        }
    };

    window.sharedI18n.registerTranslations('vi', vi);
    window.sharedI18n.registerTranslations('en', en);
})();
