# RULES & MASTER PROTOCOL FOR WEB APPS (tranthangminh.github.io/products/web-apps/)

> **Mục đích:** File hiến pháp quy chuẩn chung áp dụng chuyên biệt cho TOÀN BỘ các ứng dụng Web App nằm trong thư mục `products/web-apps/` (`lucky-wheel`, `tinhtiennhanh`, `52-cards-tracker` và mọi Web App được phát triển trong tương lai).
> AI Agent bắt buộc phải tuân thủ nghiêm ngặt mọi điều khoản bên dưới trước và trong khi thực thi bất kỳ task nào.

---

# 1. QUY CHUẨN NGÔN NGỮ DỰ ÁN (PROJECT LANGUAGE & BILINGUAL STANDARDS)

Đồng bộ nghiêm ngặt theo quy chuẩn hiến pháp `_RULE-website.md`:

## 1.1 Kiến Trúc Song Ngữ: "Engine & Trạng Thái Chung - Từ Điển Nằm Riêng"
Nhằm đảm bảo tính độc lập tuyệt đối giữa các Web App và tránh biến `common/i18n-vi.js` thành bãi rác khổng lồ, toàn bộ Web Apps tuân thủ kiến trúc 3 tầng:
1. **Trạng thái ngôn ngữ dùng chung (Shared Language State):**
   - Mọi Web App đọc và ghi cùng một key `localStorage.getItem('portfolio-lang')`.
   - Khi người dùng đổi sang Tiếng Anh/Tiếng Việt ở trang chủ hoặc ở một Web App bất kỳ, toàn bộ các Web App khác khi mở ra sẽ **tự động hiển thị đúng ngôn ngữ đó**.
2. **Từ điển nằm riêng trong từng Web App (App-Scoped Dictionaries):**
   - Mỗi Web App tự quản lý từ điển của riêng mình đặt trong thư mục của app đó:
     `products/web-apps/[app-name]/[app-name]-i18n.js` (hoặc khai báo bên trong controller của app nếu từ vựng ngắn gọn < 50 dòng theo KISS).
   - **TUYỆT ĐỐI CẤM** nhét từ vựng đặc thù của Web App vào `common/i18n-vi.js` hay `common/i18n-en.js` của website portfolio chính.
3. **Engine dịch chuẩn hóa (Attribute-Driven Engine):**
   - Quét và gán bản dịch tự động thông qua thuộc tính `data-i18n="key"` trên các phần tử DOM.
   - Hỗ trợ placeholder (`data-i18n-placeholder`).

## 1.2 Quy Tắc Bảo Vệ Đa Ngôn Ngữ (i18n) Khi Kết Hợp Icon Và Text
- Khi một nút (`<button>`) hoặc liên kết (`<a>`) chứa cả biểu tượng (icon) và văn bản, phần text **BẮT BUỘC** phải được bọc trong một thẻ `<span>` riêng biệt mang thuộc tính `data-i18n`:
  ```html
  <!-- ❌ SAI: Khi i18n thay đổi text sẽ làm mất luôn icon bên trong -->
  <button class="btn btn-primary" data-i18n="app.spin">⚡ Spin</button>

  <!-- ✅ ĐÚNG: Icon nằm riêng, text nằm riêng trong thẻ span có data-i18n -->
  <button class="btn btn-primary">
      <span aria-hidden="true">⚡</span>
      <span data-i18n="app.spin">SPIN</span>
  </button>
  ```

## 1.3 Ranh Giới Ngôn Ngữ Giữa Chat Và Mã Nguồn
- **Mã nguồn kỹ thuật (Codebase):**
  - Tên file, tên biến (variables), tên hàm (functions), thuộc tính, class CSS, ID DOM, comment kỹ thuật trong code và commit messages **PHẢI 100% sử dụng Tiếng Anh (English)**.
- **Giao tiếp & Lên kế hoạch (Chat & Planning):**
  - Toàn bộ kế hoạch (plan), giải thích kỹ thuật và phản hồi trong khung chat sử dụng **Tiếng Việt** (xưng *"tao"* - gọi *"mày"*).

