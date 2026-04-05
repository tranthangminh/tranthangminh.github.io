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
            },
            artist: {
                title: 'Họa Sĩ - Trần Thắng Minh'
            },
            tools: {
                title: 'Công Cụ - Trần Thắng Minh'
            }
        },
        header: {
            professions: 'Nghề Nghiệp',
            tools: 'Công Cụ',
            homeAria: 'Quay về trang chủ',
            languageAria: 'Chuyển ngôn ngữ',
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
            photographerAlt: 'Ảnh nhiếp ảnh phóng to',
            artistAlt: 'Ảnh họa sĩ phóng to'
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
        toolsPage: {
            cheatTables: {
                title: 'Danh Sách Cheat Table',
                note: 'Bấm vào từng file để tải xuống.',
                count: '{{count}} file',
                searchPlaceholder: 'Tìm game hoặc tên file...'
            },
            photoshop: {
                previewLabel: 'Xem trước',
                overviewTitle: 'Tổng Quan Công Cụ',
                overviewBody: 'Layer Export, Rename & Sort là một panel tiện ích cho Photoshop được tạo ra để tăng tốc các quy trình lặp đi lặp lại với layer. Công cụ này giúp xuất các layer đã chọn thành nhiều định dạng file, đổi tên layer hàng loạt và sắp xếp layer theo tên mà vẫn giữ nhịp làm việc liền mạch trong Photoshop.',
                downloadLabel: 'Tải Layer Export, Rename & Sort .CCX',
                installationTitle: 'Hướng Dẫn Cài Đặt',
                installationIntro: 'Plugin này yêu cầu Adobe Photoshop 23.3 trở lên.',
                installationPathNote: 'Để tránh lỗi cài đặt, hãy đặt file .ccx ở một đường dẫn cục bộ ngắn trước khi cài. Ví dụ nên dùng: D:\\com.max.layerxrs_PS.ccx. Tránh cài trực tiếp từ các đường dẫn quá dài, thư mục đồng bộ đám mây hoặc các vị trí bên ngoài.',
                installStepsTitle: 'Cách cài đặt',
                installStep1: 'Nhấp đúp vào file .ccx.',
                installStep2: 'Adobe Creative Cloud Desktop sẽ mở lên và cài plugin.',
                installStep3: 'Khởi động lại Photoshop nếu cần.',
                openStepsTitle: 'Cách mở công cụ trong Photoshop',
                openStep1: 'Mở Photoshop.',
                openStep2: 'Vào Plugins.',
                openStep3: 'Mở Layer Export, Rename & Sort.',
                exportTitle: 'Export',
                exportBody: 'Xuất các layer đã chọn thành từng file riêng theo tên layer, đồng thời có thể thêm tiền tố hoặc hậu tố để việc đặt tên gọn gàng hơn. Phần Export hỗ trợ JPG, PNG, WebP, PSD, TIFF và BMP, mỗi định dạng đều có nhóm thiết lập riêng như chất lượng, nén, bit depth, compatibility hoặc transparency. Bạn có thể xem trước tên file trước khi xuất, giữ thư mục của tài liệu hiện tại làm mặc định hoặc chọn thư mục xuất riêng khi cần.',
                renameTitle: 'Rename',
                renameBody: 'Đổi tên layer hàng loạt bằng những công cụ đơn giản nhưng linh hoạt. Bạn có thể đổi tên các layer đã chọn theo thứ tự số, thêm tiền tố hoặc hậu tố, hoặc xóa và thay thế một đoạn chữ trong nhiều tên layer cùng lúc. Công cụ này được thiết kế để dọn file nhanh và giữ cách đặt tên nhất quán khi làm việc với những bộ layer lớn.',
                sortTitle: 'Sort',
                sortBody: 'Sắp xếp layer theo thứ tự chữ cái để tài liệu luôn gọn gàng và dễ quản lý hơn. Bạn có thể chọn phạm vi sắp xếp như chỉ layer cấp cao nhất, toàn bộ layer theo kiểu đệ quy, hoặc các layer bên trong một group đang chọn, rồi sắp xếp theo chiều A đến Z hoặc Z đến A.'
            }
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
