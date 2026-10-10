# 📚 KIẾN TRÚC HỆ THỐNG SCRIPT ENGINE - BOOK FORGE BY MAX
> Tài liệu kỹ thuật chi tiết về toàn bộ các module xử lý (37 scripts) trong Book Forge by Max.  
> Phiên bản: **v1.0 (Beta)** | Ngôn ngữ: **JavaScript (Node.js Engine)**

---

## 🗺️ TỔNG QUAN QUY TRÌNH XỬ LÝ (PIPELINE WORKFLOW)

Quá trình xử lý sách trong Book Forge được chia thành 7 nhóm module nối tiếp nhau:

```
[File PDF Gốc]
      │
      ▼
┌────────────────────────────────────────────────────────┐
│ NHÓM 04: BÓC TÁCH ẢNH & ĐỒ HỌA TRƯỚC (04__image_...)  │
└────────────────────────────────────────────────────────┘
      │ (Tạo thư mục images/ và _images_metadata.json)
      ▼
┌────────────────────────────────────────────────────────┐
│ NHÓM 01: HÌNH HỌC 2D & CHUẨN HÓA KÝ TỰ (01__pdf_geom..)│
│          - Cào token, de-spacing, sửa lỗi font {|}~    │
│          - Gom dòng, phát hiện Drop Cap, đo lề trang   │
└────────────────────────────────────────────────────────┘
      │
      ▼
┌────────────────────────────────────────────────────────┐
│ NHÓM 02: PHÂN TÍCH MỤC LỤC & CẤU TRÚC (02__toc_parser)│
└────────────────────────────────────────────────────────┘
      │
      ▼
┌────────────────────────────────────────────────────────┐
│ NHÓM 03: DỰNG ĐỊNH DẠNG MARKDOWN (03__rich_markdown...)│
│          - Heading, In đậm/nghiêng, Footnote, Chú thích│
└────────────────────────────────────────────────────────┘
      │
      ▼
┌────────────────────────────────────────────────────────┐
│ NHÓM 05: TÁCH CHƯƠNG & XUẤT RA DỰ ÁN (05__chapter_...) │
└────────────────────────────────────────────────────────┘
      │ (Tạo các file chương trong chapters_original/)
      ▼
┌────────────────────────────────────────────────────────┐
│ NHÓM 06: BIÊN DỊCH VÀ KHỚP ẢNH DỊCH (06__book_compiler)│
└────────────────────────────────────────────────────────┘
      │ (Tạo file Book_original.md hoặc Book_translated.md)
      ▼
┌────────────────────────────────────────────────────────┐
│ NHÓM 07: NHÀ IN SỐ & XUẤT BẢN PDF (07__pdf_publisher) │
│          - Headless Browser, Bìa, Gáy sách, Mục lục in │
└────────────────────────────────────────────────────────┘
      │
      ▼
[File PDF Sách Thành Phẩm Xuất Bản Hoàn Chỉnh]
```

---

## 📂 CHI TIẾT CÁC NHÓM SCRIPT

---

### 1️⃣ NHÓM 01: HÌNH HỌC 2D & BÓC TÁCH KÝ TỰ THÔ
*Nhiệm vụ: Phân tích lưới tọa độ không gian 2D trên trang PDF, bóc tách ký tự thô và dọn dẹp sạch sẽ lỗi font ngay tại cửa ngõ.*

#### ⭐ Script Lớn (Điều phối):
* **`01__pdf_geometry.js`** *(2D Geometry Engine Coordinator)*:
  - Đầu vào: Đối tượng tài liệu PDF (`doc`), đường dẫn file và thư mục dự án.
  - Quét qua từng trang, xây dựng bản đồ font chữ, tải hộp tọa độ đồ họa từ Nhóm 04.
  - Gọi tuần tự các script nhỏ 01 bên dưới để biến dữ liệu thô từ PDF thành các dòng văn bản đã phân loại cấu trúc.

#### 🧩 Các Script Nhỏ (Module chức năng bên trong):
* **`01_token_extractor.js`** *(Raw Token Extractor & Filter)*:
  - Bóc tách từng token chữ kèm tọa độ thực `(x, y, width, height, fontSize)`.
  - Loại bỏ các chữ nằm đè bên trong hình ảnh/vector (dùng dữ liệu từ Nhóm 04).
  - **Tự động chữa lành font CMap lỗi** (`repairCorruptedPdfAccents`): Biến các ký tự dị dạng `{ | } ~` thành `à, á, â, ã`.
  - **Tách từ tiếng Việt bị dính** (`splitGluedVietnameseWords`): Tự động bóc tách các tiếng/từ bị dính chùm (như `xuấtbản` -> `xuất bản`, `phẩmcủa` -> `phẩm của`, `chọnlọcnội` -> `chọn lọc nội`) do font tracking âm hoặc lỗi bố cục trang PDF.
  - Tự động học từ vựng (NLP Dynamic Learner) và gỡ lỗi giãn cách chữ (De-spacing) có rào chắn bảo vệ ngôn ngữ (Language Guard).
