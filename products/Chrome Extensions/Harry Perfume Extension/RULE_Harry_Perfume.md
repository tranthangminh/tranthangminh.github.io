# HARRY PERFUME EXTENSION - QUY CHUẨN VÀ NGUYÊN TẮC NGHIỆP VỤ (SSOT)
> **Tài liệu chuẩn (Single Source of Truth - SSOT)** cho toàn bộ logic vận hành, xử lý dữ liệu và giao diện của Harry Perfume Chrome Extension. Mọi tính năng phát triển mới hoặc bảo trì đều bắt buộc đối chiếu với tài liệu này để đảm bảo tính nhất quán và triệt tiêu nguy cơ hồi quy mã nguồn (regression).

---

# 1. QUY CHUẨN DÙNG CHUNG (COMMON & ARCHITECTURE)

## 1.1. Kiến trúc thư mục dùng chung (`common/`) & Thẩm định mã nguồn SSOT (Anti-Bloat 1.1.5)
1. **Nguyên tắc chia sẻ dùng chung**:
   - Mọi hàm tiện ích, thuật toán hoặc module dùng chéo từ 2 tab trở lên bắt buộc phải được đưa vào thư mục `common/` (thay vì viết lặp lại ở từng tab riêng lẻ).
   - Danh mục module chuẩn:
     - `common/product-search.js`: Tìm kiếm & xếp hạng nước hoa thông minh (Tiered Best-Match Scoring).
     - `common/formatters.js`: Định dạng tiền tệ VNĐ, làm sạch chuỗi, loại bỏ dấu tiếng Việt `removeAccents`, chống XSS `escHtml`, `escAttr`, debounce và bộ bắt lỗi ảnh CSP capture-phase toàn cục.
     - `common/date-helper.js`: Xử lý ngày tháng chuẩn `DD/MM/YYYY`, so sánh và chuyển đổi thời gian (`parseDateValue`, `sortItemsByDateDesc`).
     - `common/toast.js`: Quản lý thông báo Toast nhanh góc màn hình với icon và màu sắc trạng thái (`showToast`).
     - `common/modal-controller.js`: Bộ điều khiển popup/modal tự động xử lý backdrop click và phím `Escape`.
     - `common/auth-helper.js`: Quản lý phiên Quản Trị Viên (`checkIsAdminLoggedIn`, `getCurrentAdminUser`, `setAdminLoginSession`, `clearAdminLoginSession`).
     - `common/mini-window.js`: Quản lý mở Extension dạng Cửa sổ Mini Window độc lập (`chrome.windows.create`, 420x720px).
2. **Thẩm định Anti-Bloat 1.1.5 (Tuyệt đối tuân thủ SSOT)**:
   - Khi hàm hoặc tiện ích đã được định nghĩa tại `common/` và nạp sẵn vào DOM (`panel.html`), mọi file script con (`panel.js`, `perfume-search.js`, `order.js`, `import.js`, `stats/*.js`...) **phải gọi trực tiếp hàm đó**.
   - **Nghiêm cấm phòng thủ thái quá**: Tuyệt đối không viết `typeof func === "function" ? func(...) : fallback` hoặc viết lại logic lặp để dự phòng khi thứ tự nạp script đã được đảm bảo chắc chắn.
   - **Triệt tiêu toàn diện Dead Code & Listener trùng lặp**: Không lưu lại thẻ DOM thừa (như datalist mồ côi đã chuyển sang combobox động). Không gắn lặp lại các listener đóng modal trên nền mờ hoặc phím Escape khi `modal-controller.js` đã phụ trách.

## 1.2. Tài khoản quản trị & Bảo mật (Auth & Security)
1. **Danh sách tài khoản hợp lệ**:
   - Gồm đúng 3 tài khoản: `Dương`, `Quân`, `Minh` (không phân biệt chữ hoa/thường khi kiểm tra đăng nhập).
   - Đã xóa bỏ vĩnh viễn tài khoản cũ (`harryparfym`).
2. **Mật khẩu**:
   - Dùng chung một mật khẩu duy nhất cho cả 3 tài khoản: `Skilllioned88@`.
3. **Phân quyền tính năng**:
   - Chỉ khi đăng nhập quản trị thành công (`isAdminLoggedIn === true`), tab **Nhập**, tab **Thống Kê**, tab **Mini Tools** và nút xem giá vốn/sửa giá mới được phép kích hoạt và hiển thị.
   - Khi đăng xuất: tự động xóa sạch dữ liệu nhạy cảm trên DOM và RAM, tự động chuyển về tab Nước Hoa.

## 1.3. Bộ máy tìm kiếm nước hoa thống nhất (Tiered Best-Match Scoring)
1. **Thuật toán phân tầng ưu tiên (Scoring Engine)**:
   - Kế thừa và nâng cấp từ thuật toán của `products/Temp` kết hợp cơ chế phân tầng độ ưu tiên:
     - **Tier 1 (100.000đ)**: Khớp tuyệt đối 100% từng chữ cái (`name` hoặc `tenrutgon`).
     - **Tier 2 (50.000đ)**: Bắt đầu bằng chuỗi tìm kiếm (StartsWith).
     - **Tier 3 (20.000đ)**: Chứa nguyên cụm chuỗi tìm kiếm liền khối (`includes`).
     - **Tier 4 (10.000đ)**: Chứa tất cả các từ khóa gõ vào (AND Multi-Token match).
     - **Tier 5 (Fuzzy Overlap)**: Khớp từng phần từ khóa theo số lượng từ trùng (`matchedCount`) và độ tương quan Jaccard Index.
2. **Xử lý linh hoạt từ khóa thừa**:
   - Khi người dùng gõ từ khóa chưa có trong kho (ví dụ: *"Clive Christian Town and Country"*), thuật toán vẫn bắt được các từ khóa trùng (*"Clive Christian"*) và đẩy các sản phẩm liên quan gần nhất lên đầu bảng thay vì trả về 0 kết quả.
3. **Phạm vi áp dụng đồng bộ toàn Extension**:
   - **Tab Nước hoa**: `performSearch(keyword)` trong `perfume-search.js`.
   - **Tab Đơn hàng**: `handleOrderSearch(query)` trong `order.js`.
   - **Tab Nhập hàng**: Menu gợi ý combobox trên từng thẻ kiện hàng và form thêm mới (`import.js`).

## 1.4. Quy chuẩn hiển thị ảnh chai nước hoa (Product Thumbnails & CSP)
1. **Hiển thị trực quan trước tên sản phẩm**:
   - Ở mỗi dòng sản phẩm trên thẻ kiện hàng hoặc trong form thêm mới kiện hàng, hiển thị ảnh chai nước hoa thu nhỏ (`.import-prod-thumb`, `.sender-item-thumb`) ngay trước tên sản phẩm nếu có trong kho dữ liệu sản phẩm `allProducts`.
   - Kích thước chuẩn: `26x26px` (trong tab Nhập) hoặc `36x36px` (trong tab Thống kê), bo góc `4-6px`, viền mờ tinh tế, `object-fit: contain` giữ nguyên vẹn tỉ lệ chai nước hoa, căn giữa thẳng hàng.
2. **Cơ chế khớp ảnh chính xác 100% từng chữ cái (`getProductImageByName`)**:
   - Tra cứu trực tiếp từ kho dữ liệu sản phẩm `allProducts`.
   - **Bắt buộc khớp chính xác 100% từng ký tự** (letter-by-letter exact match): Tên nhập vào phải khớp hoàn toàn với `name` hoặc `tenrutgon` của sản phẩm (hỗ trợ cả có dấu hoặc không dấu nguyên chuỗi).
   - **Tuyệt đối nghiêm cấm**: Không sử dụng tìm kiếm gần đúng hay chuỗi con `includes()`, không khớp khi người dùng mới gõ dở vài ký tự.
   - **Nguyên tắc hiển thị / ẩn ảnh tức thì**:
     - Khi tên chưa được chốt xong (đang gõ dở, gõ sai dù chỉ 1 ký tự, hoặc xóa bớt ký tự): Ảnh phải **biến mất ngay lập tức** (`display: none; src: ""`).
     - Chỉ khi người dùng chọn từ danh sách gợi ý combobox/dropdown/datalist HOẶC gõ chốt xong đúng 100% từng chữ cái thì ảnh chai nước hoa mới xuất hiện.
3. **Bảo toàn DOM và xử lý ảnh lỗi chuẩn CSP (No inline onerror)**:
   - Thẻ `img.import-prod-thumb` luôn được tạo sẵn tĩnh trong DOM lúc dựng thẻ (`display: none` nếu chưa có ảnh). Khi cập nhật ảnh, chỉ đổi `style.display` và gán/xóa `src`. Tuyệt đối không dùng `insertBefore` làm mất focus ô nhập.
   - TUYỆT ĐỐI không chèn thuộc tính inline `onerror="..."` vào HTML để tránh vi phạm chính sách bảo mật CSP (`script-src 'self'`) của Chrome Extension Manifest V3. Toàn bộ ảnh hỏng được tự động ẩn mượt mà thông qua bộ lắng nghe lỗi capture toàn cục `window.addEventListener('error', ..., true)` trong `common/formatters.js`, tuyệt đối không để lộ biểu tượng ảnh gãy (broken image icon).

## 1.5. Quy chuẩn Modal / Popup toàn hệ thống (Unified Modal Standard)
1. **Cấu trúc DOM phân tầng chuẩn 100%**:
   - Áp dụng thống nhất cho tất cả các popup/modal trong Extension (`#addCardModal`, `#orderManualModal`, `#orderItemPriceModal`, `#orderPromoModal`, `#modalAddImport`, `#loginModal`):
     - **Lớp phủ nền (Backdrop overlay)**: `.modal-overlay` (`background: rgba(0, 0, 0, 0.75); backdrop-filter: blur(4px); position: fixed; inset: 0; z-index: 10000; display: flex; justify-content: center; align-items: center; animation: fadeIn 0.2s ease-out;`). Bắt buộc `padding: 0 !important;` trên toàn bộ overlay để tránh co rút bề ngang trong Sidepanel hoặc Mini Window.
     - **Hộp thoại trung tâm**: `.modal-content` (`background: var(--bg-card); border: 1px solid var(--border-color); border-radius: 12px; padding: 16px; box-shadow: 0 10px 25px rgba(0, 0, 0, 0.5); display: flex; flex-direction: column; animation: slideUp 0.2s ease-out;`).
     - **Tiêu đề bảng**: `.modal-header` gồm `h4` (`font-size: 14px; font-weight: 700; color: var(--gold-primary);`) và nút đóng `.modal-close-btn` (`&times;`, `cursor: pointer; font-size: 20px; line-height: 1;`). Phân cách bằng `border-bottom: 1px solid var(--border-color); padding-bottom: 8px; margin-bottom: 12px;`.
     - **Thân nội dung**: `.modal-body` (tự động cuộn `overflow-y: auto` khi nội dung dài, không đặt padding ngang lớn gây thụt lề kép).
     - **Chân trang hành động**: `.modal-footer` (`display: flex; justify-content: flex-end; gap: 8px; border-top: 1px solid var(--border-color); padding-top: 10px; margin-top: 8px;`).
