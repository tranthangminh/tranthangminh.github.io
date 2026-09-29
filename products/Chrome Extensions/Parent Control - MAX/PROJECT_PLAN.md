# Master Plan: YouTube Curated Parental Control System

Tài liệu này định hình kiến trúc và kế hoạch triển khai hệ thống **Kiểm soát & Giới hạn nội dung YouTube** cho trẻ em theo danh sách video được chỉ định (Whitelist), triển khai trên 2 nền tảng: **Desktop (Chrome Extension)** và **Mobile (Android/iOS App)**.

---

## DỰ ÁN 1: Chrome Extension (YouTube Curated Feed)

> **Mục tiêu:** Can thiệp trực tiếp trên trang `youtube.com`. Khi bật chế độ, toàn bộ trang chủ YouTube sẽ không hiển thị video gợi ý ngẫu nhiên mà chỉ tải danh sách video đã được phụ huynh lưu trước. Khi xem video, chỉ cho phép xem những video có trong danh sách.

### 1. Kiến trúc kỹ thuật (Manifest V3)
* **`manifest.json`**:
  * Manifest Version: 3.
  * Quyền (Permissions): `storage`, `activeTab`.
  * Host Permissions: `*://*.youtube.com/*`, `https://www.youtube.com/oembed*`.
  * Content scripts nạp tại: `*://*.youtube.com/*` với `run_at: "document_end"`.
* **Cấu trúc dữ liệu (`chrome.storage.local` Schema)**:
  ```json
  {
    "isEnabled": true,
    "pin": "1234",
    "whitelist": [
      {
        "id": "dQw4w9WgXcQ",
        "url": "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
        "title": "Tiêu đề video",
        "author": "Tên kênh",
        "thumbnail": "https://i.ytimg.com/vi/dQw4w9WgXcQ/hqdefault.jpg",
        "addedAt": 1727580000000
      }
    ],
    "settings": {
      "strictWatch": true,
      "hideShorts": true,
      "hideRelated": true,
      "hideComments": true,
      "hideSearch": false
    }
  }
  ```

### 2. Các giải pháp kỹ thuật cốt lõi cho YouTube (Technical Edge Cases)
1. **Xử lý cơ chế SPA (Single Page Application) của YouTube:**
   * YouTube không tải lại trang khi chuyển trang (Home -> Watch -> Channel).
   * Giải pháp: Lắng nghe sự kiện custom của YouTube `yt-navigate-finish` trên `window`/`document` kết hợp `MutationObserver` để áp dụng bộ lọc tức thời mà không bị trễ hay mất hiệu lực.
2. **Chuẩn hóa Video ID (Regex Normalizer):**
   * Hỗ trợ nhận diện mọi dạng link YouTube:
     * `https://www.youtube.com/watch?v=VIDEO_ID`
     * `https://youtu.be/VIDEO_ID`
     * `https://www.youtube.com/shorts/VIDEO_ID`
     * `https://www.youtube.com/embed/VIDEO_ID`
   * Tự động loại bỏ các query rác như `&t=`, `&list=`, `&index=`, `&feature=`.
3. **Cơ chế Metadata & Cache oEmbed:**
   * Gọi API miễn phí không cần API Key: `https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v={id}&format=json`.
   * Cache kết quả trực tiếp vào danh sách `whitelist` trong storage để các lần mở trang tiếp theo hiển thị ngay lập tức không cần request mạng.
   * Fallback thumbnail nhanh: `https://i.ytimg.com/vi/{id}/hqdefault.jpg` khi ngoại tuyến hoặc API gặp sự cố.
4. **Cơ chế Chặn nghiêm ngặt (Strict Whitelist trên `/watch`):**
   * Khi `settings.strictWatch = true`, kiểm tra tham số `v` trên URL `/watch`.
   * Nếu Video ID không thuộc `whitelist`:
     * Ngay lập tức pause thẻ `<video>`.
     * Hiển thị màn hình chặn thân thiện: *"Video này chưa được bố mẹ cho phép xem"* kèm nút quay về Trang chủ, hoặc tự động redirect về `https://www.youtube.com/`.
5. **Bộ lọc CSS chống xao nhãng (Anti-distraction Selectors):**
   * Ẩn feed trang chủ gốc: `ytd-browse[page-subtype="home"] #contents`, `ytd-rich-grid-renderer`.
   * Ẩn Shorts: `ytd-reel-shelf-renderer`, `ytd-guide-entry-renderer:has(a[title="Shorts"])`, `ytd-mini-guide-entry-renderer[aria-label="Shorts"]`.
   * Ẩn video liên quan khi xem: `#related`, `ytd-watch-next-secondary-results-renderer`.
   * Ẩn bình luận (tùy chọn): `#comments`.

### 3. Giao diện Quản trị của Phụ huynh (`popup/`)
* **Trạng thái chính:** Toggle ON/OFF (có bảo vệ mã PIN).
* **Quản lý Whitelist:**
  * Form thêm URL video mới.
  * Nút bấm tiện lợi: **"Thêm video của tab hiện tại"** (Quick Add) khi phụ huynh đang mở video hay trên YouTube.
  * Danh sách video đã duyệt (có ảnh thumbnail, tiêu đề, nút xóa từng video).
* **Cài đặt & Tiện ích:**
  * Đặt / Đổi mã PIN 4 số.
  * Tùy chọn nâng cao: Bật/tắt Chặn Shorts, Chặn sidebar gợi ý, Chặn bình luận, Chặn nghiêm ngặt video ngoài danh sách.
  * **Sao lưu & Phục hồi (Export / Import JSON):** Giúp sao lưu hoặc chia sẻ danh sách video sang máy tính khác dễ dàng.

