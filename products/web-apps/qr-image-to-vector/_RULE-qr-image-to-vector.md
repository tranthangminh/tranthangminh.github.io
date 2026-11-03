# QR/Image to Vector & 8-Bit Pixel Art - Toàn Bộ Quy Chuẩn & Kiến Trúc Dự Án

Tài liệu quy chuẩn kỹ thuật cho ứng dụng **QR/Image to Vector & 8-Bit Pixel Art** (`products/web-apps/qr-image-to-vector`).
Mọi thay đổi code hoặc bảo trì tính năng trong thư mục này BẮT BUỘC tuân thủ các quy tắc phân tầng dưới đây:

---

## I. QUY CHUẨN NỀN TẢNG (CORE ARCHITECTURE)

### 1.1. Giới hạn độ dài file (< 500 lines)
- **Tuyệt đối không có file nào $\ge 500$ dòng** (theo `_MAX-RULES.md` và `_RULE-web-apps.md`).
- Khi file tiến gần mốc 450 dòng, phải tái cấu trúc, tách module vào thư mục `pipeline/` hoặc trích xuất UI helper riêng.

### 1.2. Chuẩn 100% Vanilla JS & Không phụ thuộc Framework
- Toàn bộ codebase sử dụng JavaScript thuần (ES6+), không đưa vào các thư viện build hay framework cồng kềnh.

### 1.3. Theme Tokens (100% CSS Variables từ `common/theme.css`)
- 100% màu sắc, bo góc, transition, đổ bóng phải sử dụng CSS Variables từ `../../common/theme.css` (`var(--bg-primary)`, `var(--accent-primary)`, `var(--border-color)...`).
- Không hardcode màu hex tùy tiện trong stylesheet.

### 1.4. Quy tắc Xóa bỏ Triệt để (Clean Code - Cấm Ẩn Nửa Vời)
- Khi loại bỏ hoặc không dùng bất kỳ thành phần giao diện, nút bấm, class CSS hay logic nào (ví dụ cụm nút tọa độ X, Y, Nudge, Shrink/Expand), BẮT BUỘC phải xóa bỏ dứt điểm hoàn toàn khỏi HTML, CSS và JavaScript. Tương tác Bounding Box chỉ thực hiện trực tiếp trên Viewport canvas.
- Tuyệt đối CẤM giữ lại code thừa rồi override kiểu `display: none`, `background: none`, `opacity: 0` hay comment tạm bợ làm rác codebase.

### 1.5. Phân định Ranh giới 5 Domain Độc lập (Zero-Regression)
- **Domain 1**: *Tạo mã QR (`generate`)* - Form nhập liệu, kiểu dáng QR độc lập hoàn toàn.
- **Domain 2**: *Chuyển đổi QR (`convert:qr`)* - Bộ quét và tái tạo QR matrix.
- **Domain 3**: *Chuyển đổi 8-Bit Pixel Art (`convert:pixelart`)* - Bộ lưới, bảng màu và vector hóa pixel art.
- **Domain 4**: *Thanh thông số (Inspector Panels)* - Thuần túy là Read-Only Display, cấm gọi ngược làm lặp pipeline.
- **Domain 5**: *Dịch vụ dùng chung (`common/`)* - Viewport, History, DomUtils.

---

## II. DỊCH VỤ DÙNG CHUNG (COMMON SERVICES - `common/`)

### 2.1. Quản lý Lịch sử Độc lập (`history-manager.js`)
- **Dung lượng & Vòng đời (30 ảnh FIFO)**:
  - Quản lý tối đa **30 ảnh** trong IndexedDB theo cơ chế hàng đợi FIFO (First-In, First-Out). Khi lưu ảnh thứ 31, ảnh cũ nhất tự động được giải phóng để bảo vệ bộ nhớ.
  - Mỗi thẻ thumbnail lịch sử phải có nút xóa nhanh ($\times$) ở góc trên để người dùng chủ động xóa từng ảnh tùy ý.
- **Lưu ảnh gốc nguyên bản đầy đủ độ phân giải (`fullImage`)**:
  - Trong IndexedDB, mỗi mục lịch sử BẮT BUỘC phải lưu ảnh gốc nguyên bản đầy đủ độ phân giải (`fullImage`), giữ nguyên 100% kích thước ($W \times H$) và tỉ lệ khung hình ban đầu.
  - Thumbnail nhỏ (96px) CHỈ dùng để hiển thị icon xem trước trên thanh bên (Sidebar Gallery).
- **Cơ chế Ép Lưu Ngay Lập Tức (`flushPendingSave`)**:
  - Khi người dùng nhấp đổi ảnh trong danh sách lịch sử, hệ thống BẮT BUỘC phải gọi `flushPendingSave()` để lưu ngay lập tức các thanh trượt đang kéo dở của ảnh hiện tại vào IndexedDB trước khi chuyển sang ảnh mới, triệt tiêu 100% hiện tượng mất setting do timer debounce.
- **Khôi phục ảnh trung thực 100% (No Auto-Detect on Restore)**:
  - Khi người dùng bấm vào một mục lịch sử, hệ thống nạp từ `item.fullImage` và nạp trực tiếp bộ cài đặt đã lưu trong snapshot của ảnh đó.
  - TUYỆT ĐỐI KHÔNG tự ý gọi lại các hàm auto-detect (`autoDetectBbox`, `autoEstimateGrid`, `autoDetectPaletteOnly`) khi phục hồi từ lịch sử.
  - Khóa cờ `this._isRestoring = true` trong suốt quá trình nạp để ngăn chặn việc ghi đè rác ngược vào IndexedDB.

### 2.2. Điều khiển Stage Viewport (`stage-viewport-controller.js`)
- Quản lý Pan/Zoom canvas độc lập, hỗ trợ phím Space + kéo chuột, cuộn chuột để zoom và phím tắt số 0 để reset zoom 100%.

### 2.3. Quy chuẩn Kích thước Xuất Đồng nhất (SVG & PNG Parity)
- **Dùng chung Pixel Size chuẩn**:
  - Cả SVG và PNG xuất ra đều chia sẻ chung một thuộc tính kích thước ô pixel (`blockSize`, giá trị mặc định luôn là **10px**).
  - Kích thước xuất ra ($W \times H$) của SVG và PNG bắt buộc phải trùng khớp 1:1 ($W = Cols \times blockSize$, $H = Rows \times blockSize$), không được lệch nhau.
- **Bảng thông số kích thước gọn gàng**:
  - Tại bảng thông tin bên cạnh (Stats panel), chỉ hiển thị duy nhất một trường kích thước: `Kích thước xuất: ...px × ...px` (Export Dimensions).
  - Phía dưới hiển thị riêng dung lượng ước tính của từng định dạng: Dung lượng SVG (`... KB`) và Dung lượng PNG (`... KB`).