2. **Quy chuẩn Form Group & Nút bấm**:
   - Dùng class chuẩn `.form-group` cho mọi trường nhập liệu. Nhãn `.form-group label` màu xám dịu mắt `color: var(--text-secondary); font-size: 11px; font-weight: bold;`.
   - Nút Hủy / Đóng: Bắt buộc dùng `.btn-secondary` (`Hủy`).
   - Nút Hành động chính: Bắt buộc dùng `.btn-primary` nền vàng gold thương hiệu.
   - Đóng modal tự động khi click vào vùng nền mờ bên ngoài (`backdrop click`) hoặc nhấn phím `Escape`.

## 1.6. Hệ thống thông báo Toast (No Browser Popups)
1. **Nghiêm cấm dùng `window.confirm()` và `window.alert()`**:
   - Tuyệt đối không sử dụng bất kỳ hộp thoại mặc định nào của trình duyệt (browser dialog) trong Extension.
2. **Sử dụng hệ thống Toast nội bộ (`showToast`)**:
   - Mọi thông báo xác nhận, hủy chỉnh sửa, lưu thành công, nhắc nhở hoặc lỗi mạng bắt buộc phải được hiển thị qua hàm `showToast(msg, isError, duration)` nổi ngay bên dưới thanh tab của Extension.
   - Khi người dùng nhấn `✕ Hủy`: Tự động hoàn tác ngay lập tức và hiện toast `Đã hủy chỉnh sửa.`, không bật popup hỏi lại gây phiền phức.

## 1.7. Quy chuẩn Giao diện Sáng / Tối (Theme Controller: Dark & Light Mode)
1. **Vị trí và Biểu tượng Nút Theme (`#btnThemeToggle`)**:
   - Nằm trên thanh header thương hiệu, đặt **ngay bên phải nút Cập nhật (`#btnRefresh`)**.
   - Sử dụng 2 icon SVG chuẩn từ thư mục `svg/`:
     - Khi đang ở **Giao diện Tối (Dark Mode)**: Nút hiển thị **Biểu tượng Mặt Trời (`svg/light-mode.svg`)** kèm tooltip `"Chuyển sang giao diện Sáng (Light Mode)"`.
     - Khi đang ở **Giao diện Sáng (Light Mode)**: Nút hiển thị **Biểu tượng Mặt Trăng (`svg/dark-mode.svg`)** kèm tooltip `"Chuyển sang giao diện Tối (Dark Mode)"`.
2. **Cơ chế lưu trữ & Khôi phục tức thì (Zero-flicker)**:
   - Lưu lựa chọn qua `StorageHelper.set("theme", nextTheme)` và đồng bộ tức thời với `localStorage`.
   - Khi mở Extension: Khôi phục thuộc tính `data-theme` trên `<html>` và `<body>` ngay lập tức từ đầu file script để tránh hiện tượng chớp nháy giao diện (0ms latency).
   - Tự động hiển thị Toast thông báo nhanh: `☀️ Đã bật giao diện Sáng` hoặc `🌙 Đã bật giao diện Tối`.
3. **Quy tắc phối màu và cấu trúc chuẩn trong `theme.css`**:
   - File `theme.css` thiết kế theo chuẩn SSOT & token-only (tương tự chuẩn `MAX - Multi Chat/theme.css`): chỉ khai báo các biến CSS custom properties (`:root`, `[data-theme="dark"]`, `.light-theme`, `[data-theme="light"]`) và class tiện ích `.icon-mask`. Tuyệt đối không viết selector override từng component bên trong `theme.css` (như `[data-theme="light"] .header-container`).
   - Mọi thành phần giao diện toàn hệ thống bắt buộc sử dụng CSS variables (`var(--bg-primary)`, `var(--bg-card)`, `var(--text-primary)`, `var(--border-color)`, `var(--gold-primary)`), cùng các token hiệu ứng dùng chung: `var(--shadow-elevation)` (cho thanh header, menu sort dropdown), `var(--shadow-lg)` (cho modal popup), `var(--bg-hover)` (cho hover tab/button), tuyệt đối không hardcode mã màu cục bộ.
   - **Giao diện Tối (`[data-theme="dark"]`)**: Nền đen `#000000`, card `#1c1c1c`, chữ `#f8f8f8`, viền `#555555`, gold `#e5c158`, chữ trên nền gold `--gold-text: #121214`.
   - **Giao diện Sáng (`[data-theme="light"]`)**: Nền canvas xám dịu mắt `#e9edf2` (triệt tiêu độ chói lóa, tương phản nổi bật với card), nền header/toolbar & card trắng tinh tế `#ffffff`, ô nhập `#f1f4f8`, chữ chính Slate 900 `#0f172a`, chữ phụ Slate 600 `#475569`, viền Slate 300 `#cbd5e1` sắc nét dứt khoát, gold hoàng gia đậm nét `#b8860b`, chữ trên nền gold `--gold-text: #ffffff`.
4. **Bảo toàn ảnh hóa đơn xuất cho khách (`order-canvas.js`)**:
   - Ảnh hóa đơn kết xuất để gửi khách hàng qua Zalo/Facebook luôn được giữ nguyên nền Dark Luxury `#121214` và chữ `#f8f8f8` bất kể người dùng đang duyệt app ở chế độ Sáng hay Tối.

## 1.8. Quy chuẩn Quản lý Icon Vector SVG & Kỹ thuật CSS Masking (`.icon-mask`) (SSOT)
1. **Nghiêm cấm vẽ thủ công SVG inline**:
   - Tuyệt đối KHÔNG tự ý viết code vẽ thủ công `<svg>`, `<path>`, `<rect>`, `<line>` trực tiếp trong HTML/JS/CSS khi hiển thị icon giao diện hoặc nút bấm.
   - Bắt buộc tái sử dụng toàn bộ file vector có sẵn trong thư mục `svg/` (`refresh.svg`, `filter.svg`, `money.svg`, `cost-price.svg`, `light-mode.svg`, `dark-mode.svg`, `male.svg`, `female.svg`, `unisex.svg`, `recent.svg`, `logo-full.svg`, `logo.svg`).
2. **Kỹ thuật CSS Masking chuẩn (`.icon-mask`)**:
   - **HTML**:
     ```html
     <span class="icon-mask class-rieng" style="mask-image: url('svg/icon.svg'); -webkit-mask-image: url('svg/icon.svg');"></span>
     ```
   - **Bộ 3 thuộc tính bắt buộc chống lỗi nhân bản (Icon Tiling Bug)**:
     ```css
     .icon-mask {
       display: inline-block;
       vertical-align: middle;
       background-color: currentColor;
       -webkit-mask-size: contain; mask-size: contain;
       -webkit-mask-repeat: no-repeat; mask-repeat: no-repeat;
       -webkit-mask-position: center; mask-position: center;
       flex-shrink: 0;
       pointer-events: none !important;
       border-radius: 0 !important;
     }
     ```
3. **Cơ chế đổi màu động (Dynamic Coloring)**:
   - Icon tự động đổi màu theo màu chữ của nút cha (`currentColor`) hoặc gán biến màu qua `background-color` (ví dụ: `background-color: var(--gold-primary)` khi hover/active, `var(--c-red)` khi thất bại).
   - Triệt tiêu hoàn toàn các selector can thiệp sâu `.st0`, `stroke`, `fill` phụ thuộc vào cấu trúc bên trong SVG.

---

# 2. TAB NƯỚC HOA (PERFUME TAB)

## 2.1. Tìm kiếm & Hiển thị danh mục sản phẩm
1. **Thanh tìm kiếm & Gợi ý**:
   - Áp dụng bộ máy tìm kiếm phân tầng `Tiered Best-Match Scoring` từ `common/product-search.js`.
   - Hỗ trợ tìm kiếm không dấu, đa từ khóa, tìm theo tên thương hiệu hoặc tên rút gọn.
2. **Thẻ sản phẩm**:
   - Hiển thị ảnh chai, thương hiệu, tên nước hoa, nồng độ, dung tích và các mức giá bán.
   - Tích hợp nút sao chép nhanh thông tin sản phẩm để gửi khách hàng.

## 2.2. Lịch sử xem gần đây (Recent History) & Ẩn/Hiện giá vốn
1. **Lịch sử xem gần đây**:
   - Lưu trữ danh sách sản phẩm vừa tra cứu qua `StorageHelper` (`recentPerfumeHistory`).
   - Giới hạn hiển thị 20 sản phẩm gần nhất, tự động đẩy sản phẩm mới xem lên đầu danh sách.
2. **Bảo mật giá vốn**:
   - Ẩn/hiện giá vốn thông qua switch cấu hình an toàn, mặc định ẩn đối với nhân viên bán hàng.

---

# 3. TAB VĂN MẪU / BẢNG TIN (NEWS & TEMPLATES TAB)

## 3.1. Danh mục bài viết mẫu & Thẻ nội dung
1. **Nguồn dữ liệu văn mẫu**:
   - Đồng bộ từ sheet `Tin tức` trên Google Sheet hoặc dữ liệu tạo nội bộ (`localNewsData`).
2. **Bố cục thẻ văn mẫu**:
   - Hiển thị tiêu đề, danh mục, nội dung tóm tắt và nút `Sao chép nội dung` tiện lợi.
   - Hỗ trợ định dạng icon và hashtag nhanh khi đăng bài lên mạng xã hội.

## 3.2. Modal thêm mới & Sao chép nhanh
1. **Thêm văn mẫu mới (`#addCardModal`)**:
   - Tuân thủ 100% kiến trúc Unified Modal Standard.
   - Lưu trữ tức thì vào bộ nhớ cục bộ và đồng bộ lên bộ nhớ đám mây khi có kết nối.

---

# 4. TAB ĐƠN HÀNG (ORDER TAB)

## 4.1. Tạo đơn hàng nhanh & Tìm kiếm sản phẩm
1. **Chọn sản phẩm vào đơn**:
   - Tích hợp tìm kiếm phân tầng từ `allProducts`, tự động gợi ý dung tích và giá bán tương ứng.
   - Cho phép tùy chỉnh số lượng, đơn giá thực bán và phụ thu/giảm giá.
