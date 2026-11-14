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
     - `common/modal-controller.js`: Bộ điều khiển popup/modal tự động xử lý backdrop click và phím `Escape`, kèm hộp xác nhận dùng chung `confirmAction(message, okLabel)`.
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
   - Mỗi tài khoản một mật khẩu, khai báo trong `ADMIN_PASSWORDS` (`panel.js`, khóa là tên không dấu: `duong`, `quan`, `minh`). Dương và Quân dùng chung mật khẩu cũ, **Minh có mật khẩu riêng**. Không chép mật khẩu vào tài liệu này.
3. **Phân quyền tính năng**:
   - Chỉ khi đăng nhập quản trị thành công (`isAdminLoggedIn === true`), tab **Nhập**, tab **Thống Kê**, tab **Mini Tools** và nút xem giá vốn/sửa giá mới được phép kích hoạt và hiển thị.
   - **Quy tắc "(M)"**: tool hoặc trang Google Sheet trong Mini Tools có tên bắt đầu bằng `(M)` **chỉ hiện với tài khoản Minh**; tài khoản khác ẩn hẳn (không thấy, không bấm được). Kiểm tra lại mỗi lần mở tab Mini Tools (`applyOwnerOnlyCards` trong `mini-tools.js`). Thêm tool/sheet riêng cho Minh chỉ cần đặt tên có `(M)` ở đầu.
   - Khi đăng xuất: tự động xóa sạch dữ liệu nhạy cảm trên DOM và RAM, tự động chuyển về tab Nước Hoa.

## 1.3. Bộ máy tìm kiếm nước hoa thống nhất (Tiered Best-Match Scoring)
1. **Thuật toán phân tầng ưu tiên (Scoring Engine)**:
   - Kế thừa và nâng cấp từ thuật toán đếm từ trùng của tool Matcher cũ (nay là `mini-tools/name-normalizer-parser.js`, xem §8.3) kết hợp cơ chế phân tầng độ ưu tiên:
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
   - Mọi thông báo hủy chỉnh sửa, lưu thành công, nhắc nhở hoặc lỗi mạng bắt buộc phải được hiển thị qua hàm `showToast(msg, autoHide = true, duration = 2500)` (hoặc `showSuccessToast` / `showWarningToast` / `showErrorToast`) nổi ngay bên dưới thanh tab của Extension.
3. **Hỏi xác nhận trước thao tác xóa / làm mới (`confirmAction`)**:
   - Dùng `await confirmAction("Câu hỏi?", "Nhãn nút")` (trả về `true`/`false`) với modal dùng chung `#confirmModal` cuối `panel.html` (chuẩn Unified Modal Standard). Bấm Hủy, ✕, click nền mờ hoặc nhấn `Escape` đều trả về `false`.
   - Đang áp dụng cho: xóa món khi bớt SL về 0 và Làm mới đơn (tab Đơn hàng), xóa thẻ văn mẫu tự tạo (tab Văn Mẫu).
   - Khi người dùng nhấn `✕ Hủy`: Tự động hoàn tác ngay lập tức và hiện toast `Đã hủy chỉnh sửa.`, không bật popup hỏi lại gây phiền phức.

## 1.7. Quy chuẩn Giao diện Sáng / Tối (Theme Controller: Dark & Light Mode)
1. **Vị trí và Biểu tượng Nút Theme (`#btnThemeToggle`)**:
   - Nằm trên thanh header thương hiệu, đặt **ngay bên phải nút Cập nhật (`#btnRefresh`)**.
   - Sử dụng 2 icon SVG chuẩn từ thư mục `svg/`:
     - Khi đang ở **Giao diện Tối (Dark Mode)**: Nút hiển thị **Biểu tượng Mặt Trời (`svg/light-mode.svg`)** kèm tooltip `"Chuyển sang giao diện Sáng (Light Mode)"`.
     - Khi đang ở **Giao diện Sáng (Light Mode)**: Nút hiển thị **Biểu tượng Mặt Trăng (`svg/dark-mode.svg`)** kèm tooltip `"Chuyển sang giao diện Tối (Dark Mode)"`.
2. **Cơ chế lưu trữ & Khôi phục tức thì (Zero-flicker)**:
   - Lưu lựa chọn qua `StorageHelper.set("theme", nextTheme)` và ghi bản sao đồng bộ vào `localStorage.theme` (`applyThemeUI` trong `panel.js`, `toggleTheme` trong `cost-checker.js`). Lý do: `chrome.storage` là bất đồng bộ, không đọc kịp trước khi trang vẽ.
   - Khi mở Extension: `theme-init.js` (nạp trong `<head>` của `panel.html` và mọi trang `mini-tools/*.html`, không được dùng inline script vì CSP) đọc `localStorage.theme` và gán `data-theme` lên `<html>` trước khi trang vẽ để tránh chớp giao diện. Panel và các cửa sổ Mini Tools dùng chung một giá trị theme.
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
   - **Dung tích (`dung_tich`)** - khi sửa thẻ hoặc thêm đơn, ô chia 2 phần `[Loại ▾] [Số] ml` (`buildCapacityEditorHtml` / `readCapacityValue` trong `import.js`):
     - **Loại**: ô `<select>` lấy từ cột `List-Dung tích` (Full, Full Nobox, Tester, Tester Nobox, Chiết, Refill, Mini, Set, Gốc Full, Gốc Full Nobox, Gốc Tester, Gốc Tester Nobox) + mục `(Trống)` (không ghi loại). Full / Tester = có hộp, thêm `Nobox` = không hộp. Tên cũ được đổi khi mở thẻ ra sửa (`LEGACY_CAPACITY_TYPES` trong `import.js`, chỉ ghi lên Sheet khi bấm Lưu): `Nobox` / `No Box` → Full Nobox, `Gốc Nobox` → Gốc Full Nobox, `Fullbox` / `Fullseal` → Full, `Testerbox` → Tester, `Gốc Fullbox` → Gốc Full, `Gốc Testerbox` → Gốc Tester. Loại lạ khác được thêm tạm vào ô chọn của dòng đó, không tự đổi tên.
     - **Số**: tự gõ, chữ `ml` luôn cố định phía sau (người dùng không cần gõ). Chỉ nhận chữ số, `/` (Gốc `35/50`), `.` và `,` (Mini `7.5`); ký tự khác bị chặn khi gõ và lọc sạch khi dán. Gợi ý: Chiết → `5 / 10 / 20`; loại khác → `dungtich1..5` của chai trùng tên trong tab Nước Hoa, đúng thứ tự cột (ô trống / `-` bỏ qua). Tên chưa có trong tab Nước Hoa (sản phẩm mới) → **không gợi ý**.
     - **Lưu lên Sheet**: `Loại Sốml` (vd `Full 100ml`, `Chiết 10ml`, `Gốc 35/50ml`); không có Loại → `100ml`; không có Số → `Full`; trống cả hai → rỗng.
     - Chọn tên chai khi ô Dung tích đang trống cả 2 phần → tự điền `Full` + dung tích đầu tiên của chai.
     - Lúc xem (không sửa) vẫn hiển thị 1 badge gộp như cũ.
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
1. **Ô trống là trống thật, chữ gợi ý chỉ hiển thị bằng CSS**:
   - Ô gõ (`span[contenteditable]`) có `data-ph` (thuần chữ, không dấu `+`, không icon): `Người gửi`, `Tên sản phẩm`, `Giá`, `SL`, `Số` (trước chữ `ml` cố định), `Ghi chú`. CSS `.card-editable [data-ph]:empty::before { content: attr(data-ph) }` hiện chữ gợi ý mờ khi ô trống. **Tuyệt đối không ghi chữ gợi ý vào nội dung ô** và không so chuỗi kiểu `"+ Giá"` khi lưu: ô trống đọc ra `""`.
   - Xóa hết chữ: bộ xử lý `input` bỏ `<br>` trình duyệt để lại (`innerHTML = ""`) để `:empty` khớp và chữ gợi ý hiện lại ngay.
   - Ô chọn (`select`): lựa chọn trống trong danh sách ghi `(Trống)`; khi đang chọn nó, select có class `is-empty` (`color: transparent`) nên ô hiện **trống**, danh sách xổ xuống vẫn đọc được. Lựa chọn trong dropdown **không có icon** (👤 💳 📅).
   - Dropdown gợi ý (combobox) bật lên ngay bên dưới ô khi click / focus.
