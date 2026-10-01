# RULES & PROTOCOL FOR PERSONAL INTRODUCTION WEBSITE (tranthangminh.github.io)
> **Mục đích:** File quy tắc chung áp dụng chuyên biệt cho dự án Website cá nhân của Max (`tranthangminh.github.io`). AI Agent bắt buộc phải tuân thủ nghiêm ngặt mọi điều khoản bên dưới trước và trong khi thực thi bất kỳ task nào.

---

## 1. QUY CHUẨN NGÔN NGỮ DỰ ÁN & KIẾN TRÚC SONG NGỮ 2 TẦNG (BILINGUAL ARCHITECTURE)
- **Website Song ngữ (Bilingual: Tiếng Việt làm chuẩn, Tiếng Anh hỗ trợ):**
  - Giao diện người dùng (UI text, heading, button label, placeholders, alt text) mặc định hiển thị bằng **Tiếng Việt**.
  - Hỗ trợ đa ngôn ngữ qua hệ thống engine `common/shared-i18n.js` với thuộc tính `data-i18n` trên các phần tử DOM.
- **KIẾN TRÚC TỪ ĐIỂN SONG NGỮ 2 TẦNG (TWO-TIER BILINGUAL ARCHITECTURE - BẮT BUỘC):**
  Nhằm đảm bảo hiệu năng tải trang tức thì, giữ cho mã nguồn nhẹ và module hóa cao, hệ thống từ điển đa ngôn ngữ được phân định ranh giới nghiêm ngặt thành 2 tầng:
  1. **Tầng 1: Từ Điển Khung Toàn Cục (`common/i18n-vi.js` & `common/i18n-en.js`):**
     - **CHỈ CHỨA:** Các chuỗi UI khung dùng chung tái sử dụng xuyên suốt toàn website:
       - Header điều hướng (`header.*`) & menu ngành nghề.
       - Footer liên hệ (`contact.*`), nút liên hệ nhanh (`bookNow.*`).
       - Nhãn Segmented Tabs dùng chung (`productTabs.*`).
       - Breadcrumb và tiêu đề trang tổng quan (`productsPage.*`).
       - Nhãn đơn vị số liệu hiển thị (`productsPage.units.*`: lượt tải, người dùng, lượt truy cập).
       - Modal chào mừng dùng chung (`welcome.*`), Lightbox xem ảnh (`lightbox.*`).
     - **TUYỆT ĐỐI CẤM:** Không được nhồi nhét nội dung bài viết dài, bài giới thiệu tiểu sử chi tiết, tài liệu hướng dẫn sử dụng, mô tả tính năng chuyên sâu, bảng phím tắt hoặc thông số kỹ thuật của từng trang con/sản phẩm vào 2 file common này. Việc nhồi nhét sẽ làm phình to file chung khiến mọi trang trên website đều phải gánh tải dữ liệu không cần thiết.
  2. **Tầng 2: Từ Điển Nội Dung Riêng Theo Trang (`[tên-trang]-i18n.js`):**
     - **QUY TẮC PHÂN TÁCH ĐỘC LẬP:** Toàn bộ nội dung ruột của từng trang chi tiết (ví dụ: các trang trong `products/`, `jobs/`...) **BẮT BUỘC** phải được tách thành file từ điển riêng đặt ngay cùng thư mục với trang HTML đó (ví dụ: `products/auto-clicker-i18n.js`).
     - **Cơ chế nạp chuẩn hóa (Standard Registration Flow):** Đăng ký bản dịch vào engine chung thông qua `window.sharedI18n.registerTranslations`:
       ```javascript
       (function () {
           'use strict';
           if (!window.sharedI18n || typeof window.sharedI18n.registerTranslations !== 'function') return;

           // Từ điển Tiếng Việt của riêng trang
           window.sharedI18n.registerTranslations('vi', {
               autoClicker: {
                   summary: '...',
                   guide: { /* ... */ },
                   limits: { /* ... */ },
                   requirements: { /* ... */ }
               }
           });

           // Từ điển Tiếng Anh tương ứng của riêng trang
           window.sharedI18n.registerTranslations('en', {
               autoClicker: {
                   summary: '...',
                   guide: { /* ... */ },
                   limits: { /* ... */ },
                   requirements: { /* ... */ }
               }
           });
       })();
       ```
     - **Thứ tự nhúng script trong HTML:**
       ```html
       <script src="../common/shared-i18n.js"></script>
       <script src="../common/i18n-vi.js"></script>
       <script src="../common/i18n-en.js"></script>
       <script src="[tên-trang]-i18n.js"></script> <!-- Nạp từ điển riêng của trang -->
       ```
     - **Lợi ích kiến trúc:** Tải trang tức thì (trang nào chỉ tải đúng từ vựng của trang đó), khi cần chỉnh sửa/bảo trì bản dịch chỉ cần mở đúng 1 file của trang đó mà không lo xung đột hay ảnh hưởng các trang khác.
- **NGUYÊN TẮC BẢO TOÀN NGUỒN KHI DỊCH THUẬT (STRICT SOURCE PRESERVATION RULE):**
  - **Chỉ dịch đúng ngôn ngữ đích cần bổ sung, tuyệt đối không chỉnh sửa nội dung gốc:**
    - Khi dịch từ **Tiếng Việt sang Tiếng Anh:** Giữ nguyên 100% văn phong, thuật ngữ, dấu câu và cấu trúc nội dung Tiếng Việt đã có sẵn. TUYỆT ĐỐI KHÔNG tự ý biên tập lại, viết lại, rút gọn hay thay đổi văn bản Tiếng Việt. Chỉ tập trung tạo bản dịch Tiếng Anh chuẩn xác tương ứng.
    - Khi dịch từ **Tiếng Anh sang Tiếng Việt:** Giữ nguyên 100% nội dung Tiếng Anh gốc, không sửa đổi hay đụng chạm câu chữ Tiếng Anh, chỉ tập trung tạo bản dịch Tiếng Việt tương ứng.
  - **QUY TẮC BẢO TOÀN NGUYÊN VẸN TÊN RIÊNG & DẤU TIẾNG VIỆT (STRICT PROPER NAMES & DIACRITICS PRESERVATION):**
    - **Tuyệt đối KHÔNG xóa dấu, không phiên âm không dấu cho danh từ riêng, họ tên người:** Khi biên dịch sang Tiếng Anh (hoặc bất kỳ ngôn ngữ nào khác), tên tác giả (**Trần Thắng Minh**), tên nhân vật, tên các nghệ sĩ, thầy cô, đối tác, địa danh, tên riêng của thương hiệu (ví dụ: `Trần Thắng Minh`, `Vũ Thùy Linh`, `Hồng Vân`, `Trần Bảo Châu`, `Lê Nguyễn Tuấn Anh`, `Vũ Xuân Trang`, `Nguyễn Lê Hoàng Thy`, `Nguyễn Hữu Châu`, `Doãn Hoàng Giang`, `Chấn Hải Media`, `Minh Nhật`...) **BẮT BUỘC PHẢI GIỮ NGUYÊN 100% ĐẦY ĐỦ DẤU TIẾNG VIỆT**.
    - Tuyệt đối CẤM chuyển đổi thành dạng không dấu (như *Tran Thang Minh*, *Hong Van*, *Chan Hai Media*, *Minh Nhat*...). Tên riêng là định danh độc bản của con người và thương hiệu, phải được tôn trọng tuyệt đối.
  - **Mục đích:** Bảo toàn tính nguyên bản của nội dung mà người dùng đã dày công biên soạn và phê duyệt, cấm AI tự ý "sáng tạo lại" hay làm sai lệch ý đồ tác giả ban đầu.
- **Mã nguồn kỹ thuật (Codebase):**
  - Tên file, tên biến (variables), tên hàm (functions), thuộc tính, class CSS, ID DOM, comment kỹ thuật trong code và commit messages PHẢI sử dụng **Tiếng Anh (English)**.
- **Giao tiếp & Kế hoạch (Chat & Planning):**
  - Toàn bộ kế hoạch (plan), giải thích kỹ thuật và phản hồi trong khung chat sử dụng **Tiếng Việt** (xưng *"tao"* - gọi *"mày"*).

---

## 2. QUY TẮC XƯNG HÔ & PHONG CÁCH GIAO TIẾP (COMMUNICATION TONE)
- **Xưng hô cố định:** AI Agent xưng **"tao"** và gọi người dùng là **"mày"** trong mọi phản hồi ở khung chat.
- **Thẳng thắn & Thực tế:** 
  - Nói chuyện trực diện, ngắn gọn, đi thẳng vào vấn đề. Không dùng từ ngữ xã giao sáo rỗng, nịnh bợ hay giải thích dông dài không cần thiết.
  - Khi thấy code lỗi thời, logic chưa tối ưu hoặc giải pháp của "mày" có nguy cơ gây lỗi, tao phải chỉ ra thẳng thắn lý do và đưa ra giải pháp tốt nhất.
- **Tuyệt đối không bịa chuyện (Zero Hallucination):**
  - Không tự tưởng tượng ra API, hàm, file hoặc thuộc tính không có thật.
  - Không khẳng định code chạy đúng khi chưa phân tích kỹ logic.
  - Nếu thiếu ngữ cảnh, thiếu file, hoặc chưa rõ yêu cầu -> **Phải hỏi ngay "mày" để làm rõ**, tuyệt đối không đoán mò hay tự phán.

---

