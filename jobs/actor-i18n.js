(function () {
    'use strict';

    if (!window.sharedI18n || typeof window.sharedI18n.registerTranslations !== 'function') {
        return;
    }

    // Từ điển Tiếng Việt (Bảo toàn 100% nguyên bản)
    window.sharedI18n.registerTranslations('vi', {
        actorPage: {
            breadcrumb: 'Diễn Viên',
            hero: {
                badge: 'DIỄN VIÊN / ACTOR',
                name: 'TRẦN THẮNG MINH',
                metrics: {
                    heightLabel: 'Chiều cao',
                    weightLabel: 'Cân nặng',
                    measurementsLabel: 'Số đo 3 vòng'
                }
            },
            basicInfo: {
                title: 'Thông tin cơ bản',
                dobLabel: 'Ngày sinh:',
                phoneLabel: 'SDT:',
                phoneShow: 'Hiển thị',
                skillsLabel: 'Năng Khiếu:',
                skillsValue: 'Võ Thuật, Hát, Vẽ'
            },
            trainingSummary: {
                title: 'Quá trình Rèn luyện',
                item1: 'Tham gia trong <strong>MV Trộm Vía</strong> của ca sĩ Vũ Thùy Linh.',
                item2: 'Tham gia dự án <strong>NPC game logic</strong> của công ty Chấn Hải Media.',
                item3: 'Các vở đang diễn ở Sân khấu: <strong>Cô Năm Cậu Mười</strong>, <strong>Ai Kế Tiếp</strong>, <strong>Thương Thì Thương Thế Thôi</strong>, <strong>Bỉ Vỏ</strong>.',
                item4: '<strong>Độc thoại Trần Ích Tắc</strong> (lịch sử Việt Nam).',
                item5: 'Adhya trong vở <strong>Quyền Lực và Tình Yêu</strong> (Sử thi Ramayana).',
                item6: 'Willy trong vở <strong>Cái Chết Của Một Người Bán Hàng</strong> (tác giả Arthur Miller).',
                item7: 'Nguyệt Đình trong vở <strong>Nhật Xuất</strong> (tác giả Tào Ngu).',
                viewDetails: 'Xem chi tiết các vai diễn &amp; video &darr;'
            },
            studySummary: {
                title: 'Quá trình học tập',
                item1: {
                    label: 'Lớp Cơ bản (K16)',
                    value: '<strong>NSND Hồng Vân</strong>, cô <strong>Trần Bảo Châu</strong>, thầy <strong>Lê Nguyễn Tuấn Anh</strong> giảng dạy.'
                },
                item2: {
                    label: 'Lớp Nâng Cao (NC4.2)',
                    value: '<strong>Thầy Vũ Xuân Trang</strong> &amp; <strong>Cô Nguyễn Lê Hoàng Thy</strong> giảng dạy.'
                },
                item3: {
                    label: 'Lớp Nâng Cao Chuyên Sâu (NCCS1)',
                    value: '<strong>Thầy Nguyễn Hữu Châu</strong> giảng dạy.'
                },
                viewDetails: 'Xem chi tiết quá trình học tập &darr;'
            },
            gallery: {
                featuredAlt: 'Trần Thắng Minh - Diễn viên',
                ariaLabel: 'Bộ sưu tập ảnh chân dung diễn viên'
            },
            timelineTraining: {
                title: 'Quá Trình Rèn Luyện &amp; Tác Phẩm',
                t202601: 'Tham gia trong <strong>MV Trộm Vía</strong> của ca sĩ Vũ Thùy Linh.',
                t202601VideoAria: 'Xem MV Trộm Vía trên YouTube',
                t202601PreviewAlt: 'Preview YouTube - MV Trộm Vía',
                t202408: 'Tham gia dự án <strong>NPC game logic</strong> của công ty Chấn Hải Media.',
                t202408Video1Aria: 'Xem video NPC game logic clip 1 trên YouTube',
                t202408Preview1Alt: 'Preview YouTube - NPC game logic clip 1',
                t202408Video2Aria: 'Xem video NPC game logic clip 2 trên YouTube',
                t202408Preview2Alt: 'Preview YouTube - NPC game logic clip 2',
                t202403: '<strong>Độc thoại vai Trần Ích Tắc</strong> - Giảng viên Thầy Nguyễn Hữu Châu.',
                t202401: 'Vai <strong>cảnh sát Thắng</strong> vở <strong>Ai Kế Tiếp</strong> - Đạo diễn N.I.B.',
                t202310: 'Vai <strong>Thám Tử</strong> vở <strong>Bỉ Vỏ</strong> - Đạo diễn Cố NSND Doãn Hoàng Giang và NSND Hồng Vân.',
                t202309: 'Vai <strong>Willy</strong> vở <strong>Cái Chết Người Chào Hàng</strong> - Đạo diễn NSƯT Vũ Xuân Trang.',
                t202308: 'Vai <strong>Chiến sĩ</strong> vở thi ở Hà Nội - Đạo diễn NSƯT Vũ Xuân Trang.',
                t202210: 'Vai <strong>Nguyệt Đình</strong> vở <strong>Nhật Xuất</strong> - Đạo diễn NSƯT Vũ Xuân Trang.',
                t202205: 'Vai <strong>Búp Bê</strong> vở kịch <strong>Xóm Lầy</strong> - Đạo diễn Lê Nguyễn Tuấn Anh.',
                t202204: 'Vai <strong>Phạm Công</strong> vở <strong>Nỗi Lòng Tào Thị</strong>, vai <strong>ông Dương</strong> vở <strong>Tía Ơi</strong> - Đạo diễn Lê Nguyễn Tuấn Anh.'
            },
            timelineStudy: {
                title: 'Quá Trình Học Tập &amp; Đào Tạo',
                s202404: 'Tốt nghiệp lớp <strong>Nâng Cao Chuyên Sâu</strong>.',
                s202303: 'Bắt đầu học lớp <strong>Nâng Cao Chuyên Sâu (NCCS1)</strong> tại Sân Khấu kịch Hồng Vân.',
                s202211: 'Tốt nghiệp lớp <strong>Nâng Cao (NC4.2)</strong>.',
                s202206: 'Bắt đầu học lớp <strong>Nâng Cao (NC4.2)</strong> tại Sân Khấu kịch Hồng Vân.',
                s202204: 'Hoàn thành HK3, tốt nghiệp lớp <strong>K16 Cơ bản</strong>.',
                s202009: 'Hoàn thành HK1 lớp <strong>K16 Cơ bản</strong>.',
                s202006: 'Tham diễn webdrama <strong>Đại Kê Chạy Đi 2</strong>.',
                s202005: 'Khai giảng lớp <strong>K16 Cơ bản</strong>, vào học tại Sân khấu kịch Hồng Vân.'
            }
        }
    });

    // Từ điển Tiếng Anh (Biên dịch chuẩn xác, chuyên nghiệp)
    window.sharedI18n.registerTranslations('en', {
        actorPage: {
            breadcrumb: 'Actor',
            hero: {
                badge: 'ACTOR / PERFORMER',
                name: 'TRẦN THẮNG MINH',
                metrics: {
                    heightLabel: 'Height',
                    weightLabel: 'Weight',
                    measurementsLabel: 'Measurements'
                }
            },
            basicInfo: {
                title: 'Basic Information',
                dobLabel: 'Date of Birth:',
                phoneLabel: 'Phone:',
                phoneShow: 'Show',
                skillsLabel: 'Special Skills:',
                skillsValue: 'Martial Arts, Singing, Drawing'
            },
            trainingSummary: {
                title: 'Acting Experience',
                item1: 'Featured in the music video <strong>Trộm Vía</strong> by singer Vũ Thùy Linh.',
                item2: 'Participated in the <strong>NPC game logic</strong> project by Chấn Hải Media.',
                item3: 'Current stage plays: <strong>Cô Năm Cậu Mười</strong>, <strong>Ai Kế Tiếp</strong>, <strong>Thương Thì Thương Thế Thôi</strong>, <strong>Bỉ Vỏ</strong>.',
                item4: '<strong>Monologue: Trần Ích Tắc</strong> (Vietnamese historical drama).',
                item5: 'Adhya in the play <strong>Power and Love</strong> (Ramayana Epic).',
                item6: 'Willy in the play <strong>Death of a Salesman</strong> (by Arthur Miller).',
                item7: 'Nguyệt Đình in the play <strong>Sunrise</strong> (by Cao Yu).',
                viewDetails: 'View detailed roles &amp; videos &darr;'
            },
            studySummary: {
                title: 'Education &amp; Training',
                item1: {
                    label: 'Foundation Class (K16)',
                    value: 'Taught by <strong>People\'s Artist Hồng Vân</strong>, Ms. <strong>Trần Bảo Châu</strong>, and Mr. <strong>Lê Nguyễn Tuấn Anh</strong>.'
                },
                item2: {
                    label: 'Advanced Class (NC4.2)',
                    value: 'Taught by <strong>Mr. Vũ Xuân Trang</strong> &amp; <strong>Ms. Nguyễn Lê Hoàng Thy</strong>.'
                },
                item3: {
                    label: 'Master Intensive Class (NCCS1)',
                    value: 'Taught by <strong>Mr. Nguyễn Hữu Châu</strong>.'
                },
                viewDetails: 'View detailed education timeline &darr;'
            },
            gallery: {
                featuredAlt: 'Trần Thắng Minh - Actor',
                ariaLabel: 'Actor portrait photo collection'
            },
            timelineTraining: {
                title: 'Acting Experience &amp; Works',
                t202601: 'Featured in the music video <strong>Trộm Vía</strong> by singer Vũ Thùy Linh.',
                t202601VideoAria: 'Watch Trộm Vía MV on YouTube',
                t202601PreviewAlt: 'YouTube Preview - MV Trộm Vía',
                t202408: 'Participated in the <strong>NPC game logic</strong> project by Chấn Hải Media.',
                t202408Video1Aria: 'Watch NPC game logic clip 1 on YouTube',
                t202408Preview1Alt: 'YouTube Preview - NPC game logic clip 1',
                t202408Video2Aria: 'Watch NPC game logic clip 2 on YouTube',
                t202408Preview2Alt: 'YouTube Preview - NPC game logic clip 2',
                t202403: '<strong>Monologue role of Trần Ích Tắc</strong> - Instructed by Mr. Nguyễn Hữu Châu.',
                t202401: 'Role of <strong>Police Officer Thắng</strong> in <strong>Ai Kế Tiếp</strong> - Directed by N.I.B.',
                t202310: 'Role of <strong>Detective</strong> in <strong>Bỉ Vỏ</strong> - Directed by Late People\'s Artist Doãn Hoàng Giang and People\'s Artist Hồng Vân.',
                t202309: 'Role of <strong>Willy</strong> in <strong>Death of a Salesman</strong> - Directed by Merited Artist Vũ Xuân Trang.',
                t202308: 'Role of <strong>Soldier</strong> in Hanoi competition play - Directed by Merited Artist Vũ Xuân Trang.',
                t202210: 'Role of <strong>Nguyệt Đình</strong> in <strong>Sunrise</strong> - Directed by Merited Artist Vũ Xuân Trang.',
                t202205: 'Role of <strong>Búp Bê</strong> in play <strong>Xóm Lầy</strong> - Directed by Lê Nguyễn Tuấn Anh.',
                t202204: 'Role of <strong>Phạm Công</strong> in <strong>Nỗi Lòng Tào Thị</strong>, role of <strong>Mr. Dương</strong> in <strong>Tía Ơi</strong> - Directed by Lê Nguyễn Tuấn Anh.'
            },
            timelineStudy: {
                title: 'Education &amp; Training Timeline',
                s202404: 'Graduated from the <strong>Master Intensive Class</strong>.',
                s202303: 'Enrolled in the <strong>Master Intensive Class (NCCS1)</strong> at Hồng Vân Drama Theatre.',
                s202211: 'Graduated from the <strong>Advanced Class (NC4.2)</strong>.',
                s202206: 'Enrolled in the <strong>Advanced Class (NC4.2)</strong> at Hồng Vân Drama Theatre.',
                s202204: 'Completed Term 3, graduated from the <strong>Foundation Class (K16)</strong>.',
                s202009: 'Completed Term 1 of the <strong>Foundation Class (K16)</strong>.',
                s202006: 'Participated in the web drama <strong>Đại Kê Chạy Đi 2</strong>.',
                s202005: 'Commencement of the <strong>Foundation Class (K16)</strong>, studied at Hồng Vân Drama Theatre.'
            }
        }
    });
})();