2. **Chế độ chỉnh sửa từng thẻ kiện hàng (Per-Card Edit)**:
   - Bãi bỏ hoàn toàn chế độ sửa hàng loạt toàn cục. Nút `Sửa` và `Hủy` trên thanh tìm kiếm đã bị gỡ bỏ vĩnh viễn. Ô tìm kiếm mở rộng chiếm trọn chiều ngang toolbar.
   - Ở trạng thái bình thường (Xem): Nút `✏️ Sửa` mặc định ẩn, khi hover chuột vào thẻ `.import-card` thì nút sẽ xuất hiện ở góc trên bên phải (`top: -9px; right: 12px;`).
   - Khi click `✏️ Sửa`: Chỉ duy nhất kiện hàng đó kích hoạt chế độ chỉnh sửa (`.card-editable` với `activeEditingGroupId = groupId`). Nút chuyển thành cụm 2 nút: `✓ Xong` (Lưu lên Google Sheet qua `update_import_rows`) và `✕ Hủy` (Hoàn tác từ RAM và thoát chế độ sửa).
   - Chỉ khi giá trị thực tế sau khi sửa khác với dữ liệu ban đầu từ Google Sheet, thẻ mới được gắn class `card-dirty` và hiển thị badge `✏️ Đã sửa`.
3. **Chống ghi nhầm dòng khi Sheet bị chèn / xóa / sort (`_expect`)**:
   - Mỗi dòng gửi lên trong `update_import_rows` kèm `_expect: { ten, ngay, nguoi_gui }` là giá trị gốc lúc tải về.
   - Apps Script đọc lại dòng `_row` trên Sheet và so khớp 3 ô này (bỏ khoảng trắng thừa, không phân biệt hoa/thường, Ngày so theo giá trị ngày). Lệch thì **không ghi** dòng đó và trả về trong mảng `conflicts: [{ _row }]`.
   - Extension chỉ cập nhật RAM/cache cho các dòng ghi thành công; có conflict thì hiện toast nhắc bấm Làm mới rồi sửa lại.
   - `_expect` không phải cột dữ liệu, không bao giờ được ghi xuống Sheet.

## 5.4. Quy chuẩn trạng thái Inactive ("Hỏi Giá" / "Hoàn Hàng")
1. **Khóa các trường không phát sinh tiền**:
   - Khi trạng thái là `Hỏi Giá` (hoặc `Hỏi giá`) hoặc `Hoàn Hàng` (hoặc `Hoàn hàng`):
     - `da_thanh_toan` -> Khóa cứng, **để trống**, gỡ bỏ quyền edit (`contenteditable="false"`).
     - `nguon_tien` -> Khóa cứng, để trống, gỡ bỏ quyền edit.
     - `sl` -> Khóa cứng, để trống, gỡ bỏ quyền edit.
     - `thanh_tien` và Tổng kiện -> Để trống.
   - Đọc trạng thái hiện tại của thẻ qua `readCardStatus(card)`: ô `select` phải đọc `.value` (innerText của select là chữ của mọi lựa chọn, có cả "Hỏi Giá" → hiểu nhầm thành Inactive).
2. **Ghi nhận khi lưu lên Google Sheet**:
   - Các trường bị khóa trên được ghi nhận là chuỗi rỗng `""` khi gửi API POST lên Google Apps Script, không lưu rác `—` vào database.
3. **Mở khóa khi đổi trạng thái**:
   - Khi chuyển từ `Hỏi Giá` / `Hoàn Hàng` sang trạng thái bình thường (như `Đã Nhận`, `Đang về`), các ô trên tự động mở khóa, `sl` trở lại `1` hoặc số cũ, và hệ thống tự động tính toán lại Tổng tiền theo `Giá × SL`.

## 5.5. Quy chuẩn Layout & Giao diện kiện hàng (thẻ 1 cột, đầu thẻ 2 hàng khi hẹp / 1 hàng khi rộng)
1. **Màu (giữ đủ thông tin nhưng dịu, không tô kín khối màu)**:
   - **Trạng thái** (`theme-status-*` đặt biến `--st` trên `.import-card`): vạch dọc 4px chạy **hết chiều cao thẻ** ở mép trái (`.import-card::before`) + nền đầu thẻ pha nhạt `color-mix(in srgb, var(--st) 13%, var(--bg-card))`, chữ đầu thẻ `var(--text-primary)` (Ngày chữ phụ). Xanh lá `done` (Đã Nhận, Đã giao) · Vàng `pending` (Đang Về, Chờ hàng...) · Đỏ `cancel` (Hỏi Giá, Hoàn Hàng, Đã hủy) · Xanh dương `default` (khác) · Xám `empty` (rỗng / `—`).
   - **Thanh toán** (`theme-pay-*`): viền thẻ 1.5px màu mờ 75% - `Đã TT` xanh, `Chưa TT` đỏ, rỗng / `—` / Inactive dùng viền thường `var(--border-color)`. Tuyệt đối không tự ý gán Chưa TT khi ô rỗng.
   - **4 badge** (Trạng thái, Thanh toán, Người nhập, Nguồn tiền) dùng kiểu riêng của từng loại (nền nhạt + chữ màu), không ép nền chung; **cố định 70px**, chữ căn giữa, dài thì `…`, để kéo thẳng xuống các thẻ dễ dò.
2. **Đầu thẻ (`.import-card-row-top`, flex)**: `.import-top-col-1` (Ngày + Người gửi trên 1 hàng, Người gửi dài thì `…`); `.import-top-col-2` / `.import-top-col-3` dùng `display: contents` để 4 badge xếp 1 hàng theo thứ tự Trạng thái → Thanh toán → Người nhập → Nguồn tiền.
   - **Hẹp (< 550px)**: luôn 2 hàng - hàng 1 Ngày + Người gửi (`flex: 1 1 100%`), hàng 2 là 4 badge **căn phải**.
   - **Rộng (≥ 550px)**: 1 hàng - Ngày + Người gửi bên trái, 4 badge bên phải.
3. **Danh sách chai**: không khung riêng từng chai, ngăn bằng nét đứt mờ `1px dashed rgba(255,255,255,0.1)`, chai cuối không nét (hẹp và rộng như nhau).
   - **Hẹp**: mỗi chai 2 dòng (Tên + dung tích / Giá · SL · Thành tiền).
   - **Rộng**: mỗi chai 1 dòng (`.import-prod-col-main` grid `1fr auto`): tên bên trái (dài thì xuống dòng), Giá · SL · Thành tiền dồn phải. Nhiều chai thì thẻ chỉ dài thêm mỗi chai 1 dòng.
   - **Ghi chú riêng từng chai** (`item.ghi_chu`, cột "ghi chú" của chính dòng đó trên Sheet): nằm dưới dòng Giá · SL của chai (`.import-card-note` trong `.import-prod-col-main`, khi rộng trải hết bề ngang dòng). Chai không có ghi chú thì **ẩn**; đang sửa thì chai nào cũng có ô `Ghi chú`. Lưu đúng ghi chú của từng dòng, không gom / không chép 1 ghi chú cho cả kiện. Tìm kiếm tìm cả ghi chú của từng chai.
   - **Chân thẻ** (`.import-card-footer`): chỉ còn Tổng đơn (`.import-card-group-summary`, không khung) bên phải, ngăn với danh sách bằng vạch mảnh; kiện 1 chai thì không có chân thẻ.
   - **Ô trống để trống** (cả khi xem): không hiện `—`, `👤 —`, `💳 —`, `--/--/----`; badge trống vẫn giữ khung 70px. Icon 📅 👤 bên ngoài ô (trước Ngày, Người gửi) giữ nguyên; icon 👤 💳 trong badge và 📝 trước ghi chú chỉ có khi xem, khi sửa thì ô thuần chữ.