2. **Thông tin khách hàng & Giao hàng**:
   - Điền tên khách hàng, số điện thoại, địa chỉ nhận hàng, phương thức vận chuyển và ghi chú đơn.

## 4.2. Quản lý chiết khấu, giá bán & Lưu bản nháp (Draft Persistence)
1. **Tự động lưu bản nháp đơn hàng (`activeOrderDraft`)**:
   - Bất kỳ thay đổi nào trong form tạo đơn (thêm món, sửa thông tin khách) đều được tự động lưu vào `StorageHelper`.
   - Khi người dùng vô tình đóng popup hoặc reload extension, toàn bộ thông tin đơn hàng đang soạn thảo được khôi phục nguyên vẹn 100%.
2. **Xóa bản nháp**:
   - Chỉ xóa sạch bản nháp khi người dùng hoàn tất tạo đơn hoặc chủ động nhấn nút Xóa đơn mới.

---

# 5. TAB NHẬP HÀNG (IMPORT TAB)

## 5.1. Nguồn dữ liệu Google Sheet & 6 Cột Danh sách Dropdown (List-*)
1. **6 Cột Danh sách Dropdown riêng biệt trên Google Sheet**:
   - Google Sheet bổ sung các cột riêng để quản lý các giá trị dropdown hợp lệ:
     - `List-Người Nhập`: Danh sách tên tài khoản Admin / Người nhập hàng.
     - `List-Nguồn Tiền`: Danh sách tài khoản ngân hàng, ví, quỹ tiền.
     - `List-Tình Trạng`: Danh sách trạng thái kiện hàng chuẩn (`Đã Nhận`, `Đang về`, `Hỏi Giá`, `Hoàn Hàng`).
     - `List-Người gửi`: Danh sách các đầu mối, đại lý, shop gửi hàng.
     - `List-Ghi chú`: Danh sách các mẫu ghi chú thường dùng.
     - `List-Dung tích`: Danh sách các dung tích định sẵn.
   - **Google Apps Script (`google-apps-script-import.js`)**:
     - Quét chính xác đúng các cột này theo tên chỉ định, lọc bỏ các ô rỗng và trùng lặp, trả về đối tượng `lists` trong JSON phản hồi (`{ items: [...], lists: { "List-Người Nhập": [...], "List-Nguồn Tiền": [...], "List-Tình Trạng": [...], "List-Người gửi": [...], "List-Ghi chú": [...], "List-Dung tích": [...] } }`).
     - Bảo vệ an toàn: Các thao tác thêm mới (`add_import_rows`) hoặc sửa dòng (`update_import_rows`) chỉ ghi vào 12 cột dữ liệu sản phẩm, tuyệt đối không bao giờ ghi đè hoặc làm mất dữ liệu của các cột `List-*`.
2. **Nguồn dữ liệu của các trường chuyên biệt**:
   - **Tên sản phẩm (`ten`)**: CHỈ lấy từ danh mục sản phẩm nước hoa hiện hành (`allProducts`), không quét từ hơn 2.500 dòng nhập để tránh rác và sai chính tả.
   - **Dung tích (`dung_tich`)**: Lấy theo các cột biến thể (`dungtich1` .. `dungtich5`) của chính sản phẩm đang chọn + các biến thể chiết mặc định (`5ml`, `10ml`, `20ml`).
   - **Đã thanh toán (`da_thanh_toan`)**: Chuẩn hóa text đẩy lên Google Sheet: chỉ lưu chính xác 2 giá trị text là `"Đã TT"` hoặc `"Chưa TT"` (đồng bộ 100% hiển thị và lưu trữ trên Sheet, không lưu dạng số 0).
   - **Ngày nhập (`ngay`)**: Khi click vào ô Ngày trên thẻ (chế độ sửa) hoặc ô Ngày trong modal "+ Thêm đơn", hiển thị dropdown 3 mục: `Hôm nay (DD/MM/YYYY)`, `Hôm qua (DD/MM/YYYY)`, `Hôm kia (DD/MM/YYYY)`. Khi click chọn sẽ điền chính xác chuỗi ngày tương ứng (`DD/MM/YYYY`).

## 5.2. Quy chuẩn tiền tệ, giá & số lượng (Không dùng đơn vị 'đ', nhập nhiêu lấy nhiêu)
1. **Bỏ hoàn toàn đơn vị `đ` trong tab Nhập**:
   - Toàn bộ giá trị tiền tệ trong tab Nhập (Đơn giá, Thành tiền món, Tổng tiền kiện hàng, Thanh tóm tắt, Gợi ý thanh toán) **không có chữ `đ` ở cuối**.
   - Định dạng hiển thị bắt buộc: Dấu chấm phân cách hàng nghìn (`toLocaleString("vi-VN")`, ví dụ: `2.500`, `250.000`, `2.500.000`).
2. **Giới hạn nhập số cho Giá và Số lượng (SL)**:
   - Ô `gia` và `sl` **chỉ cho phép nhập ký tự số từ `0` đến `9`**. Chặn toàn bộ ký tự chữ, dấu chấm, dấu phẩy, khoảng trắng trên sự kiện `keydown`.
   - Cho phép các phím điều hướng (`Backspace`, `Delete`, `Tab`, `Escape`, `Enter`, mũi tên) và tổ hợp phím tắt `Ctrl/Cmd + A, C, V, X, Z`.
   - Tự động lọc sạch ký tự không phải số khi dán từ clipboard (`replace(/\D/g, "")`).
3. **Cơ chế nhập giá - "Nhập nhiêu lấy nhiêu"**:
   - Không tự động nhân x1000. Gõ `2500` -> lưu `2.500`; Gõ `2500000` -> lưu `2.500.000`.
   - Trải nghiệm focus ô Giá: Khi focus vào ô giá đã có số (ví dụ `2.500.000`), tự động hiển thị chuỗi số nguyên gốc không dấu chấm (`2500000`) và bôi đen toàn bộ để người dùng gõ đè số mới ngay lập tức. Khi blur (rời ô hoặc gõ Enter), tự động format lại dấu chấm phân cách hàng nghìn.

## 5.3. Quy chuẩn Placeholder & Chế độ chỉnh sửa (Per-Card Edit)
1. **Placeholder không cho phép sửa chữ như text bình thường**:
   - Các trường khi rỗng sẽ hiển thị placeholder: `+ Ngày`, `+ Người gửi`, `👤 + Người`, `+ Tên sản phẩm`, `+ Dung tích`, `+ Giá`, `+ SL`, `💳 + Nguồn`, `+ Thêm ghi chú...`.
   - Khi click chuột hoặc nhấn Tab vào ô placeholder: Ô đó **xóa trắng ngay lập tức (`""`)**, gỡ bỏ class `is-placeholder`. Tuyệt đối không để nguyên text placeholder bắt người dùng backspace xóa.
   - Dropdown gợi ý bật lên liền ngay bên dưới con trỏ.
   - Nếu click vào làm trắng nhưng blur ra ngoài mà không chọn/nhập gì: Tự động phục hồi lại text placeholder ban đầu, gắn lại `is-placeholder`, và **không đánh dấu thẻ là dirty**.
2. **Chế độ chỉnh sửa từng thẻ kiện hàng (Per-Card Edit)**:
   - Bãi bỏ hoàn toàn chế độ sửa hàng loạt toàn cục. Nút `Sửa` và `Hủy` trên thanh tìm kiếm đã bị gỡ bỏ vĩnh viễn. Ô tìm kiếm mở rộng chiếm trọn chiều ngang toolbar.
   - Ở trạng thái bình thường (Xem): Nút `✏️ Sửa` mặc định ẩn, khi hover chuột vào thẻ `.import-card` thì nút sẽ xuất hiện ở góc trên bên phải (`top: -9px; right: 12px;`).
   - Khi click `✏️ Sửa`: Chỉ duy nhất kiện hàng đó kích hoạt chế độ chỉnh sửa (`.card-editable` với `activeEditingGroupId = groupId`). Nút chuyển thành cụm 2 nút: `✓ Xong` (Lưu lên Google Sheet qua `update_import_rows`) và `✕ Hủy` (Hoàn tác từ RAM và thoát chế độ sửa).
   - Chỉ khi giá trị thực tế sau khi sửa khác với dữ liệu ban đầu từ Google Sheet, thẻ mới được gắn class `card-dirty` và hiển thị badge `✏️ Đã sửa`.

## 5.4. Quy chuẩn trạng thái Inactive ("Hỏi Giá" / "Hoàn Hàng")
1. **Khóa các trường không phát sinh tiền**:
   - Khi trạng thái là `Hỏi Giá` (hoặc `Hỏi giá`) hoặc `Hoàn Hàng` (hoặc `Hoàn hàng`):
     - `da_thanh_toan` -> Khóa cứng, hiển thị `—`, gỡ bỏ quyền edit (`contenteditable="false"`).
     - `nguon_tien` -> Khóa cứng, hiển thị `—`, gỡ bỏ quyền edit.
     - `sl` -> Khóa cứng, hiển thị `—`, gỡ bỏ quyền edit.
     - `thanh_tien` và Tổng kiện -> Hiển thị `—`.
2. **Ghi nhận khi lưu lên Google Sheet**:
   - Các trường bị khóa trên được ghi nhận là chuỗi rỗng `""` khi gửi API POST lên Google Apps Script, không lưu rác `—` vào database.
3. **Mở khóa khi đổi trạng thái**:
   - Khi chuyển từ `Hỏi Giá` / `Hoàn Hàng` sang trạng thái bình thường (như `Đã Nhận`, `Đang về`), các ô trên tự động mở khóa, `sl` trở lại `1` hoặc số cũ, và hệ thống tự động tính toán lại Tổng tiền theo `Giá × SL`.