### 2.4. Cơ chế Hoàn tác & Làm lại (Undo / Redo Architecture)
- **Kiến trúc Snapshot Stack độc lập**:
  - Quản lý `undoStack` (tối đa 25 bước) và `redoStack` độc lập trong session.
  - Tọa độ Bounding Box được làm tròn số nguyên (`Math.round`), triệt tiêu sai số dấu phẩy động làm hỏng so sánh snapshot.
  - Reset stack sạch sẽ (`undoStack = [s]`, `redoStack = []`) khi nạp ảnh mới hoặc khi phục hồi từ History, ngăn ngừa undo nhầm sang ảnh khác.
- **Thứ tự thực thi an toàn trong `restoreSnapshot()`**:
  - Khóa cờ `this._isRestoring = true` trong suốt quá trình khôi phục.
  - Gán toàn bộ thông số (`bbox`, `cols`, `rows`, `cropToBbox`, `lockSquare`) TRƯỚC KHI kích hoạt `_updateGridLimits()`.
  - Cấm tự động gọi `_syncLockedRowsFromCols()` hay clamp sai lệch khi đang restore.
- **Trigger lưu Snapshot**: Lưu khi thả chuột kéo BBox (`onBboxCommit`), khi nhả thanh trượt (`change` event), khi đổi Style hoặc khi kích hoạt các nút Auto.
- **Phím tắt & UI**: Hỗ trợ <kbd>Ctrl</kbd>+<kbd>Z</kbd> (Undo), <kbd>Ctrl</kbd>+<kbd>Y</kbd> / <kbd>Ctrl</kbd>+<kbd>Shift</kbd>+<kbd>Z</kbd> (Redo) và cặp nút ↩ / ↪ trên Stage Toolbar. Tự động cập nhật `disabled` trạng thái của 2 nút bấm theo độ dài của stack.

### 2.5. Bộ Hiển Thị Vector Dùng Chung (`stage-svg-renderer.js`)
- **Tập trung hóa Engine hiển thị SVG**: Cả 3 chế độ (QR/Image to Vector, Pixel Art 8-Bit, và Tạo mã QR) bắt buộc dùng chung module `window.StageSvgRenderer.render(wrapper, svgString, width, height)`.
- **Cơ chế khóa tỷ lệ linh hoạt (Zero-Overflow CSS)**:
  - Khung bao `#svgDisplayWrapper` tự động fit theo `aspect-ratio: var(--svg-aspect-ratio)` và `max-width: 100%`, `max-height: 100%`.
  - Khung hiển thị bám khít 100% viền vector SVG, triệt tiêu hoàn toàn khoảng thừa và hiện tượng dải màu nền đỏ tràn màn hình.
  - Bảo lưu thuộc tính chiều cao khi ở Split-Screen (không xóa đè `wrapper.style.height`).

### 2.6. Đồng Bộ Thanh Tiêu Đề Stage (`.stage-header-bar`) & Cố Định Submode Pill
- **Quy chuẩn Thanh Tiêu Đề Chung 36px**: Cả 3 chế độ (Mã QR, Pixel Art 8-Bit, Tạo mã QR) đều chia sẻ chung một quy chuẩn thanh Header (`.stage-header-bar`, `.qr-decoded-banner`, `.split-pane-header`) cao đúng **36px** (`height: 36px; box-sizing: border-box; padding: 0 16px; background: var(--bg-secondary); border-bottom: 1px solid var(--border-color);`).
- **Cố định Tọa độ Submode Pill Bất Biến ($Y = 46$px)**: Nút `stage-submode-pill` luôn luôn ở tọa độ $Y = 46$px tính từ đỉnh Stage trong cả chế độ QR và Pixel Art, triệt tiêu 100% hiện tượng nhảy giật vị trí khi bấm đổi qua lại giữa Mã QR và Pixel Art.

---

## III. TAB CHUYỂN ĐỔI ẢNH (TAB `CONVERT`)

### 3.1. Giao diện & Ngữ cảnh Chung
- **Ẩn Panel Cài đặt khi chưa có ảnh**:
  - Ở tab Chuyển đổi ảnh (`convert`), khi người dùng chưa tải ảnh lên, toàn bộ bảng điều khiển cài đặt (Settings Panel) ở thanh bên phải BẮT BUỘC phải ẩn đi. Chỉ hiển thị vùng trống chờ ảnh (Empty State) ở giữa để người dùng không bị ngợp giao diện.
- **Vùng chờ chọn ảnh (Stage Empty State) 2 cột trực quan**:
  - Tiêu đề trung tâm: "Kéo thả hoặc Nhấp để chọn ảnh".
  - Bên dưới chia thành 2 cột hướng dẫn riêng biệt:
    + Cột 1: "Ảnh Mã QR sang Vector QR" (Mô tả định dạng hỗ trợ: PNG, JPG, WEBP, GIF, SVG).
    + Cột 2: "Ảnh 8bit sang 8bit Vector" (Mô tả định dạng hỗ trợ: PNG, JPG, WEBP, GIF, BMP).
- **Thanh chuyển chế độ phụ (Stage Submode Pill) - Cố định khi ảnh có mã QR**:
  - Khi ảnh tải lên **có mã QR hợp lệ** (`currentDecodedText`), thanh pill "Mã QR" / "Pixel Art (8-Bit)" **LUÔN LUÔN HIỂN THỊ** dù đang ở tab xem QR hay Pixel Art để người dùng tự do chuyển đổi qua lại hai chiều.
  - Khi ảnh tải lên **không có mã QR**, thanh pill tự động ẩn hoàn toàn (`display: none`) và ứng dụng mặc định ở chế độ Pixel Art.
- **Chống nghẽn luồng khi Paste ảnh (Downscaling & Async Yield)**:
  - `QrScanner.scan` bắt buộc tự động thu nhỏ ảnh xuống ngưỡng an toàn ($\le 800$px) trước khi đưa vào thư viện JS quét QR, triệt tiêu 100% hiện tượng treo CPU khi paste ảnh chụp màn hình 1080p/2K/4K.
  - Thêm `pasteLock` (600ms) để ngăn sự kiện dán gửi liên tiếp nhiều lần.

### 3.2. Phân Hệ 1: Mã QR Sang Vector QR (`convert:qr`)
- **Quét đa tầng (Dual-Engine)**:
  - Tự động ưu tiên `BarcodeDetector` phần cứng, dự phòng bằng `jsQR` thuần JS.