4. **Kiểu ô khi Sửa (`.card-editable`)**: mỗi ô chỉ có nền mờ `rgba(255,255,255,0.06)`, **không viền**; rê chuột / đang gõ mới hiện viền vàng (`box-shadow: inset 0 0 0 1px var(--gold-primary)`) + nền vàng nhạt. Badge (select) và ô Dung tích bỏ viền + nền riêng; ô Số ml nằm trong ô Dung tích không tạo ô lồng thứ 2.
5. **Nguyên tắc Single Source of Truth (100% CSS, Zero JS Duplication)**:
   - Chuyển layout hẹp / rộng **chỉ bằng `@container importPane (min-width: 550px)`** (cửa sổ riêng cũng mở `panel.html` nên luôn có `.import-container`). Không viết thêm bản `@media` chép lại.
   - Tuyệt đối KHÔNG nhân bản DOM hay viết nhánh điều kiện JavaScript `if (window.innerWidth >= 550)` để sinh HTML khác nhau. Cây DOM từ `createImportCardHtml()` phải luôn luôn giữ nguyên vẹn để bảo đảm cơ chế inline edit, combobox, tính tiền và đồng bộ Google Sheets không bao giờ bị phân mảnh lỗi.
6. **Kích thước tối thiểu ô Edit (Chống sụp layout)**:
   - Ô trong tiêu đề: `min-width: 52px` (riêng Ngày `68px`), `min-height: 18px`, `display: inline-flex`.
   - Ô Tên sản phẩm: `min-width: 80px`, `min-height: 20px`.
   - Ô Giá: `min-width: 45px`, `min-height: 18px`.
   - Ô SL: `min-width: 25px`, `min-height: 18px`.
7. **Quy chuẩn vị trí Thẻ Dung tích (`.import-badge-size`) - Cơ chế Inline Text-flow**:
   - **Chế độ xem thường (`:not(.card-editable)`)**: Bọc tên và dung tích trong `.import-prod-text-flow` với cơ chế text-flow inline (`display: inline;`). Thẻ dung tích (`display: inline-flex; vertical-align: middle;`) trôi tự nhiên sát ngay sau chữ cuối cùng của tên sản phẩm, kể cả khi tên rớt xuống dòng thứ 2 (ví dụ: `Montblanc - Signature` ở dòng 1 và `EDP [Fullbox 90ml]` ở dòng 2), không bao giờ bị văng sang mép phải tạo khoảng trống vô duyên.
   - **Chế độ chỉnh sửa (`.card-editable`)**: Thẻ dung tích chuyển thành ô 2 phần `.import-size-editor` (`select.import-size-type` + `span[data-field="dung_tich_ml"]` + chữ `ml` cố định, xem §5.1), căn cố định ở mép phải (`margin-left: auto; justify-content: space-between`), nhường toàn bộ không gian ngang cho ô nhập tên sản phẩm (`flex: 1; min-width: 80px`), giữ vị trí thao tác ổn định không bị xê dịch khi người dùng gõ tên.
8. **4 Badge đầu thẻ**: Trạng thái (`badge-status-*`, chữ thuần) · Đã thanh toán (`badge-paid-*`: `Đã TT` / `Chưa TT` / trống; ô Sheet rỗng thì để trống, tuyệt đối không tự gán Chưa TT) · Người nhập (`badge-importer`, cyan, khi xem `👤 <Tên>`) · Nguồn tiền (`badge-fund`, tím, khi xem `💳 <Nguồn>`). Cố định 70px, chữ căn giữa (xem mục 1); trống thì để trống.
9. **Cấu trúc 2 Cột cho từng Sản phẩm (`.import-product-item`)**:
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
       - Ô **Tên sản phẩm** đã có chữ: vừa click/focus là **tìm ngay theo chữ đang có** (`searchProducts`, như lúc gõ), dòng đầu là tên khớp nhất (Enter chọn dòng này). Ô Tên trống → danh sách tên A-Z. Các ô khác: mở ra hiện đủ danh sách, chỉ lọc khi gõ.
     - **Đổi màu Header & Viền thẻ động**: Nền header đổi màu theo Trạng thái (Xanh lá `theme-status-done` khi `Đã Nhận`, Vàng khi `Đang về`, Đỏ khi `Hỏi Giá` / `Hoàn Hàng`); Viền thẻ 1.5px đổi theo Thanh toán (Xanh lá `theme-pay-paid` khi `Đã TT`, Đỏ `theme-pay-unpaid` khi `Chưa TT`). Tự động khóa/mở khóa thanh toán, nguồn tiền, SL khi chuyển trạng thái Hỏi Giá / Hoàn Hàng qua `applyStatusToCardUI`.
     - **Từng dòng sản phẩm 2 Cột (`.import-product-item.add-product-row-item`)**: Cột 1 là thumbnail 38×38px (tự động nhận diện và hiện ảnh từ catalog `allProducts`, ẩn khi chưa có tên), Cột 2 là Hàng 1 (STT + Tên sản phẩm + Ô Dung tích 2 phần Loại/Số ml như §5.1 + Nút xóa ✕) và Hàng 2 (Giá + SL + 💵 Thành tiền). Các trường đều là `span[data-field][contenteditable="true"]`, Giá và SL kiểm soát chỉ cho phép gõ số và tự động tính tổng tiền món và tổng kiện qua `updateCardLiveTotal`.
     - **Vị trí nút `+ Thêm sản phẩm` (`#btnAddImportProductRow`)**: Nằm ngay bên dưới dòng sản phẩm cuối cùng của kiện hàng, có đường viền nét đứt màu gold tinh tế.
     - **Ghi chú**: mỗi dòng sản phẩm có ô `Ghi chú` riêng (`[data-field="ghi_chu"]` trong dòng), lưu vào cột ghi chú của đúng dòng đó.
     - **Footer thẻ**: tóm tắt số lượng món + tổng tiền kiện hàng tự động cập nhật trực tiếp (`#addImportItemsCount`, `#addImportTotalAmount`).
2. **Giá trị mặc định**:
   - Ngày: Ngày hôm nay (`DD/MM/YYYY`).
   - Người nhập: Tự động điền chính xác tên tài khoản Admin đang đăng nhập hệ thống (`Dương`, `Quân`, hoặc `Minh`).
   - Người gửi: trống (chữ gợi ý `Người gửi`), click vào mở gợi ý từ `List-Người gửi`.
   - Trạng thái: Mặc định phần tử đầu tiên của `List-Tình Trạng` (hoặc `Đã Nhận`).
   - Thanh toán: Mặc định `Đã TT`.
   - Nguồn tiền: trống (lựa chọn `(Trống)`), chọn từ `List-Nguồn Tiền`.
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
1. **Thanh Toolbar đầu trang (`.finance-toolbar`)**:
   - Tiêu đề hiển thị: `💰 Tổng: [số tiền]` tính tổng thành tiền của tất cả các năm cộng lại (`grandTotal`), số tiền làm nổi bật bằng màu vàng Gold thương hiệu.
   - Bên phải chứa nút Sắp xếp năm (`btnFinanceSortToggle`) và nút Bật/Tắt hiển thị chi tiết (`btnFinanceDetailToggle`).
2. **Giao diện dòng Năm Collapsible**:
   - Năm bên trái, tổng tiền năm bên phải (`formatMoneyVND`).
   - Thanh tiến trình `finance-progress-fill` bên dưới hiển thị tỷ lệ % so với năm cao điểm nhất để so sánh trực quan giữa các năm.
   - Click vào dòng Năm để mở rộng / thu gọn độc lập (`is-expanded`), tự động mở sẵn năm mới nhất chỉ duy nhất 1 lần khi khởi tạo (`isFinanceInitialized`). Cho phép đóng toàn bộ các năm hoặc mở nhiều năm tùy ý.
   - Tự động bảo lưu vị trí thanh cuộn (`scrollTop`) khi đóng / mở thẻ để tránh giật giao diện lên đầu.
