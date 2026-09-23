(function () {
    'use strict';

    if (!window.sharedI18n || typeof window.sharedI18n.registerTranslations !== 'function') {
        return;
    }

    var vi = {
        autoClicker: {
            docTitle: 'Auto Clicker by Max - Phần Mềm Tự Động Click Chuột & Macro Windows | Trần Thắng Minh',
            breadcrumb: 'Auto Clicker by Max',
            title: 'Auto Clicker by Max v1.1',
            meta: {
                portable: 'Portable',
                dotnet: 'C# .NET 4.0 Native',
                windowsApp: 'Windows App'
            },
            heroDownloadLabel: 'Tải Auto Clicker by Max (.exe)',
            finalDownloadLabel: 'Tải Ngay Auto Clicker by Max (.exe)',
            summary: '<strong>Auto Clicker by Max</strong> là công cụ tự động click chuột &amp; lập trình kịch bản macro mạnh mẽ, siêu nhẹ dành cho Windows. Được viết bằng ngôn ngữ C# .NET tối ưu, ứng dụng khởi chạy tức thì chỉ bằng một cú nhấp đúp mà không cần cài đặt rườm rà. Gồm những tính năng nổi bật:',
            features: {
                freeMouse: '<strong>Free Mouse Mode (Tính năng sát thủ):</strong> Click tự động chạy ngầm theo tọa độ cửa sổ mà không chiếm quyền điều khiển con trỏ chuột vật lý của bạn.',
                humanLike: '<strong>Mô phỏng người thật:</strong> Tùy biến rung lắc tọa độ ngẫu nhiên (Jitter &plusmn;px) và giãn cách thời gian (Interval &plusmn;ms) giúp giảm thiểu tối đa nguy cơ bị hệ thống game phát hiện bot.',
                multiThread: '<strong>Đa luồng kịch bản:</strong> Quản lý nhiều tab kịch bản độc lập và cho phép chạy song song cùng lúc.',
                overlayMap: '<strong>Overlay Map trực quan:</strong> Xem lại được những vị trí được cài đặt trực quan trên màn hình. Thay đổi vị trí nhanh chóng bằng thao tác nắm kéo.',
                targetWindow: '<strong>Khóa mục tiêu (Target Window):</strong> Chọn cửa sổ để bấm, không bị ảnh hưởng dù bị cửa sổ khác đè lên (lưu ý: không được Minimize cửa sổ).',
                runScript: '<strong>Kịch bản lồng kịch bản (Run Script):</strong> Cho phép gọi kịch bản con trong kịch bản lớn. Ví dụ: kịch bản A gồm các lệnh 1, 2, 3, 4, 5; kịch bản B gồm các lệnh 10, 11, 12, gọi kịch bản A, rồi đến 13, 14.',
                moveScale: '<strong>Tịnh tiến &amp; Co giãn hàng loạt (Move &amp; Scale):</strong> Di chuyển các điểm tịnh tiến hoặc co giãn kích thước mà không phải dời thủ công từng điểm.'
            },
            spotlight: {
                simpleCaption: 'Giao diện Simple Mode',
                asianCaption: 'Giao diện Asian Mode'
            },
            privacy: '<strong>Bảo mật &amp; Riêng tư tuyệt đối (100% Local):</strong> Phần mềm chạy hoàn toàn cục bộ trên máy tính của bạn, không gửi yêu cầu qua mạng, không thu thập dữ liệu (no telemetry) và không chứa bất kỳ tracker nào.',
            guide: {
                hotkeysTitle: 'Các Phím Tắt Hệ Thống (Global Hotkeys)',
                hotkeysDesc: 'Điều khiển nhanh các thao tác mọi lúc mọi nơi ngay cả khi đang chơi game hoặc ẩn cửa sổ:',
                thShortcut: 'Phím Tắt',
                thFunction: 'Chức Năng &amp; Lưu Ý',
                hotkeySpace: '<strong>Thêm điểm / bước mới (Add Point / Add Step):</strong> Bắt nhanh tọa độ con trỏ chuột hiện tại. <em>(Lưu ý: Cần click chọn / focus cửa sổ Auto Clicker trước khi nhấn Space).</em>',
                hotkeyF6: '<strong>Bắt đầu / Tạm dừng (START / PAUSE):</strong> Chạy hoặc dừng kịch bản tại tab đang mở (ví dụ: Tab 1 của Simple Mode, hoặc Tab 2 của Asian Mode). <em>(Lưu ý: Cần focus cửa sổ Auto Clicker trước khi START; khi đang chạy thì ở cửa sổ nào click F6 cũng dừng được).</em>',
                hotkeyF7: '<strong>Dừng khẩn cấp (Emergency Stop):</strong> Dừng toàn bộ tất cả kịch bản đang chạy ở mọi tab ngay lập tức.',
                simpleTitle: 'Simple Mode (Cơ Bản &amp; Mì Ăn Liền)',
                simpleDesc: 'Phù hợp cho thao tác nhanh, mì ăn liền với kịch bản đơn giản. Hỗ trợ 2 chế độ Click Mode:',
                simplePointList: '<strong>Point List:</strong> Cài đặt sẵn danh sách các tọa độ điểm (X, Y) và chạy tuần tự theo kịch bản.',
                simpleFollowClick: '<strong>Follow Click:</strong> Spam click liên tục tự do ngay tại vị trí con trỏ chuột của bạn.',
                asianTitle: 'Asian Mode (Engine Macro Kịch Bản Nâng Cao)',
                asianDesc: 'Cho phép tạo kịch bản nâng cao, phức tạp với nhiều nhánh xử lý thông minh. Dưới đây là 11 hành động Macro được hỗ trợ:',
                actions: {
                    act1Desc: 'Thao tác nhấp chuột trái, chuột phải hoặc nhấp đúp chuột với thời gian đè giữ (Hold time) tùy chỉnh.',
                    act2Desc: 'Click hoặc cuộn chuột. Giá trị <code>0</code> là click chuột giữa, <code>&lt; 0</code> là cuộn xuống, <code>&gt; 0</code> là cuộn lên.',
                    act3Desc: 'Click và kéo chuột từ điểm A sang điểm B với chuyển động nội suy tự nhiên.',
                    act4Desc: 'Nhấn phím đơn hoặc tổ hợp phím tắt hệ thống (ví dụ: <code>Ctrl+C</code>, <code>Ctrl+V</code>, <code>Ctrl+Shift+A</code>).',
                    act5Desc: 'Tự động gõ đoạn văn bản hoặc chuỗi ký tự bất kỳ vào ô nhập liệu.',
                    act6Desc: 'Đơn giản chỉ là chờ trễ. Có thể tận dụng bước này để thực hiện thao tác move chuột mà không kích hoạt click.',
                    act7Desc: 'Bạn set màu X là <code>#123456</code>, lệnh sẽ chờ đến lúc màu X xuất hiện trên màn hình mới thực hiện bước tiếp theo.',
                    act8Desc: 'Bạn set màu X tại tọa độ X:Y; lệnh sẽ kiểm tra nếu màu X đang ở trên điểm đó hay không. Đúng thì thực hiện lệnh A, Sai thì thực hiện lệnh B.',
                    act9Desc: 'Tương tự If Color, nhưng cho phép kiểm tra sự xuất hiện của màu mục tiêu trong cả một VÙNG tọa độ.',
                    act10Desc: 'Theo dõi điểm ảnh tại tọa độ X:Y; nếu màu tại điểm đó bị thay đổi so với ban đầu thì sẽ thực hiện lệnh tiếp theo.',
                    act11Desc: 'Cho phép chạy lồng nhiều kịch bản vào nhau. Ví dụ: Kịch bản A gồm các lệnh 1, 2, 3, 4, 5; Kịch bản B gồm lệnh 10, 11, 12, gọi kịch bản A, rồi đến 13, 14.'
                }
            },
            limits: {
                title: 'Cơ Chế &amp; Giới Hạn Kỹ Thuật',
                noticeTitle: '⚠️ Lưu Ý Quan Trọng Về "Free Mouse Mode"',
                noticeDesc1: 'Nếu Auto Clicker không hoạt động trên ứng dụng hoặc game của bạn, <strong>bạn nên thử tắt tính năng Free Mouse Mode</strong>.',
                noticeDesc2: '<strong>Nguyên nhân kỹ thuật:</strong> Nhiều cửa sổ / ứng dụng (đặc biệt là các tựa game sử dụng <em>DirectInput</em>, <em>Raw Input</em> hoặc có phần mềm chống gian lận Anti-Cheat) bắt buộc phải tắt "Free Mouse Mode" mới có thể macro được. Chế độ Free Mouse gửi lệnh click trực tiếp vào hàng đợi thông điệp của cửa sổ (<code>PostMessage</code>), nhưng các game này chỉ chấp nhận tín hiệu click phần cứng thực tế (<code>SendInput</code>).',
                noticeDesc3: 'Đây là <strong>giới hạn kiến trúc hệ điều hành</strong>, không thể khắc phục được ở tầng ứng dụng phổ thông. Nếu muốn vừa macro mà vẫn "Free Mouse Mode" với các ứng dụng bị chặn này, bắt buộc phải phát triển ứng dụng can thiệp chuyên biệt (driver hoặc hook riêng) cho từng app cụ thể.'
            },
            requirements: {
                title: 'Yêu Cầu Hệ Thống &amp; Lưu Ý Khi Mở',
                thComponent: 'Thành phần',
                thRequirement: 'Cấu hình yêu cầu',
                osLabel: 'Hệ Điều Hành',
                osVal: 'Windows 10 / Windows 11 (64-bit khuyên dùng)',
                runtimeLabel: 'Môi trường Runtime',
                runtimeVal: '.NET Framework 4.0 trở lên <em>(Windows 10 và 11 đã tích hợp sẵn)</em>',
                ramLabel: 'Bộ nhớ RAM',
                ramVal: 'Cực nhẹ: chỉ ~20 MB RAM khi hoạt động',
                diskLabel: 'Dung lượng đĩa',
                diskVal: 'Chỉ ~330 KB (1 file thực thi duy nhất, không cần cài đặt)',
                permLabel: 'Quyền hạn',
                permVal: 'Quyền người dùng tiêu chuẩn (Không cần quyền Quản trị viên - Admin)',
                smartScreenTitle: 'ℹ️ Thông báo Windows SmartScreen trong lần mở đầu tiên',
                smartScreenDesc: 'Do phần mềm thực hiện mô phỏng chuột &amp; bàn phím qua các hàm Win32 API cấp hệ thống, Windows Defender SmartScreen có thể hiện cảnh báo <em>"Unknown Publisher"</em>. Bạn chỉ cần nhấn <strong>More info &rarr; Run anyway</strong> để mở. File hoàn toàn sạch sẽ, không mã độc và chạy 100% offline.'
            }
        }
    };

    var en = {
        autoClicker: {
            docTitle: 'Auto Clicker by Max - Windows Mouse Auto Clicker & Macro Automation | Trần Thắng Minh',
            breadcrumb: 'Auto Clicker by Max',
            title: 'Auto Clicker by Max v1.1',
            meta: {
                portable: 'Portable',
                dotnet: 'C# .NET 4.0 Native',
                windowsApp: 'Windows App'
            },
            heroDownloadLabel: 'Download Auto Clicker by Max (.exe)',
            finalDownloadLabel: 'Download Auto Clicker by Max (.exe) Now',
            summary: '<strong>Auto Clicker by Max</strong> is a powerful, lightweight mouse auto-clicker and macro automation tool for Windows. Written in optimized native C# .NET, it launches instantly with a double-click without any cumbersome installation. Key features include:',
            features: {
                freeMouse: '<strong>Free Mouse Mode (Killer Feature):</strong> Runs automated background clicks using window coordinates without taking control of your physical mouse cursor.',
                humanLike: '<strong>Human-Like Simulation:</strong> Customizable randomized coordinate jitter (Jitter &plusmn;px) and timing variance (Interval &plusmn;ms) to minimize the risk of bot detection by game systems.',
                multiThread: '<strong>Multi-Threaded Scripting:</strong> Manage multiple independent script tabs and run them simultaneously in parallel.',
                overlayMap: '<strong>Visual Overlay Map:</strong> Visually review configured click points directly on your screen. Reposition points quickly with drag-and-drop.',
                targetWindow: '<strong>Target Window Lock:</strong> Bind to a specific target window, unaffected even when overlaid by other windows (Note: the target window must not be minimized).',
                runScript: '<strong>Nested Script Execution (Run Script):</strong> Call sub-scripts from within a master script. For example: Script A contains actions 1, 2, 3, 4, 5; Script B runs actions 10, 11, 12, calls Script A, and continues with 13, 14.',
                moveScale: '<strong>Batch Translate &amp; Scale (Move &amp; Scale):</strong> Shift or scale coordinates in bulk across multiple points without moving each point manually.'
            },
            spotlight: {
                simpleCaption: 'Simple Mode Interface',
                asianCaption: 'Asian Mode Interface'
            },
            privacy: '<strong>100% Local Privacy &amp; Security:</strong> The software runs entirely offline on your computer, sends zero network requests, collects no telemetry, and contains no trackers whatsoever.',
            guide: {
                hotkeysTitle: 'Global Hotkeys',
                hotkeysDesc: 'Quickly control operations anytime, anywhere even while gaming or when the window is hidden:',
                thShortcut: 'Shortcut',
                thFunction: 'Function &amp; Notes',
                hotkeySpace: '<strong>Add Point / Add Step:</strong> Quickly captures the current mouse cursor coordinates. <em>(Note: Click to focus the Auto Clicker window before pressing Space).</em>',
                hotkeyF6: '<strong>START / PAUSE:</strong> Starts or stops the script in the active tab (e.g., Tab 1 in Simple Mode, or Tab 2 in Asian Mode). <em>(Note: Focus the Auto Clicker window before pressing START; while running, pressing F6 from any window will pause execution).</em>',
                hotkeyF7: '<strong>Emergency Stop:</strong> Immediately terminates all running scripts across all tabs.',
                simpleTitle: 'Simple Mode (Basic &amp; Quick Setup)',
                simpleDesc: 'Ideal for quick, straightforward tasks with simple automation. Supports 2 Click Modes:',
                simplePointList: '<strong>Point List:</strong> Pre-configure a list of coordinate points (X, Y) to execute sequentially.',
                simpleFollowClick: '<strong>Follow Click:</strong> Continuously spam clicks wherever your physical mouse cursor is positioned.',
                asianTitle: 'Asian Mode (Advanced Macro Engine)',
                asianDesc: 'Enables complex, multi-branch macro scripting with intelligent conditions. 11 supported macro actions:',
                actions: {
                    act1Desc: 'Left-click, right-click, or double-click with customizable hold duration.',
                    act2Desc: 'Mouse click or wheel scroll. Value <code>0</code> triggers middle click, <code>&lt; 0</code> scrolls down, and <code>&gt; 0</code> scrolls up.',
                    act3Desc: 'Click and drag from point A to point B with smooth natural motion interpolation.',
                    act4Desc: 'Simulate single keypresses or system shortcut combinations (e.g., <code>Ctrl+C</code>, <code>Ctrl+V</code>, <code>Ctrl+Shift+A</code>).',
                    act5Desc: 'Automatically type any text string or characters into the active input field.',
                    act6Desc: 'A timed wait interval. Can also be used to perform cursor repositioning without triggering clicks.',
                    act7Desc: 'Define color X (e.g. <code>#123456</code>); execution pauses until color X appears on screen before proceeding.',
                    act8Desc: 'Checks if target color X matches at coordinates X:Y. Executes Action A if matched, or Action B if not.',
                    act9Desc: 'Similar to If Color, but scans for the target color across an entire coordinate REGION.',
                    act10Desc: 'Monitors the pixel at coordinates X:Y; triggers the next action as soon as the pixel color changes from its initial state.',
                    act11Desc: 'Enables nested script execution. For example: Script A has steps 1, 2, 3, 4, 5; Script B runs 10, 11, 12, calls Script A, then proceeds to 13, 14.'
                }
            },
            limits: {
                title: 'Technical Mechanisms &amp; Limits',
                noticeTitle: '⚠️ Important Note Regarding "Free Mouse Mode"',
                noticeDesc1: 'If Auto Clicker is not responding in your application or game, <strong>try disabling the Free Mouse Mode feature</strong>.',
                noticeDesc2: '<strong>Technical Explanation:</strong> Many windows and applications (particularly games utilizing <em>DirectInput</em>, <em>Raw Input</em>, or protected by Anti-Cheat systems) require "Free Mouse Mode" to be disabled to accept macros. Free Mouse sends clicks directly to the window\'s message queue (<code>PostMessage</code>), whereas these games only accept low-level physical hardware events (<code>SendInput</code>).',
                noticeDesc3: 'This is an <strong>operating system architectural constraint</strong> that cannot be bypassed at standard user-space level. Running background automation alongside "Free Mouse Mode" on such protected software would require custom kernel-mode drivers or dedicated hooks tailored to each specific app.'
            },
            requirements: {
                title: 'System Requirements &amp; Launch Guide',
                thComponent: 'Component',
                thRequirement: 'Requirement',
                osLabel: 'Operating System',
                osVal: 'Windows 10 / Windows 11 (64-bit recommended)',
                runtimeLabel: 'Runtime Environment',
                runtimeVal: '.NET Framework 4.0 or higher <em>(Pre-installed on Windows 10 &amp; 11)</em>',
                ramLabel: 'Memory (RAM)',
                ramVal: 'Ultra-lightweight: ~20 MB RAM during operation',
                diskLabel: 'Disk Space',
                diskVal: 'Only ~330 KB (Single portable executable, zero installation)',
                permLabel: 'Permissions',
                permVal: 'Standard user privileges (No Administrator rights required)',
                smartScreenTitle: 'ℹ️ Windows SmartScreen notice on first launch',
                smartScreenDesc: 'Because the application simulates mouse and keyboard input using low-level Win32 APIs, Windows Defender SmartScreen may display an <em>"Unknown Publisher"</em> prompt. Simply click <strong>More info &rarr; Run anyway</strong> to launch. The executable is 100% clean, virus-free, and runs completely offline.'
            }
        }
    };

    window.sharedI18n.registerTranslations('vi', vi);
    window.sharedI18n.registerTranslations('en', en);
})();