- **Bảo toàn tiếng Việt UTF-8 có dấu**:
  - Quét QR và Tạo QR (9 định dạng) phải hoạt động 100% không suy hao với tiếng Việt UTF-8 (`stringToBytesFuncs['UTF-8']`).
- **Tự động nâng cấp ECC Level H khi chèn Logo**:
  - Khi có logo trung tâm, ma trận QR tự động kích hoạt mức sửa lỗi cao nhất (Level H - 30%).
- **Dọn dẹp trạng thái triệt để khi đổi sang Pixel Art**:
  - Khi chuyển từ QR sang Pixel Art hoặc ngược lại, bắt buộc xóa sạch `currentDecodedText = ''`, ẩn banner giải mã QR, và gọi `pixelArtHandler.deactivate()` để dọn dẹp giao diện chia đôi split-screen, không để hình ảnh của hai chế độ dính đè lên nhau.

- **Chế độ màu QR (`colorMode`: `solid` | `duo` | `gradient`)** — UI ở thẻ `#colorCard`, trạng thái do `qr-color-controls.js` (`QrColorControls`) giữ, vẽ do `pipeline/05b-vectorizer-paint.js` (`QrPaint`):
  - `solid` (1 màu): đường vẽ cũ, SVG phải giống hệt trước đây (không `<defs>`, 1 path). CẤM đổi output của chế độ này.
  - `duo` (2 màu): tách 3 mắt định vị (vùng 7×7 ở 3 góc) khỏi thân QR, vẽ 2 path riêng bằng cùng bộ vẽ (liền/tách/block rời, bo góc); 1 màu cho cả ring lẫn tâm mắt, 3 mắt cùng màu (`eyeColor`).
  - `gradient`: màu 1 = `fgColor`, màu 2 = `gradColor`; `gradType` `linear` (góc `gradAngle`, 0° = trái→phải, tăng theo chiều kim đồng hồ) hoặc `radial` (từ tâm ra); gradient phủ đúng vùng mã QR (không tính viền trắng). `gradEyes` bật thì mắt chạy theo gradient, tắt thì mắt giữ `eyeColor`.
  - `gradPerShape` (mỗi khối vector 1 màu): mỗi khối vector (đường bao liền kèm các lỗ của nó, theo đúng kiểu nối đang chọn: 8-connected, 4-connected, hoặc từng module ở chế độ block rời) là 1 path phẳng 1 màu, lấy màu gradient tại trọng tâm khối (làm tròn 64 nấc, các khối cùng nấc gộp chung 1 path nên tối đa 64 path). Không dùng `clipPath`, không chia nhỏ khối theo module.
  - Thứ tự hàng trong thẻ: Màu mã QR (= gradient màu 1) → Màu gradient 2 → Màu 3 góc → Kiểu gradient → Góc → Mỗi khối vector 1 màu → Mắt theo gradient (gradient màu 1 và 2 luôn kế nhau).
  - Nút đổi chỗ màu gradient 1 và 2 (`#btnSwapGradColors`) nằm ở hàng "Màu gradient 2"; màu 1 là `fgColor` (do `fgColorPicker` giữ) nên việc đổi chỗ nằm ở `QrColorControls.swapGradColors()`, không viết lại ở nơi khác.
  - Cảnh báo tương phản: khi màu vẽ module (màu QR, màu 3 góc nếu đang dùng, màu gradient 2) có độ tương phản WCAG < 3:1 so với màu nền, hiện 1 toast cam (`.toast.is-warning`, 4.5s); chỉ báo mỗi lần chuyển từ ổn sang kém, không chặn. Nền trong suốt thì bỏ qua (không biết nền thật).
  - Cài đặt Margin và Khoảng cách block nằm chung thẻ "Tùy Chỉnh Vector" (cùng nút "Đặt lại"); không còn thẻ "Cài Đặt Mở Rộng" riêng.
  - Hàng không áp dụng ở chế độ đang chọn dùng `is-disabled`, không ẩn (tránh nhảy sidebar). Cài đặt lưu cùng `qr_image_to_vector_settings` và settings của mục lịch sử QR; thiếu field thì mặc định `solid`.

### 3.3. Phân Hệ 2: Ảnh 8-Bit Sang Vector 8-Bit (`convert:pixelart`)
- **Thanh công cụ pane Ảnh gốc (`.pixelart-pane-toolbar`)**: Tìm Object, Chọn Ảnh (góc trên trái) và Lưới Tự Động, Hiện/Ẩn Lưới (góc trên phải) nằm ở đây, KHÔNG đặt lại trong thẻ cài đặt bên trái. Hai nhóm nút BÁM THEO ẢNH (không theo viewport): ghim ngay ngoài góc trên trái / trên phải của ảnh, đi theo zoom/pan, kích thước nút không scale; vị trí tính từ tọa độ màn hình trong `_positionToolbar`, cập nhật qua `MutationObserver` trên `gridContainer`, `ResizeObserver` và `renderGridCanvas`; hết chỗ thì kẹp vào mép pane. Đệm trên 48px ở CẢ HAI pane để ảnh gốc và vector luôn thẳng hàng; hằng `PANE_TOOLBAR_HEIGHT` trong `pixelart-handler.js` phải khớp phần đệm thêm này. `showGrid` vẫn nằm trong snapshot undo/history.
- **Vector cùng tỉ lệ hiển thị với ảnh gốc**: kích thước vector trên màn hình luôn = vùng nguồn tương ứng × cùng tỉ lệ px/px của ảnh gốc (bật Cắt theo Khung: bbox 40×40 trên ảnh 160×160 thì vector chỉ bằng 1/4 cạnh ảnh gốc; tắt thì bằng cả ảnh). Tính trong `_syncVectorSize()` (gọi từ `_syncContentDimensions` và `renderVector`), cấm gán chiều cao `svgWrapper` bằng chiều cao cả ảnh.
- **Vector trùng vị trí bbox**: khi bật Cắt theo Khung và xem song song, vector nằm đúng chỗ bbox nằm trong pane Ảnh gốc (lệch khỏi tâm pane = lệch tâm bbox khỏi tâm ảnh × tỉ lệ hiển thị). Độ lệch đặt qua `StageViewportController.setOffset` (cộng vào pan và nhân theo zoom); cấm dùng `left/top`/CSS `translate` vì không nhân theo zoom nên vector sẽ trôi khỏi bbox khi zoom. Tắt cắt hoặc xem chỉ Vector thì độ lệch = 0.
- **Spacing thẻ cài đặt**: lấy QR làm chuẩn (tiêu đề → nội dung 12px, giữa các hàng điều khiển 9px, giữa các thẻ 14px, đệm thẻ 14px). Thẻ Pixel Art dùng đúng class `.card` như QR, cấm thêm `gap`/margin riêng cho thẻ Pixel Art.
- **Khóa An Toàn Chống Tràn Lưới (Safety Grid Clamp $\le 256$ ô)**:
  - Khi công tắc 'Cắt theo Bounding Box' tắt (`cropToBbox = false`), số cột/hàng Bbox tối đa được tính bằng $\min(256, \lfloor 256 \times (W_{bbox} / W_{img}) \rfloor)$.
  - Đảm bảo lưới phóng chiếu ra toàn ảnh TUYỆT ĐỐI không bao giờ vượt quá 256 cột hoặc 256 hàng, triệt tiêu 100% nguy cơ tràn bộ nhớ và treo máy khi người dùng kéo Bounding Box quá nhỏ.
  - Tự động hạ Cột/Hàng về mức an toàn và hiện Toast cảnh báo khi Bbox bị co nhỏ.