3. **Nút Sắp xếp Năm (`btnFinanceSortToggle`)**:
   - Tích hợp nút Filter (reuse icon từ tab Nước hoa) ngay trên thanh toolbar cạnh nút Chi tiết.
   - Menu dropdown hỗ trợ 3 tiêu chí: 🗓️ Năm mới nhất (mặc định), 🗓️ Năm cũ nhất, 💵 Theo tổng tiền.
   - Tự động đóng menu khi click ra ngoài hoặc khi chọn xong.
4. **Nội dung mở rộng bên trong dòng Năm**:
   - Bắt buộc thiết lập `flex-shrink: 0` trên toàn bộ thẻ và mục con để ngăn flexbox co rút chiều cao, đảm bảo thanh cuộn mượt mà không bị ép vào chiều cao extension:
     1. **Biểu đồ cột đứng 12 tháng (`finance-bar-chart`)**: Thiết kế pure HTML/CSS flexbox `align-items: flex-end`, chiều cao chuẩn 120px, nhãn T1...T12 sắc nét, cột đổi màu gradient khi hover, làm nổi bật cột tháng cao điểm nhất năm (thẻ sao ⭐ / viền sáng).
     2. **Lưới 3 cột × 4 hàng 12 tháng (`finance-month-grid`)**: Hiển thị cố định 12 tháng trong năm. Tên tháng ở trên, tổng thành tiền của tháng ở dưới.
5. **Nút "Chi tiết" (`btnFinanceDetailToggle`)**:
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
  - **Nhóm 1 (`Tools`)** - thẻ có `data-tool-page`, mở bằng `openToolWindow(page)` trong `mini-tools.js` (cửa sổ popup vuông 900×900px, co theo màn hình; mỗi tool chỉ 1 cửa sổ, bấm lại thì focus cửa sổ đang mở):
    1. 🏷️ **Kiểm tra giá Vốn** (`mini-tools/cost-checker.html`, §8.2).
    2. 🧹 **(M) Chuẩn hóa Tên file Nhập** (`mini-tools/name-normalizer.html`, §8.3) - chỉ tài khoản Minh.
    3. 📏 **(M) Kiểm Tra Dung Tích** (`mini-tools/volume-checker.html`, §8.4) - chỉ tài khoản Minh.
  - **Nhóm 2 (`Google Sheet`)**:
    2. 📗 **Chi Phí Vốn**: Mở tab Google Sheet Chi Phí Vốn.
    3. 📗 **Tổng Kết Tháng**: Mở tab Google Sheet Tổng Kết Tháng.
    4. 📗 **File Nhập**: Mở tab Google Sheet File Nhập.
    5. 📗 **Gửi Khách Zalo**: Mở tab Google Sheet Gửi Khách Zalo (`https://docs.google.com/spreadsheets/d/1K8kMtmAG0ZwNC9mr-tPQ3VkcAU7RzRWbBWlGu0y9Dzw/edit?gid=1199644754#gid=1199644754`).
    6. 📗 **Bảng Giá CTV**: Mở tab Google Sheet Bảng Giá CTV (`https://docs.google.com/spreadsheets/d/1RpeA7re9vYjyYwghuQev9SD_fp3JfPc9VJ2UjdoSvVk/edit?usp=sharing`).
    7. 📗 **(M) Data Sets**: Mở Google Sheet Data Sets (`https://docs.google.com/spreadsheets/d/1gZ67ufW3saPQfE5qC7XapLt8feuuFCE9mJwLY06qTBE/edit?usp=sharing`) - chỉ tài khoản Minh.
    8. 📗 **(M) Sapo Data**: Mở Google Sheet Sapo Data (`https://docs.google.com/spreadsheets/d/1YnsjpWdine38XIkSsihAGzIMhNPaJ1I6Cj-JlVNUyKw/edit?usp=drive_link`) - chỉ tài khoản Minh.

## 8.1b. Giao diện & JS dùng chung cho cửa sổ Mini Tools (`mini-tools/common/`)
- `common/tool-base.css`: font Nunito, khung `.tool-app`, `.tool-header`, `.tool-toolbar`, nút (`.btn-topbar`, `.btn-action`, `.btn-th-action`), bảng Excel (`.excel-table`, header dính, cột Hình `.th-thumb` rộng cố định 52px - bảng nào cũng phải để ít nhất 1 cột tên không đặt width để nhận phần dư, nếu không cột cố định sẽ bị kéo giãn, `.td-text`, `.td-edit` + `.excel-cell-textarea`, sáng dòng khi hover). Ô textarea tự cao theo nội dung bằng CSS `field-sizing: content`; **cấm** đo `scrollHeight` bằng JS để giãn ô (mỗi lần đo bắt cả bảng tính lại bố cục, bảng 400 dòng mất ~2,6 giây), toast `.tool-toast`, thanh cuộn. File CSS của từng tool chỉ chứa style riêng (độ rộng cột, màu kết quả...).
- `common/tool-shell.js` (`ToolShell`): nút đổi theme, `showToast` (cần `#toolToast` + `#toolToastMsg`), `copyText`, `iconHtml(tên)` (thẻ icon SVG `../svg/<tên>.svg` dạng `.icon-mask`), `initImagePreview` (nút Ảnh lớn chỉ icon `images.svg`: Bật = viền + icon vàng `.active`, chú thích rê chuột ghi Bật/Tắt; mặc định Bật + khung 128×128 theo dòng; dòng cần `data-img`; thẻ `img#cursorImageTag` **không được có `src=""`** vì src rỗng bắn lỗi ảnh và bộ bắt lỗi ảnh toàn cục trong `formatters.js` sẽ ẩn luôn thẻ img), `thumbHtml`, `bindColumnNavigation` (Enter/↓/↑ theo cột, textarea cần `data-row` + `data-col`), `readMultilinePaste`, `confirmByDoubleClick` (bấm 2 lần trong 3 giây cho thao tác ghi đè/xóa: lần 1 nút chuyển đỏ `.armed` + toast "Bấm lần nữa để …", không đổi nội dung nút; quá 3 giây tự trở lại), `loadProducts` / `loadImportRows` (đọc cache của panel, chưa có mới gọi Apps Script; dữ liệu Nhập chỉ nạp khi Admin đang đăng nhập), `setDbStatus`.
- Thứ tự nạp script trong trang tool: `../common/formatters.js` → `../storage-helper.js` → `../common/api-config.js` → `common/tool-shell.js` → script riêng của tool. `<head>` nạp `../theme.css`, `common/tool-base.css`, CSS của tool, `../theme-init.js`.
- URL Apps Script dùng chung ở `common/api-config.js` (`PRODUCTS_API_URL`, `IMPORT_API_URL`), không chép URL vào file khác.
- **Ô 2 hàng Input/Output** (`.td-stack` > `.cell-stack` > textarea + `.cell-result`, tạo bằng `ToolShell.stackedCellHtml`) và **tiêu đề 2 dòng** (`.th-stack` > `.th-line-input` / `.th-line-output`) nằm trong common: hàng trên Input chữ phụ, hàng dưới Output vàng, trùng 100% xanh (`.is-same`), cần xem lại đỏ (`.is-alert`). Dùng ở Kiểm Tra Giá Vốn (Input/Output Name, Input/Output Vốn) và (M) Chuẩn hóa Tên file Nhập. `stackedCellHtml` nhận `tdClass` để gắn class riêng của cột (vd căn phải cột số).
- **Bộ lọc dòng chung** (`ToolShell.initRowFilter(select, tbody)`, trả về hàm lọc lại 1 dòng để gọi sau mỗi lần vẽ kết quả): select `#filterSelect.toolbar-select` gồm `Tất Cả` (all) · `Đã Đúng` (ok: có kết quả và toàn bộ ô kết quả xanh) · `Cần Xem Xét` (review: có ít nhất 1 ô vàng) · `Cần Sửa` (fix: có ít nhất 1 ô đỏ). Đọc màu các ô `.cell-result` có giá trị: đỏ `.is-alert`, xanh `.is-same`, còn lại là vàng. Dòng vừa vàng vừa đỏ nằm ở cả Cần Xem Xét và Cần Sửa (phép OR); dòng trống chỉ hiện ở Tất Cả. Có ở cả 2 tool.
- **Phần đếm dòng trên toolbar trái** (`ToolShell.renderRowSummary(#rowSummary, tbody)`, `.row-summary`): chữ thường, lưới 2 dòng × 2 cột, không kẻ khung; thứ tự `xx Tất Cả` (chữ phụ) · `xx Đã Đúng` (xanh) / `xx Cần Xem Xét` (vàng) · `xx Cần Sửa` (đỏ). Đếm đúng theo quy tắc bộ lọc; `Tất Cả` = dòng có dữ liệu (ô nhập hoặc ô kết quả có giá trị). Cập nhật mỗi lần kết quả đổi.
- **Theme cho phần trình duyệt tự vẽ**: `color-scheme` dark/light theo `data-theme` và `.toolbar-select option` dùng `--bg-card` / `--text-primary`, để danh sách xổ xuống không bị nền trắng chữ trắng.
- **Nét đứt giữa 2 hàng** (ô `.cell-result` và tiêu đề `.th-line-output`): màu viền mờ 50% (`color-mix(in srgb, var(--border-color) 50%, transparent)`). Dòng trống không hiện hàng dưới nên không có nét đứt.
- **Cỡ chữ thống nhất 12.5px**: tiêu đề bảng (kể cả `Hình`, chữ đậm 800), hàng trên (textarea) và hàng dưới (`.cell-result`) của ô 2 hàng đều 12.5px, chữ thường 400, line-height 1.4. Chữ đỏ báo lỗi (`.is-alert`) không in đậm.
- **Nút toolbar Ảnh lớn / Nạp lại / Xóa trắng**: chỉ icon (icon 18px), nút vuông 32×32 (`.btn-action.btn-toolbar-icon`), có `title` + `aria-label`. Luôn nằm sát nhau ở **cuối bên phải** toolbar, thứ tự **Ảnh → Nạp → Xóa**; các điều khiển khác (ngưỡng, lọc, Danh mục chuẩn) đứng trước. Tool không có nút nào thì bỏ nút đó (vd Kiểm Tra Giá Vốn không có Nạp lại).
- **Bề ngang cột có nút trên tiêu đề**: đặt đủ rộng để tiêu đề + nút Dán / X / Copy nằm 1 dòng ở cả cửa sổ 760px và 900px (đo lại khi đổi chữ tiêu đề hoặc cỡ chữ).
- **Viền bảng tách riêng từng ô** (`border-collapse: separate; border-spacing: 0`, ô vẽ viền phải + dưới): tiêu đề dính (sticky) mang theo viền khi cuộn, không hở khe. Viền đỏ cả dòng vẽ bằng `box-shadow: inset`. Không đổi lại `border-collapse: collapse`.
- Tool mới bắt buộc dùng lại 2 file này, không viết lại theme / toast / bảng Excel riêng.
- **Icon nút (cả 2 tool, không dùng emoji trên nút)**: Copy cột = `copy.svg` (nút vuông 22×22 `.btn-icon-square`, không chữ); Xóa cột = `close.svg` (nút vuông); Nạp lại = `refresh.svg`; Ảnh lớn = `images.svg`; Xóa trắng = `delete.svg`; nút giao diện = `light-mode.svg` khi đang Tối / `dark-mode.svg` khi đang Sáng (giống panel). Nút Dán chỉ để chữ "Dán". Emoji trong toast giữ nguyên.

