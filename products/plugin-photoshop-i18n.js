(function () {
    'use strict';

    if (!window.sharedI18n || typeof window.sharedI18n.registerTranslations !== 'function') {
        return;
    }

    var vi = {
        photoshopPlugin: {
            breadcrumb: 'Photoshop',
            title: 'Layer Export, Rename & Sort',
            badge: 'Photoshop Plugin',
            summary: 'Panel tiện ích cho Photoshop giúp xử lý hình ảnh và layer hàng loạt, đẩy nhanh khâu chỉnh sửa, xuất file và chuẩn hóa file cho các đầu việc thiết kế thực tế.',
            f1: 'Tự động hóa các bước chỉnh sửa lặp lại và xuất nhiều phiên bản nhanh hơn.',
            f2: 'Chuẩn hóa tên layer, kích thước file và định dạng đầu ra cho từng mục đích sử dụng.',
            f3: 'Giảm thời gian thao tác tay để tập trung nhiều hơn vào bố cục và chất lượng hình ảnh.',
            previewLabel: 'Xem trước',
            overviewTitle: 'Tổng Quan Sản Phẩm',
            overviewBody: 'Layer Export, Rename & Sort là một panel tiện ích cho Photoshop được tạo ra để tăng tốc các quy trình lặp đi lặp lại với layer. Công cụ này giúp xuất các layer đã chọn thành nhiều định dạng file, đổi tên layer hàng loạt và sắp xếp layer theo tên mà vẫn giữ nhịp làm việc liền mạch trong Photoshop.',
            exportTitle: 'Export',
            exportBody: 'Xuất các layer đã chọn thành từng file riêng theo tên layer, đồng thời có thể thêm tiền tố hoặc hậu tố để việc đặt tên gọn gàng hơn. Phần Export hỗ trợ JPG, PNG, WebP, PSD, TIFF và BMP, mỗi định dạng đều có nhóm thiết lập riêng như chất lượng, nén, bit depth, compatibility hoặc transparency. Bạn có thể xem trước tên file trước khi xuất, giữ thư mục của tài liệu hiện tại làm mặc định hoặc chọn thư mục xuất riêng khi cần.',
            renameTitle: 'Rename',
            renameBody: 'Đổi tên layer hàng loạt bằng những công cụ đơn giản nhưng linh hoạt. Bạn có thể đổi tên các layer đã chọn theo thứ tự số, thêm tiền tố hoặc hậu tố, hoặc xóa và thay thế một đoạn chữ trong nhiều tên layer cùng lúc. Công cụ này được thiết kế để dọn file nhanh và giữ cách đặt tên nhất quán khi làm việc với những bộ layer lớn.',
            sortTitle: 'Sort',
            sortBody: 'Sắp xếp layer theo thứ tự chữ cái để tài liệu luôn gọn gàng và dễ quản lý hơn. Bạn có thể chọn phạm vi sắp xếp như chỉ layer cấp cao nhất, toàn bộ layer theo kiểu đệ quy, hoặc các layer bên trong một group đang chọn, rồi sắp xếp theo chiều A đến Z hoặc Z đến A.',
            downloadLabel: 'Tải Xuống .CCX',
            downloadUnit: 'lượt tải',
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
            openStep3: 'Mở Layer Export, Rename & Sort.'
        }
    };

    var en = {
        photoshopPlugin: {
            breadcrumb: 'Photoshop',
            title: 'Layer Export, Rename & Sort',
            badge: 'Photoshop Plugin',
            summary: 'A Photoshop utility panel designed for batch image and layer operations, accelerating editing, asset export, and file standardization for real-world design workflows.',
            f1: 'Automates repetitive editing steps and accelerates multi-version asset exports.',
            f2: 'Standardizes layer naming, file dimensions, and output formats for diverse use cases.',
            f3: 'Reduces manual mouse operations so you can focus more on composition and image quality.',
            previewLabel: 'Preview',
            overviewTitle: 'Product Overview',
            overviewBody: 'Layer Export, Rename & Sort is a Photoshop utility panel built to speed up repetitive layer workflows. It helps you export selected layers into multiple file formats, rename layers in bulk, and sort layers by name without breaking your flow inside Photoshop.',
            exportTitle: 'Export',
            exportBody: 'Export selected layers as individual files using their layer names, with optional prefix and suffix controls for cleaner naming. The Export section supports JPG, PNG, WebP, PSD, TIFF, and BMP, each with its own format settings such as quality, compression, bit depth, compatibility, or transparency options. You can preview the output names before exporting, keep the current document folder as the default location, or choose a custom export folder when needed.',
            renameTitle: 'Rename',
            renameBody: 'Rename layers in bulk with simple but flexible tools. You can rename selected layers with sequential numbering, add a prefix or suffix, or remove and replace text across multiple layer names at once. It is designed for fast cleanup and consistent naming when working with large layer sets.',
            sortTitle: 'Sort',
            sortBody: 'Sort layers alphabetically to keep your document organized and easier to manage. You can choose different sorting scopes, such as top-level layers, all layers recursively, or layers inside a selected group, and then sort them in either A to Z or Z to A order.',
            downloadLabel: 'Download .CCX',
            downloadUnit: 'downloads',
            installationTitle: 'Installation Guide',
            installationIntro: 'This plugin requires Adobe Photoshop 23.3 or later.',
            installationPathNote: 'To avoid installation errors, place the .ccx file in a short local path before installing. Recommended example: D:\\com.max.layerxrs_PS.ccx. Avoid installing from very long folder paths, cloud-synced folders, or external locations.',
            installStepsTitle: 'To install',
            installStep1: 'Double-click the .ccx file.',
            installStep2: 'Adobe Creative Cloud Desktop will open and install the plugin.',
            installStep3: 'Restart Photoshop if needed.',
            openStepsTitle: 'To open the tool in Photoshop',
            openStep1: 'Open Photoshop.',
            openStep2: 'Go to Plugins.',
            openStep3: 'Open Layer Export, Rename & Sort.'
        }
    };

    window.sharedI18n.registerTranslations('vi', vi);
    window.sharedI18n.registerTranslations('en', en);
})();