## 5.5. Quy chuẩn Layout & Giao diện kiện hàng (Header 3x2, Responsive 2 Cột × 2 Dòng)
2. **Cấu trúc Grid Tiêu đề 3 Cột × 2 Hàng (`.import-card-row-top`) - Cố định bề ngang**:
   - **Màn hẹp (< 550px - Popup & Sidepanel hẹp)**: Dùng chuẩn Grid `grid-template-columns: minmax(0, 1fr) 68px 68px;`
     - **Cột 1 (`minmax(0, 1fr)`)**: Mở rộng tối đa phần trống còn lại sau khi cột 2 và 3 đã có. Chứa Ngày (hàng 1) và Người gửi (hàng 2). Cho phép tên người gửi hiển thị dài nhất có thể trên thanh tiêu đề trên đỉnh thẻ.
     - **Cột 2 (`max 68px`)**: Bề ngang cố định 68px. Chứa Trạng thái (hàng 1) và Đã thanh toán (hàng 2).
     - **Cột 3 (`max 68px`)**: Bề ngang cố định 68px. Chứa Người nhập (hàng 1) và Nguồn tiền (hàng 2).
   - **Màn rộng (≥ 550px - Sidepanel rộng / Cửa sổ lớn)**: Dùng chuẩn Grid `grid-template-columns: 110px 68px 68px;`
     - **Cột 1 (`110px`)**: Bề ngang cố định tối đa 110px (`width: 110px; max-width: 110px;`), tên người gửi dài sẽ ellipsis gọn gàng.
     - **Cột 2 (`68px`)**: Bề ngang cố định tối đa 68px.
     - **Cột 3 (`68px`)**: Bề ngang cố định tối đa 68px.
    - **Đổ màu tiêu đề động theo Trạng thái (Dynamic Header Coloring)**: Nền tiêu đề (`.import-card-row-top`) được tô màu theo màu text của ô Trạng thái (`tinh_trang`):
      - Xanh lá (`var(--c-green)`): `Đã Nhận`, `Đã giao` (`theme-status-done`), chữ màu tối `#121214`.
      - Vàng gold (`var(--gold-primary)`): `Đang Về`, `Chờ hàng`, v.v. (`theme-status-pending`), chữ màu tối `#121214`.
      - Đỏ (`var(--c-red)`): `Hỏi Giá`, `Hoàn Hàng`, `Đã hủy` (`theme-status-cancel`), chữ màu trắng `#ffffff`.
      - Xanh dương (`var(--c-blue)`): Trạng thái khác (`theme-status-default`), chữ màu tối `#121214`.
      - Rỗng (`theme-status-empty`): Khi ô Trạng thái để trống hoặc `—`, nền tiêu đề là `var(--text-secondary)`, chữ màu trắng `#ffffff`. Badge hiển thị `—`.
    - **Đổ màu viền thẻ theo Thanh toán (Dynamic Card Border Coloring)**: Viền thẻ kiện hàng (`.import-card`) sử dụng màu của ô Đã thanh toán (`da_thanh_toan`) và độ dày `2px`:
      - Xanh lá: `Đã TT` (`theme-pay-paid`, `border: 2px solid var(--c-green) !important`).
      - Đỏ: `Chưa TT` (`theme-pay-unpaid`, `border: 2px solid var(--c-red) !important`).
      - Rỗng / `—` / Inactive: `theme-pay-none`, `border: 2px solid transparent !important;`, badge hiển thị `—` (`badge-paid-none`). Tuyệt đối không tự ý gán Chưa TT khi ô rỗng.
2. **Layout Màn hình hẹp (< 550px - Tiêu đề trên đỉnh)**:
   - Header tô màu theo trạng thái (`.import-card-row-top`) nằm trên đỉnh thẻ, bo góc trên `6px 6px 0 0` (khớp hoàn hảo với viền 2px của thẻ, loại bỏ hoàn toàn khe hở góc).
   - Danh sách sản phẩm (`.import-products-list`) xếp dọc bên dưới.
3. **Layout Màn hình rộng (≥ 550px - Tiêu đề chuyển sang cột trái)**:
   - **Bố cục 2 Cột song song (`grid-template-columns: auto 1fr;` - Bãi bỏ chia đều 50%-50%)**:
     - **Cột Trái (`auto`, tổng bề ngang ~261px)**: Tiêu đề kiện hàng (`.import-card-row-top`), bo góc trái `6px 0 0 6px`, vạch dọc ngăn cách bên phải. Cố định kích thước 3 cột (Cột 1: 110px | Cột 2: 65px | Cột 3: 60px).
     - **Cột Phải (`1fr` - Mở rộng tối đa phần trống còn lại)**: Danh sách sản phẩm (`.import-products-list`).
     - **Footer (Ghi chú / Tóm tắt đơn hàng)**: Trải ngang bên dưới cả 2 cột (`grid-column: 1 / -1;`).
4. **Nguyên tắc bảo tồn Single Source of Truth (100% CSS, Zero JS Duplication)**:
   - Toàn bộ cơ chế chuyển đổi layout giữa màn hẹp (< 550px) và màn rộng (≥ 550px) **PHẢI được thực hiện 100% bằng CSS Container Queries (`@container importPane (min-width: 550px)`) và Media Queries (`@media screen and (min-width: 550px)`)**.
   - Tuyệt đối KHÔNG nhân bản DOM hay viết nhánh điều kiện JavaScript `if (window.innerWidth >= 550)` để sinh HTML khác nhau. Cây DOM từ `createImportCardHtml()` phải luôn luôn giữ nguyên vẹn để bảo đảm cơ chế inline edit, combobox, tính tiền và đồng bộ Google Sheets không bao giờ bị phân mảnh lỗi.
5. **Kích thước tối thiểu ô Edit (Chống sụp layout)**:
   - Ô trong tiêu đề: `min-width: 52px` (riêng Ngày `68px`), `min-height: 18px`, `display: inline-flex`.
   - Ô Tên sản phẩm: `min-width: 80px`, `min-height: 20px`.
   - Ô Giá: `min-width: 45px`, `min-height: 18px`.
   - Ô SL: `min-width: 25px`, `min-height: 18px`.
6. **Quy chuẩn vị trí Thẻ Dung tích (`.import-badge-size`) - Cơ chế Inline Text-flow**:
   - **Chế độ xem thường (`:not(.card-editable)`)**: Bọc tên và dung tích trong `.import-prod-text-flow` với cơ chế text-flow inline (`display: inline;`). Thẻ dung tích (`display: inline-flex; vertical-align: middle;`) trôi tự nhiên sát ngay sau chữ cuối cùng của tên sản phẩm, kể cả khi tên rớt xuống dòng thứ 2 (ví dụ: `Montblanc - Signature` ở dòng 1 và `EDP [Fullbox 90ml]` ở dòng 2), không bao giờ bị văng sang mép phải tạo khoảng trống vô duyên.
   - **Chế độ chỉnh sửa (`.card-editable`)**: Thẻ lựa chọn dung tích tự động chuyển sang căn cố định ở mép phải (`margin-left: auto; justify-content: space-between`), nhường toàn bộ không gian ngang cho ô nhập tên sản phẩm (`flex: 1; min-width: 80px`), giữ vị trí thao tác ổn định không bị xê dịch khi người dùng gõ tên.
7. **Style 4 Badge Tiêu đề (Cố định chiều ngang, căn trái, dứt khoát Chưa TT)**:
   - Toàn bộ 4 ô ở Cột 2 và Cột 3 đều được hiển thị dưới dạng **thẻ (Badge)** đồng bộ, cố định bề ngang và **căn trái (`justify-content: flex-start; text-align: left;`)**:
     - **Cột 2 (Hàng 1)**: Trạng thái (Bỏ icon, chỉ hiển thị text như `Đã Nhận`, `Đang Về`, `Hỏi Giá`, cố định `width: 65px`, căn trái, class `badge-status-*`).
     - **Cột 2 (Hàng 2)**: Đã thanh toán (Bỏ icon `✓`/`✗`, chỉ hiển thị `Đã TT`, `Chưa TT` hoặc `—`, cố định `width: 65px`, căn trái, class `badge-paid-*`). Tuyệt đối không hiển thị `+ TT`. Nếu ô trên Sheet để rỗng thì hiển thị `—` và thẻ viền trong suốt `transparent`, tuyệt đối không tự ý gán thành Chưa TT.
     - **Cột 3 (Hàng 1)**: Người nhập (`👤 <Tên>`, cố định `width: 60px`, căn trái, class `badge-importer`, màu Cyan `--c-cyan`). Khi rỗng hiển thị `👤 + Người` (khi sửa) hoặc `👤 —`.
     - **Cột 3 (Hàng 2)**: Nguồn tiền (`💳 <Nguồn>`, cố định `width: 60px`, căn trái, class `badge-fund`, màu Tím `--c-purple`). Khi rỗng hiển thị `💳 + Nguồn` (khi sửa) hoặc `💳 —`.
   - Kích thước chữ cố định chuẩn `10px` - `11px`, nền tối chuẩn theme `var(--bg-primary)` / `var(--bg-card) !important`.
   - Khi badge ở trạng thái rỗng (`👤 + Người`, `💳 + Nguồn`), chữ placeholder bắt buộc phải có màu sáng (`rgba(255, 255, 255, 0.65)`) để đọc rõ ràng trên nền tối.
8. **Cấu trúc 2 Cột cho từng Sản phẩm (`.import-product-item`)**:
   - Mỗi item sản phẩm được chia thành **2 cột ngang** (`display: flex; flex-direction: row; align-items: center; gap: 8px;`):
     - **Cột 1 (`.import-prod-col-thumb`)**: Ảnh thumbnail sản phẩm kích thước `38px × 38px`, bo góc `6px`, bọc trong container `flex-shrink: 0`. Khi không có ảnh hoặc tên không khớp trong danh mục, cột ảnh tự động ẩn (`display: none`) để nhường toàn bộ không gian cho cột 2.
     - **Cột 2 (`.import-prod-col-main`)**: Chiếm trọn bề ngang còn lại (`flex: 1; min-width: 0;`), gồm 2 dòng layout:
       - **Dòng 1 (`.import-prod-row-top`)**: Số thứ tự (`.import-prod-num`), Tên sản phẩm (`.import-prod-name-edit` / `.import-prod-name`), Thẻ tag dung tích (`.import-badge-size` bọc trong `.import-prod-text-flow`).
       - **Dòng 2 (`.import-prod-row-bottom`)**: Đơn giá (`gia`), Số lượng (`sl`), và Thành tiền (`thanh_tien`).

## 5.6. Gom nhóm kiện hàng & Tách biệt đơn thăm dò (Package Grouping & Auto-merge)
1. **Khóa gom nhóm kiện hàng**:
   - Kiện hàng gom các dòng sản phẩm có chung: **Ngày + Người gửi + Trạng thái**.
   - `groupKey = "${dateVal}___${cleanSender}___${statusKey}"`.
2. **Tách biệt bắt buộc giữa Đơn thật và Đơn thăm dò**:
   - Các dòng có trạng thái không phát sinh tiền nhập kho (`Hỏi Giá`, `Hoàn Hàng`) **bắt buộc phải tách thành thẻ riêng biệt**, tuyệt đối không được gom chung vào thẻ đơn hàng thực tế (`Đã Nhận`, `Đang về`, `Chờ hàng`) dù có cùng Ngày và cùng Người gửi.
