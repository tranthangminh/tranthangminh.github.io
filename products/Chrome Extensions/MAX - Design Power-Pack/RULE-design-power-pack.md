# DỰ ÁN MAX - DESIGN POWER-PACK — QUY TẮC PHÁT TRIỂN & BẢO TOÀN KIẾN TRÚC

> **Mục đích:** File quy chuẩn kỹ thuật bắt buộc dành riêng cho extension **MAX - Design Power-Pack**. Bất kỳ AI Agent hay lập trình viên nào can thiệp vào mã nguồn dự án này đều **bắt buộc phải đọc và tuân thủ tuyệt đối** các điều khoản bên dưới trước khi viết hoặc sửa đổi bất kỳ dòng code nào.

---

# 1. BẢN SẮC KIẾN TRÚC DỰ ÁN (ARCHITECTURE & STACK)

## 1.1 Ngôn Ngữ & Nền Tảng Kỹ Thuật
- **Công nghệ cốt lõi:** Pure Vanilla JavaScript (ES6+), CSS3 Variables / Tokens, HTML5 Canvas, SVG Vector Graphics.
- **Tiêu chuẩn Extension:** Chrome Extension Manifest V3 (MV3).
- **Phân tách ngữ cảnh chạy (Context Isolation):**
  1. **Background Service Worker (`background.js`):** Xử lý vòng đời extension, tabs, contextMenus, desktopCapture, debugger API. Không có DOM window.
  2. **Popup UI (`popup.html`, `popup.js`, `popup.css`):** Giao diện popup extension và SidePanel (`?view=sidepanel`).
  3. **Content Scripts (`content.js`, `image_previewmodal/*`, `4. tools-features/*`):** Inject vào trang web người dùng (`<all_urls>`). Chạy trong Isolated World.
  4. **Standalone In-Place Studio (`auto-open-image-studio.js`):** Biến tab ảnh trực tiếp của trình duyệt (Direct image URL / Blob URL) thành Full Studio mà vẫn bảo toàn 100% URL gốc trên Address Bar.

## 1.2 Ranh Giới Ngôn Ngữ (English-First UI)
- **Giao diện 100% Tiếng Anh:** Toàn bộ text hiển thị trên UI (Button, Label, Tooltip, Dialog, Shortcut hint chips, Placeholder, Status toasts) đều phải là **Tiếng Anh chuẩn**. Tuyệt đối không hardcode tiếng Việt hay nửa Anh nửa Việt vào giao diện ứng dụng.
- **Khung Chat & Trao Đổi:** Sử dụng **Tiếng Việt** (xưng *"tao"* - gọi *"mày"*, thẳng thắn, trung thực, chỉ ra lỗi sai kỹ thuật ngay lập tức).

## 1.3 Tính Tự Chủ CSS Trong Content Scripts (Self-Contained Content Scripts)
- **Cấm phụ thuộc vào `common/common.css`:** `common.css` chỉ được load trong Popup, **không được inject vào Content Scripts** (`manifest.json`).
- Mọi module chạy dưới Content Script (Preview Modal, Image Editor, Floating HUD, Support MAX, Video/Audio controllers) **phải tự cấp đủ CSS (self-contained)** hoặc khai báo đầy đủ trong `theme.css` / `image_previewmodal.css`.

---

# 2. BẢO TỒN HỆ THỐNG MASK & SVG ICONS (ICON SYSTEM INTEGRITY)

> [!CAUTION]
> **ĐÂY LÀ KHU VỰC TỬ HUYỆT ĐÃ TỪNG GÂY LỖI LẶP LẠI (ICON TILING BUG).**
> Thuộc tính CSS `-webkit-mask-repeat` và `mask-repeat` mặc định là `repeat`. Khi đặt một SVG có kích thước cố định (ví dụ 16x16px) vào container lớn hơn (ví dụ 25x25px) mà thiếu `no-repeat` và `contain`, icon sẽ bị browser nhân bản lặp lại thành 4 hoặc nhiều hình!

## 2.1 Bộ 3 Thuộc Tính Bắt Buộc Cho Mọi `.icon-mask`
Bất kỳ CSS class hoặc inline style nào sử dụng CSS Mask cho SVG icon **BẮT BUỘC** phải có đủ cả tiền tố chuẩn và `-webkit-`:
```css
.icon-mask {
  display: inline-block;
  -webkit-mask-size: contain;
  mask-size: contain;
  -webkit-mask-repeat: no-repeat;
  mask-repeat: no-repeat;
  -webkit-mask-position: center;
  mask-position: center;
  flex-shrink: 0;
}
```

## 2.2 Kỷ Luật Bảo Vệ Tệp Tin SVG (SVG Integrity)
- **CẤM SỬA TRỰC TIẾP FILE SVG:** Trừ khi người dùng yêu cầu rõ ràng, tuyệt đối không được sửa đổi, cắt xén hay xóa các thuộc tính trong file `.svg` gốc.
- Mọi điều chỉnh về kích thước hiển thị, tỉ lệ hay màu sắc (`currentColor`) **phải được giải quyết 100% bằng CSS và thuộc tính mask** của phần tử chứa icon.

---

# 3. QUY CHUẨN THEME HỆ THỐNG & ĐỒNG BỘ TRẠNG THÁI (THEME SYNCHRONIZATION)

