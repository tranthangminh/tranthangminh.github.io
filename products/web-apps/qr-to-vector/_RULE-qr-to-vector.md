# QR to Vector & 8-Bit Vectorizer - Project Rules & Architecture Guardrails

Tài liệu quy chuẩn kỹ thuật cho ứng dụng **QR to Vector & 8-Bit Pixel Art** (`products/web-apps/qr-to-vector`).
Mọi thay đổi code hoặc bảo trì tính năng trong thư mục này BẮT BUỘC tuân thủ các quy tắc sau:

---

## 1. Quy tắc giới hạn độ dài file (< 500 lines)
- **Tuyệt đối không có file nào $\ge 500$ dòng** (theo `_MAX-RULES.md` và `_RULE-web-apps.md`).
- Khi file tiến gần mốc 450 dòng, phải tái cấu trúc, tách module vào thư mục `pipeline/` hoặc trích xuất UI helper riêng.

---

## 2. Quy tắc giao diện & Theme Tokens (100% `common/theme.css`)
- 100% màu sắc, bo góc, transition, đổ bóng phải sử dụng CSS Variables từ `../../common/theme.css` (`var(--bg-primary)`, `var(--accent-primary)`, `var(--border-color)...`).
- Không hardcode màu hex tùy tiện trong stylesheet.

---

## 3. Quy tắc đường lưới Grid trên màn hình (1px Physical Screen Grid)
- Đường lưới gióng pixel art hiển thị trên ảnh gốc **phải luôn luôn mỏng đúng 1px màn hình**, bất kể ảnh gốc to hay nhỏ và bất kể cấp độ zoom.
- **Quy tắc Neo Khung & Khử Nhân Đôi Zoom ($Zoom^2$ Elimination)**:
  - Lớp canvas lưới `#pixelArtOverlayCanvas` neo kích thước layout CSS theo `offsetWidth` và `offsetHeight` của ảnh gốc (không dùng `getBoundingClientRect` vì bị dính CSS transform cha).
  - Buffer canvas được cấp phát theo `offsetWidth * zoom * dpr` để 1 canvas pixel = 1 physical screen pixel.
  - Vẽ với `ctx.lineWidth = 1` và subpixel centering `0.5`, đảm bảo khi zoom sâu lưới không bao giờ bị mờ hay biến mất.
  - Tự động ẩn lưới nếu kích thước ô pixel hiển thị trên màn hình $< 3$px để tránh chói mắt trên ảnh độ phân giải siêu cao.

---

## 4. Quy tắc Split-Screen cân bằng tỉ lệ 1:1 (Equal Dimensions)
- Hai nửa màn hình chia đôi (Trái: Ảnh gốc + Lưới, Phải: Vector SVG kết quả) **phải có cùng chiều cao và kích thước hiển thị vật lý 100%**.
- Thẻ SVG xuất ra phải dùng:
  ```xml
  <svg viewBox="0 0 ${w} ${h}" width="100%" height="100%" preserveAspectRatio="xMidYMid meet">
  ```
- CSS của cả Canvas và SVG phải đồng nhất:
  ```css
  width: 100%; height: 100%; max-width: 100%; max-height: 100%; object-fit: contain;
  ```
  Không để SVG dùng kích thước pixel cố định khiến nó bị co nhỏ hơn ảnh gốc.

---

## 5. Quy tắc 3 Chế Độ Render Style (Dính Giao Điểm / Tách Giao Điểm / Từng Block Rời)
- **CẤM xuất sọc scanlines ngang (RLE stripes)** làm vỡ hình thành từng thanh nan rèm cửa.
- Ba phong cách chuẩn:
  1. `unified-connected` (**Dính Giao Điểm**): 8-connectivity nối liền khối góc chéo.
  2. `unified-separated` (**Tách Giao Điểm**): 4-connectivity tách rời khối tại giao điểm chéo, giữ nét thanh mảnh.
  3. `blocks` (**Từng Block Rời**): Vẽ từng ô vuông block pixel rời rạc.
- Thanh trượt `Bo Góc Khối (0-100%)` và `Khoảng Cách Khối (0-40%)` độc lập: Khi radius = 0 là khối vuông; tăng lên là bo góc; 100% là tròn (dots).

---

