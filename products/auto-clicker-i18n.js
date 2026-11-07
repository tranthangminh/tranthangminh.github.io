(function () {
    'use strict';

    if (!window.sharedI18n || typeof window.sharedI18n.registerTranslations !== 'function') {
        return;
    }

    var vi = {
        autoClicker: {
            docTitle: 'Auto Clicker by Max - Phần Mềm Tự Động Click Chuột & Macro Windows | Trần Thắng Minh',
            breadcrumb: 'Auto Clicker by Max',
            title: 'Auto Clicker by Max v1.1.4',
            meta: {
                fileSize: '~1 MB',
                portable: 'Portable',
                dotnet: 'C# .NET Framework 4.x',
                windowsApp: 'Windows App'
            },
            heroDownloadLabel: 'Tải Auto Clicker by Max (.exe)',
            finalDownloadLabel: 'Tải Ngay Auto Clicker by Max (.exe)',
            summary: '<strong>Auto Clicker by Max</strong> là công cụ tự động click chuột &amp; lập trình kịch bản macro mạnh mẽ, siêu nhẹ dành cho Windows. Được viết bằng ngôn ngữ C# .NET tối ưu, ứng dụng khởi chạy tức thì chỉ bằng một cú nhấp đúp mà không cần cài đặt rườm rà. Gồm những tính năng nổi bật:',
            features: {
                freeMouse: '<strong>Chuột Tự Do (Free Mouse Mode):</strong> Click tự động chạy ngầm theo tọa độ cửa sổ mà không chiếm quyền điều khiển con trỏ chuột vật lý của bạn.',
                humanLike: '<strong>Mô phỏng người thật:</strong> Tùy biến rung lắc tọa độ ngẫu nhiên (Jitter &plusmn;px) và giãn cách thời gian (Interval &plusmn;ms) giúp giảm thiểu tối đa nguy cơ bị hệ thống game phát hiện bot.',
                recorder: '<strong>Ghi thao tác:</strong> Bấm Record rồi thao tác như bình thường, app tự tạo các bước Click, Double Click, Kéo &amp; Thả, Nhấn Phím, Gõ Văn Bản và Nhấn &amp; Click.',
                multiThread: '<strong>Đa luồng kịch bản:</strong> Quản lý nhiều tab kịch bản độc lập và cho phép chạy song song cùng lúc.',
                overlayMap: '<strong>Overlay Map trực quan:</strong> Xem lại được những vị trí được cài đặt trực quan trên màn hình. Thay đổi vị trí nhanh chóng bằng thao tác nắm kéo.',
                targetWindow: '<strong>Khóa mục tiêu:</strong> Chọn cửa sổ để bấm, không bị ảnh hưởng dù bị cửa sổ khác đè lên. Mở thêm cửa sổ cùng app cũng không click nhầm. Nếu cửa sổ bị tắt hoặc thu nhỏ, tab đó tự dừng và báo rõ, không click sai chỗ.',
                runScript: '<strong>Kịch bản lồng kịch bản:</strong> Cho phép gọi kịch bản con trong kịch bản lớn. Ví dụ: kịch bản A gồm các lệnh 1, 2, 3, 4, 5; kịch bản B gồm các lệnh 10, 11, 12, gọi kịch bản A, rồi đến 13, 14.',
                moveScale: '<strong>Tịnh tiến &amp; Co giãn hàng loạt:</strong> Di chuyển các điểm tịnh tiến hoặc co giãn kích thước mà không phải dời thủ công từng điểm.',
                imageRecognition: '<strong>Nhận diện hình ảnh:</strong> Tự động quét và tìm hình ảnh mục tiêu trên màn hình hoặc trong cửa sổ để click chính xác vào tâm ảnh.',
                batchOps: '<strong>Thao tác hàng loạt:</strong> Nhấp vào tiêu đề các cột trong bảng kịch bản để áp dụng thông số (đổi hành động, đổi cửa sổ, đổi tọa độ, nhập Hold/Delay/Repeat) cho toàn bộ các dòng cùng lúc.',
                specialAdapters: '<strong>Tương thích ứng dụng đặc thù:</strong> Tối ưu hóa click ngầm cho giả lập Android (BlueStacks, Google Play Games), trình duyệt, Discord, Slack, File Explorer, Desktop và Taskbar.',
                interfaceOptions: '<strong>Song ngữ &amp; Sáng/Tối:</strong> Chuyển Anh - Việt và đổi giao diện Sáng/Tối ngay trên thanh tiêu đề.'
            },
            spotlight: {
                simpleCaption: 'Giao diện Simple Mode',
                asianCaption: 'Giao diện Asian Mode'
            },
            privacy: '<strong>Bảo mật &amp; Riêng tư:</strong> Kịch bản và cài đặt chỉ lưu trên máy tính của bạn. Kết nối mạng duy nhất là kiểm tra phiên bản mới trên website này, tự động tối đa 1 lần mỗi ngày hoặc khi bạn bấm kiểm tra, và không gửi dữ liệu của bạn đi. Phần mềm không thu thập dữ liệu và không chứa tracker.',
            guide: {
                hotkeysTitle: 'Phím Tắt Hệ Thống &amp; Mẹo Chung',
                hotkeysDesc: 'F6 và F7 dùng được cả khi bạn đang ở cửa sổ khác. Nếu app khác đã chiếm một trong hai phím này, Auto Clicker sẽ báo khi mở, các nút Start và Stop trong app vẫn dùng được.',
                thShortcut: 'Phím Tắt',
                thFunction: 'Chức Năng &amp; Lưu Ý',
                hotkeySpace: '<strong>Thêm điểm / bước mới:</strong> Bắt nhanh tọa độ con trỏ chuột hiện tại. <em>(Lưu ý: Cần click chọn / focus cửa sổ Auto Clicker trước khi nhấn Space).</em>',
                hotkeyF6: '<strong>Bắt đầu / Dừng:</strong> Chạy hoặc dừng kịch bản tại tab đang mở (ví dụ: Tab 1 của Simple Mode, hoặc Tab 2 của Asian Mode), từ cửa sổ nào cũng được. <em>(Lưu ý: Khi popup của app đang mở, F6 chỉ dừng được chứ không bắt đầu; khi đang ghi thao tác, F6 sẽ dừng ghi).</em>',
                hotkeyF7: '<strong>Dừng khẩn cấp:</strong> Dừng toàn bộ tất cả kịch bản đang chạy ở mọi tab ngay lập tức.',
                params: {
                    loopBadge: '0 = ∞',
                    loopName: 'Vòng Lặp Kịch Bản',
                    loopDesc: 'Mặc định là <code>0</code> để chạy vô hạn (Infinite). Nhập số cụ thể (ví dụ: <code>10</code>, <code>50</code>) để phần mềm tự động dừng sau đủ số chu kỳ.',
                    jitterBadge: '± px',
                    jitterName: 'Rung Lắc Tọa Độ',
                    jitterDesc: 'Tạo sai số ngẫu nhiên ±px xung quanh tọa độ click (ví dụ: <code>2</code> - <code>3</code> px). Giúp click tự nhiên như tay người thật, tránh bị game / Anti-cheat bắt bot.',
                    intervalBadge: '± ms',
                    intervalName: 'Biến Thiên Giãn Cách',
                    intervalDesc: 'Tự động cộng/trừ ngẫu nhiên ±ms vào thời gian nghỉ giữa các bước (ví dụ: delay 250ms với Interval ±20ms sẽ dao động 230ms - 270ms), phá vỡ nhịp click máy móc.',
                    speedBadge: '100%',
                    speedName: 'Tốc Độ Script',
                    speedDesc: 'Tăng tốc hoặc làm chậm toàn bộ kịch bản theo tỷ lệ phần trăm (10% - 2000%), tự động co giãn thời gian delay và hold time tương ứng mà không cần chỉnh từng bước.'
                },
                utilities: {
                    windowOnTop: '<strong>Ghim lên đầu:</strong> Ghim cửa sổ Auto Clicker luôn nổi trên cùng mọi ứng dụng để tiện quan sát và điều khiển.',
                    freeMouse: '<strong>Chuột Tự Do:</strong> Cho phép Auto Clicker thao tác chạy nền trên cửa sổ đích mà không chiếm dụng chuột vật lý của bạn.',
                    showMap: '<strong>Hiện Map:</strong> Bật bản đồ hiển thị các điểm click phát sáng trên màn hình; có thể dùng chuột nắm kéo dời tọa độ điểm trực tiếp.',
                    smoothMouse: '<strong>Di chuột mượt:</strong> Di chuyển con trỏ chuột lướt mượt mà có nội suy giữa các điểm thay vì dịch chuyển tức thời.'
                },
                simpleTitle: 'Simple Mode (Cơ Bản &amp; Mì Ăn Liền)',
                simpleDesc: 'Phù hợp cho thao tác nhanh, mì ăn liền với kịch bản đơn giản. Hỗ trợ 2 chế độ Click Mode:',
                simplePointList: '<strong>Point List:</strong> Cài đặt sẵn danh sách các tọa độ điểm (X, Y) và chạy tuần tự theo kịch bản.',
                simpleFollowClick: '<strong>Follow Cursor:</strong> Click liên tục ngay tại vị trí con trỏ chuột của bạn. Hãy dùng phím <kbd class="app-kbd">F6</kbd> để dừng, vì lúc này rất khó bấm nút Stop bằng chuột.',
                simpleSaveLoad: '<strong>Save / Load:</strong> Xuất và nạp nhanh toàn bộ danh sách tọa độ ra file <code>.txt</code> để lưu trữ hoặc chia sẻ.',
                simpleClear: '<strong>Clear:</strong> Xóa sạch toàn bộ danh sách điểm chỉ với 1 click để bắt đầu tạo danh sách mới.',
                asianTitle: 'Asian Mode (Macro Kịch Bản Nâng Cao)',
                asianRecord: '<strong>Ghi thao tác:</strong> Bấm <kbd class="app-kbd">Record</kbd> ở cuối danh sách bước rồi thao tác như bình thường, app tự tạo các bước tương ứng. Bấm <kbd class="app-kbd">F6</kbd> hoặc bấm vào khung Record để dừng ghi.',
                asianDesc: 'Cho phép tạo kịch bản nâng cao, phức tạp với nhiều nhánh xử lý thông minh. Dưới đây là 14 hành động Macro được hỗ trợ:',
                asianTips: {
                    title: 'Mẹo Thao Tác Nhanh &amp; Chỉnh Sửa Hàng Loạt',
                    tipSelect: '<strong>Chọn dòng:</strong> Click vào tiêu đề cột <kbd class="app-kbd">No.</kbd> để chọn toàn bộ dòng. Giữ <kbd class="app-kbd">Shift</kbd> để chọn một dải dòng liên tục, hoặc giữ <kbd class="app-kbd">Ctrl</kbd> để chọn nhiều dòng rời rạc.',
                    tipBatch: '<strong>Sửa hàng loạt:</strong> Nhấp chuột vào <strong>tiêu đề các cột</strong> (<kbd class="app-kbd">✔</kbd>, <kbd class="app-kbd">Win</kbd>, <kbd class="app-kbd">Action Type</kbd>, <kbd class="app-kbd">Target/Setting</kbd>, <kbd class="app-kbd">Hold</kbd>, <kbd class="app-kbd">Delay</kbd>, <kbd class="app-kbd">Rep</kbd>) để đổi thông số cho toàn bộ các dòng được chọn cùng lúc.',
                    tipClone: '<strong>Nhân bản bước:</strong> Sau khi chọn các dòng cần lặp lại, bấm nút <kbd class="app-kbd">Clone Step(s)</kbd> để nhân đôi nhanh cụm bước đó, bản sao nằm ngay dưới dòng được chọn cuối cùng.',
                    tipTools: '<strong>Công cụ bổ trợ:</strong> Nút <kbd class="app-kbd">Move &amp; Scale</kbd> giúp dời cụm tọa độ hoặc co giãn tỷ lệ khi đổi độ phân giải. Menu <kbd class="app-kbd">Template</kbd> nạp kịch bản mẫu; <kbd class="app-kbd">Save Script</kbd> và <kbd class="app-kbd">Load Script</kbd> lưu và nạp file <code>.json</code>.'
                },
                actions: {
                    act1Name: 'Click Trái',
                    act1Desc: 'Thao tác nhấp chuột trái với thời gian đè giữ (Hold time) tùy chỉnh.',
                    act2Name: 'Click Phải',
                    act2Desc: 'Nhấp chuột phải để mở menu ngữ cảnh hoặc thao tác lệnh phụ trong game.',
                    act3Name: 'Cuộn / Giữa',
                    act3Desc: 'Click chuột giữa (giá trị <code>0</code>) hoặc cuộn chuột (<code>&lt; 0</code>: cuộn xuống, <code>&gt; 0</code>: cuộn lên).',
                    act4Name: 'Click Đúp',
                    act4Desc: 'Nhấp đúp chuột trái nhanh với khoảng cách trễ và độ nhạy tối ưu.',
                    act5Name: 'Kéo &amp; Thả',
                    act5Desc: 'Click và kéo chuột từ điểm A sang điểm B với chuyển động nội suy tự nhiên.',
                    act6Name: 'Nhấn &amp; Click',
                    act6Desc: 'Vừa đè giữ phím (Shift, Ctrl, Alt...) vừa thực hiện Click chuột hoặc Kéo thả (hữu ích trong game &amp; đồ họa).',
                    act7Name: 'Nhấn Phím',
                    act7Desc: 'Nhấn phím đơn hoặc tổ hợp phím tắt hệ thống (ví dụ: <code>Ctrl+C</code>, <code>Ctrl+V</code>, <code>Alt+F4</code>).',
                    act8Name: 'Gõ Văn Bản',
                    act8Desc: 'Tự động gõ đoạn văn bản hoặc chuỗi ký tự bất kỳ vào ô nhập liệu.',
                    act9Name: 'Chờ Đợi',
                    act9Desc: 'Tạm dừng chờ trễ thời gian. Có thể tận dụng bước này để thực hiện thao tác move chuột mà không kích hoạt click.',
                    act10Name: 'Lặp / Bấm giờ',
                    act10Desc: 'Quản lý vòng lặp bước linh hoạt theo số lần lặp lại (Count) hoặc theo chu kỳ thời gian (Timer đếm ngược mm:ss).',
                    act11Name: 'Nếu Màu',
                    act11Desc: 'Kiểm tra màu mục tiêu tại tọa độ hoặc trong một vùng (Khớp màu làm lệnh A, Sai làm lệnh B), hỗ trợ cả chế độ Chờ màu.',
                    act12Name: 'Chờ Đổi Màu',
                    act12Desc: 'Theo dõi điểm ảnh tại tọa độ X:Y; nếu màu tại điểm đó bị thay đổi so với ban đầu thì mới thực hiện lệnh tiếp theo.',
                    act13Name: 'Nếu Hình Ảnh',
                    act13Desc: 'Tìm kiếm hình ảnh mẫu trên màn hình hoặc trong cửa sổ với độ tương đồng (Similarity %) tùy chỉnh và tự động click vào tâm ảnh, hỗ trợ Chờ ảnh.',
                    act14Name: 'Gọi Script',
                    act14Desc: 'Cho phép chạy lồng nhiều kịch bản vào nhau (Kịch bản A gọi Kịch bản B rồi chạy tiếp).'
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
                runtimeVal: '.NET Framework 4.x <em>(Windows 10 và 11 đã tích hợp sẵn)</em>',
                ramLabel: 'Bộ nhớ RAM',
                ramVal: 'Khoảng 60-80 MB RAM khi đang mở',
                diskLabel: 'Dung lượng đĩa',
                diskVal: 'Chỉ ~1 MB (1 file thực thi duy nhất, không cần cài đặt)',
                dataLabel: 'Dữ liệu',
                dataVal: 'Cài đặt, kịch bản và bản sao lưu cài đặt <code>.bak</code> nằm trong thư mục <code>AutoClicker-Save&amp;Load</code> cạnh file exe. File cấu hình bị hỏng được giữ lại với đuôi <code>.corrupt-*</code>. Lỗi phát sinh được ghi vào <code>error.log</code> cạnh file exe.',
                permLabel: 'Quyền hạn',
                permVal: 'Quyền người dùng tiêu chuẩn. Chỉ khi app mục tiêu chạy quyền Admin thì mới cần chạy Auto Clicker bằng quyền Admin.',
                smartScreenTitle: 'ℹ️ Thông báo Windows SmartScreen trong lần mở đầu tiên',
                smartScreenDesc: 'Do phần mềm thực hiện mô phỏng chuột &amp; bàn phím qua các hàm Win32 API cấp hệ thống, Windows Defender SmartScreen có thể hiện cảnh báo <em>"Unknown Publisher"</em>. Bạn chỉ cần nhấn <strong>More info &rarr; Run anyway</strong> để mở. File hoàn toàn sạch sẽ, không mã độc.'
            }
        }
    };

    var en = {
        autoClicker: {
            docTitle: 'Auto Clicker by Max - Windows Mouse Auto Clicker & Macro Automation | Trần Thắng Minh',
            breadcrumb: 'Auto Clicker by Max',
            title: 'Auto Clicker by Max v1.1.4',
            meta: {
                fileSize: '~1 MB',
                portable: 'Portable',
                dotnet: 'C# .NET Framework 4.x',
                windowsApp: 'Windows App'
            },
            heroDownloadLabel: 'Download Auto Clicker by Max (.exe)',
            finalDownloadLabel: 'Download Auto Clicker by Max (.exe) Now',
            summary: '<strong>Auto Clicker by Max</strong> is a powerful, lightweight mouse auto-clicker and macro automation tool for Windows. Written in C# .NET, it launches instantly with a double-click without any cumbersome installation. Key features include:',
            features: {
                freeMouse: '<strong>Free Mouse Mode (Killer Feature):</strong> Runs automated background clicks using window coordinates without taking control of your physical mouse cursor.',
                humanLike: '<strong>Human-Like Simulation:</strong> Customizable randomized coordinate jitter (Jitter &plusmn;px) and timing variance (Interval &plusmn;ms) to minimize the risk of bot detection by game systems.',
                recorder: '<strong>Action Recorder:</strong> Press Record and work as usual. The app turns your actions into Click, Double Click, Drag &amp; Drop, Key Press, Type Text and Press &amp; Click steps.',
                multiThread: '<strong>Multi-Threaded Scripting:</strong> Manage multiple independent script tabs and run them simultaneously in parallel.',
                overlayMap: '<strong>Visual Overlay Map:</strong> Visually review configured click points directly on your screen. Reposition points quickly with drag-and-drop.',
                targetWindow: '<strong>Target Window Lock:</strong> Bind to a specific window, unaffected even when other windows cover it. Opening another window of the same app never steals the clicks. If the target is closed or minimized, that tab stops and tells you why instead of clicking the wrong place.',
                runScript: '<strong>Nested Script Execution (Run Script):</strong> Call sub-scripts from within a master script. For example: Script A contains actions 1, 2, 3, 4, 5; Script B runs actions 10, 11, 12, calls Script A, and continues with 13, 14.',
                moveScale: '<strong>Batch Translate &amp; Scale (Move &amp; Scale):</strong> Shift or scale coordinates in bulk across multiple points without moving each point manually.',
                imageRecognition: '<strong>Smart Image Recognition:</strong> Automatically scans and locates target images on screen or within a window to click precisely on image centers.',
                batchOps: '<strong>Batch Header Operations:</strong> Click column headers to instantly apply settings (action type, target window, coordinates, hold/delay/repeat values) across all script steps at once.',
                specialAdapters: '<strong>Specialized App Adapters:</strong> Optimized background clicking for Android emulators (BlueStacks, Google Play Games), web browsers, Discord, Slack, File Explorer, the Desktop and the Taskbar.',
                interfaceOptions: '<strong>Two Languages &amp; Light/Dark:</strong> Switch between English and Vietnamese, and between light and dark themes, right from the title bar.'
            },
            spotlight: {
                simpleCaption: 'Simple Mode Interface',
                asianCaption: 'Asian Mode Interface'
            },
            privacy: '<strong>Privacy &amp; Security:</strong> Your scripts and settings stay on your computer. The only network connection is the check for a new version on this website, automatically at most once a day or when you ask, and it sends none of your data. The software collects no telemetry and contains no trackers.',
            guide: {
                hotkeysTitle: 'Global Hotkeys &amp; Core Tips',
                hotkeysDesc: 'F6 and F7 work even while you are in another window. If another app already holds one of these keys, Auto Clicker tells you when it opens, and the Start and Stop buttons in the app still work.',
                thShortcut: 'Shortcut',
                thFunction: 'Function &amp; Notes',
                hotkeySpace: '<strong>Add Point / Add Step:</strong> Quickly captures the current mouse cursor coordinates. <em>(Note: Click to focus the Auto Clicker window before pressing Space).</em>',
                hotkeyF6: '<strong>START / STOP:</strong> Starts or stops the script in the active tab (e.g., Tab 1 in Simple Mode, or Tab 2 in Asian Mode), from any window. <em>(Note: While an app popup is open, F6 can stop but not start; while recording, F6 stops the recording).</em>',
                hotkeyF7: '<strong>Emergency Stop:</strong> Immediately terminates all running scripts across all tabs.',
                params: {
                    loopBadge: '0 = ∞',
                    loopName: 'Script Loops',
                    loopDesc: 'Defaults to <code>0</code> for infinite execution. Enter any number (e.g. <code>10</code>, <code>50</code>) to automatically terminate execution after completed cycles.',
                    jitterBadge: '± px',
                    jitterName: 'Coordinate Jitter',
                    jitterDesc: 'Generates random ±px deviation around click coordinates (e.g. <code>2</code> - <code>3</code> px). Simulates human hand variance to bypass bot detection.',
                    intervalBadge: '± ms',
                    intervalName: 'Interval Variance',
                    intervalDesc: 'Randomly offsets delay by ±ms (e.g. 250ms delay with ±20ms varies between 230ms - 270ms), breaking robotic mechanical rhythms.',
                    speedBadge: '100%',
                    speedName: 'Script Speed',
                    speedDesc: 'Scales entire script execution speed by percentage (10% - 2000%), dynamically adjusting delay and hold timings without modifying individual steps.'
                },
                utilities: {
                    windowOnTop: '<strong>Window on Top:</strong> Pins the Auto Clicker window on top of all applications for easy monitoring.',
                    freeMouse: '<strong>Free Mouse Mode:</strong> Allows Auto Clicker to automate background windows without taking control of your physical mouse cursor.',
                    showMap: '<strong>Show Map (Overlay):</strong> Activates visual screen overlay displaying numbered glowing points; drag points directly to reposition.',
                    smoothMouse: '<strong>Smooth Mouse Move:</strong> Smoothly glides cursor between coordinates with interpolation rather than instant jumping.'
                },
                simpleTitle: 'Simple Mode (Basic &amp; Quick Setup)',
                simpleDesc: 'Ideal for quick, straightforward tasks with simple automation. Supports 2 Click Modes:',
                simplePointList: '<strong>Point List:</strong> Pre-configure a list of coordinate points (X, Y) to execute sequentially.',
                simpleFollowClick: '<strong>Follow Cursor:</strong> Continuously clicks wherever your mouse cursor is. Use <kbd class="app-kbd">F6</kbd> to stop, because clicking the Stop button with the mouse is nearly impossible in this mode.',
                simpleSaveLoad: '<strong>Save / Load:</strong> Export and import coordinate point lists to/from plain text <code>.txt</code> files.',
                simpleClear: '<strong>Clear:</strong> Reset and clear the entire coordinate list in 1 click to start fresh.',
                asianTitle: 'Asian Mode (Advanced Macro Engine)',
                asianRecord: '<strong>Record your actions:</strong> Press <kbd class="app-kbd">Record</kbd> at the end of the step list and work as usual, and the app creates the matching steps. Press <kbd class="app-kbd">F6</kbd> or click the Record box to stop.',
                asianDesc: 'Enables complex, multi-branch macro scripting with intelligent conditions. 14 supported macro actions:',
                asianTips: {
                    title: 'Pro Tips &amp; Batch Operations',
                    tipSelect: '<strong>Multi-Select:</strong> Click header <kbd class="app-kbd">No.</kbd> to select all rows. Hold <kbd class="app-kbd">Shift</kbd> to select a continuous range, or hold <kbd class="app-kbd">Ctrl</kbd> to toggle individual rows.',
                    tipBatch: '<strong>Batch Header Edit:</strong> Click <strong>column headers</strong> (<kbd class="app-kbd">✔</kbd>, <kbd class="app-kbd">Win</kbd>, <kbd class="app-kbd">Action Type</kbd>, <kbd class="app-kbd">Target/Setting</kbd>, <kbd class="app-kbd">Hold</kbd>, <kbd class="app-kbd">Delay</kbd>, <kbd class="app-kbd">Rep</kbd>) to batch-edit values across all selected rows at once.',
                    tipClone: '<strong>Clone Step(s):</strong> Select target steps and click <kbd class="app-kbd">Clone Step(s)</kbd> to instantly duplicate them. The copies appear right below the last selected row.',
                    tipTools: '<strong>Advanced Tools:</strong> <kbd class="app-kbd">Move &amp; Scale</kbd> shifts or resizes point coordinates on resolution change. <kbd class="app-kbd">Template</kbd> loads sample scripts; <kbd class="app-kbd">Save Script</kbd> and <kbd class="app-kbd">Load Script</kbd> manage <code>.json</code> files.'
                },
                actions: {
                    act1Name: 'Left Click',
                    act1Desc: 'Standard left-click action with customizable hold duration.',
                    act2Name: 'Right Click',
                    act2Desc: 'Right-click to open context menus or secondary game controls.',
                    act3Name: 'Middle / Scroll',
                    act3Desc: 'Middle-click (value <code>0</code>) or scroll wheel (<code>&lt; 0</code>: scroll down, <code>&gt; 0</code>: scroll up).',
                    act4Name: 'Double Click',
                    act4Desc: 'Rapid double left-click with optimized delay interval.',
                    act5Name: 'Drag &amp; Drop',
                    act5Desc: 'Click and drag cursor from point A to point B with natural interpolation.',
                    act6Name: 'Press &amp; Click',
                    act6Desc: 'Combine holding a modifier key (Shift, Ctrl, Alt...) while clicking or dragging (essential for games &amp; design tools).',
                    act7Name: 'Key Press',
                    act7Desc: 'Simulate single keypresses or system shortcut combinations (e.g., <code>Ctrl+C</code>, <code>Ctrl+V</code>, <code>Alt+F4</code>).',
                    act8Name: 'Type Text',
                    act8Desc: 'Automatically type any text string or characters into the active input field.',
                    act9Name: 'Delay',
                    act9Desc: 'Pause execution for a specified duration. Can also reposition cursor without clicking.',
                    act10Name: 'Repeat / Timer',
                    act10Desc: 'Flexible step loop management by execution count or timed cycle countdown (mm:ss).',
                    act11Name: 'If Color',
                    act11Desc: 'Check target color at coordinates or within a region (Executes Action A if matched, Action B if not), supports Wait Color.',
                    act12Name: 'Wait Color Change',
                    act12Desc: 'Monitor pixel at X:Y; triggers the next action as soon as the pixel color changes from its initial state.',
                    act13Name: 'If Image',
                    act13Desc: 'Search for template images on screen or within a window with similarity (%) and click image center, supports Wait Image.',
                    act14Name: 'Run Script',
                    act14Desc: 'Nested script execution (Master script calls sub-script then resumes next steps).'
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
                runtimeVal: '.NET Framework 4.x <em>(Pre-installed on Windows 10 &amp; 11)</em>',
                ramLabel: 'Memory (RAM)',
                ramVal: 'About 60-80 MB RAM while open',
                diskLabel: 'Disk Space',
                diskVal: 'Only ~1 MB (Single portable executable, zero installation)',
                dataLabel: 'Your Data',
                dataVal: 'Settings, scripts and a <code>.bak</code> backup of the settings live in the <code>AutoClicker-Save&amp;Load</code> folder next to the exe. A damaged settings file is kept with a <code>.corrupt-*</code> suffix. Errors are written to <code>error.log</code> next to the exe.',
                permLabel: 'Permissions',
                permVal: 'Standard user privileges. Run Auto Clicker as Administrator only when the target app runs as Administrator.',
                smartScreenTitle: 'ℹ️ Windows SmartScreen notice on first launch',
                smartScreenDesc: 'Because the application simulates mouse and keyboard input using low-level Win32 APIs, Windows Defender SmartScreen may display an <em>"Unknown Publisher"</em> prompt. Simply click <strong>More info &rarr; Run anyway</strong> to launch. The executable is 100% clean and virus-free.'
            }
        }
    };

    window.sharedI18n.registerTranslations('vi', vi);
    window.sharedI18n.registerTranslations('en', en);
})();