## 1.4 Quy Chuẩn Nút Chuyển Đổi Ngôn Ngữ (Language Switcher UI Standard)
Nhằm đảm bảo tính nhận diện thương hiệu và đồng bộ 100% với phong cách toàn bộ website portfolio:
1. **Dùng chuẩn thiết kế từ Sticky Header trang `index.html`:**
   - Mọi Web App trên thanh Header bắt buộc phải sử dụng cụm nút chuyển đổi ngôn ngữ chuẩn với cấu trúc cờ CSS và mã ngôn ngữ xếp dọc (`.lang-switch`, `.lang-btn`, `.lang-flag`, `.lang-code`).
2. **Tuyệt đối CẤM dùng Emoji cờ hệ điều hành:**
   - Không được dùng emoji cờ như `🇬🇧`, `🇻🇳`,... vì bị phụ thuộc font hệ điều hành (Windows, macOS, Android hiển thị khác nhau, có thể bị lỗi ô vuông hoặc biến dạng layout).
   - Toàn bộ icon cờ được vẽ bằng **CSS thuần (Pure CSS Flag)** cực kỳ sắc nét, nhẹ và độc lập tuyệt đối (`clip-path: polygon` cho ngôi sao vàng Việt Nam, `repeating-linear-gradient` cho sọc cờ Mỹ).
3. **Quy tắc hiển thị trạng thái ngôn ngữ:**
   - Khi đang ở **Tiếng Việt**: Hiển thị cờ Mỹ (`.lang-flag--en`) + chữ `EN` in hoa ở dưới (bấm vào để chuyển sang Tiếng Anh).
   - Khi đang ở **Tiếng Anh**: Hiển thị cờ Việt Nam (`.lang-flag--vi`) + chữ `VN` in hoa ở dưới (bấm vào để chuyển sang Tiếng Việt).
4. **Cấu trúc HTML chuẩn:**
   ```html
   <div class="lang-switch">
       <button type="button" class="lang-btn lang-btn--toggle" id="langToggleBtn" data-lang="en" aria-label="Chuyển sang Tiếng Anh">
           <span class="lang-flag lang-flag--en" aria-hidden="true"></span>
           <span class="lang-code">EN</span>
       </button>
   </div>
   ```
5. **CSS chuẩn tái sử dụng (kế thừa hoặc nhúng vào CSS của app):**
   ```css
   .lang-switch {
       display: inline-flex;
       align-items: center;
   }
   .lang-btn {
       border: none;
       background: transparent;
       color: var(--text-primary, #ffffff);
       padding: 0 4px;
       min-width: var(--btn-height-sm, 28px);
       display: inline-flex;
       flex-direction: column;
       align-items: center;
       gap: 4px;
       font-size: var(--font-xs, 11px);
       font-weight: 700;
       line-height: 1;
       letter-spacing: 0.08em;
       cursor: pointer;
       opacity: 0.85;
       transition: opacity var(--transition-normal, 0.2s ease), color var(--transition-normal, 0.2s ease);
   }
   .lang-btn:hover { opacity: 1; }
   .lang-btn--toggle { opacity: 1; }
   .lang-code { display: block; }
   .lang-flag {
       position: relative;
       display: block;
       width: 20px;
       height: 13px;
       box-shadow: 0 1px 2px rgba(0, 0, 0, 0.35);
       overflow: hidden;
   }
   .lang-flag--vi, .lang-flag--vn { background: #d62828; }
   .lang-flag--vi::before, .lang-flag--vn::before {
       content: "";
       position: absolute;
       left: 50%; top: 50%;
       width: 8px; height: 8px;
       background: #f4d35e;
       clip-path: polygon(50% 0%, 61% 35%, 98% 35%, 68% 57%, 79% 91%, 50% 70%, 21% 91%, 32% 57%, 2% 35%, 39% 35%);
       transform: translate(-50%, -50%);
   }
   .lang-flag--en, .lang-flag--us {
       background: repeating-linear-gradient(to bottom, #b22234 0px, #b22234 1px, #ffffff 1px, #ffffff 2px);
   }
   .lang-flag--en::before, .lang-flag--us::before {
       content: "";
       position: absolute;
       left: 0; top: 0;
       width: 9px; height: 7px;
       background: #3c3b6e;
   }
   ```
6. **Vị trí trên thanh Header (.header-actions):**
   - Cụm `.lang-switch` bắt buộc nằm ngay bên trái của nút `Sign in` (`#sharedAuthSlot`) theo quy chuẩn thứ tự từ phải qua trái:
     `[Sign in (Góc phải cùng)]` ➔ `[Ngôn ngữ]` ➔ `[Âm thanh / Nút phụ]`