3. **Cơ chế tự động Merge (Gom đơn thông minh)**:
   - Dữ liệu trên Google Sheet được lưu dưới dạng từng dòng riêng lẻ (Flat rows).
   - Bất kể một dòng nằm ở dòng thứ 2 hay vừa được thêm vào dòng 3000 ở cuối sheet, khi nạp vào Extension, nếu có cùng **Ngày + Người gửi + Trạng thái**, hệ thống **tự động merge** các dòng đó vào chung một thẻ kiện hàng duy nhất. Số lượng món và tổng tiền kiện sẽ tự động cộng dồn chính xác.

## 5.7. Thêm mới kiện hàng (Add New Package Modal - Chuẩn Thẻ Kiện Hàng Đồng Bộ .import-card.card-editable)
1. **Layout Thẻ Kiện Hàng Đồng Bộ (`#addImportCard.import-card.card-editable`)**:
   - Form thêm mới trong `#modalAddImport` được thiết kế tương tự 100% như một thẻ kiện hàng bình thường đang ở chế độ chỉnh sửa (`.import-card.card-editable`), chia sẻ 100% markup, CSS, font chữ, border, và bộ xử lý sự kiện:
     - **Header 3 Cột × 2 Hàng (`#addImportCardHeader.import-card-row-top`)**: Cột 1 (Ngày, Người gửi), Cột 2 (Trạng thái, Đã thanh toán), Cột 3 (Người nhập, Nguồn tiền). Toàn bộ là các thẻ `span[data-field][contenteditable="true"]` kế thừa trọn vẹn styling của thẻ bên ngoài (`.import-top-val`, `.import-badge`). 5 trường giá trị đơn giản gồm Ngày (`ngay`), Trạng thái (`tinh_trang`), Đã thanh toán (`da_thanh_toan`), Người nhập (`nguoi_nhap`), và Nguồn tiền (`nguon_tien`) sử dụng thẻ dropdown `<select>` mặc định của trình duyệt (`appearance: none; -webkit-appearance: none;`) gọn gàng, tiết kiệm không gian, phản hồi tức thì và không chiếm dụng DOM menu nổi. Riêng trường Người gửi (`nguoi_gui`) là `span[contenteditable="true"]` có gợi ý từ `List-Người gửi`.
     - **Bộ điều khiển Combobox dùng chung (`#importComboboxMenu`)**: Click hoặc focus vào bất kỳ ô nào (`ngay`, `nguoi_gui`, `tinh_trang`, `da_thanh_toan`, `nguoi_nhap`, `nguon_tien`, `ghi_chu`, `ten`, `dung_tich`) đều kích hoạt menu dropdown nền tối viền vàng gold đồng bộ 100% với bên ngoài, lấy dữ liệu từ các cột `List-*` và từ điển danh mục `allProducts`.
     - **Đổi màu Header & Viền thẻ động**: Nền header đổi màu theo Trạng thái (Xanh lá `theme-status-done` khi `Đã Nhận`, Vàng khi `Đang về`, Đỏ khi `Hỏi Giá` / `Hoàn Hàng`); Viền thẻ dày 2px đổi theo Thanh toán (Xanh lá `theme-pay-paid` khi `Đã TT`, Đỏ `theme-pay-unpaid` khi `Chưa TT`). Tự động khóa/mở khóa thanh toán, nguồn tiền, SL khi chuyển trạng thái Hỏi Giá / Hoàn Hàng qua `applyStatusToCardUI`.
     - **Từng dòng sản phẩm 2 Cột (`.import-product-item.add-product-row-item`)**: Cột 1 là thumbnail 38×38px (tự động nhận diện và hiện ảnh từ catalog `allProducts`, ẩn khi chưa có tên), Cột 2 là Hàng 1 (STT + Tên sản phẩm + Thẻ Dung tích + Nút xóa ✕) và Hàng 2 (Giá + SL + 💵 Thành tiền). Các trường đều là `span[data-field][contenteditable="true"]`, Giá và SL kiểm soát chỉ cho phép gõ số và tự động tính tổng tiền món và tổng kiện qua `updateCardLiveTotal`.
     - **Vị trí nút `+ Thêm sản phẩm` (`#btnAddImportProductRow`)**: Nằm ngay bên dưới dòng sản phẩm cuối cùng của kiện hàng, có đường viền nét đứt màu gold tinh tế.
     - **Footer thẻ**: Chứa ô nhập ghi chú (`#addImportGhiChu`) và tóm tắt số lượng món + tổng tiền kiện hàng tự động cập nhật trực tiếp (`#addImportItemsCount`, `#addImportTotalAmount`).
2. **Giá trị mặc định**:
   - Ngày: Ngày hôm nay (`DD/MM/YYYY`).
   - Người nhập: Tự động điền chính xác tên tài khoản Admin đang đăng nhập hệ thống (`Dương`, `Quân`, hoặc `Minh`).
   - Người gửi: Mặc định placeholder `+ Người gửi`, click vào mở gợi ý từ `List-Người gửi`.
   - Trạng thái: Mặc định phần tử đầu tiên của `List-Tình Trạng` (hoặc `Đã Nhận`).
   - Thanh toán: Mặc định `Đã TT`.
   - Nguồn tiền: Mặc định placeholder `💳 + Nguồn`, click vào mở gợi ý từ `List-Nguồn Tiền`.
3. **Cơ chế ghi nhận & Lưu trữ**:
   - Gửi API POST `action: "add_import_rows"`, Google Apps Script dò tìm dòng cuối cùng có dữ liệu của cột "Tên" (`lastNameRow`), và ghi chèn dữ liệu mới bắt đầu ngay tại dòng tiếp sau (`targetRow = lastNameRow + 1`) bằng lệnh `setValues` theo khối; tuyệt đối không dùng `appendRow` để tránh bị nhảy xuống đáy bảng tính do các cột khác có checkbox/công thức rác.
   - Nạp vào RAM, lưu cache, kích hoạt Auto-merge và render tức thì với thông báo Toast thành công.

## 5.8. Nút mở nhanh bảng tính Google Sheet (`#btnOpenImportSheet`)
1. **Vị trí & Bố cục**:
   - Nằm ở góc bên trái của thanh `.import-summary-bar` (ngay trên đầu danh sách cuộn kiện hàng, căn đều 2 bên với bộ đếm đơn hàng bên phải qua `justify-content: space-between`).
2. **Quy chuẩn hiển thị & Màu sắc (Token System)**:
   - Nút dạng nhỏ gọn (`font-size: 10px; font-weight: 600; padding: 2px 7px; border-radius: 4px;`).
   - Sử dụng đúng token màu xanh lá thương hiệu: viền và chữ `var(--c-green)`, nền `var(--c-green-bg)`. Khi hover: nền chuyển `var(--c-green)` và chữ chuyển trắng `#ffffff`.
   - Hiển thị chữ `"file Nhập"` gọn gàng, không dùng icon vẽ inline.
3. **Hành vi mở trang**:
   - Khi bấm, tự động mở bảng tính Google Sheet Nhập Hàng (`https://docs.google.com/spreadsheets/d/1jrlUYUTx2qlVw1URIbRCMLpxo6zA_HNXE7PeY86O3qA/edit?usp=sharing`) bằng `chrome.tabs.create` (trên Chrome MV3 Extension) hoặc `window.open(url, "_blank")`.

## 5.9. Bộ lọc kiện hàng & Soát lỗi dữ liệu (`#btnImportFilterToggle`, `#importFilterDropdown`)
1. **Vị trí & Biểu tượng**:
   - Nằm trên thanh toolbar `.import-toolbar`, đặt ngay bên trái nút `+ Thêm đơn`.
   - Sử dụng trực tiếp file biểu tượng có sẵn trong thư mục `svg/`: `<img src="svg/filter.svg" class="filter-svg" alt="Bộ lọc">` (tuyệt đối không nhúng mã SVG inline vẽ tay). Kích thước nút chuẩn 34x34px, bo góc 8px.
   - Có chấm đỏ `#importFilterDot` ở góc trên bên phải báo hiệu khi đang có bộ lọc hoạt động. Khi kích hoạt, nút sáng viền vàng gold + ánh hào quang `box-shadow: 0 0 10px var(--gold-glow);`.
2. **Menu Dropdown Popover (`#importFilterDropdown`)**:
   - Bố cục gọn gàng (rộng 230px, bo góc 10px, đổ bóng elevation, căn mép phải toolbar `right: 10px;` chống tràn màn hình).
   - Tự động đóng khi click ra ngoài hoặc nhấn phím `Escape`.
   - Hiển thị số đếm theo thời gian thực (real-time badge count) cho từng tiêu chí. Các mục soát lỗi có số lượng > 0 sẽ hiển thị badge màu đỏ `--c-red` / `--c-red-bg` cảnh báo.
3. **Danh mục 7 tiêu chí lọc chuẩn**:
   - **Mục mặc định**: `📋 Tất cả đơn` (xóa lọc, hiện toàn bộ danh sách).
   - **Nhóm Soát lỗi dữ liệu (Data Quality)**:
     1. `⚠️ Chưa thanh toán` (`unpaid`): Lọc đơn thực tế có `da_thanh_toan` chưa trả (`✗ Chưa TT`).
     2. `👤 Thiếu người gửi` (`missing_sender`): Lọc đơn có ô Người gửi bị trống hoặc `-`.
     3. `🏷️ Có tên thiếu giá` (`missing_price`): Lọc đơn có tên sản phẩm nhưng Giá bị trống hoặc `= 0` (bỏ qua đơn Hỏi Giá/Hoàn Hàng).
     4. `💳 Đã TT thiếu nguồn` (`missing_fund`): Lọc đơn đã đánh dấu `✓ Đã TT` nhưng ô Nguồn tiền lại để trống hoặc `—` (tránh lệch sổ quỹ).
     5. `🔢 Thiếu số lượng (SL ≤ 0)` (`missing_qty`): Lọc đơn có tên sản phẩm nhưng SL bị trống hoặc `<= 0`.
   - **Nhóm Trạng thái kiện hàng (Status - 5 mục chuẩn)**:
     6. `✅ Đã Nhận` (`status_danhan`): Lọc đơn đã nhận / đã về / hoàn thành.
     7. `⏳ Order` (`status_order`): Lọc đơn đang đặt hàng / đang về / chờ hàng.
     8. `↩️ Hoàn Hàng` (`status_hoanhang`): Lọc đơn trả hàng hoàn tiền / hủy.
     9. `❓ Hỏi Giá` (`status_hoigia`): Lọc đơn khảo giá thị trường.
     10. `⚪ Chưa Rõ Trạng Thái` (`status_chuaro`): Lọc đơn chưa rõ hoặc để trống trạng thái.