## 3.1 Nguồn Chân Lý Dữ Liệu Theme (Single Source of Truth)
- **Key lưu trữ thống nhất:** Trạng thái theme của Image Studio được lưu trữ tại `chrome.storage.local` với key duy nhất:
  ```javascript
  const MODAL_THEME_STORAGE_KEY = 'imageStudioTheme'; // 'dark' | 'light'
  ```
- **Popup theme:** Được lưu trữ qua key `maxTheme`.

## 3.2 Cơ Chế Lắng Nghe & Đồng Bộ Tức Thì (Zero-Reload Realtime Sync)
- Mọi instance của Preview Modal, Image Studio và Popup phải đăng ký `chrome.storage.onChanged`:
  ```javascript
  chrome.storage.onChanged.addListener((changes, area) => {
    if (area === 'local' && changes.imageStudioTheme) {
      applyModalTheme(changes.imageStudioTheme.newValue);
    }
  });
  ```
- Khi chuyển đổi Dark/Light mode, trạng thái phải cập nhật tức thì trên toàn bộ các tab và cửa sổ đang mở mà không yêu cầu reload trang.

## 3.3 Đồng Bộ Thuộc Tính DOM Toàn Diện
Khi đổi theme, bắt buộc phải cập nhật thuộc tính `data-theme` trên cả 3 cấp độ:
1. `#image-preview-modal.setAttribute('data-theme', theme)`
2. `document.documentElement.setAttribute('data-theme', theme)` (nếu là trang standalone)
3. `document.body.setAttribute('data-theme', theme)` (nếu là trang standalone)
4. Cập nhật `title` và icon mask (`light-mode.svg` khi ở theme Dark để bấm chuyển sang Light; `dark-mode.svg` khi ở theme Light để bấm chuyển sang Dark).

## 3.4 Cấm Tuyệt Đối Hardcode Mã Màu HEX Trong Giao Diện
Mọi thành phần giao diện bắt buộc phải dùng CSS Variables từ `theme.css`:
- `--bg-primary`, `--bg-secondary`, `--bg-tertiary`, `--bg-overlay`
- `--text-primary`, `--text-secondary`, `--text-on-accent`
- `--accent-primary` (`var(--c-cyan)`), `--accent-secondary` (`var(--c-purple)`)
- `--border-color`, `--border-hover`, `--shadow-md`

---

# 4. QUẢN LÝ BỘ NHỚ & AN TOÀN TRANG WEB (PERFORMANCE & ANTI-LEAK)

## 4.1 Thu Hồi Bộ Nhớ Blob URL (Anti-RAM Bloat)
- Mọi Blob URL tạo ra bằng `URL.createObjectURL(blob)` để nạp ảnh hoặc preview **phải được giải phóng** bằng `URL.revokeObjectURL(url)` ngay khi ảnh đã tải xong (`img.onload`) hoặc khi modal đóng lại.

## 4.2 Dọn Dẹp Event Listeners Khi Đóng Modal
- Content script inject vào trang web của người dùng không được gây ảnh hưởng đến trang web gốc.
- Khi modal ẩn hoặc đóng (`forceClosePreviewModal`), các listener phím tắt toàn cục (`keydown`, `wheel` zoom, `mousemove` pan) phải được vô hiệu hóa hoặc kiểm tra điều kiện `!modal.classList.contains('hidden')` trước khi gọi `preventDefault()`.

## 4.3 Phòng Tránh Trùng Lặp Listener (Single Listener Guard)
- Sử dụng biến cờ như `isModalInitialized` hoặc `dataset.themeBound` để đảm bảo không gắn lặp nhiều lần cùng một sự kiện click/keydown khi mở lại modal nhiều lần.

---

# 5. BẢO MẬT & TIÊU CHUẨN PHÊ DUYỆT CHROME WEB STORE

## 5.1 Cấm Tuyệt Đối `eval` và Dynamic Code Execution
- Manifest V3 cấm hoàn toàn `eval()`, `new Function()`, `setTimeout("string")`. Mọi logic xử lý hình ảnh, canvas và tính toán toán học phải được viết bằng code thuần túy.

## 5.2 Không Phụ Thuộc Tài Nguyên Mạng Ngoài (Zero External CDN)
- Font chữ (`Outfit`), icon SVG và thư viện đều phải tự lưu trữ cục bộ trong extension (`web_accessible_resources`). Không import bất kỳ link script/css/font nào từ internet bên ngoài.

## 5.3 Cấm Đặt Tên File/Thư Mục Bắt Đầu Bằng Dấu Gạch Dưới `_`
- **Quy tắc Chromium bắt buộc:** Chromium bảo lưu tiền tố `_` cho hệ thống (chỉ cho phép các thư mục đặc biệt như `_locales` và `_metadata`).
- **Lỗi thực tế đã xảy ra:** Nếu đặt file như `_RULE-*.md` trong thư mục extension, Chrome sẽ từ chối nạp extension với lỗi:
  *"Cannot load extension with file or directory name _RULE-*.md. Filenames starting with "_" are reserved for use by the system. Could not load manifest."*
- **Quy chuẩn:** Mọi file tài liệu, markdown, rules trong thư mục extension BẮT BUỘC đặt tên không có dấu gạch dưới ở đầu (ví dụ: `RULE-design-power-pack.md`).