## 6. Quy tắc Xếp Tầng Khối Đặc Lót Đáy (Layered Solid Matryoshka)
- Tự động phát hiện quan hệ bao bọc (Enclosure Tree): Đảo cha bọc hoàn toàn đảo con.
- Đắp đặc (hole-filling) toàn bộ pixel của các đảo con vào mặt nạ đảo cha.
- **Mỗi đảo cha chỉ được xuất ra ĐÚNG 1 thẻ `<path>` duy nhất**, không được nhân bản thẻ rác.
- Sắp xếp thứ tự Z-Index trong SVG: Đảo cha (sâu nhất) vẽ trước $\rightarrow$ đảo con vẽ đè lên trên. Khi mở trong Figma/Illustrator, nhấc đảo con ra thì bên dưới vẫn là mảng đặc nguyên vẹn.

---

## 7. Phân Tầng Kiến Trúc & Module Dùng Chung (`common/`)
- **Tầng `common/`**: Chứa toàn bộ UI, Stage Viewport, Exporter, DOM Utilities dùng chung cho cả 3 tab (`stage-exporter.js`, `dom-utils.js`, `stage-viewport-controller.js`, `png-exporter.js`).
- **Tầng `pipeline/`**: Thuần túy chứa các thuật toán dữ liệu và hình học (Scanner, Matrix, Contours, Fillet, Topology, Quantizer, Grid Detector).
- Ảnh gốc trong 8-Bit luôn giữ nguyên bản $100\%$ tỉ lệ gốc 1:1, không áp dụng co giãn làm méo mó pixel.

---

## 8. Bảo toàn tính năng QR Code
- Quét QR và Tạo QR (9 định dạng) phải hoạt động $100\%$ không suy hao.
- Giữ nguyên hỗ trợ tiếng Việt có dấu UTF-8 (`stringToBytesFuncs['UTF-8']`).
- Giữ nguyên tính năng tự động nâng cấp ECC Level H khi chèn logo trung tâm.

---

## 9. Quy tắc Tỉ lệ Ô Vuông 1:1 & Đồng bộ 2 chiều Cols/Rows (Pixel Art Grid Standard)
- **Quy tắc trực quan tỉ lệ Bounding Box (Không công thức rườm rà)**:
  - Tỉ lệ Cột (Cols) và Hàng (Rows) BẮT BUỘC luôn luôn tính theo kích thước Bounding Box ($W_{bbox} : H_{bbox}$), dù công tắc 'Cắt theo Bounding Box' bật (ON) hay tắt (OFF):
    + Ví dụ ảnh đầu vào kích thước 100×50:
      * Nếu vùng Bounding Box là 100×50: Dù cắt Bounding Box ON hay OFF, tỉ lệ Cột và Hàng luôn là 2:1.
      * Nếu vùng Bounding Box là 30×50: Dù cắt Bounding Box ON hay OFF, tỉ lệ Cột và Hàng luôn là 3:5.
    + Tóm lại: Việc bật/tắt cắt Bounding Box không ảnh hưởng gì tới tỉ lệ lưới, tỉ lệ Cột và Hàng luôn dựa theo Bounding Box.
  - **Đồng bộ 2 chiều (Bi-directional Sync)**:
    + Khi điều chỉnh Cột (Cols): Hàng (Rows) tự động tính lại theo tỉ lệ Bounding Box.
    + Khi điều chỉnh Hàng (Rows): Cột (Cols) tự động tính lại theo tỉ lệ Bounding Box.
    + Khi kéo thay đổi Bounding Box trên màn hình: Cột và Hàng tự động cập nhật lại theo khung Bounding Box mới.
  - **Ô mẫu vuông 1:1 không méo mó**: Mỗi ô lưới gióng pixel art trên ảnh gốc bắt buộc phải là hình vuông 1:1, tuyệt đối không để ô mẫu thành hình chữ nhật làm méo mó biến dạng ảnh khi xuất vector.
  - BẬT 'Cắt Bounding Box': Lấy mẫu và xuất vector đúng vùng Bounding Box (`Cols × Rows`).
  - TẮT 'Cắt Bounding Box': Ô vuông kích thước chuẩn đó trải đều ra toàn bộ ảnh và xuất vector toàn bộ ảnh.

---

## 10. Quy tắc Xóa bỏ Triệt để (Clean Code - Cấm Ẩn Nửa Vời)
- Khi loại bỏ hoặc không dùng bất kỳ thành phần giao diện, nút bấm, class CSS hay logic nào (ví dụ cụm nút tọa độ X, Y, Nudge, Shrink/Expand), BẮT BUỘC phải xóa bỏ dứt điểm hoàn toàn khỏi HTML, CSS và JavaScript. Tương tác Bounding Box chỉ thực hiện trực tiếp trên Viewport canvas.
- Tuyệt đối CẤM giữ lại code thừa rồi override kiểu `display: none`, `background: none`, `opacity: 0` hay comment tạm bợ làm rác codebase.