- **Tỉ lệ Cột/Hàng 1:1 theo Bounding Box**:
  - Tỉ lệ Cột (Cols) và Hàng (Rows) BẮT BUỘC luôn luôn tính theo kích thước Bounding Box ($W_{bbox} : H_{bbox}$), dù công tắc 'Cắt theo Bounding Box' bật (ON) hay tắt (OFF).
  - Đồng bộ 2 chiều: Chỉnh Cột $\rightarrow$ Hàng tính lại theo BBox; Chỉnh Hàng $\rightarrow$ Cột tính lại theo BBox; Kéo BBox $\rightarrow$ Cột/Hàng cập nhật theo BBox mới.
  - Ô mẫu vuông 1:1 không méo mó: Mỗi ô lưới gióng pixel art trên ảnh gốc bắt buộc phải là hình vuông 1:1.
- **Bố cục Setting Tinh gọn (Toolstrip & Dual Switch Row)**:
  - Cụm thao tác nhanh (`Tìm Object`, `Chọn Ảnh`, `Lưới Tự Động`) gom thành một thanh Toolstrip 3 nút ngang liền kề, không kèm icon rườm rà.
  - 2 tùy chọn `Khóa Tỷ Lệ` và `Cắt theo Khung` gom thành hàng 2 thẻ switch dạng card nằm ngang, tiết kiệm 50% diện tích dọc.
- **Đường lưới gióng vật lý 1px màn hình (Khử $Zoom^2$)**:
  - Đường lưới gióng pixel art hiển thị trên ảnh gốc phải luôn luôn mỏng đúng 1px màn hình, bất kể cấp độ zoom.
  - Buffer canvas được cấp phát theo `offsetWidth * zoom * dpr` để 1 canvas pixel = 1 physical screen pixel.
- **Cân bằng Split-Screen 1:1 giữa Ảnh gốc và Vector (`baseH`)**:
  - Hai nửa màn hình chia đôi (Trái: Ảnh gốc + Lưới, Phải: Vector SVG kết quả) phải có cùng chiều cao hiển thị vật lý 100%.
  - Cả `gridContainer` và `svgWrapper` bắt buộc khóa cùng `height: ${baseH}px`, `width: auto` để `aspect-ratio` tự tính toán, triệt tiêu triệt để hiện tượng lệch chiều cao đỉnh/đáy.
- **Bộ Lọc Lưới Rìa Ngoài $\ge 60\%$ (Drop Edge Slivers $< 0.6$)**:
  - Khi phóng chiếu lưới toàn ảnh (`projectFullImageGrid`), khoảng cách dư thừa từ mép Bbox tới 4 biên ảnh chỉ được sinh ô lưới mới nếu phần dư đạt tối thiểu **60% ($\ge 0.6$)** kích thước ô thực tế.
  - Bất kỳ mẩu mép vụn nào $< 0.6$ đều bị cắt bỏ, ngăn chặn hoàn toàn việc sinh dải ô vuông trắng rác ở rìa ảnh vector.
- **Tối Giản Kiểu Vector Trong Pixel Art**:
  - Cụm 3 nút chọn kiểu hiển thị được lược bỏ hoàn toàn khỏi tab Pixel Art (chỉ giữ trong Mã QR và Tạo QR).
  - Tự động hóa: Khi `Khoảng hở Pixel Block = 0%`, mặc định vector hóa gộp khối đa giác mượt (`unified-connected`). Khi `Khoảng hở Pixel Block > 0%`, tự động xuất từng khối pixel rời (`blocks`) có khe hở.
  - Khi `Khoảng hở Pixel Block > 0%`, Layered Solids bị khóa hiệu lực (nhánh flat, UI `is-disabled`, giá trị đã lưu không đổi): mỗi ô pixel chỉ xuất đúng 1 khối đúng 1 màu của nó, không chồng layer. Kéo khoảng hở về 0% thì trả lại Layered Solids + connect 8.
  - Vết hở 1px thỉnh thoảng thấy giữa các màu liền kề là do antialias lộ lớp lót phía dưới. CẤM vá bằng `stroke` cùng màu trên path: đã thử (round và miter), làm góc/ranh block bị thô và SVG xuất ra bị thêm viền. Chưa có cách sạch hơn.
  - CẤM xuất sọc scanlines ngang (RLE stripes).
- **Mặc định Gộp nhóm cùng màu (`Group by Color`) = TẮT** (constructor, HTML, vectorizer và fallback khi khôi phục lịch sử cũ thiếu field).
- **Chỉnh màu Greyscale / HSL (`pipeline/02b-pixelart-color-adjust.js`)**:
  - Áp lên bảng màu SAU bước quantize (`basePalette` → `currentPalette`), không đụng ảnh gốc, `matrix`, topology hay số màu Best/detected; ô trong suốt không đổi.
  - Greyscale dùng luma Rec.601 và khóa Hue/Saturation (`is-disabled`). Hue −180…180°, Saturation và Lightness −100…100.
  - 4 giá trị (`greyscale`, `hueShift`, `satShift`, `lightShift`) nằm trong snapshot undo/redo và history; thiếu field thì mặc định tắt/0. Nạp ảnh mới reset về mặc định.
- **Xếp tầng khối đặc lót đáy (Layered Solid Matryoshka)**:
  - Tự động phát hiện quan hệ bao bọc (Enclosure Tree). Đắp đặc toàn bộ pixel của các đảo con vào mặt nạ đảo cha.
  - Mỗi đảo cha chỉ được xuất ra ĐÚNG 1 thẻ `<path>` duy nhất. Sắp xếp Z-Index: Đảo cha vẽ trước $\rightarrow$ đảo con vẽ đè lên trên.
  - Khi tắt switch, sử dụng class `is-disabled` (giữ nguyên layout height, khóa slider) để triệt tiêu 100% hiện tượng nhảy thanh cuộn sidebar.