## 1.5 Quy Định Tuyệt Đối Không Tự Ý Thêm Text Chú Thích Phụ (No Unsolicited Tooltips / Title Annotations)
- **CẤM TUYỆT ĐỐI** tự ý thêm thuộc tính `title="..."` hoặc popup/tooltip chú thích hover vào bất kỳ nút bấm, nhãn dán, trường nhập liệu hay biểu tượng nào trên giao diện nếu **người dùng không yêu cầu một cách tường minh**.
- **Lý do & Mục đích:**
  - Giữ cho giao diện tối giản, thanh thoát, hiện đại, không bị các popup chữ vàng/đen mặc định của trình duyệt che khuất tầm nhìn hay gây rối mắt khi di chuột qua lại.
  - Tránh làm cồng kềnh bộ từ điển i18n với hàng chục key chú thích thừa thãi.
- **Quy tắc thực thi:**
  - Chỉ sử dụng `aria-label` cho mục đích hỗ trợ thiết bị trợ năng (screen reader) nếu cần thiết, tuyệt đối không gán thuộc tính `title`.
  - Chỉ chừng nào người dùng chủ động yêu cầu thêm chú thích/tooltip cho một thành phần cụ thể, AI Agent mới được phép bổ sung cho đúng thành phần đó.

---

# 2. QUY TẮC XƯNG HÔ & PHONG CÁCH GIAO TIẾP (COMMUNICATION TONE)

- **Xưng hô cố định:** AI Agent xưng **"tao"** và gọi người dùng là **"mày"** trong mọi phản hồi ở khung chat.
- **Thẳng thắn & Thực tế:** 
  - Nói chuyện trực diện, ngắn gọn, đi thẳng vào vấn đề. Không dùng từ ngữ xã giao sáo rỗng, nịnh bợ hay giải thích dông dài không cần thiết.
  - Khi thấy code lỗi thời, logic chưa tối ưu hoặc giải pháp của "mày" có nguy cơ gây lỗi, tao phải chỉ ra thẳng thắn lý do và đưa ra giải pháp tốt nhất.
- **Tuyệt đối không bịa chuyện (Zero Hallucination):**
  - Không tự tưởng tượng ra API, hàm, file hoặc thuộc tính không có thật.
  - Không khẳng định code chạy đúng khi chưa phân tích kỹ logic.
  - Nếu thiếu ngữ cảnh, thiếu file, hoặc chưa rõ yêu cầu -> **Phải hỏi ngay "mày" để làm rõ**, tuyệt đối không đoán mò hay tự phán.

---

# 3. CẤU TRÚC THƯ MỤC & PHÂN TÁCH MODULE (MODULAR ARCHITECTURE)

## 3.1 Mô Hình "File Ngoài - Thư Mục Trong" (Strict Directory Layout)
Toàn bộ ứng dụng trong `products/web-apps/` phải tuân theo cấu trúc mô-đun hóa:
```text
products/web-apps/
├── _RULE-web-apps.md                  # File quy chuẩn này
├── [app-name].html                    # File khởi chạy HTML duy nhất ở ngoài
└── [app-name]/                        # Thư mục chứa toàn bộ logic, style của riêng app đó
    ├── [app-name].css                 # Stylesheet riêng của app
    ├── [app-name].js (hoặc app.js)    # Controller chính của app
    └── [modules].js                   # Các module phụ trợ (audio, engine, worker...)
```

## 3.2 Nguyên Tắc Độc Lập & Chống God Object
1. **Một file - Một trách nhiệm (Single Responsibility Principle):**
   - Tránh viết các file "God Object" dài hàng nghìn dòng code. Nếu 1 file vượt quá **500 dòng code** -> Bắt buộc tách nhỏ thành các sub-module (ví dụ: tách `audio.js`, `engine.js`, `storage.js`).
2. **Tính độc lập tuyệt đối giữa các Web App:**
   - Mỗi Web App là một giải pháp độc lập. Xóa bỏ hoặc sửa đổi thư mục của app này tuyệt đối không được làm ảnh hưởng sang app khác.
   - Các tài nguyên dùng chung bắt buộc phải nằm ở thư mục gốc `../../common/` (`theme.css`, `shared-auth.js`,...).