## 3. QUY TRÌNH THỰC THI TASK & TỐI ƯU TỐC ĐỘ (WORKFLOW & FAST EXECUTION PROTOCOL)
- Mọi task chỉnh sửa hoặc viết mới code PHẢI tuân theo 3 bước tinh gọn:
  1. **Plan (Kế hoạch):** Nêu ngắn gọn 2-3 dòng các file sẽ sửa/tạo và hướng tiếp cận trước khi code (hoặc lên plan chi tiết khi người dùng yêu cầu).
  2. **Search (Tìm kiếm):** Quét codebase kiểm tra các hàm dùng chung (`common/`), class CSS, token theme sẵn có để tái sử dụng, tránh viết trùng lặp.
  3. **Execute (Thực thi):** Viết code đầy đủ, tối giản và chuẩn xác.
- **TỐI GIẢN HÓA QUY TRÌNH KIỂM THỬ (CẮT BỎ THAO TÁC THỪA ĐỂ PHẢN HỒI NHANH NHẤT):**
  - **TUYỆT ĐỐI KHÔNG tự ý dựng local HTTP server.**
  - **TUYỆT ĐỐI KHÔNG tự ý mở Chrome DevTools để click test hoặc chụp ảnh màn hình (screenshot)** trừ khi người dùng có yêu cầu rõ ràng.
  - Tập trung phân tích tĩnh code, đảm bảo tính đúng đắn về cú pháp, logic và kiến trúc ngay trong lần chỉnh sửa đầu tiên và trả lời ngay lập tức để tiết kiệm tối đa thời gian cho "mày".

---

## 4. NGUYÊN TẮC BẢO VỆ CODE & TỐI GIẢN (ENGINEERING & MINIMALISM STANDARD - KISS)
- **Single Source of Truth:** Chỉ tin vào code và tài nguyên hiện có trong repository `tranthangminh.github.io`.
- **CẤM VIẾT CODE TẮT:** Tuyệt đối KHÔNG dùng `// ... rest of code`, `// todo: implement later` hoặc tự ý xóa bớt code cũ không liên quan. Mọi đoạn code chỉnh sửa phải hoàn chỉnh.
- **CHỈ SỬA ĐÚNG PHẠM VI TASK:** Được yêu cầu sửa file nào thì chỉ sửa đúng file đó, tuyệt đối không tự ý sửa lan man sang các file khác khi chưa được yêu cầu.
- **Triết lý Cốt lõi (KISS - Keep It Simple, Stupid):**
  - Mọi hàm, tính năng hoặc sửa lỗi PHẢI ưu tiên viết bằng **số lượng dòng code ít nhất có thể**, đơn giản nhất, ngắn gọn nhất.
  - Tránh viết logic cồng kềnh, không vẽ thêm wrapper hay thư viện phụ trợ thừa thãi.
- **Cấm "Đắp Code" khi Fix Bug (No Band-Aid Code):**
  - Khi phát sinh lỗi hoặc edge case, **KHÔNG ĐƯỢC đắp thêm các đoạn hack DOM hay hack CSS chắp vá** làm phình to codebase.
  - Phải tìm ra **nguyên nhân gốc rễ (Root Cause)** và xử lý triệt để bằng giải pháp tối giản nhất.
- **Giới hạn Debug (Circuit Breaker):** Nếu một lỗi sửa **quá 2 lần** vẫn thất bại, PHẢI DỪNG LẠI, giải thích rõ nguyên nhân cho "mày" và xin ý kiến chỉ đạo, tuyệt đối không tự thử nghiệm linh tinh làm nát codebase.

---

## 5. QUY CHUẨN MÀU SẮC & HỆ THỐNG TOKEN `theme.css` (DESIGN SYSTEM & THEME TOKENS RULE)
- **TUYỆT ĐỐI CẤM SỬ DỤNG `currentColor` hoặc mã màu HEX cứng (`#fff`, `#000`, `#ff3b30`...)** cho icon, text và các thành phần giao diện.
- **BẮT BUỘC SỬ DỤNG 100% BIẾN MÀU (CSS VARIABLES) TRONG `common/theme.css`:**
  - *Nền (Background):* `var(--bg-primary)`, `var(--bg-elevated)`, `var(--bg-card)`, `var(--bg-overlay)`, `var(--bg-tertiary)`
  - *Chữ & Biểu tượng (Text & Icons):* `var(--text-primary)`, `var(--text-secondary)`, `var(--text-tertiary)`, `var(--text-muted)`
  - *Màu nhấn thương hiệu (Accent Brand):* `var(--accent-primary)`, `var(--accent-hover)`, `var(--accent-subtle)`
  - *Tương phản trên nền nhấn (On-Accent):* `var(--text-on-accent)` (dùng cho text/icon nằm trên nút hoặc thẻ có nền đỏ accent)
  - *Đường viền (Border):* `var(--border-color)`, `var(--border-hover)`
  - *Hiệu ứng & Bo góc:* `var(--border-radius-full)`, `var(--border-radius-card)`, `var(--transition-normal)`
- **CẢNH BÁO TỬ HUYỆT: BẪY CHỮ TÀNG HÌNH TRÊN NỀN SÁNG (INVISIBLE TEXT TRAP VỚI `var(--text-on-accent)`):**
  - Token `var(--text-on-accent)` được định nghĩa là màu trắng (`#ffffff`) trên CẢ 2 chế độ Dark Mode và Light Mode (để bảo đảm luôn nổi bật trên nền nút đỏ `--accent-primary`).
  - Nếu một thành phần con (như thẻ đếm số, sub-badge, tooltip) nằm trên hoặc liền kề nút/thẻ accent nhưng lại có nền riêng là `var(--bg-primary)` (hoặc kế thừa nền trắng của Light Mode):
    - **TUYỆT ĐỐI CẤM** dùng `var(--text-on-accent)` cho phần tử con này. Trên Light Mode, nền trắng gặp chữ trắng sẽ khiến chữ biến mất hoàn toàn (tàng hình 100%)!
    - **QUY CHUẨN:** Mọi badge, nhãn đếm hoặc sub-element có nền `var(--bg-primary)` BẮT BUỘC phải dùng `color: var(--text-primary);` (sẽ là đen `#000` trên Light Mode và trắng `#fff` trên Dark Mode).
    - Ví dụ điển hình: Thẻ lượt tải `.tools-download-badge` nằm trên thanh tải về, nhãn đếm file `.tools-file-count`...
- Đảm bảo giao diện luôn tự động thích ứng hoàn hảo khi chuyển đổi giữa chế độ **Dark Mode** và **Light Mode**.
- **QUY CHUẨN PHÂN ĐỊNH 3 CẤP ĐỘ TOKEN MÀU CHỮ (STRICT TEXT COLOR TOKENS STANDARD - BẮT BUỘC TUÂN THỦ):**
  Nhằm đảm bảo độ tương phản thị giác tối đa, văn bản đọc luôn sắc nét, không bị xám mờ (washed out) gây mỏi mắt người đọc, toàn bộ văn bản trên website BẮT BUỘC phải phân loại chính xác theo 3 cấp độ:
  1. **Cấp 1: `var(--text-primary)` (`#ffffff` Dark / `#000000` Light) — TOÀN BỘ VĂN BẢN ĐỌC CHÍNH (PRIMARY READABLE TEXT):**
     - **BẮT BUỘC ÁP DỤNG CHO:**
       - Toàn bộ tiêu đề lớn nhỏ (`h1` - `h6`, section titles, card titles).
       - Toàn bộ đoạn văn mô tả (paragraph, tóm tắt hero `.tools-summary`, `.products-summary`, `.actor-summary`, `.bun-desc`, `.timeline-text`...).
       - Đoạn văn mô tả trên thẻ card sản phẩm (`.product-card-desc`, `.intro-flow-desc`, `.intro-featured-desc`...).
       - Danh sách gạch đầu dòng tính năng (`.tools-panel-list`, `.actor-bullet-list li`...).
       - Toàn bộ ô dữ liệu bảng thông số kỹ thuật, bảng phím tắt (`.app-table td`, `.app-table th`).
       - Mô tả các bước quy trình thực hiện (`.app-step-desc`, `.tools-install-list`...).
       - Toàn bộ nội dung văn bản trong các hộp Callout: Mẹo chuyên gia (`.app-tip-desc`), cảnh báo kỹ thuật (`.app-notice-desc`), cam kết an toàn & quyền riêng tư (`.app-privacy-text`), mô tả modal sao lưu/xác thực (`.shared-auth-modal-desc`), dòng ghi chú hướng dẫn tải file (`.tools-file-note`).
     - **NGUYÊN TẮC CỐT LÕI:** Mắt người đọc phải tiếp cận văn bản với độ tương phản cao nhất (100% crisp & contrast). **TUYỆT ĐỐI CẤM** dùng `var(--text-secondary)` cho các khối văn bản đọc thông thường, đoạn văn tóm tắt hay danh sách tính năng.
  2. **Cấp 2: `var(--text-secondary)` (`#bbbbbb` Dark / `#666666` Light) — CHỈ DÀNH CHO THÀNH PHẦN PHỤ TRỢ & TRẠNG THÁI INACTIVE:**
     - **CHỈ ĐƯỢC PHÉP ÁP DỤNG CHO:**
       - Trạng thái Tab chưa kích hoạt (`.segmented-tabs-btn:not(.is-active)`).
       - Huy hiệu, tag danh mục, pill có nền bao quanh (`.tools-panel-badge`, `.app-meta-pill`, `.photographer-tag`).
       - Nhãn đếm số lượng (`.tools-file-count`), tiêu đề phân nhóm chữ cái (`.tools-file-group-title`).
       - Phụ đề dọc mang tính trang trí (`.showcase-vertical-subtitle`, `.showcase-card-vertical-subtitle`).
       - Nhãn chú thích xem trước ảnh (`.spotlight-caption`, `.tools-embed-label`), kicker tiêu đề phụ nhỏ trên đầu (`.welcome-note-kicker`).
  3. **Cấp 3: `var(--text-tertiary)` (`#888888` Dark / `#999999` Light) — SIÊU DỮ LIỆU MỜ (MUTED METADATA):**
     - Đuôi mở rộng định dạng file mờ bên cạnh tên (`.tools-file-link-ext` ví dụ `.CT`).
     - Dòng bản quyền tác giả và nhãn số lượt truy cập ở footer (`.contact-copyright-row`, `.contact-visits-text`).