## 8.2. Công cụ "Kiểm Tra Giá Vốn" (Cost Checker Standalone Tool)
1. **Kiến trúc Cửa sổ Độc lập & Đơn Nhất (Single Instance, Square 900×900px)**:
   - Mở từ thẻ card trong tab Mini Tools dưới dạng cửa sổ popup riêng biệt (`mini-tools/cost-checker.html`).
   - **Kích thước cửa sổ chuẩn hình vuông**: Chiều cao bằng chiều ngang (`cao = ngang`, chuẩn `900×900px`, tự động co giãn an toàn theo màn hình người dùng).
   - Đảm bảo **chỉ duy nhất 1 cửa sổ tồn tại cùng lúc**: Khi người dùng bấm mở lại, hệ thống tự động tìm và focus ngay cửa sổ đang mở thay vì tạo cửa sổ mới.
2. **Bố cục Dạng Bảng Tính Excel Thống Nhất (Unified Spreadsheet View)**:
   - Toàn bộ các cột và cột số thứ tự `#` nằm chung trong một bảng tính Excel thống nhất, sử dụng **thanh cuộn chung duy nhất** (không chia khung riêng lẻ).
   - **Các cột** lần lượt: `#` · **`Hình`** · **`Input Name / Output Name`** (1 cột, ô 2 hàng: trên ô gõ Input Name, dưới Output Name chỉ xem - vàng, khớp 100% xanh; tiêu đề 2 dòng: dòng Input có nút Dán + Xóa cột, dòng Output có nút Copy) · **`Input Vốn / Output Vốn`** (1 cột rộng 170px, ô 2 hàng như cột Name, số căn phải: trên ô gõ Input Vốn, dưới Output Vốn chỉ xem - vàng khi chưa có Input Vốn, khớp xanh `.is-same`, lệch đỏ `.is-alert`; dòng có Input Vốn hoặc Output Vốn (`td.is-filled`) luôn giữ đủ 2 hàng, hàng thiếu giá trị để trống, không placeholder; dòng trống hẳn vẫn 1 hàng; tiêu đề 2 dòng: dòng Input có Dán + Xóa cột, dòng Output có Copy) · **`Merge Vốn`** (giữ riêng, rộng 135px, chữ 12.5px).
   - **Toolbar phải**: Lọc (§8.1b) · 2 nút icon 32×32 `Ảnh lớn` → `Xóa trắng` (§8.1b). Xóa trắng ở tool này bấm 1 lần là xóa.
   - **Font chữ đồng bộ 100%**: Sử dụng font Nunito Variable offline chuẩn từ thư mục `Nunito/` (`@font-face`) chia sẻ cùng toàn bộ Extension.
   - **Định dạng hiển thị dữ liệu**: Output Name màu vàng; khi tên tìm được **khớp chính xác 100%** từng chữ cái với Input Name (đầy đủ hoặc tên rút gọn) thì chuyển **màu xanh lá (`.is-same`)**.
   - **Quy tắc bỏ chữ Chiết**: Riêng phân loại Chiết tuyệt đối **không ghi chữ 'Chiết'** mà chỉ ghi dung tích đi kèm (ví dụ: `Afnan - Supremacy Collector's Edition EDP - 10ml`).
   - **Cột Hình thumbnail**: Nằm ngay trước cột `Input Name / Output Name`, rộng cố định 52px, ảnh hiển thị trực tiếp trong ô mà không có khung viền con bên trong.
   - **Nút Ảnh lớn & Khung xem ảnh 128×128 neo theo dòng**: Nút toggle chỉ icon trên Toolbar (`#btnTogglePreview`), Bật thì viền + icon vàng (`.active`), rê chuột hiện chú thích "Ảnh lớn: Bật/Tắt". **Mặc định BẬT**; khi bật, khi rê chuột vào dòng bất kỳ có ảnh, khung xem ảnh kích thước **128×128px** sẽ hiển thị cố định ngay **phía trên (hoặc phía dưới nếu sát mép trên)** của dòng đó và căn thẳng hàng với cột `Hình` (không bám theo con trỏ chuột). Trạng thái nút được lưu vào `localStorage`. Dùng chung `ToolShell.initImagePreview` + `ToolShell.thumbHtml` (§8.1b).
   - **Viền đỏ dòng lệch giá**: dòng nào có `Output Vốn` lệch với `Input Vốn` (chữ đỏ) thì cả dòng có viền đỏ (`.excel-row.row-alert`); sửa lại cho khớp thì viền tự mất.
   - **Căn giữa dọc tuyệt đối (Vertical Middle Alignment)**: Toàn bộ nội dung văn bản và ô nhập liệu trên tất cả các cột (`#`, `Output Name`, `Hình`, `Input Name`, `Input Vốn`, `Output Vốn`, `Merge Vốn`) luôn được căn giữa dòng theo trục dọc (`vertical-align: middle;`, kết hợp khung bọc `.cell-flex-wrap { display: flex; align-items: center; }` cho textarea). Kể cả khi tên dài tự động ngắt dòng (word-wrap) làm tăng chiều cao hàng thì nội dung của các cột bên cạnh vẫn luôn giữ vị trí chính giữa dòng chuẩn xác.
   - **Hỗ trợ Word Wrap (xuống dòng tự nhiên)**: Khi tên sản phẩm hoặc nội dung quá dài, ô tự động ngắt dòng tự nhiên (`white-space: pre-wrap; word-break: break-word`) và tự co giãn chiều cao dòng mượt mà.
   - **Khởi động tức thì (Zero-latency Instant Display)**: Dữ liệu đã lưu ở các cột (Input Name, Input Vốn, Output Name, Output Vốn, Hình) được đọc đồng bộ từ `localStorage` và hiển thị lên màn hình ngay tức thì (0ms) khi mở popup mà không phải chờ quá trình tải mạng. Quá trình tra cứu đối chiếu từ Google Sheet diễn ra ngầm phía sau và tự động cập nhật lại.
   - **Hiệu ứng sáng dòng khi hover chuột rõ nét**: Khi di chuột vào bất kỳ ô nào trên dòng, toàn bộ dòng (`tr.excel-row:hover`) sáng lên màu vàng gold rõ rệt (`rgba(229, 193, 88, 0.22)`) và cột `#` sáng đậm (`0.35`) giúp người dùng đối chiếu ngang cực kỳ trực quan và không bị mỏi mắt. Toàn bộ màu sắc tuân thủ 100% design token từ `theme.css`.
   - Hỗ trợ gõ trực tiếp trong ô với phím điều hướng `Enter` / `ArrowDown` / `ArrowUp` như Excel thật.