- **Nút "Lưới Tự Động" Cố Định Viewport (Thụt 100px từ đỉnh)**:
  - Nút "Lưới Tự Động" (không icon) được định vị cố định tại `top: 100px; left: 50%; transform: translateX(-50%)` bên trong viewport pane ảnh gốc.
  - Giữ nguyên vị trí và kích thước vật lý 100% khi zoom hoặc khi di chuyển Bounding Box.
- **Ưu Tiên Tuyệt Đối Space + Drag Để Pan**:
  - Khi nhấn giữ Space, `overlayCanvas` nhường toàn quyền bubble sự kiện cho Stage Viewport Pan, cho phép kéo di chuyển màn hình trơn tru ngay cả khi con trỏ chuột nằm trên ảnh.
- **Bảng phím tắt HUD (Layout 2 hàng & Căn lề chuẩn)**:
  - Bố cục bắt buộc chia thành 2 hàng dọc (`flex-direction: column`):
    + Hàng 1 (trên cùng): Tiêu đề "⌨️ Phím Tắt & Thao Tác" kèm nút thu gọn `▾`.
    + Hàng 2 (bên dưới): Danh sách các phím tắt và mô tả thao tác.
  - Từng dòng thao tác: **Mô tả căn trái** (`.shortcut-desc`), **Phím tắt căn phải** (`.shortcut-keys`). Bỏ phím tắt số 0.
  - **Single Source of Truth:** danh sách phím tắt chỉ định nghĩa ở `common/shortcuts.js` (`QrShortcuts`), dropdown Phím Tắt (`#shortcutsHudBody`) và trang cuối modal Hướng Dẫn đều render từ đó. Thêm/đổi phím tắt chỉ sửa đúng 1 chỗ (kèm key i18n `hud.*`), cấm hardcode dòng phím tắt vào HTML hay JS khác.
  - Thứ tự chuẩn: Ảnh mới (`Ctrl+V` / Drag), Kéo / Resize box, Di chuyển vùng nhìn (`Space+Drag` / Middle Drag), Thu phóng (`Wheel`), Đổi chế độ xem (`Y`), Hoàn tác (`Ctrl+Z`), Làm lại (`Ctrl+Y`).

---

## IV. TAB TẠO MÃ QR MỚI (TAB `GENERATE`)

### 4.1. 9 Kiểu Dữ liệu QR Code độc lập
- Hỗ trợ đầy đủ: Văn bản, URL, Wi-Fi, Danh thiếp (vCard), Email, Điện thoại, SMS, Vị trí (Geo), Sự kiện (Calendar).

### 4.2. Form nhập liệu riêng biệt và cô lập sự kiện
- Khi người dùng đang nhập liệu hoặc dán (`paste`) văn bản trong các ô input/textarea của tab Tạo mã QR, sự kiện dán ảnh của Stage bị bỏ qua hoàn toàn, không chuyển tab bất ngờ.

### 4.3. Chèn Logo Trung Tâm
- Hỗ trợ chèn logo ảnh và vector SVG vào tâm mã QR với độ an toàn cao, tự động chừa lề (margin) và nâng ECC lên Level H.

### 4.4. Tái Sử Dụng Stage Header Banner (`#qrDecodedBanner`)
- Cả tab Chuyển Đổi Ảnh và Tạo Mã QR đều dùng chung 100% thanh header bar `#qrDecodedBanner` và hàm `displayDecodedInfo(payload)`.
- Cập nhật thời gian thực nội dung mã QR, tag phân loại (`URL`, `EMAIL`, `WIFI`,...) và các nút tác vụ (`Mở liên kết`, `Sao chép`).
- Tuyệt đối không tạo banner tĩnh hay badge thừa (`URL • SVG`).

---

## V. BẢNG THÔNG SỐ BÊN HÔNG (INSPECTOR PANELS)

### 5.1. Nguyên tắc Read-Only Tuyệt đối
- Bảng thông số bên phải chỉ đóng vai trò hiển thị dữ liệu (`textContent`), tuyệt đối không can thiệp hay gọi ngược lại luồng pipeline để tránh vòng lặp vô tận.

### 5.2. Gom Nhóm Thẻ Đơn Nhất Kèm Divider (`#statsCard`)
- Thẻ Thông Số Vector và Dữ Liệu Giải Mã được gộp chung vào một thẻ duy nhất (`#statsCard`), phân tách bởi `.stats-divider` (đồng bộ cấu trúc với Thông Số Pixel Art).
- Nửa trên (Thông số Vector): `Kích thước xuất`, `Kích thước Pixel Block`, `Độ phân giải lưới`, `Đường bao vector`.
- Divider: `.stats-divider`.
- Nửa dưới (Dữ liệu QR): `Độ dài` và `Nội dung QR`.
- Xóa bỏ triệt để câu mô tả tiếp thị thừa ("Vector phóng to không giới hạn, không vỡ hạt, sẵn sàng in ấn và thiết kế.") trên toàn bộ các thẻ thông số.

### 5.3. Format hiển thị Đồng nhất
- Chỉ hiển thị một dòng kích thước xuất duy nhất (`Kích thước xuất: ...px × ...px`).
- Hiển thị riêng dung lượng ước tính của từng định dạng: Dung lượng SVG (`... KB`) và Dung lượng PNG (`... KB`).

---

## VI. GIAO DIỆN KHỞI ĐẦU VÀ ĐIỀU HƯỚNG TAB (EMPTY STATE & TABS)

### 6.1. Chuẩn Hóa Tên Tab
- Tab 1: `QR/Ảnh -> Vector` (EN: `QR/Image -> Vector`).
- Tab 2: `Tạo Mã QR` (EN: `Create QR`).

### 6.2. Cấu Trúc Dual Cards Trong Empty State
- Màn hình khởi đầu (`#stageEmptyState`) bố trí 2 thẻ đối xứng kèm nhãn phân cách `"hoặc"` (`"or"`):
  - **Thẻ 1** (`#emptyCardUpload`): Tải lên / kéo thả ảnh. Click mở hộp thoại file input.
  - **Chính giữa** (`.empty-divider`): Chữ `"hoặc"` nằm trong pill capsule.
  - **Thẻ 2** (`#emptyCardGenerate`): Tạo mã QR mới. Click chuyển ngay sang tab Tạo Mã QR (`setAppMode('generate')`).