---

# 4. BỐ CỤC KHÔNG GIAN & KHÓA VIEWPORT (VIEWPORT GEOMETRY BUDGET)

## 4.1 Khóa Toàn Màn Hình 100vh - Triệt Tiêu Thanh Cuộn Ngoài (Zero Page Scrollbar)
- Trên môi trường máy tính (Desktop/Laptop) và máy tính bảng (Tablet):
  - Ứng dụng phải hiển thị vừa khít trong khung màn hình:
    ```css
    html, body {
        height: 100vh;
        max-height: 100vh;
        overflow: hidden; /* CẤM thanh cuộn trang ngoài trên PC & Tablet */
    }
    ```
  - **Scroll nội bộ (Internal Scrollbar):** Thanh cuộn chỉ được phép xuất hiện thanh mảnh (custom slim scrollbar) bên trong các container con (danh sách phần tử, lịch sử...) khi nội dung vượt quá chiều cao cho phép.
  - Không bao giờ để phát sinh khoảng trống chết (dead space) dưới đáy màn hình.

## 4.2 Bố Cục Chuẩn 2 Cột (Desktop & Tablet Landscape)
- Layout phân chia rõ ràng thành 2 khu vực:
  - **Cột Trái (Control Panels / Sidebar):** Chiếm chiều rộng cố định khoảng `360px - 400px`. Chứa toàn bộ các bảng điều khiển, cài đặt, nhập liệu, lịch sử, chuyển đổi Tab.
  - **Cột Phải (Main Stage / Workspace / Canvas):** Chiếm toàn bộ không gian còn lại (`flex: 1`). Dành trọn vẹn cho khu vực trải nghiệm đồ họa tương tác chính.

## 4.3 Tự Động Co Giãn Canvas Theo Không Gian Khả Dụng
- Đối với các app có Canvas đồ họa:
  - Canvas phải tự động scale sắc nét theo màn hình Retina (`window.devicePixelRatio`).
  - Kích thước hiển thị phải tính toán theo `Math.min(wRect.width, wRect.height)` trừ khoảng đệm các nút bấm, đảm bảo không bao giờ đẩy thanh điều khiển tràn ra khỏi màn hình.

## 4.4 Thích Ứng Mobile (Responsive < 700px)
- Khi màn hình hẹp (`< 700px`): Tự động chuyển đổi layout thành 1 cột dọc và cho phép cuộn trang tự nhiên (`overflow-y: auto;`).

---

# 5. QUY CHUẨN DESIGN SYSTEM & THEME TOKENS

## 5.1 Tái Sử Dụng Duy Nhất Master `theme.css`
Mọi Web App bắt buộc phải nhúng file Design Tokens gốc:
```html
<link rel="stylesheet" href="../../common/theme.css">
```

## 5.2 Bảng Mã Tokens Ngữ Cảnh Bắt Buộc
**TUYỆT ĐỐI CẤM HARDCODE MÃ MÀU HEX TÙY TIỆN** trong CSS của Web App. Bắt buộc sử dụng 100% biến tokens:

| Token Ngữ Cảnh | Tên CSS Variable | Công Dụng / Ý Nghĩa |
| :--- | :--- | :--- |
| **Nền chính** | `var(--bg-primary)` | Nền tối chính của toàn bộ trang web (`#191919`) |
| **Nền thẻ card** | `var(--bg-secondary)` | Nền của các thẻ Card, Sidebar, Header (`#222222`) |
| **Nền ô nhập / chip** | `var(--bg-tertiary)` | Nền của ô input, pill, nút phụ (`#343434`) |
| **Nền hover / nổi** | `var(--bg-elevated)` | Nền khi hover item, tab active (`#464646`) |
| **Chữ tiêu đề / chính**| `var(--text-primary)` | Văn bản chính, tiêu đề app (`#ffffff`) |
| **Chữ mô tả / phụ** | `var(--text-secondary)` | Ghi chú, subtext, nhãn phụ (`#bbbbbb`) |
| **Chữ mờ / hint** | `var(--text-tertiary)` | Placeholder, ngày giờ lịch sử (`#888888`) |
| **Màu nhấn thương hiệu**| `var(--accent-primary)`| Nút hành động chính (SPIN, Confirm, Play...) |
| **Màu trạng thái Lam** | `var(--c-cyan)` | Điểm nhấn phụ, thanh trượt, badge (`#8DF2F2`) |
| **Màu trạng thái Đỏ** | `var(--c-red)` | Nút xóa, lỗi, nguy hiểm (`#ef4444`) |
| **Màu trạng thái Lục** | `var(--c-green)` | Trạng thái bật, thành công (`#34d399`) |
| **Màu trạng thái Vàng**| `var(--c-yellow)` | Giải thưởng, cúp chiến thắng, sao (`#e5c158`) |