3. **Bộ bóc tách phân tầng nghiêm ngặt (5-Tier Parser)**:
   - **Tầng 1 (Gốc)**: Nhận diện phân số `X/Y` hoặc từ khóa `gốc`, `goc` $\rightarrow$ xét lần lượt: có `tester`/`test`/`testerbox`/`tester box` **và** `nobox`/`no box` → `Gốc Tester Nobox`; chỉ có tester → `Gốc Tester`; chỉ có nobox → `Gốc Full Nobox`; còn lại (có `full`/`fullbox` hoặc không có từ khóa) → `Gốc Full`. Đánh dấu `isGoc = true` để bỏ qua tra cứu giá vốn.
   - **Tầng 2 (Mini)**: Bắt từ khóa `mini` $\rightarrow$ Loại `Mini`, quét số đi kèm.
   - **Tầng 3 (Dung tích)**: Quét số hợp lệ chia hết cho 5 (5-500) hoặc số 88.
   - **Tầng 4 (Loại)**: Chỉ nhận diện đúng các từ khóa có tiền tố `"- "` (không phân biệt chữ hoa chữ thường; tuyệt đối không tự ý thêm các biến thể khác như re-fill, ko box, no hộp). Thứ tự xét: **`- Refill`** → Refill; **`- Tester`** / **`- Test`** / **`- Testerbox`** / **`- Tester box`** → Tester; **`- Nobox`** / **`- No box`** → Full Nobox; **`- Full`** / **`- Fullbox`** / **`- Full box`** → Full. Tester hoặc Full mà trong dòng có thêm chữ `nobox` / `no box` (vd `- Tester Nobox`, `- Full No box`) → **Tester Nobox** / **Full Nobox**. **Tuyệt đối không tìm chữ "chiết"**; nếu dung tích là 5, 10, 20ml tự động gán là `Chiết`. Không có từ khóa và dung tích $\ge 30$ml tự gán là `Full`.
   - **Cách gọi loại xuất ra**: `Full` (có hộp) · `Full Nobox` (không hộp) · `Tester` (có hộp) · `Tester Nobox` (không hộp), Gốc tương tự. Tên cột giá trên Sheet (`giavonfull`, `giavontest`) giữ nguyên.
   - **Tầng 5 (Làm sạch & So khớp)**: Làm sạch tên (chỉ bóc tách từ khóa loại khi có tiền tố `"- "` để bảo tồn nguyên vẹn các tên nước hoa có chữ Full/Test trong tên như *Montale Full Incense*), đưa qua `searchProducts()` tìm Tên chuẩn trong `allProducts`.
4. **Quy tắc tra cứu & Định dạng Output Vốn Cột 4 (Cost Price Lookup)**:
   - **Chiết (5, 10, 20ml)**: Lấy tương ứng từ `giavon5ml`, `giavon10ml`, `giavon20ml`.
   - **Tester** (có hộp): Quét dung tích khớp slot `1..5` trong `dungtich1..5`, lấy giá từ `giavontest1..5`.
   - **Full (có hộp) / Refill / Mini**: Quét dung tích khớp slot `1..5`, lấy giá từ `giavonfull1..5`.
   - **Full Nobox / Tester Nobox (không hộp)**: không có cột giá vốn trên Sheet → **để trống**.
   - **Trường hợp là Gốc (`isGoc === true`)**: **Bỏ qua (skip)**, luôn xuất chuỗi rỗng `""`.
   - **Trường hợp không tìm thấy hoặc giá không tồn tại**: Xuất chuỗi rỗng `""`, tuyệt đối không điền bừa.
   - **Định dạng rút gọn chia 1000 (tối đa 1 chữ số sau dấu phẩy)**: Giá vốn xuất ra dưới dạng rút gọn chia cho 1.000, số thập phân sau dấu phẩy làm tròn lấy đúng 1 chữ số:
     - Số nguyên: `570000 -> 570`, `2100000 -> 2.100`
     - Số thập phân lẻ (làm tròn 1 chữ số sau dấu phẩy): `196588 -> 196,6`, `472667 -> 472,7`, `64100 -> 64,1`
     - Số lớn có phân cách hàng nghìn và thập phân: `1515300 -> 1.515,3`
5. **Cơ chế Đối Chiếu Output Vốn & Dung Sai $\pm 1$ (Cột 3 vs Cột 4)**:
   - Chuẩn hóa số học dòng-tương-ứng (tự động nhận diện cả `570`, `570k`, `570.000`, `64,1`, `64.1`, `64100`, `1.515,3`, `1515300`).
   - **Quy tắc dung sai cho phép lệch $\pm 1$**: Input Vốn và Output Vốn cho phép chênh lệch tối đa $\pm 1$ đơn vị ($|Giá_{recheck} - Giá_{vốn}| \le 1.001$, ví dụ: `472,7` và `472,667` chênh lệch 0.033) thì hệ thống vẫn tính là khớp chuẩn xác và hiển thị **màu xanh lá** (hàng Output Vốn `.is-same`, ô Merge `cell-match`), loại bỏ cảnh báo đỏ không đáng có khi làm tròn số. Khi lệch $> 1$ mới tô đỏ cảnh báo (hàng Output Vốn `.is-alert`, ô Merge `cell-mismatch`).
   - Phần đếm trên Toolbar là phần đếm chung 4 mục (§8.1b); dòng lệch giá tính vào `Cần Sửa`.
6. **Cột Hợp Nhất Dữ Liệu Giá (Cột Merge Vốn)**:
   - Tự động hợp nhất dữ liệu của `Output Vốn` (hệ thống) và `Input Vốn`.
   - **Quy tắc ưu tiên**: Ưu tiên hiển thị giá trị `Output Vốn` (output) trước; nếu `Output Vốn` rỗng (do chưa tìm thấy hoặc là dòng Gốc) mà `Input Vốn` có nhập liệu thì lấy giá trị của `Input Vốn` (tự động chuẩn hóa về định dạng rút gọn K tương đương như `570`, `64,1`, `1.515,3`).
   - **Màu sắc khớp 100% với trạng thái của Output Vốn (output)**:
     - Khi lấy từ `Output Vốn` (output hệ thống): Màu sắc của cột Merge Vốn **khớp 100% với màu của ô Output Vốn** tương ứng:
       - Nếu khớp giá ($\pm 1$): Hiển thị **màu xanh lá (`cell-match`)**.
       - Nếu lệch giá ($> 1$): Hiển thị **màu đỏ (`cell-mismatch`)**.
       - Nếu chưa có giá recheck để đối chiếu: Hiển thị **màu vàng gold mặc định (`var(--gold-primary)`)**.
     - Khi lấy từ `Input Vốn` (bù giá do Output Vốn rỗng): Hiển thị **text màu trắng (`#ffffff`)** nổi bật (ở giao diện sáng tự động chuyển sang màu tương phản cao `var(--text-primary)`).
   - Nút vuông icon `copy.svg` (chỉ icon, rê chuột hiện chú thích) trên tiêu đề cột Merge Vốn (`#btnCopyMerge`) hỗ trợ sao chép toàn bộ cột chỉ với 1 click để dán trực tiếp vào Google Sheet / Excel.