### 6.3. Ưu Tiên Drag & Drop và Paste Toàn Cục Stage
- Vùng Stage Viewport bắt sự kiện `drop` và `paste` toàn cục.
- Kéo thả hoặc dán ảnh vào bất kỳ vị trí nào trên Stage (kể cả rơi trên Thẻ 2 Tạo Mã QR) đều tự động chuyển về chế độ Convert, quét nhận diện mã QR và tự động fallback sang Pixel Art nếu không có mã QR.

---

## VII. KIẾN TRÚC 4 FUNCTION ĐƯỜNG NỐI & SOLID LAYERS (PIPELINE)

### 7.1. Chuẩn Hóa 4 Function Hình Học & Topology
- **Function 1 (`render0Connected`)**: 0 đường nối (Block rời). Mỗi ô pixel là 1 hình vuông/bo góc rời rạc, hỗ trợ khoảng hở (`gapNorm`).
- **Function 2 (`extract4Connected`)**: 4 đường nối (Tách điểm). Chỉ nối 4 hướng cạnh (N, S, E, W), tách rời các đỉnh chéo tại ngã tư.
- **Function 3 (`extract8Connected`)**: 8 đường nối (Dính điểm). Nối cả cạnh lẫn đỉnh chéo thành đường bao đa giác mượt mà.
- **Function 4 (`buildSimilarityGraphAndSolidLayers`)**: Chuyên trị Pixel Art đa màu. Dựng bản đồ đường nối 8 hướng (Similarity Graph) $\rightarrow$ Tìm vùng khép kín $\rightarrow$ Đúc đặc ruột Solid Layers.

### 7.2. Giải Quyết 4 Edge Cases Trong Pixel Art
1. **Ngã tư chữ X $2 \times 2$ (Checkerboard)**: Áp dụng *Sparse Pixels Heuristic* trong cửa sổ $6 \times 6$. Màu nét viền mảnh (ít pixel hơn) thắng quyền nối chéo để khép kín vòng vây; mảng màu lớn hơn nhường.
2. **Topological Exterior Flood-Fill**: Lan truyền 4 hướng từ Nền ngoài. Hàng rào 8 hướng chặn đứng dòng nước, bắt trọn 100% cụm đa màu bên trong thành khối lót đáy (Silhouette).
3. **Ancestor-Assisted Peeling**: Phân tầng các chi tiết nội bộ dựa trên tiếp xúc với lớp vỏ tổ tiên và ngưỡng chu vi cài đặt (50% - 100%).
4. **Bảo Toàn Ô Trong Suốt**: Pixel `transparent` (`-1`) tuyệt đối không bao giờ bị lấp đặc, giữ nguyên vẹn các lỗ thủng nhìn xuyên nền.

---

## VIII. KIẾN TRÚC UNIFIED STAGE FOOTER BAR & HISTORY AUTO-RESET

### 8.1. Hợp Nhất Chân Màn Hình (Stage Footer Bar - Common 3 Chế Độ)
- Thay thế toàn bộ các floating bar rời rạc cũ (`.stage-action-bar`, `.stage-shortcuts-hud`, `.stage-toolbar`) bằng **Stage Footer Bar** duy nhất (`#stageFooterBar`) nằm cố định ở đáy `#stageViewport` (chiều cao 46px).
- Footer Bar được tái sử dụng đồng bộ (**COMMON**) cho cả 3 chế độ: `QR/Image to Vector`, `Pixel Art (8-Bit)`, và `Tạo Mã QR`:
  - **Trái**: Droplist Phím Tắt (`#btnToggleShortcutsHud`, `#shortcutsDropdownMenu`). Menu popover trồi lên trên, click ra ngoài tự đóng.
  - **Giữa**: 3 nút hành động (`#btnDownloadSvg`, `#btnDownloadPng`, `#btnCopySvg`) dùng chung 100% logic xuất qua `curSvg()` và `window.StageExporter`.
  - **Phải**: Cụm công cụ trực tiếp (`#btnUndo`, `#btnRedo`, vạch chia, `#btnZoomOut`, `#zoomLevelBadge`, `#btnZoomIn`, `#btnZoomReset`, vạch chia, `#btnToggleGrid`, `#btnToggleViewMode`).

### 8.2. Vòng Đời Đồng Bộ Header - Footer (Stage Lifecycle)
- Trạng thái của Footer Bar đi liền tuyệt đối với Header Bar:
  - `showStage()` (khi có tác phẩm/ảnh đang nạp) $\rightarrow$ Cả Header (`#qrDecodedBanner`) và Footer (`#stageFooterBar`) đều hiển thị (`display: flex`).
  - `hideStage()` (khi ở màn hình chờ / empty state) $\rightarrow$ Cả Header và Footer đều ẩn (`display: none`), giải phóng toàn bộ không gian cho Dual Empty Cards.

### 8.3. Cơ Chế Tự Động Trở Về Màn Hình Trống Khi Xóa Lịch Sử (Auto-Reset)
- Khi người dùng bấm xóa một tác phẩm trong panel Lịch Sử:
  - Nếu tác phẩm bị xóa trùng với tác phẩm đang mở trên màn hình (`item.id === HistoryManager.activeId`), callback `onActiveDeleted` được kích hoạt.
  - Hệ thống tự động kích hoạt `resetToEmptyState()`: giải phóng `currentImage = null`, reset `pixelArtHandler?.reset()`, dọn sạch canvas SVG và gọi `hideStage()`, đưa giao diện về trạng thái chờ nguyên bản.

---

## IX. QUY CHUẨN GIAO DIỆN PRO LIGHTROOM / CAMERA RAW (SIDEBARS & SLIDERS)

### 9.1. Cấu Trúc Control Group 1 Hàng 3 Cột
- Toàn bộ slider trong Control Panels tổ chức dạng CSS Grid 1 hàng duy nhất gồm 3 cột:
  - **Cột 1 (Nội dung / Label)**: 88px, font 11px, màu `text-secondary`, hỗ trợ xuống dòng tối đa 2 dòng khi text dài (`word-break: break-word`).
  - **Cột 2 (Slider / Stepper)**: Track thanh mảnh 3px màu tối `#383838`, con trượt thumb hình squircle chữ nhật trung tính (`#888888`, hover `#b5b5b5`, kích thước 10×14px).
  - **Cột 3 (Thông số / Badge)**: Ô số căn phải, font monospace 11px, màu `text-secondary` (`#bbbbbb`), nền tối bán trong suốt viền mảnh `#3a3a3a`.