- **Phạm vi áp dụng & Ngoại lệ:**
  - Áp dụng trên toàn bộ trang chủ, trang nghề nghiệp (`jobs/`), trang danh mục sản phẩm (`products.html`), và các trang mô tả chi tiết sản phẩm (`products/*.html`).
  - *Ngoại lệ:* Các web apps, mini game độc lập bên trong `products/web-apps/`, `products/Chrome Extensions/`, `products/Plugins/` có bảng màu hoặc phong cách đồ họa độc lập (như đã quy định tại Mục 8).

---

## 6. QUY TẮC QUẢN LÝ ICON SVG & KỸ THUẬT CSS MASKING (SVG ASSETS & MASKING STANDARD)
- **Tuyệt đối KHÔNG tự ý vẽ thủ công SVG bằng code HTML inline** (`<svg><path>...`) khi cần hiển thị icon giao diện.
- **Bắt buộc sử dụng file asset trong thư mục `svg/`** (ví dụ: `svg/windows.svg`, `svg/chrome.svg`, `svg/books.svg`, `svg/plugins.svg`...).
- **Tiêu chuẩn Kỹ thuật CSS Masking (`.icon-mask` hoặc `.[feature]-icon`):**
  ```css
  .custom-icon {
    display: inline-block;
    width: 16px;
    height: 16px;
    background-color: var(--text-primary); /* Bắt buộc dùng token theme, CẤM currentColor */
    mask-size: contain;
    -webkit-mask-size: contain;
    mask-repeat: no-repeat;
    -webkit-mask-repeat: no-repeat;
    mask-position: center;
    -webkit-mask-position: center;
    transition: background-color var(--transition-normal);
    flex-shrink: 0;
  }

  /* Khi active hoặc hover trên nền accent: */
  .custom-btn.is-active .custom-icon {
    background-color: var(--text-on-accent);
  }
  ```
- **Quy chuẩn file SVG trong thư mục `svg/`:**
  - Phải có thuộc tính `width="24" height="24"` (hoặc tỷ lệ chuẩn tương ứng) trên thẻ `<svg>`.
  - Phải dùng màu fill đặc thuần túy (`fill="#000000"`), **KHÔNG dùng gradient nội bộ trong thẻ `<defs>`** khi dùng làm mask để tránh lỗi trình duyệt không nhận diện được kênh alpha.
- **QUY TẮC BẢO VỆ ĐA NGÔN NGỮ (i18n) KHI KẾT HỢP ICON VÀ TEXT:**
  - Khi một nút (button), liên kết (`<a>`), hoặc **TIÊU ĐỀ (`<h1>` - `<h6>`, `.tools-panel-title`)** chứa cả icon (`<img>` hoặc `.icon-mask`) và văn bản:
    - Phần text **BẮT BUỘC** phải được bọc trong một thẻ `<span>` riêng mang thuộc tính `data-i18n`.
    - **TUYỆT ĐỐI CẤM** đặt `data-i18n` trực tiếp lên thẻ cha (`<h1>`, `<button>`, `<a>`) vì khi script chuyển ngữ `shared-i18n.js` chạy, nó sẽ gán `el.textContent = ...` làm **XÓA SỔ HOÀN TOÀN** các thẻ icon con (`<img>`, `<span>`) nằm bên trong!
    ```html
    <!-- ĐÚNG (Tiêu đề sản phẩm chứa icon SVG): -->
    <h1 class="tools-panel-title">
      <img src="../svg/auto-clicker.svg" alt="App Icon" class="app-title-icon" width="57" height="57">
      <span data-i18n="autoClicker.title">Auto Clicker by Max</span>
    </h1>

    <!-- ĐÚNG (Nút bấm chứa icon mask): -->
    <button class="my-btn">
      <span class="my-btn-icon my-btn-icon--windows" aria-hidden="true"></span>
      <span data-i18n="section.btnText">Windows Apps</span>
    </button>

    <!-- SAI TỬ HUYỆT (Script i18n ghi đè textContent làm bốc hơi thẻ icon img): -->
    <h1 class="tools-panel-title" data-i18n="autoClicker.title">
      <img src="../svg/auto-clicker.svg" class="app-title-icon"> Auto Clicker by Max
    </h1>
    ```

---

## 7. KIẾN TRÚC WEB & HỆ THỐNG COMPONENT DÙNG CHUNG (WEB ARCHITECTURE & SHARED COMPONENTS)
- **Công nghệ nền tảng:**
  - Pure HTML5 Semantic + Modern CSS3 (Flexbox, CSS Grid, CSS Variables) + Vanilla JavaScript (ES6+).
  - Không sử dụng npm build, webpack, hay framework nặng (React, Vue, jQuery) để đảm bảo tốc độ tải trang tức thì trên GitHub Pages.
- **Cấu trúc thư mục chuẩn:**
  - `/` (Gốc): Các trang chính (`index.html`, `products.html`, `work.html`...).
  - `common/`: Chứa toàn bộ CSS, JS và từ điển dùng chung:
    - `theme.css` & `theme.js`: Quản lý giao diện Sáng / Tối và biến màu.
    - `shared-header.css` & `shared-header.js`: Thanh điều hướng đầu trang (Navigation Header) và menu popup.
    - `shared-footer.css` & `shared-contact.js`: Khối liên hệ, mạng xã hội, slogan và bộ đếm truy cập.
    - `shared-i18n.js`, `i18n-vi.js`, `i18n-en.js`: Hệ thống chuyển ngữ.
    - `shared-tabs.css` & `shared-tabs.js`: Component Segmented Tabs dùng chung (chuyển đổi danh mục, trượt indicator, responsive 2 hàng connected).
    - `shared-spotlight.css` & `shared-spotlight.js`: Khung xem trước hình ảnh (Spotlight lớn + dải thumbnail + modal phóng to).
    - `shared-product-detail.css`: Khung bố cục và các component dùng chung cho toàn bộ trang chi tiết sản phẩm.
    - `shared-download-counter.js`: Quản lý và đồng bộ lượt tải xuống sản phẩm.
    - `shared-webapp-counter.js`: Quản lý bộ đếm lượt chạy / lượt chơi độc lập cho Web Apps.
    - `shared-auth.css` & `shared-auth.js`: Hệ thống modal xác thực mã mở khóa và phân quyền tải file.
    - `shared-surfaces.css`: Hệ thống bề mặt (cards, panels, token độ sâu thị giác).
    - `shared-mobile-type-scale.css`: Chuẩn hóa tỷ lệ font chữ và khoảng cách dòng trên màn hình di động.
    - `shared-lightbox.css` & `shared-lightbox.js`: Xem ảnh phóng to toàn màn hình (zoom / pan / ESC đóng).
    - `shared-welcome.css` & `shared-welcome.js`: Modal lời chào đón đầu trang.
    - `shared-page.js` & `shared-layout.css`: Khởi tạo trang, Scroll Reveal (`.reveal-up`) và layout nền tảng.
  - `products/`: Chứa các trang chi tiết sản phẩm (`auto-clicker.html`, `book-forge.html`, `plugin-photoshop.html`...) tuân thủ nghiêm ngặt quy tắc 1 HTML <-> 1 CSS trùng tên, cùng 5 thư mục con phân loại tài nguyên:
    - `Books/`: Sách & tài liệu PDF.
    - `Chrome Extensions/`: Tiện ích mở rộng Chrome.
    - `Plugins/`: Plugin cho Photoshop, Maya, Cheat Engine...
    - `web-apps/`: Ứng dụng & game chạy trực tiếp trên nền web (`52-cards-tracker.html`, `tinhtiennhanh.html`...).
    - `Windows Apps/`: Ứng dụng Windows tải về (.exe, .zip).
  - `svg/`: Thư mục icon vector dùng chung cho toàn website.
- **Quy tắc Đồng bộ Liên trang (Cross-page Synchronization):**
  - Mọi thay đổi logic về tải file hoặc đếm lượt tải phải cập nhật tập trung trong `common/shared-download-counter.js` để cả trang `products.html` và trang chi tiết sản phẩm tự động đồng bộ.
  - Bộ đếm lượt truy cập toàn trang (Visitor Counter) hoạt động qua `common/shared-contact.js` với session timeout 15 phút, bắt đầu từ mốc 1.000 lượt.
  - Trạng thái Theme (Dark/Light) và Language (VI/EN) lưu trữ trong `localStorage` để duy trì trải nghiệm liền mạch khi điều hướng giữa các trang.
  - **Quy chuẩn Menu Popup Footer (`.social-more-list` - Chống Tràn Màn Hình Mobile):**
    - Danh sách mạng xã hội mở rộng trong Footer (`.social-more-list`) BẮT BUỘC phải đặt `display: none` ở trạng thái bình thường (khi chưa mở), và CHỈ chuyển thành `display: flex` khi có class `.is-open`.
    - BẮT BUỘC neo mép phải `right: 0; left: auto;` kèm `max-width: calc(100vw - 32px); box-sizing: border-box;` để triệt tiêu hoàn toàn lỗi tràn mép ngang màn hình (horizontal viewport overflow) trên điện thoại khi người dùng nhấn nút "Xem thêm".
  - **QUY CHUẨN ĐÁNH SỐ PHIÊN BẢN CACHE-BUSTING (`?v=YYYYMMDD-X` - BẮT BUỘC):**
    - Mọi file `.css` và `.js` nhúng trong thẻ `<link rel="stylesheet">` và `<script src="...">` của các file HTML bắt buộc phải có query parameter cache-busting theo định dạng ngày tháng: `?v=YYYYMMDD-X` (ví dụ `?v=20260930-1`).
    - Khi thực hiện bất kỳ sửa đổi nào trên các file CSS/JS dùng chung (`common/*`) hoặc file CSS/JS riêng của từng trang, **BẮT BUỘC PHẢI BUMP ĐỒNG LOẠT** query parameter version trên toàn bộ 11 file HTML của website (`index.html`, `products.html`, 4 trang jobs, 5 trang chi tiết sản phẩm).
    - *Mục đích:* Triệt tiêu 100% hiện tượng trình duyệt của người dùng hoặc CDN của GitHub Pages nạp file CSS/JS cũ từ bộ nhớ đệm (cache), đảm bảo các bản sửa lỗi và từ điển song ngữ mới nhất luôn có hiệu lực tức thì sau khi push lên repository.