7. **Lưu trữ tự động & Khôi phục trạng thái (State Persistence)**:
   - Dữ liệu Cột 2 (`costCheckerInputNames`) và Cột 3 (`costCheckerInputCosts`) được tự động lưu ngay khi người dùng gõ hoặc dán qua `StorageHelper` và `localStorage`.
   - Khi mở lại cửa sổ, dữ liệu được phục hồi 100% và tự động chạy lại thuật toán tra cứu tức thì.
   - Bấm `Xóa trắng` sẽ dọn dẹp sạch cả bảng tính lẫn dữ liệu đã lưu trong storage.

## 8.3. Công cụ "(M) Chuẩn hóa Tên file Nhập" (Name Normalizer) - chỉ tài khoản Minh
Chuyển từ tool Matcher cũ ở `products/Temp` (đã xóa). File: `mini-tools/name-normalizer.html` / `.css` / `.js`, bộ tách + khớp tên `mini-tools/name-normalizer-parser.js`. Dùng chung khung `mini-tools/common/` (§8.1b).
1. **Nguồn dữ liệu (tự nạp, sửa được, tự lưu)**:
   - **Danh mục chuẩn**: cột `name` + `dungtich1` của tab Nước Hoa (`cachedProducts`). Hiện trong ngăn trái, bật/tắt bằng nút `Danh mục chuẩn (N)` trên toolbar (trạng thái ẩn/hiện được ghi nhớ).
   - **Dòng cần chuẩn hóa**: cột `Sản phẩm` (`ten`) + `Dung tích` (`dung_tich`) của tab Nhập (`cachedImportData`, chỉ khi Admin đăng nhập). **Xếp đúng theo số dòng trên Sheet Nhập** (dựa vào `_row`; dòng trên Sheet bị trống thì để trống), cột `#` hiển thị đúng số dòng Sheet.
   - Mọi ô đều sửa được, dán nhiều dòng vào 1 ô thì ghi xuống cột đó, Enter/↓/↑ như Excel. Lưu qua `StorageHelper` (`nameNormalizerMaster`, `nameNormalizerRows`, `nameNormalizerMinWords`, `nameNormalizerShowMaster`). Mở lại cửa sổ dùng dữ liệu đã lưu.
   - Toolbar phải: `Từ trùng ≥` · Lọc · `Danh mục chuẩn (N)` · 3 nút icon 32×32 `Ảnh lớn` → `Nạp lại` → `Xóa trắng` (§8.1b).
   - `Nạp lại` (`refresh.svg`): nạp lại từ 2 tab, **ghi đè phần đã sửa** nên phải bấm 2 lần trong 3 giây (lần 1 nút đỏ + toast "Bấm lần nữa để ghi đè"). `Xóa trắng` (`delete.svg`): xóa cả 2 bảng, cũng bấm 2 lần (toast "Bấm lần nữa để xóa").
2. **Bóc tách Loại & Dung tích (5 tầng: Gốc → Mini → Dung tích → Loại → Làm sạch tên)**, tách riêng cột Sản phẩm và cột Dung tích rồi gộp; Loại có từ khóa rõ ràng luôn thắng Loại suy theo dung tích. Khi cột Dung tích đã có số thì không bóc số khỏi tên sản phẩm (giữ "Santal 33", "212 VIP").
   - Thứ tự: **Set** → **Gốc** → **Mini** → loại thường → suy theo dung tích.
   - Loại thường: lấy **nhóm** có từ khóa xuất hiện sớm nhất: Refill (`refill`/`re-fill`); Tester (`tester box`/`testerbox`/`tester`/`test`); Full (`full box`/`fullbox`/`fullseal`/`nguyên seal`/`seal`/`full`); Chiết (`chiết`/`chiet`/`decant`, không có số thì mặc định 10ml). Sau đó xét chữ **nobox** (`nobox`/`no box`/`không hộp`/`ko box`/`k box`, đứng trước hay sau đều được): Tester + nobox → **Tester Nobox**, Tester → **Tester**; Full + nobox → **Full Nobox**, Full → **Full**; chỉ có nobox (không có nhóm nào) → **Full Nobox**.
   - Gốc (phân số `X/Y` hoặc chữ `gốc`): Tester + nobox → **Gốc Tester Nobox**; Tester → **Gốc Tester**; nobox → **Gốc Full Nobox**; còn lại (có Full hoặc không có từ khóa) → **Gốc Full**.
   - Không có từ khóa: 5 / 10 / 20ml → **Chiết**; ≥ 30ml → **Full**.
   - **Set (xét trước mọi tầng)**: cột Sản phẩm hoặc cột Dung tích có chữ `Set` là **một từ riêng** (không phân biệt hoa/thường: `Set`, `Gift Set`, `(SET)`) hoặc `Giftset` → Loại & Dung tích chỉ ghi đúng **`Set`**, không kèm ml (kể cả `Set 3x10ml`), thắng mọi loại khác (`Mini Set`, `Gốc Set` → `Set`). Không lấy dung tích danh mục, không báo đỏ thiếu ml. Chữ `set` nằm trong từ khác (`Settle`, `Caset`, `Sunset`) không tính. Khi khớp tên, `Giftset` được tách thành 2 từ `gift set` (cả 2 bên).
3. **Khớp Tên chuẩn**: đếm số từ trùng với từng tên trong danh mục (**không phân biệt dấu và hoa/thường**: bỏ dấu cả 2 bên bằng `removeAccents` trước khi so, `Wulong Cha` khớp `Wūlóng Chá`; cột Tên chuẩn vẫn trả đúng tên có dấu của danh mục), hòa thì lấy Jaccard cao hơn. Dưới ngưỡng `Từ trùng ≥` (mặc định 2) là **chưa khớp**. Ngưỡng **cố định, không tự hạ** khi ô Sản phẩm có ít từ hơn ngưỡng (ô 1 từ như `Ventana`, `s` với ngưỡng 2 là chưa khớp). Khi chưa khớp: cột Tên chuẩn **trả y nguyên tên ở cột Sản phẩm** (copy dán lên Sheet không làm mất tên).
   - **Tự điền dung tích**: khớp được tên mà dòng chưa có số ml → lấy `dungtich1` của tên chuẩn, **chỉ cho loại Full / Full Nobox / Tester / Tester Nobox / Refill hoặc chưa ghi loại**. Chiết không có số thì mặc định `10ml` (có số thì giữ đúng số đã nhập). **Mini và Gốc không lấy** (số ml danh mục là của chai full) → để trống, báo đỏ. Chưa ghi loại thì suy theo quy tắc trên.