- **Badge giá trị chỉnh được (`common/badge-editor.js`)**: mọi `.control-value-badge` điều khiển slider cùng `.control-group`. Click/Tab để gõ số (không cần đơn vị, tự lấy số đầu tiên), Enter hoặc blur để áp, Esc để hủy; gõ lố thì tự về giới hạn gần nhất (min/max, snap theo `step`). Cuộn chuột trên badge: lên = tăng, xuống = giảm một `step`. Giá trị luôn áp qua sự kiện `input`/`change` của slider nên các handler cũ không phải sửa; badge mới thêm vào HTML tự có hành vi này.
- Triệt tiêu màu mè lòe loẹt (không dùng cyan `#8DF2F2` hay red accent), duy trì phong cách đồ họa phòng lab chuyên nghiệp (Dark Neutral Studio).

### 9.2. Cấu Trúc Checkbox (Nội Dung ── Cần Gạt Switch)
- Các mục checkbox (`.toggle-row`, `.pixelart-switch-card`) bố trí cột đầu là nhãn nội dung, cột sau là cần gạt Switch phẳng (32×18px) căn sát lề phải.

### 9.3. Phân Tầng Inspector Panels (40% Thông Số / 60% Lịch Sử)
- Right Sidebar chia thành 2 vùng độc lập:
  - **Phần trên (`.inspector-section-stats`)**: Chiếm 40% chiều cao (`height: 40%`), cuộn độc lập (`overflow-y: auto`) hiển thị Thông Số Vector / Pixel Art.
  - **Phần dưới (`.inspector-section-history`)**: Chiếm 60% chiều cao (`height: 60%`), cuộn độc lập (`overflow-y: auto`) chứa Thư viện Lịch Sử tác phẩm.

- **Inspector không nhảy layout**: `#inspectorStatsSection` luôn chiếm sẵn 40% chiều cao (kể cả ở màn hình chờ, chỉ để trống), cấm ẩn/hiện theo trạng thái ảnh.
- **Ô `+` đầu danh sách Lịch Sử** (`.history-item-new`): luôn là mục đầu tiên, bấm là lưu ngay cài đặt đang kéo dở rồi về màn hình chờ mặc định (không xóa mục lịch sử nào, không hiện toast); sáng viền khi đang ở màn hình chờ.

### 9.4. Kích Thước Tab Chế Độ Chính (`.app-mode-switch`)
- Chiều cao cố định chuẩn **60px** (`height: 60px`), bo góc 8px, phân tách rõ ràng 2 nhánh tác vụ chính: `QR/Ảnh -> Vector` và `Tạo Mã QR`.

---

## IX. QUY TẮC SAU ĐỢT KIỂM TOÁN (WEB AUDIT)

- **i18n thuộc tính (`data-i18n-attr`)**: nhiều cặp phân tách bằng dấu chấm phẩy `;` (`title:tooltips.a;aria-label:tooltips.a`). Cấm dấu phẩy: bộ dịch sẽ bỏ qua cả hai thuộc tính. Khóa i18n không còn dùng phải xóa ở CẢ hai ngôn ngữ; khóa dựng động (`guide.step${n}Title`, `guide.altStep${n}`, `generator.*`) coi là đang dùng.
- **Escape dữ liệu người dùng**: giá trị đưa vào form tạo QR bằng `innerHTML` phải qua `escapeHtml` (hàm `v()` trong `qr-generator-types.js`). Cấm chèn chuỗi người dùng thô vào thuộc tính hay `<textarea>`.
- **Viewport**: không khóa zoom (`user-scalable=no`, `maximum-scale` bị cấm).
- **Modal (Hướng Dẫn)**: khi mở phải focus vào nút đầu, `Tab` bị khóa trong modal, `Esc` đóng và trả focus về nút đã mở; phím tắt toàn cục (Y, Ctrl+Z...) bị chặn khi modal mở (listener capture + `stopPropagation`).
- **Tên cho thanh trượt**: mỗi `input[type=range]` lấy `aria-label` từ nhãn của hàng (gán trong `applyTranslations`, chạy lại khi đổi ngôn ngữ). Nút chỉ có ký tự (`+`, `−`) bắt buộc có `aria-label`.
- **Màu & cỡ chữ trong CSS**: không dùng mã HEX thô (dùng `var(--token)`; riêng màu lưới Pixel Art là `--grid-accent`). Cỡ chữ nhỏ nhất 10px (micro) và 12px; không dùng 9, 10.5, 11, 11.5, 12.5. Trạng thái "mờ, không bấm được" dùng class `.is-disabled`, cấm viết `opacity`/`pointer-events` inline.
- **Dead code**: CSS class và khóa i18n không dùng phải xóa ngay (đã quét bằng script ở đợt kiểm toán này).
- **Icon đơn sắc**: file `.svg` nằm trong `svg/`, dùng qua CSS mask: `<span class="icon-mask icon-undo" aria-hidden="true"></span>`, định nghĩa trong `qr-image-to-vector-icons.css` (thêm icon mới = thêm file vào `svg/` + 1 dòng `.icon-<tên>`). Cấm vẽ `<svg>` / `<path>` tay trong HTML hay JS, cấm dùng emoji hay ký tự Unicode làm icon của nút. Icon đa sắc (`QR-8bit.svg`, `QR-add.svg`) giữ dạng `<img>`. Đổi chế độ xem (Y) đổi icon bằng cách đổi class `icon-split-view` / `icon-left-view` / `icon-right-view`. Còn dùng emoji: 💡 (Hướng Dẫn), ⌨️ (Phím Tắt), 🖼️ (nút Tải Logo), chờ icon mới.
- **Nền caro**: nút `#btnToggleGrid` (icon `icon-grid`) bật/tắt class `has-checkerboard` trên `.stage-viewport`; nền caro vẽ bằng `conic-gradient` từ token `--bg-secondary` để thấy vùng trong suốt của QR. Không lưu trạng thái.

---

## X. TÍNH NĂNG BỔ SUNG (ĐỢT NÂNG CẤP SAU KIỂM TOÁN)