---

## 11. Quy tắc Lưu Trữ Lịch Sử Offline Nguyên Bản & Phục Hồi Độ Phân Giải Gốc (History Parity)
- **Lưu ảnh gốc nguyên bản đầy đủ độ phân giải (`fullImage`)**:
  - Trong IndexedDB, mỗi mục lịch sử BẮT BUỘC phải lưu ảnh gốc nguyên bản đầy đủ độ phân giải (`fullImage`), giữ nguyên 100% kích thước ($W \times H$) và tỉ lệ khung hình ban đầu.
  - Thumbnail nhỏ (96px) CHỈ dùng để hiển thị icon xem trước trên thanh bên (Sidebar Gallery).
- **Khôi phục ảnh chuẩn xác 100%**:
  - Khi người dùng bấm vào một mục lịch sử, hệ thống BẮT BUỘC phải nạp từ `item.fullImage` (ảnh gốc nguyên bản), TUYỆT ĐỐI CẤM lấy ảnh thumbnail 96×96 để khôi phục làm bể hạt, mất độ phân giải và méo mó tỉ lệ ảnh.
  - Tự động nạp lại toàn bộ cấu hình cài đặt (`settings`) tương ứng của ảnh khi phục hồi từ lịch sử.

---

## 12. Quy chuẩn Kích thước Xuất file Đồng nhất (SVG & PNG Export Parity)
- **Dùng chung Pixel Size chuẩn**:
  - Cả SVG và PNG xuất ra đều chia sẻ chung một thuộc tính kích thước ô pixel (`blockSize`, giá trị mặc định luôn là **10px**).
  - Kích thước xuất ra ($W \times H$) của SVG và PNG bắt buộc phải trùng khớp 1:1 ($W = Cols \times blockSize$, $H = Rows \times blockSize$), không được lệch nhau.
- **Bảng thông số kích thước gọn gàng**:
  - Tại bảng thông tin bên cạnh (Stats panel), chỉ hiển thị duy nhất một trường kích thước: `Kích thước xuất: ...px × ...px` (Export Dimensions).
  - Phía dưới hiển thị riêng dung lượng ước tính của từng định dạng: Dung lượng SVG (`... KB`) và Dung lượng PNG (`... KB`).

---

## 13. Quy chuẩn Hiển thị Giao diện theo Ngữ cảnh (Contextual UI Visibility & Stage Controls)
- **Ẩn Panel Cài đặt khi chưa có ảnh (Tab Chuyển đổi)**:
  - Ở tab Chuyển đổi ảnh (`convert`), khi người dùng chưa tải ảnh lên, toàn bộ bảng điều khiển cài đặt (Settings Panel) ở thanh bên phải BẮT BUỘC phải ẩn đi. Chỉ hiển thị vùng trống chờ ảnh (Empty State) ở giữa để người dùng không bị ngợp giao diện.
- **Vùng chờ chọn ảnh (Stage Empty State) 2 cột trực quan**:
  - Tiêu đề trung tâm: "Kéo thả hoặc Nhấp để chọn ảnh".
  - Bên dưới chia thành 2 cột hướng dẫn riêng biệt:
    + Cột 1: "Ảnh Mã QR sang Vector QR" (Mô tả định dạng hỗ trợ: PNG, JPG, WEBP, GIF, SVG).
    + Cột 2: "Ảnh 8bit sang 8bit Vector" (Mô tả định dạng hỗ trợ: PNG, JPG, WEBP, GIF, BMP).
- **Thanh chuyển chế độ phụ (Stage Submode Pill)**:
  - Bố trí cách biệt bên dưới `split-pane-header`, không để cấn hoặc đè lên header.
  - Nếu ảnh tải lên không phát hiện mã QR, thanh chuyển đổi submode này tự động ẩn đi để tránh gây rối mắt và nhầm lẫn.

---

## 14. Quy chuẩn Quản lý Lịch sử Độc lập & Vòng đời Cài đặt (History Quota & Individual Snapshot Lifecycle)
- **Dung lượng & Vòng đời (30 ảnh FIFO)**:
  - Quản lý tối đa **30 ảnh** trong IndexedDB theo cơ chế hàng đợi FIFO (First-In, First-Out). Khi lưu ảnh thứ 31, ảnh cũ nhất tự động được giải phóng để bảo vệ bộ nhớ.
  - Mỗi thẻ thumbnail lịch sử phải có nút xóa nhanh ($\times$) ở góc trên để người dùng chủ động xóa từng ảnh tùy ý.