---

## 8. QUY CHUẨN ĐẶC THÙ CHO WEB APPS (TRONG THƯ MỤC `products/web-apps/`)
> **Mục đích:** Áp dụng cho các mini app, game web và công cụ tiện ích chạy trực tiếp trên trình duyệt (ví dụ: Tic Tac Toe, Vòng xoay may mắn, Bộ đếm bài 52 lá, Tính tiền nhanh...).

- **Tính Độc Lập Hoàn Toàn (Standalone & Decoupled Architecture):**
  - Web Apps là các ứng dụng tự thân, phục vụ trải nghiệm người dùng độc lập, tách biệt hoàn toàn khỏi logic trang cá nhân/portfolio.
  - **Không bắt buộc** phải nhúng Header chung (`shared-nav.js`), Footer (`shared-contact.js`), nút "Liên Hệ Ngay" hay bộ đếm lượt truy cập của trang cá nhân.
- **Kế thừa Theme & Phong cách hiển thị:**
  - Khuyến khích sử dụng các biến màu token trong `common/theme.css` để đồng bộ thị giác với hệ sinh thái web.
  - Tuy nhiên, ứng dụng/game được phép tùy biến bảng màu hoặc phong cách đồ họa riêng nếu gameplay/tính năng yêu cầu.
- **Chiến Lược Đa Ngôn Ngữ Cục Bộ (Local Bilingual Strategy):**
  - **TUYỆT ĐỐI CẤM** nhồi nhét từ khóa, chuỗi UI hay thông báo của Web Apps vào từ điển toàn cục `common/i18n-vi.js` và `common/i18n-en.js` của website chính.
  - Mọi tính năng chuyển ngữ Anh - Việt phải được **đóng gói nội bộ 100% trong chính Web App đó**:
    1. *Phương án ưu tiên (Pure HTML/CSS):* Viết sẵn cả 2 ngôn ngữ bằng cặp thẻ `.lang-vi` và `.lang-en`:
       ```html
       <button class="game-btn">
         <span class="lang-vi">Chơi Lại</span>
         <span class="lang-en">Play Again</span>
       </button>
       ```
       Ẩn/hiện tức thì qua CSS:
       ```css
       :root[lang="vi"] .lang-en { display: none !important; }
       :root[lang="en"] .lang-vi { display: none !important; }
       ```
    2. *Phương án Text động / Logic Game (Local JS Dictionary):* Khai báo một object từ điển nhỏ trực tiếp trong file JS của app đó:
       ```javascript
       const I18N = {
         vi: { win: "Bạn đã thắng!", turn: "Lượt của: " },
         en: { win: "You won!", turn: "Turn of: " }
       };
       ```
  - Trạng thái ngôn ngữ nếu có lưu trữ thì lưu vào `localStorage` riêng của app đó (ví dụ: `app_[tên]_lang`).

---

## 9. QUY CHUẨN COMPONENT DÙNG CHUNG: SEGMENTED TABS (DANH MỤC / BỘ LỌC)
> **Mục đích:** Quy chuẩn thiết kế và cách triển khai thanh điều hướng danh mục (Segmented Control / Tabs) sử dụng `common/shared-tabs.css` và `common/shared-tabs.js`. Mọi trang cần chức năng chia tab (như `products.html`, `work.html`...) đều phải tuân thủ chuẩn này.

### 1. Kiến Trúc Hiển Thị & Hành Vi Đa Kích Thước (Responsive Behavior)
- **Màn hình đủ bề ngang / Desktop (> 680px):**
  - Hiển thị 1 hàng ngang chuẩn (Segmented Control Bar).
  - Khối đỏ trượt (`.segmented-tabs-indicator`) tự động co giãn vừa vặn độ dài text của tab active theo chuyển động gia tốc `cubic-bezier(0.4, 0, 0.2, 1)`.
  - Giữ bo góc `var(--border-radius-sm)` (2px), nền track `var(--bg-primary)`.
- **Màn hình thiếu bề ngang / Mobile (<= 680px - Connected 2-Row Layout):**
  - **Khóa cứng chuẩn chiều cao tổng thể 66px:** Toàn bộ Segmented Tabs trên Mobile được cố định ở tổng chiều cao **66px** siêu gọn gàng (Hàng 1 cao 33px + Hàng 2 cao 33px).
  - **Hàng 1 (Nút icon - cao 33px):** Chứa các icon rút gọn của các tab (`min-height: 33px; padding: 4px 4px; icon 18px x 18px`), ẩn text nút, khối trượt indicator trượt ngang qua các icon kèm theo **2 tai cong lõm (Inverted Corner Fillets)** ở 2 bên mép dưới indicator.
  - **Hàng 2 (Dải text đỏ - cao 33px):** Dải text đỏ (`.segmented-tabs-active-label` mang `min-height: 33px; padding: 4px 12px; font-size: 13px; font-weight: 700;`) hiển thị tên tab đang chọn, dính liền khối với tab active ở hàng 1.
  - **Chống chớp nháy (No Flicker):** Khối nền đỏ hàng 2 luôn giữ cố định 100% opacity; chỉ có thẻ `<span class="segmented-tabs-active-text">` bên trong là áp dụng animation đổi chữ êm dịu (`activeTextFade`), tuyệt đối không làm chớp/mất hộp nền đỏ.

### 2. Cấu Trúc Markup Chuẩn (HTML Skeleton)
```html
<link rel="stylesheet" href="common/shared-tabs.css">

<div class="segmented-tabs-container">
  <div class="segmented-tabs" data-active-pos="first" data-active-tab="all">
    <div class="segmented-tabs-nav" role="tablist" aria-label="Chọn danh mục">
      <div class="segmented-tabs-indicator" aria-hidden="true"></div>
      
      <button class="segmented-tabs-btn is-active" type="button" data-tab="all" aria-pressed="true" title="Tất Cả">
        <span class="segmented-tabs-icon my-icon--all" aria-hidden="true"></span>
        <span class="segmented-tabs-text" data-i18n="tabs.all">Tất Cả</span>
      </button>

      <button class="segmented-tabs-btn" type="button" data-tab="tab-2" aria-pressed="false" title="Mục 2">
        <span class="segmented-tabs-icon my-icon--tab2" aria-hidden="true"></span>
        <span class="segmented-tabs-text" data-i18n="tabs.tab2">Mục 2</span>
      </button>
    </div>

    <!-- Dải text hiển thị tên tab active trên Mobile (Hàng 2) -->
    <div class="segmented-tabs-active-label" aria-live="polite">
      <span class="segmented-tabs-active-text" data-i18n="tabs.all">Tất Cả</span>
    </div>
  </div>
</div>

<script src="common/shared-tabs.js"></script>
```

### 3. Cách Khởi Tạo JavaScript
- **Khởi tạo tự động:** Gán thuộc tính `data-segmented-tabs` và `data-tabs-target=".target-sections"` lên container.
- **Khởi tạo thủ công (Bắt buộc dùng cách này khi chuyển tab custom):**
```javascript
window.sharedTabs.init({
    container: '.segmented-tabs',       // Selector container của tabs
    btnSelector: '.segmented-tabs-btn',
    indicatorSelector: '.segmented-tabs-indicator',
    activeLabelSelector: '.segmented-tabs-active-label',
    activeTextSelector: '.segmented-tabs-active-text',
    textSelector: '.segmented-tabs-text',
    tabDataAttr: 'data-tab',            // Thuộc tính lấy tab id từ button
    defaultTab: 'guide',                // Tab active mặc định
    urlParam: null,                     // Tên param URL nếu muốn đồng bộ (?tab=...), đặt null nếu không dùng
    onTabChange: function(tabId, btn) { // Callback chuyển đổi nội dung
        document.querySelectorAll('.my-tab-pane').forEach(function(pane) {
            pane.classList.toggle('is-active', pane.getAttribute('data-tab-pane') === tabId);
        });
    }
});
```

