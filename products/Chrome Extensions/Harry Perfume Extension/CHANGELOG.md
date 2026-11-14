# Changelog

## 1.0.13

### Fixed
- Nước Hoa tab: the product detail card is laid out top to bottom again (name, badges, image and scent notes, similar scents, tags) instead of squeezed into one row. The Thống Kê product list used the same `.product-card` class and overrode it; its classes are now `.stats-product-card` and `.stats-product-card-*`.
- Mini Tools: the filter dropdown list follows the theme instead of showing white text on a white background.
- Nhập tab: editing a price or quantity no longer blanks the line totals and the order total. The status dropdown was read as "Hỏi Giá" because its text included every option.

### Added
- New Mini Tool "(M) Kiểm Tra Dung Tích" (Minh account only). Paste a list of product names (`Brand - Name - Type Nml`, or Excel columns `Name ⇥ 75 ⇥ 125`) with the Dán button or Ctrl + V. Lines with the same name are merged and checked against the Perfume tab's standard names (exact match, accents and case included) and `dungtich1..5`. The table shows # · Hình · Tên · DT1–DT5, each cell with the catalog value on top and the pasted value below. Pasted volumes sit under the matching catalog column; volumes the catalog doesn't have fill its empty columns in red. Unknown names get their own red row, and names that only differ by accents, case or spacing show the pasted name in gold with the catalog name above it. Chiết and Gốc lines are skipped and counted; divider lines containing `___` are skipped silently. Each line gives at most one volume (the number with ml first), and text in brackets after the volume or at the end of the line, such as `(Mẫu 2024)`, is ignored for both the volume and the name. Lines with Set, Gift Set or Giftset keep only the plain name and no volume. Same filter and counts as the other tools; no Copy button.
- Chuẩn hóa Tên file Nhập: when the product or capacity cell has "Set" as its own word (Set, Gift Set, Giftset, any case), Loại & Dung tích is just `Set` with no ml, and the row isn't flagged red for a missing volume. Words that only contain "set" (Settle, Caset, Sunset) don't count. "Giftset" is matched as the two words "gift set".
- Nhập tab: each bottle has its own note, saved to that row's note column on the Sheet. The note shows under the bottle's price line and stays hidden when empty. Search also looks in bottle notes. The Thêm đơn dialog has a note field on each product row instead of one shared note.

