# Khung Trang Sản Phẩm Windows App

Phần dùng chung cho trang sản phẩm của các app trong `products/Windows Apps/`. Đang dùng ở `products/auto-clicker.html` và `products/book-forge.html`.

## Phần nào nằm ở đâu

| Thành phần | File |
| :--- | :--- |
| Tiêu đề, tag nhỏ, nút tải, bảng, khung bảo mật, khung lưu ý, phím `kbd`, thẻ bước, thẻ mẹo | `common/shared-product-detail.css` |
| 3 thẻ chuyển nội dung (Mô Tả, Hướng Dẫn, Giới Hạn & Yêu Cầu) | `common/shared-tabs.css`, `common/shared-tabs.js` |
| Thư viện ảnh | `common/shared-spotlight.css`, `common/shared-spotlight.js` |
| Icon cạnh tiêu đề, thanh thẻ dính, khối chữ + ảnh, thẻ hành động, lưới tham số, thẻ mẹo 4 cột | `windows-app-page.css` |
| Header, footer, chuyển thẻ, thư viện ảnh của trang | `windows-app-page.js` |
| Nội dung và phần chỉ trang đó có | `[tên-app].html`, `[tên-app].css`, `[tên-app]-i18n.js`, `[tên-app].js` |

HTML vẫn nằm ở từng trang, không dựng bằng JS, để tiêu đề và nội dung có sẵn cho công cụ tìm kiếm.

## Làm trang cho app mới

1. Chép `products/book-forge.html` thành `products/[tên-app].html`, đổi đường dẫn, tên app và phiên bản.
2. Tạo `products/[tên-app]-i18n.js` với đủ `vi` và `en`, có khóa `docTitle`.
3. Tạo `products/[tên-app].js`:

   ```js
   'use strict';

   initWindowsAppPage({ titleKey: 'tenApp.docTitle' });
   ```

4. Tạo `products/[tên-app].css`, chỉ chứa phần riêng của trang.
5. Thêm trang vào `sitemap.xml`, `products.html` và `products/products-version.json`.

## Thứ tự nạp file

CSS, sau các file `common/shared-*.css`:

```html
<link rel="stylesheet" href="../common/shared-tabs.css?v=...">
<link rel="stylesheet" href="../common/shared-spotlight.css?v=...">
<link rel="stylesheet" href="../common/shared-product-detail.css?v=...">
<link rel="stylesheet" href="Windows%20Apps/common/windows-app-page.css?v=...">
<link rel="stylesheet" href="[tên-app].css?v=...">
```

JS, ở cuối `<body>`:

```html
<script src="../common/shared-download-counter.js?v=..."></script>
<script src="../common/shared-tabs.js?v=..."></script>
<script src="../common/shared-spotlight.js?v=..."></script>
<script src="Windows%20Apps/common/windows-app-page.js?v=..."></script>
<script src="[tên-app].js?v=..."></script>
```

Sửa file dùng chung thì đổi `?v=` ở mọi trang đang nạp nó.

## Quy ước nội dung

- Chỉ ghi điều đã kiểm chứng từ code hoặc đo thực tế: dung lượng file, RAM, phím tắt, số khổ giấy, kết nối mạng.
- Không ghi "100% offline" nếu app có kiểm tra cập nhật. Nói rõ khi nào app kết nối mạng.
- Mô tả trong HTML và trong `vi` của file i18n phải giống nhau. Tên nút giữ đúng như trong app.
- Ảnh giao diện chụp bằng dữ liệu mẫu, không để lộ tên cửa sổ hay đường dẫn riêng.
- Sửa nội dung thì sửa cả tiếng Việt và tiếng Anh, rồi đổi `lastmod` trong `sitemap.xml`.