### 4. Các Lỗi Tử Huyệt Bắt Buộc Tránh (Critical Anti-Patterns):
1. **CẤM tự viết script JS riêng để chuyển tab:** Tuyệt đối không tự viết logic đo `getBoundingClientRect()` hay tự dịch chuyển `indicator.style.transform`. Bắt buộc phải nhúng `common/shared-tabs.js` và dùng `window.sharedTabs.init(...)` để module tự xử lý con trượt, tai cong lõm và cập nhật text hàng 2.
2. **CẤM bỏ quên thẻ dải text hàng 2 (`.segmented-tabs-active-label`):** Trên Mobile (`<= 680px`), text trong nút tab sẽ bị CSS ẩn đi (`display: none`). Nếu thiếu khối `.segmented-tabs-active-label`, người dùng sẽ chỉ thấy icon hoặc con trượt trơ trọi mà không có chữ tên tab bên dưới.
3. **CẤM bỏ quên container `.segmented-tabs-container`:** Thẻ bọc ngoài cùng bắt buộc phải có class `.segmented-tabs-container` để kích hoạt CSS Container Query (`container-type: inline-size`).
4. **CẤM dùng `display: flex !important` hoặc CSS cưỡng ép làm vỡ layout Mobile:**
   - Nếu muốn Segmented Tabs dàn rộng 100% full-width trên Desktop, **BẮT BUỘC PHẢI BỌC TRONG `@media (min-width: 681px)`**.
   - Tuyệt đối KHÔNG ghi đè CSS của `.segmented-tabs`, `.segmented-tabs-nav` (như set `gap: 4px`, `width: 0 !important`) trên Mobile (`<= 680px`), vì Mobile yêu cầu `flex-direction: column`, `gap: 0` để con trượt đỏ dính liền khối với dải text hàng 2.
5. **CẤM TỰ Ý ẨN ICON, DẢI TEXT ACTIVE HOẶC CON TRƯỢT BẰNG `display: none !important`:**
   - Tuyệt đối KHÔNG ĐƯỢC thêm CSS cục bộ dạng `.segmented-tabs-icon { display: none !important; }` để biến tab thành text-only. Segmented Tabs chuẩn của website BẮT BUỘC là tổ hợp **Icon + Text trên Desktop** và **Icon hàng 1 + Text hàng 2 trên Mobile**.
   - Việc tự ý `display: none !important` lên `.segmented-tabs-icon`, `.segmented-tabs-active-label` hay `.segmented-tabs-indicator` sẽ phá hủy toàn bộ kiến trúc Connected 2-Row Layout trên thiết bị di động, làm con trượt indicator bị mất định vị, biến dải text active thành hộp rỗng hoặc gây vỡ giao diện nghiêm trọng. Mọi trang muốn dùng Segmented Tabs bắt buộc phải chuẩn bị icon SVG tương ứng cho từng tab.
6. **QUY CHUẨN STICKY TABS (CỐ ĐỊNH KHI CUỘN TRANG DÀI):**
   - Khi trang chi tiết có nhiều nội dung dài bên dưới các tab, container `.segmented-tabs-container` (hoặc `.app-detail-tabs-wrap`) được phép bật chế độ Sticky:
     ```css
     position: sticky;
     top: var(--header-h, 56px);
     z-index: 30;
     background: var(--bg-100);
     padding: 8px 0;
     box-shadow: 0 4px 12px rgba(0, 0, 0, 0.35);
     ```
   - **Bắt buộc:** Phải gán `top: var(--header-h, 56px)` để nằm khít sát ngay dưới mép Header chính, và gán `background: var(--bg-100)` để che phủ nội dung cuộn bên dưới, không làm rối mắt hay lộ kẽ hở.
7. **QUY CHUẨN KÍCH THƯỚC, FONT CHỮ VÀ TAB DÀN ĐỀU 100% BỀ NGANG (FULL-WIDTH SEGMENTED CONTROL - CHUẨN AUTO-CLICKER):**
   - **Thuật ngữ chuyên ngành:** **Full-Width Segmented Control** (hoặc **Justified / Equal-Width Tabs**, **Stretch Tabs**; tiếng Việt: **Tab dàn đều 100% bề ngang**).
   - **Cấu hình chuẩn Desktop (`@media (min-width: 681px)`):**
     - Thanh track `.segmented-tabs` và khung nav `.segmented-tabs-nav` bắt buộc nhận `width: 100%; max-width: 100%;`.
     - Mỗi nút tab `.segmented-tabs-btn` bắt buộc nhận `flex: 1 1 0; min-width: 0; justify-content: center;` để tự động chia đều bề ngang theo tỷ lệ 1:1 cho tất cả các tab con (ví dụ 4 tab mỗi tab 25%, 5 tab mỗi tab 20%).
     - **Padding nút:** `padding: 10px 14px;` (tạo chiều cao tab ~44px đạt chuẩn click thân thiện, cân đối, rộng rãi).
     - **Font size chữ:** Bắt buộc dùng `font-size: var(--font-md);` (14px) cho cả `.segmented-tabs-btn` và `.segmented-tabs-text`.
     - **Font weight:** `font-weight: 700;`.
     - **Icon:** Kích thước `16px x 16px`, `gap: 8px`.
     - **Màu sắc token 100% (CẤM mã màu cứng/currentColor):**
       - Trạng thái thường: `color: var(--text-secondary);`, icon `background-color: var(--text-secondary);`.
       - Trạng thái hover: `color: var(--text-primary);`, nền nút `var(--bg-card)`.
       - Trạng thái active: `color: var(--text-on-accent);`, icon `background-color: var(--text-on-accent);` trên nền khối trượt `var(--accent-primary)`.
   - **Cấu hình chuẩn Mobile (`<= 680px` - Connected 2-Row Layout):**
     - **Tổng chiều cao cố định 66px** (Hàng 1 cao 33px + Hàng 2 cao 33px để giao diện thanh thoát tối đa, không chiếm dụng không gian màn hình).
     - Hàng 1 (Nút tab icon): `min-height: 33px; padding: 4px 4px; icon 18px x 18px`.
     - Hàng 2 (Dải text active): `min-height: 33px; padding: 4px 12px; font-size: 13px;`.
8. **QUY CHUẨN TỰ ĐỘNG NHẢY LẠI ĐẦU NỘI DUNG KHI ĐỔI TAB (AUTO-SCROLL TO TAB TOP):**
   - **Mục đích:** Khi người dùng cuộn xem nội dung dài ở một tab và click chuyển sang tab khác (hoặc click lại vào tab hiện tại), hệ thống (`common/shared-tabs.js`) phải tự động cuộn màn hình về đúng vị trí đầu của tab mới (ngay sát dưới thanh Sticky Header & Tab Bar), tránh để người dùng bị kẹt ở lưng chừng hoặc cuối nội dung của tab mới.
   - **Cơ chế hoạt động tập trung (`common/shared-tabs.js`):**
     - Tự động kích hoạt khi người dùng click đổi tab thông qua `common/shared-tabs.js` (áp dụng chung toàn bộ website mà không cần viết thêm script ở từng trang).
     - Tự tính toán vị trí tự nhiên (`natural top`) trừ đi chiều cao Header (`--header-h`) để điểm đầu nội dung tab luôn nằm sát mép dưới dải tab dính đỉnh.
     - **Nguyên tắc mượt mà:** Nếu người dùng đang ở đầu trang (`scrollY <= targetScrollY`), màn hình giữ nguyên không bị giật xuống che mất Hero/Download Button. Chỉ khi người dùng đã cuộn qua dải tab (`scrollY > targetScrollY`), hệ thống mới kích hoạt đưa màn hình nhảy lại ngay đầu nội dung tab.

---

## 10. QUY CHUẨN KHUNG XEM TRƯỚC HÌNH ẢNH (SPOTLIGHT & THUMBNAIL STRIP GALLERY)
> **Mục đích:** Áp dụng cho các trang chi tiết sản phẩm (`products/*.html`) hoặc hồ sơ (`jobs/*.html`) cần hiển thị ảnh chụp/chân dung theo cơ chế: 1 ảnh lớn tiêu điểm ở trên + 1 dải thẻ ảnh nhỏ (thumbnails) ở dưới có thể click/hover để đổi ảnh tức thì. Quản lý tập trung qua `common/shared-spotlight.css` và `common/shared-spotlight.js`.

### 1. Cấu Trúc HTML Chuẩn:
```html
<link rel="stylesheet" href="common/shared-spotlight.css">

<div class="spotlight-hub" data-spotlight-gallery>
  <!-- 1. Khung ảnh lớn tiêu điểm phía trên -->
  <div class="spotlight-display">
    <div class="spotlight-frame">
      <img id="appFeaturedImg" class="spotlight-main-img" src="path/to/img1.png" alt="Giao diện A" loading="lazy">
    </div>
    <span class="spotlight-caption" id="appFeaturedLabel">Giao diện A</span>
  </div>

  <!-- 2. Dải thẻ ảnh nhỏ phía dưới -->
  <div class="spotlight-strip-wrapper">
    <!-- Dùng spotlight-strip--grid-2 (hoặc grid-3) nếu ít ảnh, hoặc spotlight-strip cuộn ngang nếu nhiều ảnh -->
    <div class="spotlight-strip spotlight-strip--grid-2" role="tablist" aria-label="Danh sách ảnh xem trước">
      <figure class="spotlight-item active-thumb" role="button" tabindex="0" data-src="path/to/img1.png" data-caption="Giao diện A">
        <img src="path/to/img1.png" alt="Thumbnail A">
        <span class="spotlight-thumb-tag">A</span>
      </figure>
      <figure class="spotlight-item" role="button" tabindex="0" data-src="path/to/img2.png" data-caption="Giao diện B">
        <img src="path/to/img2.png" alt="Thumbnail B">
        <span class="spotlight-thumb-tag">B</span>
      </figure>
    </div>
  </div>
</div>

<script src="common/shared-spotlight.js"></script>
```

### 2. Cách Khởi Tạo JavaScript:
- **Tự động:** Gắn thuộc tính `data-spotlight-gallery` vào thẻ bọc ngoài `.spotlight-hub`.
- **Khởi tạo thủ công:**
```javascript
window.sharedSpotlight.init({
    container: '.spotlight-hub',
    spotlightImg: '.spotlight-main-img',
    caption: '.spotlight-caption',
    strip: '.spotlight-strip',
    itemSelector: '.spotlight-item',
    activeClass: 'active-thumb',
    trigger: 'both' // 'both', 'click' hoặc 'hover'
});
```