4. **Huy hiệu bộ lọc đang hoạt động (`#importActiveFilterBadge`)**:
   - Khi có bộ lọc đang bật, trên thanh `.import-summary-bar` (cạnh nút `file Nhập`) xuất hiện một badge vàng `[ Tên bộ lọc ✕ ]`.
   - Bấm vào dấu `✕` trên badge sẽ xóa lọc và trở về danh sách đầy đủ ngay lập tức.
5. **Ghi nhớ trạng thái (State Persistence - Rule 6.2)**:
   - Tiêu chí lọc được lưu tự động vào `StorageHelper` (`activeImportFilter`) và khôi phục nguyên vẹn khi mở lại Extension.

---

# 6. TAB THỐNG KÊ (ANALYTICS & STATS TAB)

## 6.1. Bảo mật & Quản lý Router phân hệ (Sub-tabs Dropdown List)
1. **Bảo mật và Phân quyền Quản trị (Admin-Only Access)**:
   - Toàn bộ tab Thống Kê (`#tabStats`, `#paneStats`) và các file logic thống kê chỉ xuất hiện, hoạt động và tải dữ liệu khi Quản Trị Viên đã đăng nhập thành công (`checkIsAdminLoggedIn()`).
   - Khi chưa đăng nhập hoặc khi đăng xuất (`btnConfirmLogout`), nút tab và nội dung thống kê phải được ẩn hoàn toàn (`display: none`), dữ liệu trong RAM được xóa sạch (`clearStatsData()`), không để lộ thông tin tài chính ra giao diện người dùng thông thường.
2. **Cấu trúc phân hệ Module bằng tiếng Anh (Modular English Naming)**:
   - Các file phục vụ thống kê được đặt tên tiếng Anh chuẩn mực trong thư mục `stats/`:
     - `stats/stats.js`: Controller điều phối dropdown list và quản lý router giữa các phân hệ thống kê.
     - `stats/stats.css`: Bố cục layout tổng thể, dropdown list chọn mục con và khung cuộn mượt mà.
     - `stats/stats-finance.js`: Bộ máy tính toán, tổng hợp số liệu chi tiêu thành tiền theo Tháng và Năm.
     - `stats/stats-finance.css`: Giao diện bộ lọc thời gian, thẻ KPI chỉ số, thanh tỷ lệ chi tiêu tiến trình và lưới so sánh các năm.
     - `stats/stats-sender.js`: Phân hệ thống kê người gửi, lịch sử nhập hàng của từng người gửi.
     - `stats/stats-product.js`: Phân hệ thống kê lịch sử giá & người bán của từng chai nước hoa trùng tên.

## 6.2. Quy tắc Lưu trạng thái người dùng (State Persistence Rule)
> **Nguyên tắc cốt lõi cho Tab Thống Kê**: Người dùng đã chọn xem mục nào và sắp xếp danh sách theo tiêu chí nào thì hệ thống **bắt buộc phải ghi nhớ 100%**, khi chuyển qua lại giữa các tab hoặc reload Extension phải khôi phục nguyên vẹn trạng thái đó.

1. **Lưu trạng thái Sub-tab được chọn cuối cùng (`statsActiveSubtab`)**:
   - Khi người dùng bấm chuyển giữa 3 nút phân hệ (`.stats-subnav-btn`: `finance`, `sender`, `product` chia đều 3 cột, thiết kế Icon-Only dùng icon vector nguyên bản `tab-money.svg`, `tab-seller.svg`, `tab-perfume.svg` kèm tooltip hover): Lựa chọn được lưu tức thì vào `StorageHelper` (với fallback đồng bộ sang `localStorage`).
   - Khi mở lại Tab Thống Kê hoặc mở lại Extension: Tự động khôi phục đúng sub-tab người dùng vừa thao tác (ví dụ: đang ở `Người Gửi` thì giữ nguyên ở `Người Gửi`, tuyệt đối không tự ý reset về `Tổng Thành Tiền`).
2. **Lưu trạng thái Sắp xếp (Sort Mode) và Tùy chọn hiển thị của từng phân hệ**:
   - **Phân hệ Tổng thành tiền (`stats-finance.js`)**:
     - `statsFinanceSortMode`: Ghi nhớ tiêu chí sắp xếp các dòng Năm (`recent`: Năm mới nhất, `oldest`: Năm cũ nhất, `total`: Theo tổng tiền).
     - `statsFinanceDetailMode`: Ghi nhớ trạng thái bật/tắt của nút `👁️ Chi tiết` (hiển thị số kiện, số chai, % cao điểm).
   - **Phân hệ Người gửi (`stats-sender.js`)**:
     - `statsSenderSortMode`: Ghi nhớ tiêu chí sắp xếp danh sách người gửi (`recent`: Nhập gần nhất, `total`: Theo tổng tiền, `name`: Theo chữ cái A-Z).
     - `statsSenderDetailSortMode`: Ghi nhớ tiêu chí sắp xếp danh sách chai trong chi tiết của người gửi (`recent`: Ngày mới nhất, `oldest`: Ngày cũ nhất, `name`: Tên chai A-Z, `price_desc`: Giá cao nhất).
3. **Quy tắc mở rộng bắt buộc cho mọi phân hệ mới trong tương lai**:
   - Bất kỳ phân hệ thống kê nào được bổ sung sau này (ví dụ: `stats-product.js` chai trùng tên, thống kê thương hiệu, v.v.) **bắt buộc phải áp dụng quy chuẩn lưu trữ trạng thái này** (Single Source of Truth về State Persistence):
     - Tự động nạp giá trị đã lưu khi khởi tạo module.
     - Tự động ghi lại giá trị mới ngay khi người dùng thay đổi sort/filter/view options qua `StorageHelper.set()`.
     - Khi đăng xuất Quản Trị Viên: Chỉ xóa sạch dữ liệu DOM hiển thị (`container.innerHTML = ""`) và các thông tin truy vấn tìm kiếm nhạy cảm, **tuyệt đối giữ nguyên tùy chọn sort/preferences** để khi Admin đăng nhập lại vẫn có trải nghiệm thân thuộc.

## 6.3. Quy tắc định dạng tiền tệ và số liệu tài chính (Dot Separator Without Unit)
- Toàn bộ các con số tài chính hiển thị trên giao diện Thống Kê bắt buộc sử dụng định dạng số có dấu chấm phân cách hàng nghìn và **tuyệt đối không kèm ký hiệu đơn vị tiền tệ** (ví dụ: `125.400.000`, không viết `125.400.000đ`). Sử dụng hàm `formatMoneyVND()` từ `common/formatters.js`.

## 6.4. Phân hệ Thống kê Tổng thành tiền (Finance Stats: Collapsible Years, Bar Chart, Month Grid, Nút Sort)
1. **Giao diện dòng Năm Collapsible**:
   - Năm bên trái, tổng tiền năm bên phải (`formatMoneyVND`).
   - Thanh tiến trình `finance-progress-fill` bên dưới hiển thị tỷ lệ % so với năm cao điểm nhất để so sánh trực quan giữa các năm.
   - Click vào dòng Năm để mở rộng / thu gọn độc lập (`is-expanded`), tự động mở sẵn năm mới nhất chỉ duy nhất 1 lần khi khởi tạo (`isFinanceInitialized`). Cho phép đóng toàn bộ các năm hoặc mở nhiều năm tùy ý.
   - Tự động bảo lưu vị trí thanh cuộn (`scrollTop`) khi đóng / mở thẻ để tránh giật giao diện lên đầu.
2. **Nút Sắp xếp Năm (`btnFinanceSortToggle`)**:
   - Tích hợp nút Filter (reuse icon từ tab Nước hoa) ngay trên thanh toolbar cạnh nút Chi tiết.
   - Menu dropdown hỗ trợ 3 tiêu chí: 🗓️ Năm mới nhất (mặc định), 🗓️ Năm cũ nhất, 💵 Theo tổng tiền.
   - Tự động đóng menu khi click ra ngoài hoặc khi chọn xong.
3. **Nội dung mở rộng bên trong dòng Năm**:
   - Bắt buộc thiết lập `flex-shrink: 0` trên toàn bộ thẻ và mục con để ngăn flexbox co rút chiều cao, đảm bảo thanh cuộn mượt mà không bị ép vào chiều cao extension:
     1. **Biểu đồ cột đứng 12 tháng (`finance-bar-chart`)**: Thiết kế pure HTML/CSS flexbox `align-items: flex-end`, chiều cao chuẩn 120px, nhãn T1...T12 sắc nét, cột đổi màu gradient khi hover, làm nổi bật cột tháng cao điểm nhất năm (thẻ sao ⭐ / viền sáng).
     2. **Lưới 3 cột × 4 hàng 12 tháng (`finance-month-grid`)**: Hiển thị cố định 12 tháng trong năm. Tên tháng ở trên, tổng thành tiền của tháng ở dưới.
4. **Nút "Chi tiết" (`btnFinanceDetailToggle`)**:
   - Nút pill toggle ở toolbar trên cùng: Mặc định tắt cho gọn gàng.
   - Khi bật: trên mỗi dòng Năm và từng ô Tháng sẽ hiển thị thêm: số kiện hàng, số chai, và % cao điểm.
   - Hover vào từng cột biểu đồ có tooltip chi tiết (Tháng/Năm, tổng tiền, số kiện, số chai, % đỉnh).

## 6.5. Phân hệ Thống kê theo Người gửi (Sender Stats: Danh sách, Chi tiết, Phân cột Tên - Dung tích, Nút Sort)
1. **Danh sách tất cả người gửi**:
   - Hiển thị danh sách người gửi (`nguoi_gui`), thanh tìm kiếm tên người gửi không dấu (`removeAccents`).
   - Nút Filter danh sách người gửi hỗ trợ 3 chế độ sắp xếp: 🗓️ Nhập gần nhất, 💵 Theo tổng tiền, 🔤 Theo chữ cái (A-Z).
