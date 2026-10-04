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
                fileSize: '~660 KB',
                portable: 'Portable',
                dotnet: 'C# .NET 4.0 Native',
                windowsApp: 'Windows App'
            },
            heroDownloadLabel: 'Tải Auto Clicker by Max (.exe)',
            finalDownloadLabel: 'Tải Ngay Auto Clicker by Max (.exe)',
            summary: '<strong>Auto Clicker by Max</strong> là công cụ tự động click chuột &amp; lập trình kịch bản macro mạnh mẽ, siêu nhẹ dành cho Windows. Được viết bằng ngôn ngữ C# .NET tối ưu, ứng dụng khởi chạy tức thì chỉ bằng một cú nhấp đúp mà không cần cài đặt rườm rà. Gồm những tính năng nổi bật:',
            features: {
                freeMouse: '<strong>Chuột Tự Do (Free Mouse Mode):</strong> Click tự động chạy ngầm theo tọa độ cửa sổ mà không chiếm quyền điều khiển con trỏ chuột vật lý của bạn.',
                humanLike: '<strong>Mô phỏng người thật:</strong> Tùy biến rung lắc tọa độ ngẫu nhiên (Jitter &plusmn;px) và giãn cách thời gian (Interval &plusmn;ms) giúp giảm thiểu tối đa nguy cơ bị hệ thống game phát hiện bot.',
                multiThread: '<strong>Đa luồng kịch bản:</strong> Quản lý nhiều tab kịch bản độc lập và cho phép chạy song song cùng lúc.',
                overlayMap: '<strong>Overlay Map trực quan:</strong> Xem lại được những vị trí được cài đặt trực quan trên màn hình. Thay đổi vị trí nhanh chóng bằng thao tác nắm kéo.',
                targetWindow: '<strong>Khóa mục tiêu:</strong> Chọn cửa sổ để bấm, không bị ảnh hưởng dù bị cửa sổ khác đè lên (lưu ý: không được Minimize cửa sổ).',
                runScript: '<strong>Kịch bản lồng kịch bản:</strong> Cho phép gọi kịch bản con trong kịch bản lớn. Ví dụ: kịch bản A gồm các lệnh 1, 2, 3, 4, 5; kịch bản B gồm các lệnh 10, 11, 12, gọi kịch bản A, rồi đến 13, 14.',
                moveScale: '<strong>Tịnh tiến &amp; Co giãn hàng loạt:</strong> Di chuyển các điểm tịnh tiến hoặc co giãn kích thước mà không phải dời thủ công từng điểm.',
                imageRecognition: '<strong>Nhận diện hình ảnh:</strong> Tự động quét và tìm hình ảnh mục tiêu trên màn hình hoặc trong cửa sổ để click chính xác vào tâm ảnh.',
                batchOps: '<strong>Thao tác hàng loạt:</strong> Nhấp vào tiêu đề các cột trong bảng kịch bản để áp dụng thông số (đổi hành động, đổi cửa sổ, nhập Hold/Delay/Repeat) cho toàn bộ các dòng cùng lúc.',
                specialAdapters: '<strong>Tương thích ứng dụng đặc thù:</strong> Tối ưu hóa click ngầm ổn định cho giả lập Android (BlueStacks), Discord, Spotify, Windows Explorer...'
            },
            spotlight: {
                simpleCaption: 'Giao diện Simple Mode',
                asianCaption: 'Giao diện Asian Mode'
            },
            privacy: '<strong>Bảo mật &amp; Riêng tư tuyệt đối:</strong> Phần mềm chạy hoàn toàn cục bộ trên máy tính của bạn, không gửi yêu cầu qua mạng, không thu thập dữ liệu và không chứa bất kỳ tracker nào.',
            guide: {
                hotkeysTitle: 'Phím Tắt Hệ Thống &amp; Mẹo Chung',
                hotkeysDesc: 'Điều khiển nhanh các thao tác mọi lúc mọi nơi ngay cả khi đang chơi game hoặc ẩn cửa sổ:',
                thShortcut: 'Phím Tắt',
                thFunction: 'Chức Năng &amp; Lưu Ý',
                hotkeySpace: '<strong>Thêm điểm / bước mới:</strong> Bắt nhanh tọa độ con trỏ chuột hiện tại. <em>(Lưu ý: Cần click chọn / focus cửa sổ Auto Clicker trước khi nhấn Space).</em>',
                hotkeyF6: '<strong>Bắt đầu / Tạm dừng:</strong> Chạy hoặc dừng kịch bản tại tab đang mở (ví dụ: Tab 1 của Simple Mode, hoặc Tab 2 của Asian Mode). <em>(Lưu ý: Cần focus cửa sổ Auto Clicker trước khi START; khi đang chạy thì ở cửa sổ nào click F6 cũng dừng được).</em>',
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
                    speedDesc: 'Tăng tốc hoặc làm chậm toàn bộ kịch bản theo tỷ lệ phần trăm (10% - 500%), tự động co giãn thời gian delay và hold time tương ứng mà không cần chỉnh từng bước.'
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
                simpleFollowClick: '<strong>Follow Click:</strong> Spam click liên tục tự do ngay tại vị trí con trỏ chuột của bạn.',
                simpleSaveLoad: '<strong>Save / Load:</strong> Xuất và nạp nhanh toàn bộ danh sách tọa độ ra file <code>.txt</code> để lưu trữ hoặc chia sẻ.',
                simpleClear: '<strong>Clear:</strong> Xóa sạch toàn bộ danh sách điểm chỉ với 1 click để bắt đầu tạo danh sách mới.',
                asianTitle: 'Asian Mode (Macro Kịch Bản Nâng Cao)',
                asianDesc: 'Cho phép tạo kịch bản nâng cao, phức tạp với nhiều nhánh xử lý thông minh. Dưới đây là 13 hành động Macro được hỗ trợ:',
                asianTips: {
                    title: 'Mẹo Thao Tác Nhanh &amp; Chỉnh Sửa Hàng Loạt',
                    tipSelect: '<strong>Chọn dòng:</strong> Click vào tiêu đề cột <kbd class="app-kbd">No.</kbd> để chọn toàn bộ dòng. Giữ <kbd class="app-kbd">Shift</kbd> để chọn một dải dòng liên tục, hoặc giữ <kbd class="app-kbd">Ctrl</kbd> để chọn nhiều dòng rời rạc.',
                    tipBatch: '<strong>Sửa hàng loạt:</strong> Nhấp chuột vào <strong>tiêu đề các cột</strong> (<kbd class="app-kbd">✔</kbd>, <kbd class="app-kbd">Win</kbd>, <kbd class="app-kbd">Action Type</kbd>, <kbd class="app-kbd">Hold</kbd>, <kbd class="app-kbd">Delay</kbd>, <kbd class="app-kbd">Rep</kbd>) để đổi thông số cho toàn bộ các dòng được chọn cùng lúc.',
                    tipClone: '<strong>Nhân bản bước:</strong> Sau khi chọn các dòng cần lặp lại, bấm nút <kbd class="app-kbd">+ Clone Step(s)</kbd> để nhân đôi nhanh cụm bước đó xuống cuối kịch bản.',
                    tipTools: '<strong>Công cụ bổ trợ:</strong> Nút <kbd class="app-kbd">Move &amp; Scale</kbd> giúp dời cụm tọa độ hoặc co giãn tỷ lệ khi đổi độ phân giải. Menu <kbd class="app-kbd">Template ▾</kbd> &amp; <kbd class="app-kbd">Save/Load</kbd> hỗ trợ nạp kịch bản mẫu và lưu file <code>.json</code>.'
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
                    act5Name: 'Kéo và Thả',
                    act5Desc: 'Click và kéo chuột từ điểm A sang điểm B với chuyển động nội suy tự nhiên.',
                    act6Name: 'Nhấn Phím',
                    act6Desc: 'Nhấn phím đơn hoặc tổ hợp phím tắt hệ thống (ví dụ: <code>Ctrl+C</code>, <code>Ctrl+V</code>, <code>Alt+F4</code>).',
                    act7Name: 'Gõ Văn Bản',
                    act7Desc: 'Tự động gõ đoạn văn bản hoặc chuỗi ký tự bất kỳ vào ô nhập liệu.',
                    act8Name: 'Chờ Đợi',
                    act8Desc: 'Tạm dừng chờ trễ thời gian. Có thể tận dụng bước này để thực hiện thao tác move chuột mà không kích hoạt click.',
                    act9Name: 'Lặp / Bấm giờ',
                    act9Desc: 'Quản lý vòng lặp bước linh hoạt theo số lần lặp lại (Count) hoặc theo chu kỳ thời gian (Timer đếm ngược mm:ss).',
                    act10Name: 'Nếu Màu',
                    act10Desc: 'Kiểm tra màu mục tiêu tại tọa độ hoặc trong một vùng (Khớp màu làm lệnh A, Sai làm lệnh B).',
                    act11Name: 'Chờ Đổi Màu',
                    act11Desc: 'Theo dõi điểm ảnh tại tọa độ X:Y; nếu màu tại điểm đó bị thay đổi so với ban đầu thì mới thực hiện lệnh tiếp theo.',
                    act12Name: 'Nếu Hình Ảnh',
                    act12Desc: 'Tìm kiếm hình ảnh mẫu trên màn hình hoặc trong cửa sổ với độ tương đồng (Similarity %) tùy chỉnh và tự động click vào tâm ảnh.',
                    act13Name: 'Gọi Script',
                    act13Desc: 'Cho phép chạy lồng nhiều kịch bản vào nhau (Kịch bản A gọi Kịch bản B rồi chạy tiếp).'
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
                diskVal: 'Chỉ ~660 KB (1 file thực thi duy nhất, không cần cài đặt)',
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
                fileSize: '~660 KB',
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
                moveScale: '<strong>Batch Translate &amp; Scale (Move &amp; Scale):</strong> Shift or scale coordinates in bulk across multiple points without moving each point manually.',
                imageRecognition: '<strong>Smart Image Recognition:</strong> Automatically scans and locates target images on screen or within a window to click precisely on image centers.',
                batchOps: '<strong>Batch Header Operations:</strong> Click column headers to instantly apply settings (action type, target window, hold/delay/repeat values) across all script steps at once.',
                specialAdapters: '<strong>Specialized App Adapters:</strong> Optimized background clicking for Android emulators (BlueStacks), Discord, Spotify, Windows Explorer, and more.'
            },
            spotlight: {
                simpleCaption: 'Simple Mode Interface',
                asianCaption: 'Asian Mode Interface'
            },
            privacy: '<strong>100% Local Privacy &amp; Security:</strong> The software runs entirely offline on your computer, sends zero network requests, collects no telemetry, and contains no trackers whatsoever.',
            guide: {
                hotkeysTitle: 'Global Hotkeys &amp; Core Tips',
                hotkeysDesc: 'Quickly control operations anytime, anywhere even while gaming or when the window is hidden:',
                thShortcut: 'Shortcut',
                thFunction: 'Function &amp; Notes',
                hotkeySpace: '<strong>Add Point / Add Step:</strong> Quickly captures the current mouse cursor coordinates. <em>(Note: Click to focus the Auto Clicker window before pressing Space).</em>',
                hotkeyF6: '<strong>START / PAUSE:</strong> Starts or stops the script in the active tab (e.g., Tab 1 in Simple Mode, or Tab 2 in Asian Mode). <em>(Note: Focus the Auto Clicker window before pressing START; while running, pressing F6 from any window will pause execution).</em>',
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
                    speedDesc: 'Scales entire script execution speed by percentage (10% - 500%), dynamically adjusting delay and hold timings without modifying individual steps.'
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
                simpleFollowClick: '<strong>Follow Click:</strong> Continuously spam clicks wherever your physical mouse cursor is positioned.',
                simpleSaveLoad: '<strong>Save / Load:</strong> Export and import coordinate point lists to/from plain text <code>.txt</code> files.',
                simpleClear: '<strong>Clear:</strong> Reset and clear the entire coordinate list in 1 click to start fresh.',
                asianTitle: 'Asian Mode (Advanced Macro Engine)',
                asianDesc: 'Enables complex, multi-branch macro scripting with intelligent conditions. 13 supported macro actions:',
                asianTips: {
                    title: 'Pro Tips &amp; Batch Operations',
                    tipSelect: '<strong>Multi-Select:</strong> Click header <kbd class="app-kbd">No.</kbd> to select all rows. Hold <kbd class="app-kbd">Shift</kbd> to select a continuous range, or hold <kbd class="app-kbd">Ctrl</kbd> to toggle individual rows.',
                    tipBatch: '<strong>Batch Header Edit:</strong> Click <strong>column headers</strong> (<kbd class="app-kbd">✔</kbd>, <kbd class="app-kbd">Win</kbd>, <kbd class="app-kbd">Action Type</kbd>, <kbd class="app-kbd">Hold</kbd>, <kbd class="app-kbd">Delay</kbd>, <kbd class="app-kbd">Rep</kbd>) to batch-edit values across all selected rows at once.',
                    tipClone: '<strong>Clone Step(s):</strong> Select target steps and click <kbd class="app-kbd">+ Clone Step(s)</kbd> to instantly duplicate them to the bottom of the script.',
                    tipTools: '<strong>Advanced Tools:</strong> <kbd class="app-kbd">Move &amp; Scale</kbd> shifts or resizes point coordinates on resolution change. <kbd class="app-kbd">Template ▾</kbd> &amp; <kbd class="app-kbd">Save/Load</kbd> manage <code>.json</code> scripts.'
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
                    act5Name: 'Drag n Drop',
                    act5Desc: 'Click and drag cursor from point A to point B with natural interpolation.',
                    act6Name: 'Key Press',
                    act6Desc: 'Simulate single keypresses or system shortcut combinations (e.g., <code>Ctrl+C</code>, <code>Ctrl+V</code>, <code>Alt+F4</code>).',
                    act7Name: 'Type Text',
                    act7Desc: 'Automatically type any text string or characters into the active input field.',
                    act8Name: 'Delay',
                    act8Desc: 'Pause execution for a specified duration. Can also reposition cursor without clicking.',
                    act9Name: 'Repeat / Timer',
                    act9Desc: 'Flexible step loop management by execution count or timed cycle countdown (mm:ss).',
                    act10Name: 'If Color',
                    act10Desc: 'Check target color at coordinates or within a region (Executes Action A if matched, Action B if not).',
                    act11Name: 'Wait Color Change',
                    act11Desc: 'Monitor pixel at X:Y; triggers the next action as soon as the pixel color changes from its initial state.',
                    act12Name: 'If Image',
                    act12Desc: 'Search for template images on screen or within a window with similarity (%) and click image center.',
                    act13Name: 'Run Script',
                    act13Desc: 'Nested script execution (Master script calls sub-script then resumes next steps).'
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
                diskVal: 'Only ~660 KB (Single portable executable, zero installation)',
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