## 5.3 Thang Bo Góc Đồng Bộ (Border Radius Scale)
- Bo góc siêu nhỏ (`2px`): `--border-radius-sm`
- Bo góc nhỏ (`4px`): `--border-radius-md`
- Bo góc chuẩn (`6px`): `--border-radius` (Dành cho Input, Button, Item)
- Bo góc lớn (`8px` - `12px`): `--border-radius-lg` (Dành cho Khung Card, Modal, Dialog)
- Bo tròn tuyệt đối (`9999px`): `--border-radius-full` (Dành cho Badge, Avatar, Pill, Switch)

---

# 6. CHUẨN XÁC THỰC SINGLE SIGN-ON (SSO) & CLOUD SYNC

Mọi Web App cần lưu trữ cài đặt người dùng **BẮT BUỘC** phải tích hợp bộ giải pháp Single Sign-On dùng chung tại `common/`.

## 6.1 Nhúng Thư Viện Chuẩn
Trong file HTML của Web App:
```html
<!-- Firebase SDKs (Lightweight CDN) -->
<script src="https://www.gstatic.com/firebasejs/10.8.0/firebase-app-compat.js"></script>
<script src="https://www.gstatic.com/firebasejs/10.8.0/firebase-auth-compat.js"></script>
<script src="https://www.gstatic.com/firebasejs/10.8.0/firebase-database-compat.js"></script>

<!-- Universal Shared SSO Engine -->
<link rel="stylesheet" href="../../common/shared-auth.css">
<script src="../../common/shared-auth-config.js"></script>
<script src="../../common/shared-auth.js"></script>
```

Trên thanh Header (`.header-actions`):
Thứ tự các phần tử trên thanh Header bắt buộc xếp **từ phải qua trái (Right-to-Left)**:
`[Sign in / User Avatar (Góc phải cùng)]` ➔ `[Ngôn ngữ]` ➔ `[Âm thanh / Nút phụ]`

Cấu trúc DOM chuẩn:
```html
<div class="header-actions">
    <!-- Nút âm thanh / Nút phụ -->
    <button type="button" class="icon-btn" id="soundToggleBtn" title="Bật/Tắt Âm Thanh">🔊</button>
    <!-- Cụm chuyển đổi ngôn ngữ chuẩn -->
    <div class="lang-switch">
        <button type="button" class="lang-btn lang-btn--toggle" id="langToggleBtn" data-lang="en" aria-label="Chuyển sang Tiếng Anh" title="Chuyển sang Tiếng Anh">
            <span class="lang-flag lang-flag--en" aria-hidden="true"></span>
            <span class="lang-code">EN</span>
        </button>
    </div>
    <!-- Shared SSO Auth Slot (Bắt buộc nằm ở góc ngoài cùng bên phải) -->
    <div id="sharedAuthSlot"></div>
</div>
```

## 6.2 Khởi Tạo Trong JavaScript Controller
```javascript
window.SharedAuth.init({
    appId: 'ten_ung_dung',       // Định danh riêng (ví dụ: 'lucky_wheel')
    mountTo: '#sharedAuthSlot',  // ID slot trên header
    onUserChange: (user) => {
        // Xử lý khi user đăng nhập / đăng xuất
    },
    onDataLoaded: (cloudData) => {
        // Áp dụng dữ liệu mây vừa tải về vào app
    }
});

// Lưu dữ liệu mây khi trạng thái app thay đổi (tự động debounce chống spam):
window.SharedAuth.saveData({ myState: data });
```

