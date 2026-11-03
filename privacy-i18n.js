(function () {
    'use strict';

    if (!window.sharedI18n || typeof window.sharedI18n.registerTranslations !== 'function') {
        return;
    }

    window.sharedI18n.registerTranslations('vi', {
        privacy: {
            metaTitle: 'Chính Sách Quyền Riêng Tư - Web Apps | Trần Thắng Minh',
            title: 'Chính Sách Quyền Riêng Tư',
            updated: 'Cập nhật lần cuối: 03/11/2026',
            summaryHeading: 'Tóm tắt',
            summary: 'Website và các web app của tôi chạy trực tiếp trên trình duyệt của bạn. Ảnh, mã QR và nội dung bạn nhập được xử lý ngay trên máy bạn, không được tải lên máy chủ nào của tôi. Tôi không dùng cookie quảng cáo và không theo dõi hành vi người dùng.',
            localHeading: 'Dữ liệu lưu trên thiết bị của bạn',
            localIntro: 'Một số thông tin được lưu trong bộ nhớ của trình duyệt (localStorage, IndexedDB) để ứng dụng nhớ lựa chọn của bạn. Những dữ liệu này không rời khỏi máy bạn:',
            localLanguage: 'Ngôn ngữ giao diện bạn đã chọn.',
            localSettings: 'Cài đặt của từng web app (màu, kích thước, kiểu hiển thị...).',
            localHistory: 'Trong QR/Image to Vector: lịch sử tối đa 30 ảnh gần nhất cùng cài đặt của chúng, để bạn mở lại nhanh.',
            localClear: 'Bạn có thể xóa từng mục hoặc toàn bộ lịch sử ngay trong ứng dụng, hoặc xóa dữ liệu trang trong cài đặt trình duyệt.',
            thirdHeading: 'Dịch vụ của bên thứ ba',
            thirdIntro: 'Khi bạn mở trang, trình duyệt gửi yêu cầu đến các dịch vụ sau. Như mọi yêu cầu web, các dịch vụ này nhìn thấy địa chỉ IP và thông tin trình duyệt của bạn:',
            thirdCounter: '<strong>Bộ đếm lượt truy cập</strong> (countapi.mileshilliard.com): mỗi lượt mở một web app sẽ gửi một yêu cầu đếm. Kết quả chỉ là một con số lượt truy cập. Tôi không lưu thông tin cá nhân nào từ yêu cầu này.',
            thirdFonts: '<strong>Google Fonts</strong> (fonts.googleapis.com, fonts.gstatic.com): dùng để tải phông chữ hiển thị.',
            authHeading: 'Đăng nhập tùy chọn',
            auth: 'Một số web app khác (Lucky Wheel, Dice Roller 3D, 52 Cards Tracker) cho phép đăng nhập bằng Google để sao lưu dữ liệu của app đó. Chỉ khi bạn bấm đăng nhập thì mã định danh tài khoản và dữ liệu bạn chọn sao lưu mới được lưu trên Google Firebase. QR/Image to Vector không có chức năng đăng nhập và không gửi dữ liệu của bạn đi đâu.',
            cookieHeading: 'Cookie',
            cookie: 'Mã nguồn của website không tự đặt cookie. Các dịch vụ bên thứ ba nêu trên có thể áp dụng chính sách riêng của họ.',
            rightsHeading: 'Quyền của bạn & liên hệ',
            rights: 'Bạn có thể xóa dữ liệu lưu trên thiết bị bất cứ lúc nào như nêu ở trên. Nếu bạn đã đăng nhập sao lưu và muốn xóa dữ liệu đó, hoặc có bất kỳ câu hỏi nào về quyền riêng tư, hãy liên hệ qua nút Email ở cuối trang.',
            changesHeading: 'Thay đổi chính sách',
            changes: 'Khi website thay đổi cách xử lý dữ liệu, trang này sẽ được cập nhật cùng ngày cập nhật ở đầu trang.'
        }
    });

    window.sharedI18n.registerTranslations('en', {
        privacy: {
            metaTitle: 'Privacy Policy - Web Apps | Trần Thắng Minh',
            title: 'Privacy Policy',
            updated: 'Last updated: November 3, 2026',
            summaryHeading: 'Summary',
            summary: 'This website and my web apps run directly in your browser. Images, QR codes and anything you type are processed on your own device and are never uploaded to any server of mine. I do not use advertising cookies and I do not track user behavior.',
            localHeading: 'Data stored on your device',
            localIntro: 'Some information is kept in your browser storage (localStorage, IndexedDB) so the apps can remember your choices. This data never leaves your device:',
            localLanguage: 'The interface language you picked.',
            localSettings: 'Per-app settings (colors, sizes, display styles...).',
            localHistory: 'In QR/Image to Vector: a history of up to the 30 most recent images with their settings, so you can reopen them quickly.',
            localClear: 'You can delete single entries or the whole history inside the app, or clear site data in your browser settings.',
            thirdHeading: 'Third-party services',
            thirdIntro: 'When you open a page, your browser sends requests to the services below. As with any web request, these services can see your IP address and browser information:',
            thirdCounter: '<strong>Visit counter</strong> (countapi.mileshilliard.com): each time a web app is opened it sends one counting request. The result is only a visit number. I do not store any personal information from this request.',
            thirdFonts: '<strong>Google Fonts</strong> (fonts.googleapis.com, fonts.gstatic.com): used to load the display fonts.',
            authHeading: 'Optional sign-in',
            auth: 'A few other web apps (Lucky Wheel, Dice Roller 3D, 52 Cards Tracker) let you sign in with Google to back up that app\'s data. Only when you choose to sign in are your account identifier and the data you choose to back up stored on Google Firebase. QR/Image to Vector has no sign-in and sends your data nowhere.',
            cookieHeading: 'Cookies',
            cookie: 'The website\'s own code does not set cookies. The third-party services above may apply their own policies.',
            rightsHeading: 'Your rights & contact',
            rights: 'You can delete data stored on your device at any time as described above. If you signed in to back up data and want it deleted, or you have any privacy question, please reach out with the Email button at the bottom of the page.',
            changesHeading: 'Changes to this policy',
            changes: 'When the website changes how it handles data, this page will be updated together with the date at the top.'
        }
    });
})();