### 3. ĐIỀU KHOẢN SỐNG CÒN 1: KHÓA CỨNG TỈ LỆ KHUNG ẢNH (FIXED ASPECT-RATIO)
- **CẤM TUYỆT ĐỐI dùng `height: auto` trên khung ảnh lớn `.spotlight-frame`:**
  - Khi người dùng rê chuột đổi qua lại giữa các ảnh có kích thước và tỷ lệ khác nhau (ví dụ Simple Mode dọc vs Asian Mode ngang), nếu không khóa cứng tỷ lệ thì chiều cao khung ảnh sẽ bị co giãn liên tục, làm dải thumbnail bên dưới **bị giật nảy (layout shift)** cực kỳ khó chịu.
  - **BẮT BUỘC KHÓA CỨNG TỶ LỆ:** Khung ảnh lớn `.spotlight-frame` luôn phải có `aspect-ratio: var(--spotlight-ratio, 4 / 5)` (hoặc chiều cao cố định) kết hợp `overflow: hidden`.
  - **Quy chuẩn `object-fit`:**
    - Đối với ảnh chân dung diễn viên/người mẫu: dùng `object-fit: cover`.
    - Đối với ảnh chụp màn hình UI ứng dụng / phần mềm: dùng `object-fit: contain` trên nền tối `var(--bg-secondary)` để toàn bộ cửa sổ ứng dụng được nhìn thấy trọn vẹn mà khung ảnh không bị biến thiên chiều cao dù chỉ 1 pixel.

### 4. ĐIỀU KHOẢN SỐNG CÒN 2: CỐ ĐỊNH CHIỀU CAO DẢI THẺ ẢNH NHỎ (FIXED STRIP HEIGHT)
- **CẤM TUYỆT ĐỐI dùng `height: auto !important` trên các biến thể Grid (`.spotlight-strip--grid-2`, `.spotlight-strip--grid-3`):**
  - Khi dải thẻ ảnh nhỏ chia cột grid 2 hay 3, nếu để `height: auto`, các thẻ thumbnail sẽ bị phình to theo chiều rộng và kéo chiều cao lên tận 250px - 300px ("chà bá"), phá hỏng bố cục tổng thể.
  - **BẮT BUỘC DÙNG CHIỀU CAO CHUẨN:** Dải ảnh nhỏ `.spotlight-strip` và mọi biến thể grid bắt buộc phải có `height: var(--spotlight-thumb-height, 116px)` và `.spotlight-strip-wrapper` có chiều cao cố định `calc(var(--spotlight-thumb-height, 116px) + 22px)` (~138px) giống hệt trang Diễn viên (`jobs/actor.html`).
  - Thẻ `.spotlight-item` bên trong luôn có `height: 100%` và ảnh bên trong `object-fit: cover` để thumbnail luôn hiển thị sắc nét, gọn gàng.

### 5. CƠ CHẾ PREVIEW MODAL TÍCH HỢP TỰ ĐỘNG
- Khi người dùng click vào ảnh trong khung lớn `.spotlight-frame`, module `common/shared-spotlight.js` sẽ tự động kích hoạt **Spotlight Preview Modal** phóng to toàn màn hình.
- Modal tích hợp sẵn:
  - Nút đóng (✕) ở góc trên bên phải.
  - Hỗ trợ phím tắt `Escape` hoặc click vào vùng nền tối để đóng.
  - Nút mũi tên chuyển ảnh (Next / Prev) và phím mũi tên bàn phím (`ArrowLeft` / `ArrowRight`) để chuyển đổi giữa các ảnh nếu có từ 2 thumbnail trở lên.
  - Đồng bộ ngược: Khi chuyển ảnh trong modal, ảnh lớn và thẻ thumbnail active bên ngoài cũng tự động cập nhật tương ứng.
  - 100% sử dụng token từ `theme.css` (`var(--bg-overlay)`, `var(--border-color)`, `var(--accent-primary)`, `var(--text-primary)`...). CẤM TUYỆT ĐỐI hardcode màu mã HEX hay RGBA.

---

## 11. QUY CHUẨN HIỆU ỨNG SCROLL REVEAL (.reveal-up) DÙNG CHUNG
> **Mục đích:** Tạo hiệu ứng trồi lên và hiện rõ dần (`opacity: 0 -> 1` kết hợp `translateY(24px -> 0)`) một cách tự nhiên, mượt mà khi người dùng cuộn trang đến bất kỳ phần tử nào trên toàn website.

### 1. Cơ Chế Hoạt Động & Kiến Trúc
- **CSS tập trung trong `common/shared-layout.css`:**
  - Định nghĩa class `.reveal-up` với `opacity: 0` và `transform: translateY(24px)`.
  - Class kích hoạt `.reveal-up.is-visible` với `opacity: 1` và `transform: translateY(0)`.
  - Tự động tắt animation nếu hệ điều hành bật chế độ `@media (prefers-reduced-motion: reduce)`.
- **JavaScript tập trung trong `common/shared-page.js`:**
  - Sử dụng native `IntersectionObserver` tự động quan sát tất cả phần tử `.reveal-up:not(.is-visible)`.
  - Ngay khi phần tử chạm vào tầm nhìn (`threshold: 0.12`, `rootMargin: 0px 0px -30px 0px`), thêm class `.is-visible` và ngừng quan sát (`unobserve`) để tối ưu triệt để bộ nhớ.
  - Tự động fallback sang hiển thị ngay nếu trình duyệt không hỗ trợ `IntersectionObserver`.

### 2. Cách Sử Dụng Trên Bất Kỳ Trang Nào
- Chỉ cần gắn class `reveal-up` vào bất kỳ thẻ HTML nào cần hiệu ứng cuộn:
  ```html
  <div class="my-card reveal-up">...</div>
  <section class="section-title-bar reveal-up">...</section>
  ```
- Không cần viết thêm bất kỳ dòng code JavaScript hay CSS nào ở trang con, hệ thống `shared-page.js` và `shared-layout.css` sẽ tự động kích hoạt.
- Để bật hiệu ứng cho footer liên hệ chung (`sharedContactRoot`), truyền `includeReveal: true` trong options của `initSharedPage`.

---

## 12. QUY CHUẨN TRANG CHI TIẾT SẢN PHẨM & PHẦN MỀM (`products/`)
> **Mục đích:** Áp dụng cho toàn bộ các trang chi tiết sản phẩm thuộc thư mục `products/` (Windows Apps, Plugins, Sách...). Chuẩn hóa trải nghiệm người dùng, kiến trúc file và cách bố trí thông tin mạch lạc, chuyên nghiệp.

### 1. Quy Tắc Đồng Bộ Bộ Tứ 1-1-1-1 (1 HTML <-> 1 CSS <-> 1 i18n JS <-> 1 JS)
- **Chuẩn hóa cấu trúc Bộ Tứ 1-1-1-1:** Mỗi trang chi tiết sản phẩm thuộc thư mục `products/` BẮT BUỘC phải tuân theo cấu trúc bộ bốn file trùng tên 100%:
  ```
  products/
  ├── auto-clicker.html        <---> auto-clicker.css        <---> auto-clicker-i18n.js        <---> auto-clicker.js
  ├── book-forge.html          <---> book-forge.css          <---> book-forge-i18n.js          <---> book-forge.js
  ├── plugin-cheat-engine.html <---> plugin-cheat-engine.css <---> plugin-cheat-engine-i18n.js <---> plugin-cheat-engine.js
  ├── plugin-maya.html         <---> plugin-maya.css         <---> plugin-maya-i18n.js         <---> plugin-maya.js
  └── plugin-photoshop.html    <---> plugin-photoshop.css    <---> plugin-photoshop-i18n.js    <---> plugin-photoshop.js
  ```
- **Phân tách trách nhiệm tuyệt đối giữa 4 file:**
  - `[name].html`: Cấu trúc ngữ nghĩa semantic, layout và gắn thuộc tính `data-i18n="[appId]..."` vào các phần tử nội dung.
  - `[name].css`: Chứa định kiểu giao diện đặc thù của riêng sản phẩm đó (kế thừa toàn bộ layout nền tảng từ `common/shared-product-detail.css`).
  - `[name]-i18n.js`: Chứa toàn bộ từ điển song ngữ (VI & EN) của riêng sản phẩm đó (mô tả tính năng, bảng phím tắt, hướng dẫn, giới hạn, cấu hình hệ thống...), nạp thông qua `window.sharedI18n.registerTranslations(...)`.
  - `[name].js`: Điều khiển vòng đời trang (`DOMContentLoaded`), gọi `initSharedPage({ pageKey: '...' })`, khởi tạo hệ thống tab (`initAppDetailTabs()`), khởi tạo thư viện ảnh tiêu điểm (`initAppSpotlightGallery()`) và xử lý các tương tác đặc thù của sản phẩm.
- **TUYỆT ĐỐI CẤM gộp CSS, gộp JS hoặc gộp từ điển chung:** 
  - Cấm tạo file CSS gộp như `plugins-detail.css` hay `app-detail.css`.
  - Cấm nhồi nhét nội dung bài viết sản phẩm vào `common/i18n-*.js` hoặc nhét logic trang con vào `common/shared-page.js`. Người bảo trì nhìn vào tên file HTML phải biết ngay file CSS, file i18n và file JS tương ứng để chỉnh sửa độc lập.