## 6.3 Quy Chuẩn Cấu Trúc Dữ Liệu Mây
Dữ liệu lưu trữ độc lập theo cây thư mục Realtime Database:
`/users/{google_uid}/apps/{appId}`
Tuyệt đối không lưu dữ liệu các app chung một node phẳng để tránh ghi đè dữ liệu của nhau.

## 6.4 Nguyên Tắc An Toàn Offline (Offline Resilience)
Khi mất mạng hoặc chưa đăng nhập: Web App **phải tự động fallback lưu vào `localStorage`**, đảm bảo ứng dụng luôn chạy mượt 100% không bao giờ bị đơ hay báo lỗi màn hình đỏ.

---

# 7. TRIẾT LÝ TỐI GIẢN CODE & HIỆU NĂNG CAO (KISS PROTOCOL)

## 7.1 Zero Bloatware & No Bulky Frameworks
- Không dùng jQuery, không dùng Bootstrap, không kéo các thư viện UI cồng kềnh.
- Sử dụng Vanilla JavaScript (ES6+), Semantic HTML5 và Modern CSS (Flexbox/Grid).

## 7.2 Đồ Họa & Âm Thanh Thuần Túy (Zero External Media Assets)
- **Đồ họa:** Ưu tiên Canvas 2D thuần hoặc SVG Masking theo quy chuẩn `.icon-mask` của `_RULE-website.md`.
- **Âm thanh:** Dùng **Web Audio API thuần** để tự tổng hợp âm thanh (tiếng click cơ học, hợp âm fanfare,...). Tuyệt đối không phụ thuộc vào việc tải các file `.mp3` bên ngoài để tránh lỗi 404, giật lag mạng và phụ thuộc đường dẫn.

## 7.3 Giới Hạn Debug (Circuit Breaker)
- Nếu một lỗi hoặc bug sửa **quá 2 lần** vẫn thất bại: **BẮT BUỘC PHẢI DỪNG LẠI**, giải thích rõ ràng nguyên nhân gốc rễ (Root Cause) cho "mày" và xin ý kiến chỉ đạo.
- Cấm tự tiện thử nghiệm linh tinh, cấm "đắp code" vá chắp vá làm nát codebase.

---

# 8. KHUNG MẪU BOILERPLATE CHUẨN KHI TẠO WEB APP MỚI

Khi tạo một Web App mới, AI Agent hãy sao chép trực tiếp khung mẫu này để đảm bảo tuân thủ 100% hiến pháp:

### `products/web-apps/[app-name].html`
```html
<!DOCTYPE html>
<html lang="vi">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
    <title data-i18n="app.title">App Name</title>
    <link rel="icon" type="image/svg+xml" href="../../svg/logo-MAX-favicon.svg">
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Montserrat:wght@400;500;600;700;800&display=swap" rel="stylesheet">
    
    <!-- Theme & Shared SSO Styles -->
    <link rel="stylesheet" href="../../common/theme.css">
    <link rel="stylesheet" href="../../common/shared-auth.css">
    <link rel="stylesheet" href="./[app-name]/[app-name].css">
</head>
<body>
    <header class="app-header">
        <div class="header-brand">
            <div class="brand-icon" aria-hidden="true">🚀</div>
            <div>
                <h1 class="brand-title" data-i18n="app.heading">App Heading</h1>
                <p class="brand-subtitle" data-i18n="app.subheading">App Subtitle</p>
            </div>
        </div>
        <div class="header-actions">
            <!-- Nút công cụ phụ / Âm thanh -->
            <button type="button" class="icon-btn" id="fullscreenBtn" title="Toggle Fullscreen">⛶</button>
            <!-- Cụm nút chuyển đổi ngôn ngữ chuẩn (CSS Flag + EN/VN) -->
            <div class="lang-switch">
                <button type="button" class="lang-btn lang-btn--toggle" id="langToggleBtn" data-lang="en" aria-label="Chuyển sang Tiếng Anh" title="Chuyển sang Tiếng Anh">
                    <span class="lang-flag lang-flag--en" aria-hidden="true"></span>
                    <span class="lang-code">EN</span>
                </button>
            </div>
            <!-- Shared SSO Auth Slot (Góc ngoài cùng bên phải) -->
            <div id="sharedAuthSlot"></div>
        </div>
    </header>

    <main class="app-layout">
        <!-- Cột Trái: Cài đặt & Điều khiển -->
        <aside class="control-panels">
            <div class="card panel-card">
                <!-- Nội dung điều khiển -->
            </div>
        </aside>

        <!-- Cột Phải: Không gian hiển thị / Canvas chính -->
        <section class="main-stage">
            <!-- Vùng tương tác chính -->
        </section>
    </main>

    <!-- Firebase SDKs -->
    <script src="https://www.gstatic.com/firebasejs/10.8.0/firebase-app-compat.js"></script>
    <script src="https://www.gstatic.com/firebasejs/10.8.0/firebase-auth-compat.js"></script>
    <script src="https://www.gstatic.com/firebasejs/10.8.0/firebase-database-compat.js"></script>

    <!-- Shared SSO & App Scripts -->
    <script src="../../common/shared-auth-config.js"></script>
    <script src="../../common/shared-auth.js"></script>
    <script src="./[app-name]/app.js"></script>
</body>
</html>
```