2. **Màn hình Chi tiết người gửi**:
   - Khi click vào 1 người gửi: hiển thị màn hình chi tiết gồm header tóm tắt (số món, số chai, tổng tiền) và nút Trở về danh sách.
   - Thanh tìm kiếm chai: bọc trong `.sender-search-row` với `flex-shrink: 0`, chiều cao chuẩn 32px, không bị co giãn chiều dọc.
   - **Nút Sort danh sách chai**: Nằm ngay bên phải ô tìm kiếm chai, hỗ trợ 4 tiêu chí sắp xếp:
     - 🗓️ **Ngày nhập mới nhất** (mặc định - mới nhất lên trên cùng).
     - 🗓️ **Ngày nhập cũ nhất** (xếp theo thứ tự ngày tăng dần).
     - 🔤 **Theo tên chai (A-Z)** (chuẩn bảng chữ cái tiếng Việt).
     - 💵 **Theo giá cao nhất** (xếp theo đơn giá từ cao xuống thấp).
   - Tự động đóng menu sort khi click ra ngoài hoặc khi bấm nút Trở về danh sách.
3. **Bố cục từng dòng chai nước hoa**:
   - Phía trước là ảnh thumbnail nếu tên khớp 100% trong `allProducts` qua hàm `getProductImageByName()` (nếu không khớp 100% thì ẩn ảnh).
   - **Hàng trên:** Tên chai (`ten`) và Thẻ tag dung tích (`dung_tich`) áp dụng cơ chế text-flow inline (`.sender-item-row-top { display: block; line-height: 1.4; }` và `.sender-item-name { display: inline; }`). Thẻ tag dung tích trôi dính liền sát ngay sau chữ cuối cùng của tên chai kể cả khi rớt dòng thứ 2, phong cách thẻ gold bo góc.
   - **Hàng dưới:** Phía bên dưới là các thẻ meta (Ngày `ngay`, Trạng thái, SL) và **Giá tiền** (`gia` / `formatMoneyVND`) nằm ở góc bên phải.

## 6.6. Nguồn dữ liệu & Loại trừ trạng thái không chi tiền (SSOT & Data Integrity)
- Lấy dữ liệu trực tiếp từ mảng `importRawData` của Tab Nhập hàng qua `window.getImportRawData()`.
- Tuyệt đối loại trừ các đơn hàng không phát sinh chi phí thực tế: Chỉ gồm `"Hỏi Giá"` và `"Hoàn Hàng"`.
- Tự động lắng nghe và cập nhật lại số liệu thống kê ngay khi dữ liệu Tab Nhập có thay đổi thông qua sự kiện `window.onImportDataUpdated()`.

## 6.7. Phân hệ Thống kê theo Sản phẩm (Product Stats: Danh sách chai chuẩn & Lịch sử nhập hàng)
1. **Nguồn dữ liệu danh mục & đồng bộ Google Sheet**:
   - Cột dữ liệu sản phẩm trên Google Sheet tab `Nhập` là `"Sản Phẩm"` (trước đây là `"Tên"`), được API Apps Script tự động đọc vào key `item.ten`.
   - Danh sách chuẩn các chai nước hoa được trích xuất từ cột `"List-Sản phẩm"` vào `cachedImportLists["List-Sản phẩm"]`.
   - Thuật toán tổng hợp tự động kết hợp danh sách từ `"List-Sản phẩm"` với các dòng thực tế trong `importRawData` để đảm bảo 100% không bao giờ bỏ sót bất kỳ chai nào đã từng nhập.
2. **Màn hình Cấp 1 (Master Product List)**:
   - Hiển thị danh sách các chai nước hoa kèm ảnh thumbnail (`getProductImageByName()`), tên chai, tổng số lần nhập, tổng số chai (`sl`), giá nhập gần nhất và ngày gần nhất.
   - Thanh tìm kiếm tức thì theo tên chai (bỏ dấu tiếng Việt qua `removeAccents`).
   - Nút Filter hỗ trợ 4 chế độ sắp xếp: 🗓️ Nhập gần nhất (mặc định), 📦 Nhập nhiều nhất, 🔤 Theo chữ cái (A-Z), 💵 Theo giá mới nhất (Cao → Thấp).
3. **Màn hình Cấp 2 (Product History Drill-down)**:
   - Khi click vào bất kỳ chai nước hoa nào, mở màn hình Lịch Sử Chi Tiết với nút `← Trở về`.
   - Header hiển thị ảnh chai, tên chai, thanh stats tổng kết: Đã nhập X lần • Tổng Y chai • Giá mới nhất Z đ • Khoảng giá biến động Min ~ Max.
   - Thanh tìm kiếm trong lịch sử: lọc nhanh theo Người gửi (`nguoi_gui`), Ngày (`ngay`), Ghi chú (`ghi_chu`), Dung tích (`dung_tich`).
   - Nút Filter sắp xếp lịch sử: 🗓️ Ngày mới nhất, 🗓️ Ngày cũ nhất, 💵 Giá cao nhất, 💵 Giá thấp nhất, 👤 Theo người gửi (A-Z).
   - Bố cục từng dòng lịch sử:
     - **Hàng trên:** Người gửi (`👤 nguoi_gui`) nổi bật bên trái, Giá nhập (`gia` / `formatMoneyVND` màu vàng kim) bên phải.
     - **Hàng dưới:** Ngày nhập `🗓️ ngay`, Thẻ dung tích (`dung_tich`), Thẻ số lượng (`SL: qty`), Thẻ trạng thái đơn hàng (`tinh_trang` color-coded), Ghi chú (`ghi_chu`).

---

# 7. HẠ TẦNG VÀ TÍCH HỢP HỆ THỐNG (SYSTEM INTEGRATION & STORAGE)

## 7.1. Cơ chế lưu trữ StorageHelper (chrome.storage.local & localStorage fallback)
1. **Kiến trúc Storage Wrapper**:
   - `StorageHelper` (`storage-helper.js`) là bộ điều phối đọc/ghi dữ liệu chính thức cho Extension.
   - Sử dụng `chrome.storage.local` khi chạy trong môi trường Chrome Extension và tự động fallback sang `localStorage` với JSON serialization an toàn khi chạy trên trình duyệt web thông thường.
2. **Quy chuẩn đặt tên khóa lưu trữ (Storage Keys Standard)**:
   - Tất cả các khóa lưu trữ phải có tiền tố rõ ràng theo phân hệ (ví dụ: `statsActiveSubtab`, `statsFinanceSortMode`, `statsFinanceDetailMode`, `statsSenderSortMode`, `statsSenderDetailSortMode`, `activeOrderDraft`, `cachedProducts`, `cachedImportData`).

## 7.2. Tích hợp Google Apps Script API & Đồng bộ thời gian thực
1. **Kết nối API Google Sheet**:
   - Sử dụng Google Apps Script Web App làm cầu nối trung gian bảo mật (Backend proxy).
   - Phương thức GET: Nạp dữ liệu sản phẩm (`Nước hoa`), dữ liệu bài viết (`Tin tức`), và dữ liệu nhập hàng (`Nhập`).
   - Phương thức POST: Ghi dữ liệu sửa kiện hàng (`update_import_rows`) và thêm mới kiện hàng (`add_import_rows`).
2. **Cơ chế Cache và Live Update**:
   - Bộ nhớ đệm RAM (`importRawData`, `allProducts`) giúp giao diện phản hồi tức thì với độ trễ 0ms.
   - Nút `Làm mới dữ liệu` trên thanh thương hiệu cho phép đồng bộ cưỡng bức dữ liệu mới nhất từ Google Sheet về máy bất kỳ lúc nào.

## 7.3. Cửa sổ Mini Window độc lập & Chrome Extension Manifest V3
1. **Cửa sổ Mini Window**:
   - Hỗ trợ mở Extension dưới dạng popup extension thông thường hoặc cửa sổ nổi riêng biệt (`chrome.windows.create`, kích thước chuẩn 420x720px) thông qua `common/mini-window.js`.
2. **Tuân thủ Manifest V3**:
   - Sử dụng Service Worker làm background script (`background.js`).
   - Tuyệt đối tuân thủ chính sách Content Security Policy (CSP): không dùng `eval()`, không dùng inline JavaScript (`onclick="..."`, `onerror="..."`), tách bạch hoàn toàn mã xử lý logic vào các tệp `.js` độc lập.

---

# 8. PHÂN HỆ CÔNG CỤ QUẢN TRỊ (MINI TOOLS & COST CHECKER)

## 8.1. Phân quyền & Vị trí Tab Mini Tools
- Nằm ở **Hàng 2 (`#tabRowSub`)**, đứng bên cạnh tab `Nhập` và `Thống Kê`.
- Chỉ Quản Trị Viên đăng nhập thành công (`isAdminLoggedIn === true`) mới thấy và sử dụng tab này; khi đăng xuất tự động ẩn và chuyển về tab Nước Hoa.
- **Bố cục dạng lưới 2 cột (`grid-template-columns: repeat(2, 1fr)`) phân thành 2 nhóm rõ ràng**:
  - **Nhóm 1 (`Tools`)**:
    1. 🏷️ **Kiểm tra giá Vốn**: Mở cửa sổ popup độc lập Kiểm Tra Giá Vốn (chuẩn hình vuông 900×900px).
  - **Nhóm 2 (`Google Sheet`)**:
    2. 📗 **Chi Phí Vốn**: Mở tab Google Sheet Chi Phí Vốn.
    3. 📗 **Tổng Kết Tháng**: Mở tab Google Sheet Tổng Kết Tháng.
    4. 📗 **File Nhập**: Mở tab Google Sheet File Nhập.
    5. 📗 **Gửi Khách Zalo**: Mở tab Google Sheet Gửi Khách Zalo (`https://docs.google.com/spreadsheets/d/1K8kMtmAG0ZwNC9mr-tPQ3VkcAU7RzRWbBWlGu0y9Dzw/edit?gid=1199644754#gid=1199644754`).

## 8.2. Công cụ "Kiểm Tra Giá Vốn" (Cost Checker Standalone Tool)
1. **Kiến trúc Cửa sổ Độc lập & Đơn Nhất (Single Instance, Square 900×900px)**:
   - Mở từ thẻ card trong tab Mini Tools dưới dạng cửa sổ popup riêng biệt (`mini-tools/cost-checker.html`).
   - **Kích thước cửa sổ chuẩn hình vuông**: Chiều cao bằng chiều ngang (`cao = ngang`, chuẩn `900×900px`, tự động co giãn an toàn theo màn hình người dùng).
   - Đảm bảo **chỉ duy nhất 1 cửa sổ tồn tại cùng lúc**: Khi người dùng bấm mở lại, hệ thống tự động tìm và focus ngay cửa sổ đang mở thay vì tạo cửa sổ mới.
