(function () {
    'use strict';

    if (!window.sharedI18n || typeof window.sharedI18n.registerTranslations !== 'function') {
        return;
    }

    var vi = {
        productsCatalog: {
            tags: {
                windowsApp: 'Windows App',
                chromeExtension: 'Chrome Extension',
                ebookPdf: 'Ebook / PDF',
                photoshopPlugin: 'Photoshop Plugin',
                mayaPlugin: 'Maya Plugin',
                cheatEngine: 'Cheat Engine',
                webApp: 'Web App'
            },
            units: {
                downloads: 'lượt tải',
                users: 'người dùng',
                visits: 'lượt truy cập'
            },
            autoclicker: {
                title: 'Auto Clicker by Max v1.0',
                desc: 'Phần mềm Windows tự động click chuột theo tọa độ và kịch bản phím tắt tùy chỉnh, tối ưu thao tác lặp lại với hiệu năng cao và độ trễ cực thấp.',
                downloadTitle: 'Tải về Auto Clicker by Max v1.0 (.exe)',
                downloadAria: 'Tải về Auto Clicker by Max v1.0'
            },
            bookforge: {
                title: 'Book Forge by Max v1.0 (Beta)',
                desc: 'Ứng dụng Windows hỗ trợ bóc tách nội dung sách, tự động chia chương, trích xuất hình ảnh và dàn trang xuất bản sách PDF theo chuẩn in ấn chuyên nghiệp.',
                downloadTitle: 'Tải về Book Forge by Max v1.0 (Beta) (.zip)',
                downloadAria: 'Tải về Book Forge by Max v1.0 (Beta)'
            },
            powerpack: {
                title: 'MAX - Design Power-Pack',
                desc: 'Bộ công cụ toàn diện cho Designer: Color Picker & Studio, Screen Grabber & Video Recorder, và Multimedia Asset Downloader.',
                storeTitle: 'Xem trên Chrome Web Store (46 người dùng)',
                storeAria: 'Xem trên Chrome Web Store - 46 người dùng'
            },
            multichat: {
                title: 'MAX - Multi Chat/AI & Tab Manager',
                desc: 'Tập trung tất cả ứng dụng nhắn tin, đa tài khoản AI và website tùy chỉnh vào một không gian làm việc duy nhất, vượt giới hạn thời gian thực.',
                storeTitle: 'Xem trên Chrome Web Store (6 người dùng)',
                storeAria: 'Xem trên Chrome Web Store - 6 người dùng'
            },
            actorWork1: {
                title: "An Actor's Work - Part 1",
                desc: 'Bản dịch tiếng Việt tác phẩm kinh điển của K. Stanislavski về kỹ thuật diễn xuất và quá trình trải nghiệm tâm lý sáng tạo nhân vật.',
                downloadTitle: "Tải về Ebook PDF - An Actor's Work Part 1",
                downloadAria: "Tải về An Actor's Work Part 1"
            },
            actorWork2: {
                title: "An Actor's Work - Part 2",
                desc: 'Phần 2 tập trung vào kỹ thuật hiện thực hóa hình thể, giọng nói, nhịp điệu và sự hóa thân trọn vẹn vào nhân vật trên sân khấu & điện ảnh.',
                downloadTitle: "Tải về Ebook PDF - An Actor's Work Part 2",
                downloadAria: "Tải về An Actor's Work Part 2"
            },
            photoshopPlugin: {
                title: 'Layer Export, Rename & Sort',
                desc: 'Panel tiện ích tự động hóa quy trình xuất layer hàng loạt, đổi tên thông minh theo số thứ tự và sắp xếp cấu trúc layer chuẩn xác trong Photoshop.',
                downloadTitle: 'Tải về Layer Export, Rename & Sort (.ccx)',
                downloadAria: 'Tải về Layer Export, Rename & Sort'
            },
            mayaPlugin: {
                title: 'Maya Tools',
                desc: 'Bộ script và công cụ hỗ trợ dựng hình 3D, dọn scene tự động, chuẩn hóa tên object và tối ưu hóa luồng làm việc kỹ thuật trong Autodesk Maya.',
                downloadTitle: 'Tải về Maya Tools (.zip)',
                downloadAria: 'Tải về Maya Tools (.zip)'
            },
            cheatEnginePlugin: {
                title: 'My Cheat Tables',
                desc: 'Thư viện 70+ bảng Cheat Table (.CT) tự viết cho các tựa game Steam và PC, hỗ trợ tìm kiếm theo tên game và tải trực tiếp nhanh chóng.'
            },
            luckyWheel: {
                title: 'Lucky Wheel',
                aria: 'Lượt truy cập Lucky Wheel'
            },
            cardsTracker: {
                title: '52 Cards Tracker',
                aria: 'Lượt truy cập 52 Cards Tracker'
            },
            diceRoller: {
                title: 'Dice Roller 3D',
                aria: 'Lượt truy cập Dice Roller 3D'
            }
        }
    };

    var en = {
        productsCatalog: {
            tags: {
                windowsApp: 'Windows App',
                chromeExtension: 'Chrome Extension',
                ebookPdf: 'Ebook / PDF',
                photoshopPlugin: 'Photoshop Plugin',
                mayaPlugin: 'Maya Plugin',
                cheatEngine: 'Cheat Engine',
                webApp: 'Web App'
            },
            units: {
                downloads: 'downloads',
                users: 'users',
                visits: 'visits'
            },
            autoclicker: {
                title: 'Auto Clicker by Max v1.0',
                desc: 'Windows software for automated mouse clicks based on custom coordinates and hotkey macros, optimizing repetitive tasks with high performance and ultra-low latency.',
                downloadTitle: 'Download Auto Clicker by Max v1.0 (.exe)',
                downloadAria: 'Download Auto Clicker by Max v1.0'
            },
            bookforge: {
                title: 'Book Forge by Max v1.0 (Beta)',
                desc: 'Windows application for smart book content parsing, automatic chapter splitting, image extraction, and PDF book typesetting ready for professional printing.',
                downloadTitle: 'Download Book Forge by Max v1.0 (Beta) (.zip)',
                downloadAria: 'Download Book Forge by Max v1.0 (Beta)'
            },
            powerpack: {
                title: 'MAX - Design Power-Pack',
                desc: 'Comprehensive toolkit for Designers: Color Picker & Studio, Screen Grabber & Video Recorder, and Multimedia Asset Downloader.',
                storeTitle: 'View on Chrome Web Store (46 users)',
                storeAria: 'View on Chrome Web Store - 46 users'
            },
            multichat: {
                title: 'MAX - Multi Chat/AI & Tab Manager',
                desc: 'Consolidate all messaging apps, multi-account AI, and custom websites into a single workspace, transcending real-time limits.',
                storeTitle: 'View on Chrome Web Store (6 users)',
                storeAria: 'View on Chrome Web Store - 6 users'
            },
            actorWork1: {
                title: "An Actor's Work - Part 1",
                desc: 'Vietnamese translation of K. Stanislavski’s classic masterpiece on acting technique and the psychological process of character creation.',
                downloadTitle: "Download Ebook PDF - An Actor's Work Part 1",
                downloadAria: "Download An Actor's Work Part 1"
            },
            actorWork2: {
                title: "An Actor's Work - Part 2",
                desc: 'Part 2 focuses on physical character embodiment, vocal training, rhythm, and complete transformation into roles on stage and screen.',
                downloadTitle: "Download Ebook PDF - An Actor's Work Part 2",
                downloadAria: "Download An Actor's Work Part 2"
            },
            photoshopPlugin: {
                title: 'Layer Export, Rename & Sort',
                desc: 'Utility panel automating batch layer export, smart sequential renaming, and accurate layer structuring in Photoshop.',
                downloadTitle: 'Download Layer Export, Rename & Sort (.ccx)',
                downloadAria: 'Download Layer Export, Rename & Sort'
            },
            mayaPlugin: {
                title: 'Maya Tools',
                desc: 'Script and tool collection for 3D modeling, automated scene cleanup, object renaming standardization, and technical workflow optimization in Autodesk Maya.',
                downloadTitle: 'Download Maya Tools (.zip)',
                downloadAria: 'Download Maya Tools (.zip)'
            },
            cheatEnginePlugin: {
                title: 'My Cheat Tables',
                desc: 'Library of 70+ custom-built Cheat Tables (.CT) for Steam and PC games, supporting rapid game search and direct download.'
            },
            luckyWheel: {
                title: 'Lucky Wheel',
                aria: 'Lucky Wheel visits'
            },
            cardsTracker: {
                title: '52 Cards Tracker',
                aria: '52 Cards Tracker visits'
            },
            diceRoller: {
                title: 'Dice Roller 3D',
                aria: 'Dice Roller 3D visits'
            }
        }
    };

    window.sharedI18n.registerTranslations('vi', vi);
    window.sharedI18n.registerTranslations('en', en);
})();