- **Cách ly Cài đặt Độc lập từng Ảnh (Per-item Settings Isolation)**:
  - Mỗi mục trong lịch sử lưu trữ toàn bộ bộ cài đặt độc lập riêng biệt của chính nó: Số Cột (`cols`), Số Hàng (`rows`), Tọa độ Bounding Box (`bbox`), Trạng thái Cắt theo Bounding Box (`cropToBbox`), Bộ lọc Bảng màu (`maxColors`), Phong cách Vector (`vectorStyle`), Bán kính bo góc (`radius`), Kích thước ô (`blockSize`), Khoảng cách (`gap`), Xếp tầng khối đặc lót đáy (`layeredSolids`), Ngưỡng bao bọc (`enclosureThreshold`) và các cài đặt QR (`ecc`, `style`, `markers`, `logo`).
- **Tự động lưu cập nhật (Debounced Auto-Save)**:
  - Mọi thao tác người dùng tinh chỉnh trên ảnh đang kích hoạt (kéo thanh trượt, đổi style, chỉnh Bounding Box...) tự động lưu cập nhật vào bản ghi tương ứng của ảnh đó trong IndexedDB (áp dụng debounce 300ms để tránh thắt cổ chai I/O).
- **Phục hồi trung thực (No Auto-Detect Overwrite on Restore)**:
  - Khi người dùng nhấp chọn qua lại giữa các ảnh trong lịch sử, hệ thống BẮT BUỘC nạp trực tiếp bộ cài đặt đã lưu trong snapshot của ảnh đó.
  - TUYỆT ĐỐI KHÔNG tự ý gọi lại các hàm auto-detect (`autoDetectBbox`, `autoEstimateGrid`, `autoDetectPaletteOnly`) khi phục hồi từ lịch sử, đảm bảo không bao giờ ghi đè hoặc làm mất các thông số người dùng đã cất công căn chỉnh.

---

## 15. Quy chuẩn Nút "Tự Động Lưới" Nổi Trên Bounding Box (On-Screen Bbox Action)
- **Kích hoạt tức thì sau khi chỉnh Bounding Box**:
  - Khi người dùng hoàn thành thao tác kéo/chỉnh Bounding Box (`onBboxCommit`), hệ thống hiển thị một nút nổi "✨ Tự động Lưới" ngay phía trên khung Bounding Box trong vùng vẽ.
- **Tái sử dụng 100% logic hiện tại**:
  - Khi bấm nút nổi, gọi trực tiếp hàm `pixelArtHandler.autoEstimateGrid(true)`, tuyệt đối không viết mới logic tính toán lưới. Bấm xong nút tự ẩn ngay lập tức.
- **Vòng đời 5 giây tự động ẩn (5s Auto-Hide)**:
  - Nút tự động fade out và ẩn đi sau đúng 5 giây nếu người dùng không thao tác. Nếu người dùng bắt đầu kéo Bounding Box lại, nút ẩn ngay và reset chu kỳ đếm giờ.

---

## 16. Quy chuẩn Cách ly Ranh giới Module & Chống Lỗi Chéo (Zero-Regression Isolation)
- **Phân định 5 Domain độc lập**:
  - Domain 1: *Tạo mã QR (`generate`)* - Form nhập liệu, kiểu dáng QR độc lập hoàn toàn.
  - Domain 2: *Chuyển đổi QR (`convert:qr`)* - Bộ quét và tái tạo QR matrix.
  - Domain 3: *Chuyển đổi 8-Bit Pixel Art (`convert:pixelart`)* - Bộ lưới, bảng màu và vector hóa pixel art.
  - Domain 4: *Thanh thông số (Inspector Panels)* - Thuần túy là Read-Only Display, cấm gọi ngược làm lặp pipeline.
  - Domain 5: *Dịch vụ dùng chung (`common/`)* - Viewport, History, DomUtils.
- **Chặn đứng nghẽn luồng khi Paste ảnh màn hình**:
  - Sự kiện Paste (`Ctrl + V`) phải kiểm tra `target`: Nếu đang gõ text trong `input`/`textarea` (tab Tạo mã QR), tuyệt đối không chặn sự kiện và không chuyển tab.
  - `QrScanner.scan` bắt buộc tự động thu nhỏ ảnh xuống ngưỡng an toàn ($\le 800$px) trước khi đưa vào thư viện JS quét QR, triệt tiêu 100% hiện tượng treo CPU khi paste ảnh chụp màn hình 1080p/2K/4K.