* **`01_line_grouper.js`** *(2D Line Grouper & Clusterer)*:
  - Gom các token chữ nằm rải rác trên cùng một cao độ `y` thành một dòng văn bản hoàn chỉnh.
  - Sắp xếp thứ tự đọc tự nhiên từ trái sang phải, từ trên xuống dưới.
* **`01_font_analyzer.js`** *(Font Statistics & Dominance Analyzer)*:
  - Phân tích tần suất cỡ chữ trên toàn bộ cuốn sách để tìm ra cỡ chữ chuẩn của thân bài (Dominant Body Font Size, thường là 10pt–12pt).
  - Phân loại font chữ đậm (Bold), chữ nghiêng (Italic) phục vụ nhận diện tiêu đề.
* **`01_margin_calibrator.js`** *(Dynamic Margin & Running Header Filter)*:
  - Tính toán độ rộng lề trên, lề dưới, lề trái, lề phải của từng trang sách.
  - Tự động nhận diện và loại bỏ tiêu đề đầu trang lặp lại (Running Headers) và số trang (Page Numbers) ở chân trang để không bị lẫn vào nội dung chương.
* **`01_drop_cap_resolver.js`** *(Drop Cap & Initial Letter Resolver)*:
  - Nhận diện chữ hoa to đầu đoạn (Drop Cap) chiếm từ 2–4 dòng văn bản (dù là dạng chữ hay dạng ảnh).
  - Tự động ghép chữ cái đầu to này liền mạch lại với phần còn lại của từ (ví dụ: chữ "T" to + "ôi" -> ghép thành "Tôi").
* **`01_sub_sup_detector.js`** *(Subscript & Superscript Detector)*:
  - Đo độ lệch tọa độ `y` và tỷ lệ thu nhỏ cỡ chữ để phát hiện chỉ số trên (số mũ, số footnote như `cm²`, `E=mc²`, `chữ¹`) và chỉ số dưới (`H₂O`, `CO₂`).
* **`01_graphics_loader.js`** *(Graphics Metadata Reader)*:
  - Đọc file `_images_metadata.json` từ Nhóm 04 để cung cấp tọa độ các vùng có hình vẽ, biểu đồ cho `01_token_extractor.js`.

---

### 2️⃣ NHÓM 02: PHÂN TÍCH MỤC LỤC & CẤU TRÚC PHÂN CẤP
*Nhiệm vụ: Phát hiện cấu trúc mục lục gốc của sách để định hướng phân chia chương.*

#### ⭐ Script Lớn:
* **`02__toc_parser.js`** *(Table of Contents Analyzer)*:
  - Tự động lùng sục các trang đầu cuốn sách để tìm trang Mục lục (dựa trên các từ khóa: `Mục lục`, `Table of Contents`, `Contents`...).
  - Bóc tách danh sách các chương, tiêu đề cấp con, và số trang tương ứng.
  - Xây dựng cây phân cấp H1, H2, H3 làm "kim chỉ nam" cho Nhóm 05 cắt chương chuẩn xác 100%.

---

### 3️⃣ NHÓM 03: DỰNG ĐỊNH DẠNG MARKDOWN CHẤT LƯỢNG CAO
*Nhiệm vụ: Biến văn bản hình học thô thành tài liệu Markdown giàu ngữ nghĩa.*

#### ⭐ Script Lớn (Điều phối):
* **`03__rich_markdown_formatter.js`** *(Rich Markdown Generator)*:
  - Chuyển đổi các dòng văn bản thành cú pháp Markdown: tiêu đề (`#`, `##`), in đậm (`**`), in nghiêng (`*`), trích dẫn (`>`).
  - Gắn thẻ HTML trang trí cho chữ to đầu dòng: `<span class="drop-cap">T</span>ôi...`.
  - Tích hợp bộ dọn dẹp ngữ pháp và chuẩn hóa Unicode cuối cùng.

#### 🧩 Các Script Nhỏ:
* **`03_footnote_engine.js`** *(Footnote Parser & Re-linker)*:
  - Quét phần đáy của từng trang để phát hiện các dòng chú thích chân trang (Footnotes).
  - Tự động gắn cờ liên kết giữa vị trí trỏ trên bài viết và nội dung chú thích ở cuối bài theo chuẩn Markdown: `[^1]`.

---