4. **Bảng kết quả** (7 cột): `#` · `Ngày` · `Hình` · **`Input Sản phẩm / Output Sản phẩm`** · **`Input Dung Tích / Output Dung Tích`** (rộng cố định 180px để "Output Dung Tích" + nút Copy nằm chung 1 hàng) · `Giá` · `Khớp` (số từ trùng / ✕, rộng cố định 60px).
   - **Tiêu đề 2 dòng** (`.th-stack`) khớp với ô 2 hàng: dòng trên `Input ...` (màu chữ phụ), dòng dưới `Output ...` kèm nút Copy vuông (icon `copy.svg`) nằm ngay trên dòng Output, ngăn nét đứt.
   - **Ô 2 hàng** (`.td-stack` > `.nn-stack`): **hàng trên** là ô nhập dữ liệu tab Nhập (textarea, sửa được, Enter/↑/↓ và dán nhiều dòng như cũ); **hàng dưới** (`.nn-result`) là kết quả chuẩn hóa, chỉ xem, ngăn cách bằng vạch nét đứt. Màu: hàng trên `var(--text-secondary)`, hàng dưới `var(--gold-primary)`; hàng dưới **trùng 100% từng ký tự** với hàng trên (bỏ khoảng trắng thừa, phân biệt dấu và hoa/thường - nghĩa là đã chuẩn sẵn, không cần sửa) thì `var(--c-green)` (`.is-same`); báo đỏ `var(--c-red)` (`.is-alert`) luôn thắng xanh. Dòng trống không hiện hàng dưới. Nút 📋 trên tiêu đề copy **hàng dưới**. `Ngày`, `Giá` chỉ để xem: đọc từ tab Nhập (`ngay`, `gia`) theo số dòng Sheet mỗi lần mở cửa sổ, không lưu vào dữ liệu của tool, không sửa được. Copy giữ đúng thứ tự dòng (dòng trống giữ nguyên) để **dán vào dòng 2** của cột tương ứng trên Sheet Nhập.
   - **Báo đỏ**: Tên chuẩn chưa khớp → hàng dưới chữ đỏ; Loại & Dung tích thiếu số ml → hàng dưới chữ đỏ (`.nn-result.is-alert`). Có 1 trong 2 → viền đỏ cả dòng (`.row-alert`).
   - **Lọc**: Tất Cả / Đã Đúng / Cần Xem Xét / Cần Sửa (bộ lọc chung §8.1b).
   - **Hình + ảnh lớn**: ảnh lấy theo Tên chuẩn đã khớp từ tab Nước Hoa; nút icon `Ảnh lớn` (mặc định Bật) giống Kiểm Tra Giá Vốn (dùng chung `ToolShell.initImagePreview`).

## 8.4. Công cụ "(M) Kiểm Tra Dung Tích" (Volume Checker) - chỉ tài khoản Minh
Đối chiếu danh sách tên sản phẩm dán vào với tên chuẩn + `dungtich1..5` của tab Nước Hoa, để đồng bộ tên chuẩn (thấy tên chưa có, dung tích gốc thiếu, dung tích bên nhập không có). File: `mini-tools/volume-checker.html` / `.css` / `.js`, bộ bóc tách + xếp cột `mini-tools/volume-checker-parser.js`. Dùng chung khung `mini-tools/common/` (§8.1b).
1. **Dữ liệu gốc**: tự lấy `name` + `dungtich1..5` + `img` của tab Nước Hoa (`ToolShell.loadProducts`). Ô dung tích trống / `-` bỏ qua; `100ml` lấy số `100`.
2. **Dữ liệu nhập**: người dùng tự dán (nút **Dán** đọc clipboard, hoặc **Ctrl + V** ở bất kỳ đâu trong cửa sổ trừ ô nhập liệu), **thay toàn bộ** dữ liệu cũ; lưu lại (`volumeCheckerInput`) để mở lại vẫn còn. Nút **Xóa trắng** bấm 2 lần. **Không có nút Copy**, bảng chỉ xem.
3. **Bóc tách mỗi dòng** `Thương hiệu - Tên - Dung tích` (vd `LONGTIEN - Kẹo Bông Gòn EDP - Full 50ml` → Tên `LONGTIEN - Kẹo Bông Gòn EDP`, Dung tích `50`):
   - Đoạn sau dấu ` - ` **cuối cùng** chỉ là dung tích khi có `ml`, hoặc chỉ gồm chữ loại + số (Full, Fullbox, Nobox, Tester, Testerbox, Refill, Mini, Seal, Set...). Tên có nhiều dấu gạch (`Maison Margiela - Replica - Jazz Club EDT`) hay có số (`Montale - Paris 2020`) giữ nguyên. Chữ loại bị bỏ, chỉ lấy số; số lẻ giữ nguyên (`7,5ml` → `7.5`). **Mỗi dòng chỉ lấy 1 dung tích** (ưu tiên số có `ml`, không có thì số đầu tiên).
   - **Phần trong ngoặc** `(...)` / `[...]` ở phần dung tích hoặc cuối dòng là mô tả / tên phụ (vd `Armaf - Club de Nuit Intense Man Limited Edition Parfum - Full 105ml (Mẫu 2024)` → Tên `Armaf - Club de Nuit Intense Man Limited Edition Parfum`, Dung tích `105`): **bỏ**, không lấy số và không đưa vào tên. Ngoặc nằm giữa tên (trước phần dung tích, vd `Dior - Sauvage (Elixir) - Full 60ml`) giữ nguyên trong tên.
   - Dòng có **Set / Gift Set / Giftset** ở bất kỳ đâu (đúng 1 từ riêng, không tính `Settle`, `Sunset`): **không lấy dung tích**, chỉ giữ tên thuần (bỏ phần dung tích / chữ `Set` ở đoạn cuối, vd `Dior - Sauvage EDT - Set 3x10ml` → `Dior - Sauvage EDT`).
   - Dán từ Excel nhiều cột (`Tên <Tab> 75 <Tab> 125`): ô đầu là Tên, các ô sau là dung tích.
   - **Bỏ qua** (không đưa vào bảng, đếm ở thanh công cụ "Bỏ qua N dòng Chiết, M dòng Gốc"): dòng **Chiết** (chữ `Chiết` / `decant`, hoặc chỉ ghi `5` / `10` / `20ml` không có chữ loại - dạng Kiểm Tra Giá Vốn xuất Chiết) và dòng **Gốc** (chữ `Gốc` hoặc phân số `35/50`). Dòng **phân loại** (chứa `___`) và dòng trống bỏ qua luôn, không đếm.
4. **Gộp + so tên**: các dòng cùng Tên gộp thành 1 dòng (giữ thứ tự xuất hiện đầu tiên, dung tích trùng tính 1 lần). So với tên chuẩn phải **trùng 100%** (phân biệt dấu và hoa/thường; chỉ bỏ qua khoảng trắng thừa và cách gõ dấu dựng sẵn / tổ hợp). Bảng chỉ hiện các tên có trong dữ liệu dán vào.
   - Không trùng 100% nhưng trùng khi bỏ dấu + hoa/thường + khoảng trắng → **gần giống**: hàng trên hiện tên chuẩn đề xuất (giữ màu chữ phụ như mọi dòng, kèm `dungtich1..5` của nó), **chỉ tên nhập ở hàng dưới chữ vàng**.
   - Không có tên nào → **dòng riêng**: hàng trên trống, hàng dưới chữ đỏ.
5. **Bảng** (chỉ xem): `#` · `Hình` · **`Tên chuẩn / Tên nhập`** · `DT1`..`DT5` (64px, số căn phải). Mỗi ô 2 hàng: **trên là gốc** (chữ phụ), **dưới là nhập** (`.cell-result`). Ô dung tích luôn đủ 2 hàng.
   - **Xếp cột**: dung tích nhập có trong gốc → đặt **đúng cột có cùng số**; không có trong gốc → lần lượt vào **các cột gốc còn trống** (gốc `75 30 50 125` nhập thêm `100` → cột 5; gốc `75 30` nhập `75 30 50 125` → `50` cột 3, `125` cột 4); hết cột trống → ghi thêm dưới tên `+200ml` chữ đỏ.
   - **Màu hàng dưới**: xanh (`.is-same`) = tên trùng 100% / dung tích có trong gốc; đỏ (`.is-alert`) = tên chưa có / dung tích gốc chưa có / dư cột; vàng = tên gần giống. Gốc có mà nhập không có → ô dưới để trống, không tính lỗi. Có đỏ → viền đỏ cả dòng (`.row-alert`).
   - **Lọc + đếm**: Tất Cả / Đã Đúng / Cần Xem Xét / Cần Sửa (bộ lọc chung §8.1b). **Hình + ảnh lớn** lấy theo tên chuẩn như §8.3.