2. **Bố cục Dạng Bảng Tính Excel Thống Nhất (Unified Spreadsheet View)**:
   - Toàn bộ các cột và cột số thứ tự `#` nằm chung trong một bảng tính Excel thống nhất, sử dụng **thanh cuộn chung duy nhất** (không chia khung riêng lẻ).
   - **Tên tiêu đề cột**: Rút gọn chuẩn xác lần lượt là **`Output`**, **`Hình`**, **`Input`**, **`Giá Recheck`**, **`Giá Vốn`**, **`Merge`**.
   - **Font chữ đồng bộ 100%**: Sử dụng font Nunito Variable offline chuẩn từ thư mục `Nunito/` (`@font-face`) chia sẻ cùng toàn bộ Extension.
   - **Định dạng hiển thị dữ liệu**: Văn bản hiển thị không dùng bold (`font-weight: 400/500`). Khi tên tìm được **khớp chính xác 100%** từng chữ cái với tên input (đầy đủ hoặc tên rút gọn), tên ở cột Output sẽ tự động chuyển sang **màu xanh lá (`match-100`)**.
   - **Quy tắc bỏ chữ Chiết**: Riêng phân loại Chiết tuyệt đối **không ghi chữ 'Chiết'** mà chỉ ghi dung tích đi kèm (ví dụ: `Afnan - Supremacy Collector's Edition EDP - 10ml`).
   - **Cột Hình thumbnail**: Nằm giữa cột `Output` và `Input`, ảnh hiển thị trực tiếp trong ô mà không có khung viền con bên trong.
   - **Nút '🖼️ Hiện ảnh lớn' & Khung xem ảnh 128×128 neo theo dòng**: Thêm nút toggle trên Toolbar (`#btnTogglePreview`). Mặc định tắt; chỉ khi bật, khi rê chuột vào dòng bất kỳ có ảnh, khung xem ảnh kích thước **128×128px** sẽ hiển thị cố định ngay **phía trên (hoặc phía dưới nếu sát mép trên)** của dòng đó và căn thẳng hàng với cột `Hình` (không bám theo con trỏ chuột). Trạng thái nút được lưu vào `localStorage`.
   - **Căn giữa dọc tuyệt đối (Vertical Middle Alignment)**: Toàn bộ nội dung văn bản và ô nhập liệu trên tất cả các cột (`#`, `Output`, `Hình`, `Input`, `Giá Recheck`, `Giá Vốn`, `Merge`) luôn được căn giữa dòng theo trục dọc (`vertical-align: middle;`, kết hợp khung bọc `.cell-flex-wrap { display: flex; align-items: center; }` cho textarea). Kể cả khi tên dài tự động ngắt dòng (word-wrap) làm tăng chiều cao hàng thì nội dung của các cột bên cạnh vẫn luôn giữ vị trí chính giữa dòng chuẩn xác.
   - **Hỗ trợ Word Wrap (xuống dòng tự nhiên)**: Khi tên sản phẩm hoặc nội dung quá dài, ô tự động ngắt dòng tự nhiên (`white-space: pre-wrap; word-break: break-word`) và tự co giãn chiều cao dòng mượt mà.
   - **Khởi động tức thì (Zero-latency Instant Display)**: Dữ liệu đã lưu ở các cột (Input, Giá Recheck, Output, Giá Vốn, Hình) được đọc đồng bộ từ `localStorage` và hiển thị lên màn hình ngay tức thì (0ms) khi mở popup mà không phải chờ quá trình tải mạng. Quá trình tra cứu đối chiếu từ Google Sheet diễn ra ngầm phía sau và tự động cập nhật lại.
   - **Hiệu ứng sáng dòng khi hover chuột rõ nét**: Khi di chuột vào bất kỳ ô nào trên dòng, toàn bộ dòng (`tr.excel-row:hover`) sáng lên màu vàng gold rõ rệt (`rgba(229, 193, 88, 0.22)`) và cột `#` sáng đậm (`0.35`) giúp người dùng đối chiếu ngang cực kỳ trực quan và không bị mỏi mắt. Toàn bộ màu sắc tuân thủ 100% design token từ `theme.css`.
   - Hỗ trợ gõ trực tiếp trong ô với phím điều hướng `Enter` / `ArrowDown` / `ArrowUp` như Excel thật.
3. **Bộ bóc tách phân tầng nghiêm ngặt (5-Tier Parser)**:
   - **Tầng 1 (Gốc)**: Nhận diện phân số `X/Y` hoặc từ khóa `gốc`, `goc` $\rightarrow$ `Gốc Full`, `Gốc Tester`, `Gốc Nobox`. Đánh dấu `isGoc = true` để bỏ qua tra cứu giá vốn.
   - **Tầng 2 (Mini)**: Bắt từ khóa `mini` $\rightarrow$ Loại `Mini`, quét số đi kèm.
   - **Tầng 3 (Dung tích)**: Quét số hợp lệ chia hết cho 5 (5-500) hoặc số 88.
   - **Tầng 4 (Loại)**: Chỉ nhận diện đúng các từ khóa có tiền tố `"- "`: **`- Refill`**, **`- Tester`** / **`- Test`**, **`- Nobox`**, **`- Full`** (không phân biệt chữ hoa chữ thường; tuyệt đối không tự ý thêm các biến thể khác như re-fill, ko box, no hộp). **Tuyệt đối không tìm chữ "chiết"**; nếu dung tích là 5, 10, 20ml tự động gán là `Chiết`. Không có từ khóa và dung tích $\ge 30$ml tự gán là `Full`.
   - **Tầng 5 (Làm sạch & So khớp)**: Làm sạch tên (chỉ bóc tách từ khóa loại khi có tiền tố `"- "` để bảo tồn nguyên vẹn các tên nước hoa có chữ Full/Test trong tên như *Montale Full Incense*), đưa qua `searchProducts()` tìm Tên chuẩn trong `allProducts`.
4. **Quy tắc tra cứu & Định dạng Giá Vốn Cột 4 (Cost Price Lookup)**:
   - **Chiết (5, 10, 20ml)**: Lấy tương ứng từ `giavon5ml`, `giavon10ml`, `giavon20ml`.
   - **Tester**: Quét dung tích khớp slot `1..5` trong `dungtich1..5`, lấy giá từ `giavontest1..5`.
   - **Full / Nobox / Refill / Mini**: Quét dung tích khớp slot `1..5`, lấy giá từ `giavonfull1..5`.
   - **Trường hợp là Gốc (`isGoc === true`)**: **Bỏ qua (skip)**, luôn xuất chuỗi rỗng `""`.
   - **Trường hợp không tìm thấy hoặc giá không tồn tại**: Xuất chuỗi rỗng `""`, tuyệt đối không điền bừa.
   - **Định dạng rút gọn chia 1000 (tối đa 1 chữ số sau dấu phẩy)**: Giá vốn xuất ra dưới dạng rút gọn chia cho 1.000, số thập phân sau dấu phẩy làm tròn lấy đúng 1 chữ số:
     - Số nguyên: `570000 -> 570`, `2100000 -> 2.100`
     - Số thập phân lẻ (làm tròn 1 chữ số sau dấu phẩy): `196588 -> 196,6`, `472667 -> 472,7`, `64100 -> 64,1`
     - Số lớn có phân cách hàng nghìn và thập phân: `1515300 -> 1.515,3`
5. **Cơ chế Đối Chiếu Giá Vốn & Dung Sai $\pm 1$ (Cột 3 vs Cột 4)**:
   - Chuẩn hóa số học dòng-tương-ứng (tự động nhận diện cả `570`, `570k`, `570.000`, `64,1`, `64.1`, `64100`, `1.515,3`, `1515300`).
   - **Quy tắc dung sai cho phép lệch $\pm 1$**: Giá Recheck và Giá Vốn cho phép chênh lệch tối đa $\pm 1$ đơn vị ($|Giá_{recheck} - Giá_{vốn}| \le 1.001$, ví dụ: `472,7` và `472,667` chênh lệch 0.033) thì hệ thống vẫn tính là khớp chuẩn xác và hiển thị **màu xanh lá (`cell-match`)**, loại bỏ cảnh báo đỏ không đáng có khi làm tròn số. Khi lệch $> 1$ mới tô đỏ cảnh báo (`cell-mismatch`).
   - Huy hiệu thống kê trên Toolbar tự động hiển thị:
     - `✓ X/Y khớp giá`: Toàn bộ giá nhập khớp 100% với hệ thống.
     - `⚠️ N lệch giá (X/Y khớp)`: Có dòng giá bị lệch (vượt quá dung sai $\pm 1$), giúp quản trị viên rà soát tức thì.
6. **Cột Hợp Nhất Dữ Liệu Giá (Cột Merge)**:
   - Tự động hợp nhất dữ liệu của `Giá Vốn` (hệ thống) và `Giá Recheck`.
   - **Quy tắc ưu tiên**: Ưu tiên hiển thị giá trị `Giá Vốn` (output) trước; nếu `Giá Vốn` rỗng (do chưa tìm thấy hoặc là dòng Gốc) mà `Giá Recheck` có nhập liệu thì lấy giá trị của `Giá Recheck` (tự động chuẩn hóa về định dạng rút gọn K tương đương như `570`, `64,1`, `1.515,3`).
   - **Màu sắc khớp 100% với trạng thái của Giá Vốn (output)**:
     - Khi lấy từ `Giá Vốn` (output hệ thống): Màu sắc của cột Merge **khớp 100% với màu của ô Giá Vốn** tương ứng:
       - Nếu khớp giá ($\pm 1$): Hiển thị **màu xanh lá (`cell-match`)**.
       - Nếu lệch giá ($> 1$): Hiển thị **màu đỏ (`cell-mismatch`)**.
       - Nếu chưa có giá recheck để đối chiếu: Hiển thị **màu vàng gold mặc định (`var(--gold-primary)`)**.
     - Khi lấy từ `Giá Recheck` (bù giá do Giá Vốn rỗng): Hiển thị **text màu trắng (`#ffffff`)** nổi bật (ở giao diện sáng tự động chuyển sang màu tương phản cao `var(--text-primary)`).
   - Nút **`📋 Copy`** trên tiêu đề cột Merge (`#btnCopyMerge`) hỗ trợ sao chép toàn bộ cột chỉ với 1 click để dán trực tiếp vào Google Sheet / Excel.
7. **Lưu trữ tự động & Khôi phục trạng thái (State Persistence)**:
   - Dữ liệu Cột 2 (`costCheckerInputNames`) và Cột 3 (`costCheckerInputCosts`) được tự động lưu ngay khi người dùng gõ hoặc dán qua `StorageHelper` và `localStorage`.
   - Khi mở lại cửa sổ, dữ liệu được phục hồi 100% và tự động chạy lại thuật toán tra cứu tức thì.
   - Bấm `Xóa trắng` sẽ dọn dẹp sạch cả bảng tính lẫn dữ liệu đã lưu trong storage.