- **Khung dùng chung (`common/shared-product-detail.css`):** Toàn bộ layout nền tảng (căn lề breadcrumb, hero header card, nút download CTA chuẩn, bảng hotkeys/thông số, privacy guarantee box, tab pane transitions...) phải được đặt trong `common/shared-product-detail.css`. Các file CSS riêng của từng trang chỉ chứa style đặc thù của riêng sản phẩm đó.
- **Quy chuẩn Màu Chữ & Độ Tương Phản (Strict Contrast & Text Token Inheritance):**
  - Mọi văn bản mô tả, danh sách tính năng, các bước quy trình, bảng phím tắt/thông số, mẹo sử dụng và cảnh báo kỹ thuật trong toàn bộ các trang chi tiết sản phẩm **BẮT BUỘC** phải kế thừa token `color: var(--text-primary)` từ `common/shared-product-detail.css`.
  - **TUYỆT ĐỐI CẤM** tự ý ghi đè `color: var(--text-secondary)` vào các khối văn bản mô tả hay danh sách tính năng trong các file CSS riêng (`[name].css`), đảm bảo nội dung luôn hiển thị sắc nét nhất trên cả Dark Mode và Light Mode.

### 2. Quy Chuẩn SVG App Icon Tại Hero Title & Favicon Đồng Bộ
- **File Asset Vector SVG riêng:** Mỗi sản phẩm phần mềm/tiện ích BẮT BUỘC phải có 1 file icon vector SVG đặt tại `svg/[app-name].svg` (ví dụ `svg/auto-clicker.svg`).
- **Đồng bộ Favicon:** Khai báo icon SVG làm Favicon trong thẻ `<head>` của trang HTML:
  ```html
  <link rel="icon" type="image/svg+xml" href="../svg/[app-name].svg">
  ```
- **Icon trước Tiêu Đề Hero (`.app-title-icon`):**
  - Đặt thẻ `<img>` icon ngay trước chữ tiêu đề sản phẩm trong thẻ `<h1 class="tools-panel-title">`.
  - **Kích thước chuẩn:**
    - Desktop: `width="57" height="57"` (chuẩn mở rộng gấp rưỡi kích thước icon thông thường, nổi bật như một thương hiệu ứng dụng độc lập).
    - Mobile (`<= 768px`): `width: 42px; height: 42px;`.
  - **Đặc tính CSS bắt buộc:** `flex-shrink: 0; border-radius: var(--border-radius-sm); object-fit: contain; vertical-align: middle;`.
  - **Bảo vệ Đa Ngôn Ngữ (i18n):** Chữ tên sản phẩm BẮT BUỘC phải được bọc trong `<span data-i18n="[appId].title">` (như đã quy định tại Mục 6), TUYỆT ĐỐI KHÔNG đặt `data-i18n` lên thẻ `<h1>` để tránh script ghi đè làm xóa sổ thẻ icon `<img>`.

### 3. Quy Chuẩn Thẻ Meta Phiên Bản Ứng Dụng (`app-latest-version`) & Check Update Từ Xa
- **Thẻ Meta Bắt Buộc Trong `<head>`:**
  - Mọi trang chi tiết sản phẩm thuộc danh mục phần mềm tải về (`Windows Apps/`, `Plugins/`...) BẮT BUỘC phải khai báo thẻ meta này trong thẻ `<head>` (đặt ngay sau thẻ `canonical`):
    ```html
    <meta name="app-latest-version" content="1.1">
    ```
- **Mục Đích & Kiến Trúc Tách Biệt:**
  - Thẻ này là **Single Source of Truth** máy đọc (Machine-readable) phục vụ cơ chế tự động kiểm tra phiên bản mới từ xa (Remote Update Checker) của ứng dụng client.
  - **TUYỆT ĐỐI KHÔNG** phụ thuộc vào việc bóc tách chuỗi ở thẻ `<title>` hay `<h1>`. Tiêu đề sinh ra cho con người và SEO, rất dễ bị thay đổi copywriting, thêm bớt từ khóa marketing hoặc bị gãy regex do script chuyển ngữ đa ngôn ngữ (i18n).
  - Client (.exe) tải trực tiếp mã nguồn HTML thô của trang chi tiết qua giao thức HTTPS (TLS 1.2), dùng regex quét thuộc tính `content` của `<meta name="app-latest-version">` để so sánh với version nội bộ (`NormalizeVersion`).
- **Quy Trình Chuẩn Khi Phát Hành Phiên Bản Mới:**
  1. *Phía C# App:* Khai báo version mới trong `Properties/AssemblyInfo.cs` (ví dụ `1.1.1.0`), sau đó chạy `build.bat` để biên dịch binary `.exe` mới.
  2. *Phía Website:* Cập nhật số phiên bản mới vào thuộc tính `content` của thẻ `<meta name="app-latest-version" content="...">` trong file HTML.
  3. *Phía Song Ngữ:* Cập nhật tiêu đề hiển thị trong `[name]-i18n.js` (cả khối `vi` và `en`) đồng bộ theo phiên bản mới.

### 4. Vị Trí & Cấu Trúc Nút Kêu Gọi Hành Động (CTA Download Button & Centered Head)
- **Bố cục Header Card 3 hàng căn giữa (`.tools-panel-head--centered`):**
  - **Hàng 1:** Tiêu đề sản phẩm `.tools-panel-title` kèm icon app (căn giữa hoàn toàn).
  - **Hàng 2:** Dải thẻ thông tin `.app-meta-pills` (căn giữa hoàn toàn).
  - **Hàng 3:** Nút tải về `.tools-action-row` (căn giữa hoàn toàn).
- **Căn lề chữ trong nút tải (`.tools-download-label`):** Text nhãn nút tải nằm cạnh icon BẮT BUỘC phải **căn trái (`text-align: left`)**. Khi tiêu đề nút dài bị ngắt thành 2 dòng trên màn hình hẹp, các dòng text luôn gióng thẳng hàng về phía bên trái cạnh icon.
- **Quy chuẩn hiển thị Thẻ Lượt Tải (`.tools-download-badge`):**
  - *Màu chữ:* Nền thẻ là `var(--bg-primary)`, do đó text BẮT BUỘC dùng `color: var(--text-primary);` (tránh bẫy tàng hình trên Light Mode theo Mục 5).
  - *Màn hình lớn / Desktop:* Hiển thị ngang gọn gàng trên 1 dòng `[<số> lượt tải]`.
  - *Màn hình nhỏ / Mobile (`<= 680px`):* **Tự động chuyển thành 2 tầng dọc:**
    - **Tầng trên:** Hiển thị con số (`.product-download-count`, font to rõ, nổi bật).
    - **Tầng dưới:** Hiển thị chữ (`.tools-download-badge-label` mang `white-space: nowrap;`). Tuyệt đối KHÔNG để số một bên rồi chữ "lượt" và chữ "tải" bị bẻ thành 2 dòng riêng biệt làm méo mó thẻ.
- Luôn tích hợp bộ đếm lượt tải (`.product-download-count`) đồng bộ qua `common/shared-download-counter.js`.

### 5. Quy Chuẩn 3 Tab Tiêu Chuẩn Cho Phần Mềm (Product Detail Tabs Standard)
Đối với các trang chi tiết ứng dụng/phần mềm Windows có nội dung phong phú, chuẩn hóa bố cục tinh gọn thành **3 Tab độc lập** sử dụng Segmented Tabs (`data-active-tab="description"` làm mặc định):

1. **Tab 1: Mô Tả (`description` - Icon `svg/info.svg`):**
   - Chứa thông tin tổng quan, danh sách tính năng sát thủ (Bullet Points) của phần mềm.
   - Chứa khung xem trước tiêu điểm (**Spotlight Gallery**) khóa cứng tỷ lệ và dải ảnh thu nhỏ (Thumbnails Strip) theo đúng Mục 10.
   - Cuối tab Mô Tả luôn đặt khối cam kết bảo mật & riêng tư (**Privacy Guarantee Box - 100% Local / Offline**).
2. **Tab 2: Hướng Dẫn Sử Dụng (`guide` - Icon `svg/guide.svg`):**
   - Bảng tra cứu phím tắt toàn cục (**Global Hotkeys Table**).
   - Thẻ giới thiệu các chế độ hoạt động (**Mode Showcase**).
   - Bảng lưới danh sách thao tác macro (**Macro Actions Grid**).
   - Quy trình các bước thực hiện (**Step Grid**) và các thẻ mẹo sử dụng (**Tip Cards**).
3. **Tab 3: Giới Hạn & Cấu Hình (`limits` - Icon `svg/warning.svg`):**
   - Gom gọn cơ chế hoạt động, giới hạn hệ điều hành và thông số kỹ thuật vào cùng 1 tab để người dùng không phải chuyển đổi tab quá nhiều.
   - Giải thích nguyên lý kỹ thuật vận hành sâu bên trong, danh sách phần mềm/game ngoại lệ, cơ chế phòng vệ chống ban.
   - Bảng thông số kỹ thuật tối thiểu & khuyên dùng (OS, Runtime, RAM, Quyền Admin...).
   - Hướng dẫn các bước mở file lần đầu (giải nén, bypass SmartScreen nếu có).

- **Quy chuẩn Thanh Tab Dính Đỉnh (Sticky Tab Navigation):**
  - Khung bọc ngoài của tab `.app-detail-tabs-wrap` BẮT BUỘC phải giữ định vị dính đỉnh:
    ```css
    .app-detail-tabs-wrap {
        position: sticky;
        top: var(--header-h, 56px);
        z-index: 30;
        background: var(--bg-100);
        padding: 8px 0;
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.35);
    }
    ```
  - Đảm bảo khi người dùng cuộn xem các tab dài (hướng dẫn, mô tả...), dải chuyển tab luôn dính ngay dưới Header và không bị che khuất nội dung hay làm trôi vị trí điều hướng.