### 4️⃣ NHÓM 04: BÓC TÁCH HÌNH ẢNH & ĐỒ HỌA ĐA LUỒNG
*Nhiệm vụ: Cào toàn bộ tranh ảnh, sơ đồ, biểu đồ, trang bìa với chất lượng cao nhất.*

#### ⭐ Script Lớn (Điều phối):
* **`04__image_extractor.js`** *(Master Image & Graphics Pipeline)*:
  - Điểm khởi động quá trình cào ảnh, tạo thư mục `images/` trong dự án.
  - Kích hoạt song song các luồng bóc tách ảnh raster, đồ họa vector và ảnh bìa.

#### 🧩 Các Script Nhỏ:
* **`04_raster_stream.js`** *(Raster Image Stream)*: Trích xuất ảnh bitmap nén (JPEG, PNG) nhúng trong luồng dữ liệu PDF.
* **`04_vector_stream.js`** *(Vector Graphics Stream)*: Trích xuất các nét vẽ hình học (SVG paths, đường thẳng, đa giác) thường thấy ở biểu đồ, bảng vẽ kỹ thuật.
* **`04_hybrid_stream.js`** *(Hybrid Vector/Raster Cluster Stream)*: Xử lý các cụm ảnh phức tạp đan xen giữa ảnh chụp và đường viền vector.
* **`04_cover_stream.js`** *(Book Cover Extractor)*: Tự động nhận diện trang bìa trước (Front Cover) dựa trên kích thước, mật độ màu và vị trí trang 1 để xuất ra file `cover.png` sắc nét nhất.
* **`04_clustering.js`** *(Spatial Density Clusterer - DBSCAN)*: Gom cụm các mảnh vector nhỏ rời rạc (icon, logo, hình vẽ nhiều chi tiết) thành một bức tranh duy nhất.
* **`04_spatial_matrix.js`** *(2D Spatial Matrix)*: Đo đạc vị trí không gian để biết bức ảnh này nằm sau đoạn văn bản nào, nằm giữa dòng hay chiếm trọn trang.
* **`04_filters.js`** *(Garbage Graphic Filters)*: Lọc bỏ ảnh rác (các vạch kẻ phân cách trang, viền trang trí nhỏ, logo lặp lại gây nhiễu).
* **`04_metadata_manager.js`** *(Image Metadata Manager)*: Ghi dữ liệu vị trí và tên file ảnh vào `_images_metadata.json`.
* **`04_renderer.js`** *(Puppeteer/PDF Viewport Canvas Renderer)*: Chụp lại vùng đồ họa phức tạp khi không thể bóc tách thô bằng lệnh nhị phân.

---

### 5️⃣ NHÓM 05: TÁCH CHƯƠNG & XUẤT RA DỰ ÁN
*Nhiệm vụ: Nhận diện ranh giới từng chương và cắt sách thành các file Markdown độc lập.*

#### ⭐ Script Lớn (Điều phối):
* **`05__chapter_extractor.js`** *(End-to-End Book Extractor)*:
  - Script chạy chính khi người dùng bấm "Extract" trên ứng dụng Book Forge.
  - Nối kết Nhóm 01, 02, 03, 04 lại với nhau: trích xuất toàn bộ text, phân tích tiêu đề, ghép ảnh vào đúng vị trí văn bản và xuất các chương ra thư mục `chapters_original/`.

#### 🧩 Các Script Nhỏ:
* **`05_toc_filter.js`** *(TOC Matcher & Chapter Gatekeeper)*:
  - Đối chiếu tiêu đề tìm được trên trang với bảng mục lục từ Nhóm 02 để đảm bảo không bị cắt chương bừa bãi.
* **`05_md_chapter_splitter.js`** *(Markdown Chapter Splitter)*:
  - Script phụ trợ cho phép cắt một file Markdown tổng duy nhất thành từng file chương riêng rẽ dựa trên ngưỡng số lượng ký tự hoặc cấp độ Heading.

---

### 6️⃣ NHÓM 06: BIÊN DỊCH VÀ KHỚP ẢNH DỊCH
*Nhiệm vụ: Tổng hợp các chương đã dịch/gốc thành một file sách hoàn chỉnh trước khi in.*

#### ⭐ Script Lớn:
* **`06__book_compiler.js`** *(Master Book Markdown Compiler)*:
  - Gom toàn bộ các file chương từ `chapters_original/` hoặc `chapters_translated/` theo đúng thứ tự.
  - Tự động nạp file thông tin sách `_HEADER-original.md` / `_HEADER-translated.md` và `_TRANSLATOR_NOTE.md`.
  - Xuất ra file duy nhất: `Book_original.md` hoặc `Book_translated.md`.

