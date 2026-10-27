(function () {
    'use strict';
    if (!window.sharedI18n || typeof window.sharedI18n.registerTranslations !== 'function') return;

    var vi = {
        donatePage: {
            metaTitle: 'Ủng Hộ & Quyên Góp Sáng Tạo Dự Án | Trần Thắng Minh',
            metaDesc: 'Ủng hộ và tiếp sức cho các dự án sáng tạo nghệ thuật, công cụ phần mềm và tiện ích miễn phí của Trần Thắng Minh qua tài khoản Vietcombank và PayPal.',
            breadcrumbHome: 'Trang Chủ',
            breadcrumbDonate: 'Ủng Hộ',
            heroTag: 'ĐỒNG HÀNH & TIẾP SỨC',
            heroTitle: 'Ủng Hộ Dự Án & Sáng Tạo',
            heroDesc: 'Mọi sự ủng hộ của bạn, dù lớn hay nhỏ, đều là nguồn động lực vô giá giúp tôi tiếp tục duy trì máy chủ, nghiên cứu và phát triển các sản phẩm, phần mềm và tiện ích hoàn toàn miễn phí cho cộng đồng.',
            cards: {
                vietcombank: {
                    badge: 'NỘI ĐỊA (VIỆT NAM)',
                    title: 'Ngân Hàng Vietcombank',
                    subtitle: 'Chuyển khoản nhanh 24/7 qua VietQR',
                    accountHolderLabel: 'Chủ Tài Khoản',
                    accountHolder: 'TRẦN THẮNG MINH',
                    bankLabel: 'Ngân Hàng',
                    bankName: 'TMCP Ngoại thương Việt Nam (Vietcombank)',
                    scanHint: 'Quét mã bằng bất kỳ ứng dụng Ngân hàng hoặc Ví điện tử nào để chuyển khoản tức thì.',
                    downloadBtn: 'Tải Ảnh Mã QR'
                },
                paypal: {
                    badge: 'QUỐC TẾ (INTERNATIONAL)',
                    title: 'Cổng Thanh Toán PayPal',
                    subtitle: 'Dành cho bạn bè & đối tác quốc tế',
                    accountLabel: 'Tài Khoản / Email',
                    serviceLabel: 'Cổng Thanh Toán',
                    scanHint: 'Quét mã bằng ứng dụng PayPal hoặc camera điện thoại để gửi ủng hộ quốc tế.',
                    downloadBtn: 'Tải Ảnh Mã QR'
                }
            },
            thankYou: {
                title: 'Lời Tri Ân Sâu Sắc',
                desc: 'Chân thành cảm ơn sự đồng hành và tấm lòng của bạn dành cho hành trình sáng tạo của Trần Thắng Minh!'
            }
        }
    };

    var en = {
        donatePage: {
            metaTitle: 'Support & Donate Creative Projects | Tran Thang Minh',
            metaDesc: 'Support and empower the creative art projects, software tools, and free utilities developed by Tran Thang Minh via Vietcombank and PayPal.',
            breadcrumbHome: 'Home',
            breadcrumbDonate: 'Donate',
            heroTag: 'SUPPORT & EMPOWER',
            heroTitle: 'Support & Donate Projects',
            heroDesc: 'Every contribution, big or small, is an invaluable encouragement that helps me maintain servers, conduct research, and build free tools, software, and creative artworks for the community.',
            cards: {
                vietcombank: {
                    badge: 'DOMESTIC (VIETNAM)',
                    title: 'Vietcombank Banking',
                    subtitle: 'Instant 24/7 transfer via VietQR',
                    accountHolderLabel: 'Account Holder',
                    accountHolder: 'TRẦN THẮNG MINH',
                    bankLabel: 'Bank Name',
                    bankName: 'Joint Stock Commercial Bank for Foreign Trade of Vietnam (Vietcombank)',
                    scanHint: 'Scan with any banking app or e-wallet for instant fee-free transfer.',
                    downloadBtn: 'Download QR Image'
                },
                paypal: {
                    badge: 'INTERNATIONAL',
                    title: 'PayPal Gateway',
                    subtitle: 'For international friends & supporters',
                    accountLabel: 'Account / Email',
                    serviceLabel: 'Payment Gateway',
                    scanHint: 'Scan with PayPal app or camera to send support internationally.',
                    downloadBtn: 'Download QR Image'
                }
            },
            thankYou: {
                title: 'Heartfelt Appreciation',
                desc: 'Thank you deeply for your kind support and belief in Trần Thắng Minh\'s creative journey!'
            }
        }
    };

    window.sharedI18n.registerTranslations('vi', vi);
    window.sharedI18n.registerTranslations('en', en);
})();