- **Footer co theo bề rộng của chính nó** (`container: stage-footer / inline-size`): dưới 860px chữ của các nút Tải/Copy/Phím Tắt/Hướng Dẫn ẩn, chỉ còn icon (nút bắt buộc có `title` + `aria-label` qua `data-i18n-attr`); dưới 600px footer xuống dòng. Không dùng `@media` theo cửa sổ cho footer vì bề rộng khung xem phụ thuộc cả sidebar.
- **Kiểm tra quét QR** (`pipeline/06-qr-scan-check.js`, chip `#qrScanBadge` trong banner): sau mỗi lần vẽ vector QR (debounce 400ms) rasterize SVG trên nền trắng và giải mã lại, so với nội dung gốc. Chỉ dùng cho QR/Tạo mã, không dùng cho Pixel Art.
- **Mức sửa lỗi QR** (`eccLevel`: L/M/Q/H, mặc định M, nằm trong `DEFAULT_SETTINGS` và history). Có logo giữa thì `QrMatrixGenerator` ép H, nút bị khóa và hiện H. Đổi mức phải gọi `reconstructAndVectorize()` (matrix đổi), không chỉ vẽ lại.
- **Thẻ Xuất File** (`common/export-controls.js`, key `qr_image_to_vector_export`, KHÔNG nằm trong history): cỡ PNG 1×/2×/4× và cỡ in (mm). Có cỡ in: SVG ghi `width/height` bằng mm giữ nguyên `viewBox`, PNG xuất ở 300 DPI (`StageExporter.PRINT_DPI`), cạnh dài tối đa 8192px (`PngExporter.MAX_SIDE`).
- **Xuất hàng loạt** (`qr-batch.js`, `common/zip-writer.js`): danh sách nội dung (mỗi dòng 1 QR) hoặc nhiều ảnh có QR → 1 file ZIP gồm các SVG, dùng đúng style/ECC/logo hiện tại và cỡ in; tối đa 200 mục; ảnh không có QR bị bỏ qua và báo số lượng. ZIP chỉ lưu (không nén), không dùng thư viện.
- **Palette Pixel Art** (`pipeline/02c-pixelart-palette-edit.js`, `pixelart-palette-ui.js`): bảng màu mẫu (1-bit, Game Boy, C64, PICO-8, Sweetie 16), sửa màu, gộp màu. Mọi chỉnh sửa được khóa theo màu sau quantize (`baseHex`), nằm trong snapshot undo/history (`paletteEdits`) và xóa khi nạp ảnh mới. Gộp màu thật sự gộp chỉ số trong matrix (không chỉ đổi màu hiển thị). Có bảng mẫu thì thanh "Số lượng màu" bị khóa.
- **Vector hóa Pixel Art chạy trong Web Worker** (`pipeline/pixelart-worker.js`): hằng `PIXELART_WORKER_URL` trong `pixelart-handler.js` mang `?v=`; khi sửa bất kỳ file pipeline nào worker import (contours, fillet, topology, pixelart-vectorizer) phải tăng `?v=` này. Worker lỗi hoặc không có thì tự chạy trên luồng chính. `_vectorSeq` bỏ kết quả cũ khi có lần vẽ mới hơn.
- **Trang riêng tư** (`/privacy.html#app-qr-image-to-vector`): icon Privacy chuẩn trong header (`a.icon-btn` + `.icon-privacy` từ `common/web-app-icons.css`, xem `_RULE-web-apps.md` §5.6) và footer chung của site. Mục riêng của app trong `privacy.html` phải khớp code thật (lịch sử/cài đặt chỉ nằm trên máy, không gửi ảnh đi); app này không có đăng nhập. Base `.icon-mask` nằm ở `common/web-app-icons.css`, file `qr-image-to-vector-icons.css` chỉ khai báo icon riêng của app.
- **Kiểm thử**: `node products/web-apps/qr-image-to-vector/tests/run-tests.js` (logic thuần: QR round trip mọi mức ECC, vectorizer, palette, ZIP) và mở `tests/smoke.html` qua HTTP (14 kịch bản trên trình duyệt thật: quét QR, ECC, xuất mm/PNG, ZIP, palette, undo, vector trùng bbox, history). Sửa pipeline thì chạy cả hai.
- **Còn emoji làm icon**: 9 icon loại dữ liệu trong `qr-generator-types.js` (🌐 📝 📞...); chờ bộ icon mới.

---

## XI. RESPONSIVE: TABLET & PHONE

- **Mọi luật responsive nằm ở `qr-image-to-vector-responsive.css`, nạp CUỐI** (sau controls/pixelart). Lý do: luật `@media` đặt ở file nạp trước bị `width: 320px` của file nạp sau ghi đè (lỗi dải tối 70px bên phải trên phone). Không viết `@media` bố cục vào các file khác.
- **Ngưỡng:** từ 1250px: 3 cột (Cài đặt, Khung xem, Thông số + Lịch sử). Dưới 1250px (tablet và phone): hai panel gộp thành MỘT panel có thanh tab `Cài đặt / Thông số` (`.side-tabs`, `common/side-tabs.js`, nhớ tab trong `qr_image_to_vector_side_tab`). Hai `<aside>` giữ nguyên ID và nằm cùng một ô lưới, CSS bật/tắt theo `data-side-tab` trên `.app-layout`; không di chuyển hay nhân đôi phần tử.
- **Tablet (769–1249px):** panel trái 320px (có tab), khung xem bên phải; footer dính đáy (`position: sticky`) và `.main-stage` cuộn dọc khi hai pane xếp dọc.
- **Phone (≤768px):** thứ tự khung xem, thanh tab dính, nội dung panel; trang cuộn dọc; toast căn giữa đáy; icon Quyền riêng tư vẫn hiện trong header.
- **Pane Pixel Art luôn ≥ 1:1:** vùng vẽ của mỗi pane không bao giờ thấp hơn bề rộng. Khung xem tự đo bằng `container: main-stage / inline-size`: dưới 640px thì 2 pane xếp dọc và mỗi pane cao `100cqw + var(--pane-chrome)` (`--pane-chrome` = header 36px + dải công cụ 32px, giữ khớp `PANE_TOOLBAR_HEIGHT`). Từ 640px trở lên đứng cạnh nhau. Không dùng `@media` theo cửa sổ để chia pane vì bề rộng khung xem phụ thuộc sidebar.
- **Cảm ứng:** vùng bấm tối thiểu 44px và chữ ô nhập 16px khi `pointer: coarse`; bbox dùng Pointer Events (vùng bắt handle 26px cho ngón tay; ngón thứ hai hủy thao tác kéo box); `StageViewportController` có pinch hai ngón (zoom quanh điểm giữa) và chế độ di chuyển (`#btnPanMode`, chỉ hiện trên thiết bị cảm ứng) để kéo bằng một ngón. Vùng vẽ để `touch-action: pan-y` (một ngón cuộn trang), canvas bbox `touch-action: none`.
- **Chưa kiểm chứng trên máy thật:** pinch và kéo chỉ được thử bằng Pointer Events giả lập; cần thử trên điện thoại/máy tính bảng thật vì trình duyệt có thể hủy con trỏ khi cuộn.
- **Kiểm thử:** `tests/smoke.html` kiểm tra 360, 390, 768, 820, 1024, 1440px: không cuộn ngang, mỗi pane ≥ 1:1, tab đúng ngưỡng.