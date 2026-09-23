(function () {
    'use strict';

    if (!window.sharedI18n || typeof window.sharedI18n.registerTranslations !== 'function') {
        return;
    }

    var vi = {
        bunGioHeo: {
            breadcrumbHome: 'Trang Chủ',
            breadcrumbCurrent: 'Bún Giò Heo Minh Nhật',
            badge: 'F&B - Kinh doanh gia đình',
            title: 'Bún Giò Heo Minh Nhật',
            desc: 'Thương hiệu kinh doanh ẩm thực gia đình lâu đời tại Hóc Môn từ năm 2004. Chuyên phục vụ các món bún giò heo truyền thống với hương vị đậm đà, nguyên liệu tươi ngon được chọn lọc kỹ càng mỗi ngày.',
            logoAlt: 'Bún Giò Heo Minh Nhật - Logo'
        }
    };

    var en = {
        bunGioHeo: {
            breadcrumbHome: 'Home',
            breadcrumbCurrent: 'Bún Giò Heo Minh Nhật',
            badge: 'F&B - Family Business',
            title: 'Bún Giò Heo Minh Nhật',
            desc: 'A long-standing family culinary brand in Hóc Môn since 2004. Specializing in traditional Vietnamese pork knuckle noodle soup (bún giò heo) with rich savory broth and fresh, carefully selected ingredients every day.',
            logoAlt: 'Bún Giò Heo Minh Nhật - Logo'
        }
    };

    window.sharedI18n.registerTranslations('vi', vi);
    window.sharedI18n.registerTranslations('en', en);
})();