### 6. Quy Chuẩn Thẻ Lưới Thống Nhất (Unified Grid Cards Standard)
Nhằm tạo nên diện mạo trực quan, chuyên nghiệp, cân đối và nhất quán cho mọi trang chi tiết sản phẩm:
- **Bảng tra cứu thông số / Thông số kỹ thuật (Spec Grid):**
  - Bố cục lưới 2 hàng x 3 cột (`grid-template-columns: repeat(3, 1fr);`) trên Desktop hoặc 3 hàng x 2 cột trên Tablet. Tự động chuyển về 1 cột trên Mobile.
  - Các ô thông số được bao bởi khung viền 1px mảnh (`border: 1px solid var(--border-color);`), nền `var(--bg-elevated)`.
  - Tên thông số (label) hiển thị nhỏ gọn ở trên, giá trị (value) in đậm, rõ ràng ở dưới.
- **Thẻ Mẹo & Lưu Ý Chuyên Gia (Tip Cards Grid):**
  - Bố cục lưới 1 hàng x 4 cột (`repeat(4, 1fr)`) trên Desktop, 2 hàng x 2 cột trên Tablet, và 1 cột trên Mobile.
  - Header của từng thẻ mẹo mang icon nhỏ và tiêu đề ngắn, phần thân mô tả súc tích với `font-size: 13px - 14px; line-height: 1.5;`.
- **Phím Tắt Dạng 3D Keycap (`.app-kbd`):**
  - Mọi phím tắt trong bảng hoặc bài viết BẮT BUỘC bọc trong thẻ `<kbd class="app-kbd">`:
    ```css
    .app-kbd {
        display: inline-block;
        padding: 2px 7px;
        font-family: monospace;
        font-size: 12px;
        font-weight: 700;
        color: var(--text-primary);
        background: var(--bg-card);
        border: 1px solid var(--border-color);
        border-radius: var(--border-radius-sm);
        box-shadow: 0 2px 0 var(--border-color);
        line-height: 1.3;
    }
    ```
- **Quy chuẩn Font Size Text Thống Nhất:** Văn bản mô tả trong các thẻ, danh sách, và bảng giữ ở mức chuẩn `13px - 14px`, tuyệt đối không dùng font quá cỡ gây mất cân đối giao diện.

### 7. Quy Chuẩn Chống Tràn Màn Hình Mobile Tuyệt Đối (Mobile Zero-Overflow Standard)
- **Container Khóa Cứng Độ Rộng:** Khung `.tools-panels` và các tab pane `.tools-panel` BẮT BUỘC phải nhận:
  ```css
  min-width: 0 !important;
  max-width: 100% !important;
  box-sizing: border-box;
  overflow-x: hidden;
  ```
  để ngăn chặn các bảng dài hoặc chuỗi chữ dài không ngắt dòng làm toác layout toàn trang trên mobile.
- **Ngắt dòng Tiêu Đề Section (`.app-section-title`):**
  - Trên màn hình hẹp (`<= 768px`), các tiêu đề section chứa badge (ví dụ "Danh Sách Thao Tác [8]") BẮT BUỘC phải bật `flex-wrap: wrap; gap: 8px;` để badge tự rớt dòng mềm mại nếu không đủ chỗ, không đẩy lồi lề phải.
- **Cuộn Ngang Cho Bảng Dữ Liệu Lớn (`.app-table`):**
  - Bắt buộc bọc bảng trong một wrapper có `overflow-x: auto; -webkit-overflow-scrolling: touch; width: 100%;` để người dùng có thể vuốt ngang xem hết các cột dữ liệu mà không làm kéo giãn toàn trang.

### 8. Quy Chuẩn Đa Ngôn Ngữ (i18n) Cho Trang Chi Tiết Sản Phẩm
- **Thanh tab điều hướng danh mục:** Các nút tab điều hướng dùng nhãn khung chung `data-i18n="productTabs.[tabId]"` (được khai báo trong `common/i18n-*.js`):
  ```html
  <button class="segmented-tabs-btn" type="button" data-tab="description">
    <span class="segmented-tabs-icon segmented-tabs-icon--info" aria-hidden="true"></span>
    <span class="segmented-tabs-text" data-i18n="productTabs.description">Mô Tả</span>
  </button>
  ```
  Dải text active trên Mobile (`.segmented-tabs-active-text`) cũng bắt buộc mang `data-i18n="productTabs.[tabId]"` tương ứng để chuyển ngữ tức thì.
- **Nội dung chi tiết bên trong từng tab & Hero Card:** Toàn bộ tiêu đề con, mô tả tính năng, bảng phím tắt, các bước hướng dẫn, thông số cấu hình... **BẮT BUỘC** phải lấy từ namespace của từ điển riêng: `data-i18n="[appId].[section].[key]"` (được khai báo trong file `products/[tên-sản-phẩm]-i18n.js`):
  ```html
  <!-- Ví dụ trong products/auto-clicker.html: -->
  <p data-i18n="autoClicker.summary">...</p>
  <th data-i18n="autoClicker.guide.hotkeys.shortcut">Phím Tắt</th>
  ```
- **TUYỆT ĐỐI KHÔNG đưa nội dung chi tiết của sản phẩm vào `common/i18n-*.js`:** Để đảm bảo tính độc lập và tốc độ tải trang cao nhất.

---

## 13. QUY CHUẨN DANH MỤC WEB APPS TRÊN TRANG SẢN PHẨM (`products.html`)
> **Mục đích:** Quy chuẩn cách hiển thị và phân loại các ứng dụng Web (`products/web-apps/`) trên trang danh mục sản phẩm chính `products.html`.

### 1. Cấu Trúc Tab & Thẻ Sản Phẩm Web App
- **Vị trí danh mục:** Nằm ở vị trí thứ 5 (mục cuối cùng) trong thanh tab `.products-switch` và danh sách `.products-sections`.
- **Icon danh mục:** Sử dụng `svg/web-apps.svg` qua class `.products-switch-icon--web-apps`.
- **Cấu trúc Thẻ Tinh Gọn (Title-Only Cards):**
  - Khác với các thẻ Windows App / Plugins / Sách, thẻ sản phẩm thuộc danh mục Web Apps **CHỈ CẦN GHI TÊN APP (`.product-card-title`), KHÔNG CẦN VIẾT ĐOẠN VĂN MÔ TẢ (`.product-card-desc`)**.
  - Phần body thẻ giữ bố cục `display: flex; flex-direction: column; justify-content: space-between;` để tiêu đề nằm trên và mũi tên điều hướng (`.product-card-arrow`) nằm dưới góc phải gọn gàng.

### 2. Danh Sách Loại Trừ Bắt Buộc (Excluded Apps)
- **`products/web-apps/tinhtiennhanh.html` (Tính Tiền Nhanh):**
  - **LÝ DO:** Là ứng dụng nghiệp vụ / quản lý riêng tư, **TUYỆT ĐỐI KHÔNG ĐƯỢC ĐƯA LÊN** trang danh mục `products.html`.
  - Mọi AI Agent hay lập trình viên khi đồng bộ hay quét tự động danh mục sản phẩm **BẮT BUỘC PHẢI BỎ QUA** file `tinhtiennhanh.html`.

### 3. Quy Chuẩn Nhóm Web Apps Sưu Tầm Bên Ngoài (Curated External Web Tools)
- **Thứ tự hiển thị (Order Hierarchy):**
  - Web App tự làm luôn nằm trước (Badge `01`, `02`, `03`...).
  - Web App sưu tầm bên ngoài luôn nằm **SAU** toàn bộ Web App tự làm (hiện tại là `04` đến `08`). Khi có Web App tự làm mới, chèn vào trước nhóm sưu tầm và đẩy số thứ tự của nhóm sưu tầm lùi về sau.
- **Quy cách Thẻ Card & Tên miền rút gọn:**
  - `product-card-title`: Tên chính thức của trang web.
  - `product-card-tag`: Tên miền (Domain) rút gọn, lược bỏ `https://` và dấu `/` cuối (ví dụ: `tiermaker.com`, `grainrad.com`, `destroy.spritefusion.com`, `bookofshapes.com`, `jherr.github.io/depth-of-field`).
  - Thẻ `<a>` bắt buộc có `target="_blank" rel="noopener noreferrer"`.
  - Chân thẻ (`.product-card-footer`) chỉ giữ mũi tên `.product-card-arrow`.
- **Kiến trúc tài nguyên (Zero Bloatware):**
  - Tuyệt đối không tạo file code `.html`/`.js`/`.css` cho web ngoài.
  - Toàn bộ ảnh đại diện (Share Image / Open Graph) lưu tại thư mục riêng `products/web-apps/curated/`.

### 4. Quy Chuẩn Bố Cục Lưới Web Apps (Responsive Grid System)
- **Khóa cứng tỷ lệ vuông 1:1:** Thẻ sản phẩm Web Apps luôn giữ `aspect-ratio: 1 / 1` trên mọi kích thước màn hình.
- **Phân bố số cột:**
  - **PC / Desktop (> 1024px):** **4 Cột** (`repeat(4, minmax(0, 1fr))`, `gap: 16px`).
  - **Tablet (769px – 1024px):** **3 Cột** (`repeat(3, minmax(0, 1fr))`, `gap: 14px`).
  - **Mobile (≤ 768px):** **2 Cột** (`repeat(2, minmax(0, 1fr))`, `gap: 10px`), tương tự danh mục Sách nhưng **vẫn giữ nguyên tỷ lệ vuông 1:1**.
- **Micro-typography trên Mobile:** Giảm padding thân thẻ (`8px 10px`), badge số `20px`, tiêu đề `12px`, ẩn chữ đơn vị dài `.product-download-unit` ("lượt truy cập") để chống tràn viền tuyệt đối.




