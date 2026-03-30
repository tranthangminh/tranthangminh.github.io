(function () {
    'use strict';

    if (!window.sharedI18n || typeof window.sharedI18n.registerTranslations !== 'function') {
        return;
    }

    window.sharedI18n.registerTranslations('vi', {
        meta: {
            home: {
                title: 'Hồ Sơ Trần Thắng Minh'
            },
            actor: {
                title: 'Diễn Viên - Trần Thắng Minh'
            },
            photographer: {
                title: 'Nhiếp Ảnh - Trần Thắng Minh'
            }
        },
        header: {
            professions: 'Nghề Nghiệp',
            tools: 'Công Cụ',
            homeAria: 'Quay về trang chủ',
            profession: {
                actor: 'Diễn Viên',
                artist: 'Họa Sĩ',
                photographer: 'Nhiếp Ảnh'
            },
            tool: {
                photoshop: 'Tool Photoshop',
                maya: 'Tool Maya',
                cheatEngine: 'Tool Cheat Engine'
            }
        },
        bookNow: {
            label: 'Liên Hệ Ngay!',
            aria: 'Đi đến phần liên hệ'
        },
        lightbox: {
            close: 'Đóng ảnh',
            prev: 'Ảnh trước',
            next: 'Ảnh tiếp theo',
            thumbs: 'Danh sách ảnh',
            fallbackAlt: 'Ảnh phóng to',
            actorAlt: 'Ảnh diễn viên phóng to',
            photographerAlt: 'Ảnh nhiếp ảnh phóng to'
        },
        contact: {
            title: 'LIÊN HỆ',
            intro: 'Sẵn sàng hợp tác cho các dự án diễn xuất, thiết kế 2D/3D, nhiếp ảnh và phát triển công cụ hỗ trợ quy trình làm việc.',
            directTitle: 'Liên Hệ Trực Tiếp',
            socialTitle: 'Mạng Xã Hội',
            exploreTitle: 'Lĩnh Vực Hoạt Động Khác',
            callReveal: 'Gọi ngay',
            call: 'Gọi: 036 321 9989',
            email: 'Email: maxiechen96@gmail.com',
            moreSocial: 'Xem thêm mạng xã hội',
            copyright: 'Bản quyền 2026 Trần Thắng Minh. Bảo lưu mọi quyền.',
            signatureAlt: 'Chữ ký'
        },
        welcome: {
            home: {
                title: 'Xin chào!'
            },
            actor: {
                kicker: 'Diễn viên',
                title: 'Trần Thắng Minh'
            }
        }
    });
})();