### 4. Lộ trình triển khai (Chrome Extension)
* **Giai đoạn 1 (MVP - Nền tảng cốt lõi):**
  * Khởi tạo `manifest.json` (V3) và icon ứng dụng.
  * Xây dựng `popup/` với Toggle ON/OFF, nhập URL video (chuẩn hóa ID), lưu vào `chrome.storage.local`.
  * Xây dựng `content_scripts/`: Bắt sự kiện `yt-navigate-finish`, ẩn feed trang chủ gốc khi ON, hiển thị danh sách video đã duyệt.
* **Giai đoạn 2 (UI/UX YouTube Native & oEmbed):**
  * Tự động fetch metadata (Tiêu đề, Kênh, Thumbnail) qua oEmbed và cache vào storage.
  * Thiết kế lại giao diện feed thay thế theo chuẩn Card Grid của YouTube (tương thích giao diện Dark mode / Light mode của YouTube).
  * Kích hoạt cơ chế Strict Whitelist: Chặn phát video lạ khi truy cập URL `/watch`.
* **Giai đoạn 3 (Bảo vệ nâng cao & Hoàn thiện):**
  * Khóa xác thực mã PIN 4 số cho Popup (khi muốn Tắt hoặc sửa danh sách).
  * Tính năng Quick Add từ tab hiện tại.
  * Tùy chọn ẩn Shorts toàn diện, ẩn sidebar gợi ý và bình luận.
  * Tính năng Export/Import danh sách file JSON.

---

## DỰ ÁN 2: Mobile App (YouTube Kids Curated Player)

> **Mục tiêu:** Do không thể can thiệp trực tiếp vào ứng dụng YouTube gốc trên điện thoại (cơ chế Sandbox của iOS/Android), giải pháp tối ưu nhất là tạo một ứng dụng độc lập hiển thị danh sách video được duyệt và phát qua **YouTube IFrame Player**.

### 1. Công nghệ đề xuất
* **Framework:** **Flutter** (hoặc **React Native**) để viết 1 lần chạy được cả Android lẫn iOS.
* **Player Core:** `youtube_player_flutter` (hoặc `react-native-youtube-iframe`) — sử dụng chính thức YouTube IFrame API của Google (không vi phạm chính sách, không lo lỗi bản quyền).
* **Storage:** `shared_preferences` / `Hive` (lưu local trên máy) hoặc Firebase Firestore (nếu muốn phụ huynh chỉnh link từ xa qua điện thoại của bố mẹ).

### 2. Kiến trúc chức năng
```
                       ┌─────────────────────────────────────────┐
                       │           ỨNG DỤNG MOBILE               │
                       └────────────────────┬────────────────────┘
                                            │
                    ┌───────────────────────┴───────────────────────┐
                    ▼                                               ▼
     [ GIAO DIỆN TRẺ EM ]                                [ CỔNG PHỤ HUYNH ]
     • Lưới video đã duyệt (Cards)                       • Khóa bằng Mã PIN
     • Trình phát video độc lập                          • Quản lý danh sách Link
     • KHÔNG có Shorts / Gợi ý ngoài                     • Hẹn giờ tắt (Timer)
```

* **Chế độ xem cho trẻ:**
  * Giao diện lưới đơn giản, sinh động.
  * Bấm vào video -> Phát full màn hình. Khi hết video có thể tự dừng hoặc phát video tiếp theo trong danh sách.
  * Tuyệt đối không xuất hiện bình luận, Shorts hay video ngoài danh sách.
* **Khóa thiết bị (Device Lock):**
  * Hướng dẫn phụ huynh kích hoạt **Guided Access (iOS)** hoặc **App Pinning (Android)** để ghim app trên màn hình, trẻ không thể thoát ra mở YouTube gốc.

### 3. Lộ trình triển khai (Mobile App)
* **Giai đoạn 1 (Core Player):** Setup dự án Flutter/React Native, tích hợp IFrame Player phát được link video YouTube bất kỳ.
* **Giai đoạn 2 (Quản lý danh sách & UI):** Màn hình hiển thị danh sách video đã lưu, màn hình Cài đặt cho phụ huynh thêm/xóa link.
* **Giai đoạn 3 (Parent Gate & Tiện ích):** Tạo màn hình nhập PIN bảo vệ, tính năng giới hạn thời gian xem (Timer: tự khóa sau 30-45 phút).

---

## SO SÁNH & THỜI ĐIỂM BẮT ĐẦU

| Tiêu chí | Dự án 1: Chrome Extension | Dự án 2: Mobile App (Flutter) |
| :--- | :--- | :--- |
| **Nền tảng** | PC / Laptop (Windows, macOS) | Điện thoại, Máy tính bảng (iOS, Android) |
| **Độ phức tạp code** | Thấp - Trung bình (HTML/CSS/JS) | Trung bình (Flutter/React Native) |
| **Thời gian có MVP** | 1 - 2 ngày | 3 - 5 ngày |
| **Chi phí / Tài khoản Dev** | Miễn phí (tự cài chế độ Developer) | Miễn phí khi chạy trực tiếp qua USB/TestFlight |

---

## HƯỚNG DẪN KHỞI TẠO DỰ ÁN MỚI

Khi bạn mở thư mục dự án mới trong IDE:
1. Mở cửa sổ chat mới tại thư mục `Parent Control - MAX`.
2. Gõ lệnh:
   > *"Hãy đọc file `PROJECT_PLAN.md` và bắt đầu khởi tạo dự án Chrome Extension (Giai đoạn 1 - MVP)."*