#### 🧩 Các Script Nhỏ:
* **`06_translated_image_resolver.js`** *(Translated Image Matcher)*:
  - Kiểm tra xem hình ảnh trong chương dịch có bản ảnh dịch tiếng Việt tương ứng chưa (ví dụ sơ đồ có chữ tiếng Việt). Nếu có thì trỏ đến ảnh mới, nếu chưa thì giữ nguyên ảnh gốc.

---

### 7️⃣ NHÓM 07: NHÀ IN SỐ & XUẤT BẢN PDF CHUYÊN NGHIỆP
*Nhiệm vụ: Biến file Markdown tổng thành sách PDF in ấn đạt tiêu chuẩn nhà xuất bản.*

#### ⭐ Script Lớn:
* **`07__pdf_publisher.js`** *(Digital Print Publisher Engine)*:
  - Script chạy chính khi người dùng bấm "Publish PDF".
  - Mở trình duyệt Microsoft Edge (hoặc Chrome) ở chế độ ẩn (Headless) qua Puppeteer.
  - Nạp template CSS/HTML, dàn trang sách, xử lý ngắt trang mượt mà và xuất ra file PDF chất lượng cao.

#### 🧩 Các Script Nhỏ:
* **`07_cover_engine.js`** *(Cover & Front Matter Engine)*: Dựng trang bìa, trang lót (Half-title), trang thông tin xuất bản và lời tựa.
* **`07_toc_engine.js`** *(Print Table of Contents Engine)*: Tự động đo số trang thực tế của bản in để sinh ra trang Mục lục in ấn có số trang chuẩn xác 100%.
* **`07_gutter_engine.js`** *(Gutter & Mirrored Margin Engine)*: Tạo lề đóng gáy (Gutter) so le giữa trang chẵn và trang lẻ, đảm bảo đóng sách không bị kẹp mất chữ.
* **`07_header_engine.js`** *(Running Header & Footer Engine)*: Đánh số trang và in tên sách / tên chương so le trên đỉnh trang.
* **`07_image_layout_engine.js`** *(Print Image Layout Engine)*: Căn chỉnh hình ảnh theo khổ giấy (A4, A5, B5...), chống tràn lề và chống gãy trang vô duyên.
* **`07_outline_engine.js`** *(PDF Bookmark/Outline Injector)*: Dùng `pdf-lib` nhúng cây mục lục Bookmark điện tử vào file PDF thành phẩm.

---

### 🛠️ THƯ VIỆN TIỆN ÍCH DÙNG CHUNG (SHARED UTILITIES)

* **`diacritic_normalizer.js`** *(Universal Diacritic, Syllable & Glyph Sanitizer)*:
  - Chuẩn hóa Unicode NFC toàn diện.
  - Sửa lỗi font PDF shifted `{|}~` thành `à, á, â, ã` (`repairCorruptedPdfAccents`).
  - **Tách từ tiếng Việt dính chùm** (`splitGluedVietnameseWords`): Áp dụng quy tắc ngữ âm tiếng Việt (cặp phụ âm bất khả thi, bán âm cuối / nguyên âm đôi mở kết hợp phụ âm đầu độc lập) để tách chuẩn xác các từ bị dính mà không ảnh hưởng từ tiếng Anh hay từ đơn âm.
  - Recombine dấu rời rạc (`e´ -> é`, `aˆ -> â`).
  - Mở rộng ligatures (`ﬁ -> fi`, `ﬂ -> fl`) và sửa lỗi ký tự `MM`.
* **`browser_launcher.js`** *(Robust Puppeteer Edge Launcher)*:
  - Khởi chạy Microsoft Edge có sẵn trên Windows với user-data-dir cô lập, tắt tính năng Startup Boost để tránh xung đột tiến trình và tự giải phóng RAM khi in xong.
* **`word_segmenter_EN.js`** *(NLP English Vocabulary & De-spacing Engine)*:
  - Nhận diện ranh giới từ vựng tiếng Anh / Latin khi PDF bị lỗi giãn cách chữ (letter-spacing) ở tiêu đề bằng thuật toán quy hoạch động Scored DP.
  - **Rào chắn bảo vệ tiếng Việt** (Vietnamese Language Guard): Tự động phát hiện và bỏ qua 100% các chuỗi có dấu tiếng Việt, ngăn chặn hoàn toàn việc gom nhầm hay nuốt mất khoảng trắng giữa các từ tiếng Việt.
* **`audit_pdf_vs_md.js`** *(Audit Integrity Verifier)*:
  - Công cụ kiểm toán so sánh tổng số từ giữa PDF gốc và file Markdown để phát hiện rò rỉ hoặc thiếu chữ.

---

> 💡 **Ghi chú**: Tất cả 37 script trên đều là module độc lập (CommonJS), được đóng gói 100% trong `for_zip/script/` và hoạt động hoàn toàn offline thông qua Node.js runtime.