### Changed
- Nhập tab: clicking a product name box that already has text searches for that text right away (best match first, Enter picks it), instead of showing the A-Z list until a character is typed or deleted. An empty name box still shows the A-Z list. Applies to cards being edited and the Thêm đơn dialog.
- Nhập tab: the ml box only suggests the bottle's own volumes (dungtich1..5 from the Perfume tab, in column order) when the product name matches a bottle there. A new product name gets no suggestions instead of the catalog's common volumes. Chiết still suggests 5 / 10 / 20.
- New capacity type names across the Nhập tab and both Mini Tools: Full (boxed), Full Nobox (no box), Tester (boxed), Tester Nobox (no box), and Gốc Full / Gốc Full Nobox / Gốc Tester / Gốc Tester Nobox. They replace Fullbox / Full / Testerbox / Tester and Gốc Fullbox / Gốc Full / Gốc Testerbox / Gốc Tester. Lines with no type and 30ml or more now default to Full.
- Chuẩn hóa Tên file Nhập: the type comes from the earliest Refill / Tester / Full / Chiết keyword, then a no-box word (nobox, no box, không hộp, ko box, k box) anywhere in the line turns Tester or Full into its Nobox type. A no-box word on its own gives Full Nobox.
- Kiểm Tra Giá Vốn: `- Full`, `- Fullbox` and `- Full box` mean boxed and use the `giavonfull` cost; `- Tester`, `- Test`, `- Testerbox` and `- Tester box` mean boxed and use `giavontest`. `- Nobox`, `- No box`, or a no-box word after `- Full` / `- Tester` give Full Nobox / Tester Nobox, which have no cost column and stay empty. Lists written with the old meaning (`- Full` / `- Tester` = no box) now get a cost.
- Nhập tab: the type list still comes from the Sheet's `List-Dung tích` column. Old type names are renamed when a card is opened for editing and saved: Nobox / No Box → Full Nobox, Gốc Nobox → Gốc Full Nobox, Fullbox / Fullseal → Full, Testerbox → Tester, Gốc Fullbox → Gốc Full, Gốc Testerbox → Gốc Tester.
- Nhập tab: empty fields are left blank instead of showing "—". Dropdowns list the empty choice as "(Trống)" and show a blank box when it is selected.
- Nhập tab edit mode: plain-text hints without "+" (Người gửi, Tên sản phẩm, Giá, SL, Số ml, Ghi chú). Fields are really empty when blank, and the hint is only displayed. No icons inside dropdowns or edit fields; the 📅 and 👤 labels outside the fields stay. Edit fields have a soft background with no border, and a gold outline appears on hover or while typing.
- Nhập tab cards: calmer colors. The status color is now a 4px strip down the whole left edge plus a light tint on the card header, instead of a solid colored block. The payment border is thinner and softer. The four badges keep their own colors and all have the same fixed width.
- Nhập tab cards: one-column layout at every width. Narrow: the header has two rows (date and sender, then the four badges aligned right). Wide: the header is one row and each bottle takes one line, so cards with many bottles no longer stretch a tall left column. Bottles are separated by faint dashed lines instead of separate boxes, and the note and the order total share one footer row.
- Mini Tools: table headers (including "Hình") and both lines of the two-line cells are all 12.5px; red warning text is no longer bold.
- Mini Tools toolbar: Ảnh lớn, Nạp lại and Xóa trắng are icon-only 32×32 buttons, side by side at the far right in the order Ảnh → Nạp → Xóa (Kiểm Tra Giá Vốn has no Nạp lại). Ảnh lớn shows its on state with a gold border and icon, and the tooltip says Bật/Tắt. Buttons that need a second click turn red and show a "Bấm lần nữa để …" toast instead of changing their label.
- Kiểm Tra Giá Vốn: Input Vốn and Output Vốn share one right-aligned two-line column (Input on top, Output below: gold, green when it matches, red when it doesn't). Merge Vốn stays separate and uses the same 12.5px text.
- Mini Tools: both tools have the same row filter: Tất Cả, Đã Đúng (every result green), Cần Xem Xét (any gold result) and Cần Sửa (any red result). A row with both gold and red shows under both. Replaces the old Đã khớp / Chưa khớp / Cần xem lại filter in the name tool.
- Mini Tools: the toolbar counts now show the same four groups as plain text in two rows and two columns: Tất Cả, Đã Đúng / Cần Xem Xét, Cần Sửa. They replace the old dòng / khớp / chưa khớp / khớp giá counts.
- Mini Tools: the dashed line between the two lines of a cell (and of a header) is 50% fainter.
- Kiểm Tra Giá Vốn: a Vốn cell keeps both lines whenever it has an Input Vốn or an Output Vốn; the missing line stays blank (no "..." placeholder). Fully empty rows stay one line.
- Kiểm Tra Giá Vốn: the Vốn and Merge Vốn columns are wider so the Dán, X and Copy buttons stay on the same line as their titles.

## 1.0.12

### Added
- Mini Tools: items whose name starts with "(M)" are only shown to the Minh account; other accounts don't see them at all. New "(M) Data Sets" and "(M) Sapo Data" Google Sheet cards.
- The Minh account has its own admin password; Dương and Quân keep the existing one.

### Changed
- Name tool renamed "(M) Chuẩn hóa Tên file Nhập".
- Kiểm Tra Giá Vốn: Input Name and Output Name share one column with a two-line cell and header (Input editable on top, Output read-only below in gold, green on a 100% match). Input Vốn, Output Vốn and Merge Vốn stay separate.
- The two-line cell and header styles and `ToolShell.stackedCellHtml` moved to `mini-tools/common` so both tools use the same code.

### Fixed
- Mini Tools tables: the sticky header no longer leaves a thin gap where scrolled rows show through (tables now use separate cell borders).

## 1.0.11

### Changed
- Mini Tools (Kiểm Tra Giá Vốn, Chuẩn hóa Tên file Nhập): button emojis replaced with SVG icons from `svg/` - Copy `copy.svg` (square, icon only), clear column `close.svg` (square), Nạp lại `refresh.svg`, Ảnh lớn `images.svg`, Xóa trắng `delete.svg`, theme `light-mode.svg` / `dark-mode.svg`. The Dán buttons show text only.
- Chuẩn hóa Tên file Nhập: the capacity column is a fixed 180px so "Output Dung Tích" and its Copy button stay on one line.

## 1.0.10

### Changed
- Chuẩn hóa Tên file Nhập: product name and standard name now share one column, and capacity and Loại & Dung tích share another. Each cell has two lines: the top line is the editable Import value, the bottom line is the read-only result (red when unmatched or missing a volume). Columns: # · Ngày · Hình · Input/Output Sản phẩm · Input/Output Dung Tích · Giá · Khớp, with two-line headers (Input on top, Output with its Copy button below). Copy buttons in both Mini Tools windows are icon-only (📋) with a tooltip. Copy buttons still copy the results. Input lines use the secondary text color, result lines use gold, green when the result is exactly the same as the input (already standard), and red when flagged.

### Fixed
- Chuẩn hóa Tên file Nhập: the "Từ trùng ≥" threshold is now strict. It no longer drops to 1 when the product cell has a single word, which made `s` match `Penhaligon's - Sartorial EDT` (the apostrophe split off an "s").

## 1.0.9

### Fixed
- Chuẩn hóa Tên file Nhập: name matching ignores accents, so `Nishan Wulong Cha Extrait` matches `Nishane - Wūlóng Chá Extrait de Parfum` and `Narciso Ambree` matches `Narciso - Ambrée EDP`. The output still uses the catalog name with its accents.

## 1.0.8

### Added
- Chuẩn hóa Tên file Nhập: read-only Ngày and Giá columns from the Import tab. Column order is now # · Sản phẩm · Dung tích · Ngày · Hình · Tên chuẩn · Loại & Dung tích · Giá · Khớp, with Khớp fixed at 60px.

### Changed
- The large-image toggle is on by default and its label shows the state ("🖼️ Ảnh lớn: Bật / Tắt") in both tools.
- The Hình column keeps a fixed 52px width in both tools (name columns now take the remaining space).

### Fixed
- Large image preview showed an empty frame: the preview `<img>` had `src=""`, which fired an image error on load and the global broken-image handler hid it permanently.

## 1.0.7

### Added
- Cost Checker: rows whose Output Vốn does not match Input Vốn get a red border around the whole row.
- Name tool: image column and the "🖼️ Hiện ảnh lớn" hover preview (shared with Cost Checker through `ToolShell.initImagePreview`), plus a "Cần xem lại" filter.

### Changed
- Name tool renamed to "Chuẩn hóa Tên file Nhập" with a 🧹 icon.
- Unmatched rows return the original product name in the Tên chuẩn column (also when copied), shown in red with a red row border; Loại & Dung tích without a volume is also shown in red.
- Catalog volume is filled only for Fullbox / Full / Testerbox / Tester / Refill or untyped rows; Mini and Gốc without a volume stay empty and are flagged. Chiết without a number still defaults to 10ml.

### Fixed
- Name tool: decimal volumes like `Mini 7.5ml` are kept as typed (previously read as `5ml`).

## 1.0.6

### Changed
- Cost Checker opens much faster: table cells grow with CSS `field-sizing: content` instead of measuring each cell in JS (which forced a full table re-layout per cell).
- After the catalog loads, Cost Checker only refills the result cells instead of redrawing the whole table, so text being typed is not interrupted.
- Cell column headers renamed: Output Name, Input Name, Input Vốn, Output Vốn, Merge Vốn.

## 1.0.5

### Changed
- Cost Checker outputs the new type names: Fullbox (boxed), Full (no box), Testerbox (boxed), Tester (no box). Lines without a type keyword and ≥ 30ml default to Fullbox; Gốc without a subtype defaults to Gốc Fullbox.
- Cost lookup: Fullbox uses `giavonfull`, Testerbox uses `giavontest`; Full and Tester (no box) have no cost and stay empty.
- New input keywords `- Fullbox` and `- Testerbox`; the old `- Nobox` keyword is still read and output as Full.

### Fixed
- `testerbox` / `fullbox` are no longer misread as plain Tester / Full.

## 1.0.4

### Added
- Mini Tools: new "Chuẩn hóa Tên Nhập" window (moved from the standalone `products/Temp` matcher). It loads the standard names from the Perfume tab (`name` + `dungtich1`) and the Import tab's `Sản phẩm` + `Dung tích` columns in Sheet row order, all editable, and outputs the standard name plus `Type Nml` using Fullbox / Full / Testerbox / Tester.
- `mini-tools/common/` (`tool-base.css`, `tool-shell.js`): shared window layout, Excel-style table, theme toggle, toast and data loading for Mini Tools windows.
- `common/api-config.js`: single place for both Apps Script URLs.

### Changed
- Cost Checker now uses the shared Mini Tools files (no behavior change).
- Mini Tools cards open through one shared single-window opener.

### Fixed
- Cost Checker: "Merge" cells taken from Giá Recheck now switch to a readable color in Light mode (the old selector never matched).

### Removed
- `products/Temp` standalone matcher page.

## 1.0.3

### Changed
- Import tab: when editing a card or adding a package, the capacity field is split into a type picker (from the Sheet's `List-Dung tích` column) and a number box with a fixed `ml` suffix. Saved as `Type Nml` (e.g. `Full 100ml`, `Chiết 10ml`, `Gốc 35/50ml`).
- The number box only accepts digits, `/`, `.` and `,`; it suggests 5/10/20 for Chiết and the selected bottle's volumes otherwise.
- Old capacity values with unknown types (`Fullbox`, `Fullseal`, `No Box`) are kept as-is when a card is edited.

## 1.0.2

### Added
- Shared confirm dialog `confirmAction()` (`#confirmModal`) replacing the browser `confirm()` popups.
- `theme-init.js` applies the saved theme in `<head>` before the page paints.
- Import edits now send the original `ten` / `ngay` / `nguoi_gui` values; the Apps Script skips rows that changed on the Sheet and reports them as `conflicts`. Requires redeploying `google-apps-script-import.js`.

### Changed
- Panel and the Cost Checker window now share one theme setting.
- Product image lookup by name uses a cached index instead of scanning every product on each call.
- Removed redundant `typeof` guards for helpers that are always loaded.

### Fixed
- Refresh button stuck spinning on the first run without cache (and the next click cancelled instead of refreshing).
- An older cancelled refresh could clear the controller of a newer one; the 10-minute auto refresh no longer overlaps a running one.
- Theme flicker when opening the panel in Light mode.
- Logout now also clears the cached dropdown lists (`cachedImportLists`).
- Choosing an image over 20 MB alongside other images no longer leaves the upload preview unfinished.
- Validation messages in the Add Card form use toasts instead of `alert()`.
