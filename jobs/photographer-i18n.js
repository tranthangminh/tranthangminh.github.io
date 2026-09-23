(function () {
    'use strict';

    if (!window.sharedI18n || typeof window.sharedI18n.registerTranslations !== 'function') {
        return;
    }

    var vi = {
        photographer: {
            breadcrumbHome: 'Trang Chủ',
            breadcrumbCurrent: 'Nhiếp Ảnh',
            summary: 'Mình theo đuổi nhiếp ảnh theo hướng kể chuyện bằng ánh sáng, cảm xúc và bố cục. Mỗi bộ ảnh đều được mình xử lý theo tinh thần vừa tự nhiên, vừa có điểm nhấn thị giác rõ ràng, để giữ được cá tính của nhân vật nhưng vẫn có chất điện ảnh riêng.',
            tags: {
                portrait: 'Portrait',
                fashion: 'Fashion',
                lifestyle: 'Lifestyle',
                storytelling: 'Storytelling'
            },
            galleryAriaLabel: 'Bộ sưu tập nhiếp ảnh'
        }
    };

    var en = {
        photographer: {
            breadcrumbHome: 'Home',
            breadcrumbCurrent: 'Photographer',
            summary: 'I pursue photography through storytelling with light, emotion, and composition. Each photoshoot is crafted to balance natural authenticity with distinct visual highlights, preserving individual character while delivering a unique cinematic presence.',
            tags: {
                portrait: 'Portrait',
                fashion: 'Fashion',
                lifestyle: 'Lifestyle',
                storytelling: 'Storytelling'
            },
            galleryAriaLabel: 'Photography Portfolio Gallery'
        }
    };

    window.sharedI18n.registerTranslations('vi', vi);
    window.sharedI18n.registerTranslations('en', en);
})();