---

# 9. QUY CHUẨN HIỂN THỊ TRÊN TRANG SẢN PHẨM (`products.html`)

## 9.1 Thẻ Sản Phẩm Tinh Gọn (Title-Only Cards)
- Khi trưng bày các Web App lên trang danh mục `products.html` (thuộc section `web-apps`), thẻ sản phẩm **chỉ hiển thị tên ứng dụng (`.product-card-title`) và tag phân loại (`.product-card-tag`), KHÔNG ghi đoạn văn mô tả (`.product-card-desc`)**.

## 9.2 Danh Sách Loại Trừ Tuyệt Đối (Strictly Excluded Apps)
- **`tinhtiennhanh.html` (Tính Tiền Nhanh):**
  - **Lý do loại trừ:** Ứng dụng nghiệp vụ / nội bộ riêng biệt.
  - **Quy tắc bất di bất dịch:** Bất kỳ AI Agent hay lập trình viên nào khi quét hoặc cập nhật danh mục `products.html` **TUYỆT ĐỐI CẤM** thêm `tinhtiennhanh.html` vào trang danh mục.

---

# 10. QUY TRÌNH THỰC THI & NGHIỆM THU TINH GỌN (FAST-TRACK VERIFICATION & REPORTING)

Nhằm tối ưu hóa tốc độ phản hồi, tiết kiệm thời gian chờ đợi và tránh làm treo tiến trình chat:

## 10.1 Cấm Tuyệt Đối Các Bước Kiểm Thử Nặng & Rườm Rà (No Heavy DevTools/Browser QA)
Sau khi chỉnh sửa hoặc tạo mới code Web App, AI Agent **TUYỆT ĐỐI KHÔNG TỰ Ý CHẠY** các công đoạn sau:
1. **Không mở trình duyệt ngầm (No Headless Chrome / DevTools):** Không mở browser ngầm để load page, soi console log hay đợi network request.
2. **Không chụp ảnh màn hình (No Headless Screenshots):** Không dùng tool để chụp ảnh màn hình giao diện app trong môi trường ảo.
3. **Không mô phỏng click/tương tác bằng script (No Automated UI Scripting):** Không chạy script tự động click tab, click nút hay mô phỏng thao tác người dùng qua DevTools.
4. **Không chạy các lệnh hệ thống dễ treo / timeout (No Hanging Terminal Commands):** Tuyệt đối không chạy các lệnh như `git status`, `git diff`... khi công cụ không chắc chắn có sẵn trong biến môi trường PATH hoặc có nguy cơ làm đứng terminal.

## 10.2 Quy Trình Nghiệm Thu Chuẩn Tinh Gọn (Fast-Track Flow)
Quy trình bàn giao chỉ gồm đúng các bước nhanh - gọn - chuẩn:
1. **Kiểm tra cú pháp tĩnh (Static Syntax Check):** Nếu cần thiết, chỉ chạy nhanh lệnh kiểm tra cú pháp file JS (ví dụ: `node -c <file.js>`) trong vòng < 2 giây.
2. **Cập nhật báo cáo (Update Walkthrough / Report):** Ghi tóm tắt ngắn gọn, trực quan các file đã thay đổi và logic vào artifact báo cáo (`walkthrough.md`).
3. **Bàn giao ngay cho người dùng:** Trả lời trực tiếp trong khung chat để người dùng tự mở trình duyệt thật trải nghiệm và phản hồi thực tế.

