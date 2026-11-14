/**
 * NAME-NORMALIZER.JS - Cửa sổ "Chuẩn hóa Tên file Nhập"
 * - Danh mục chuẩn: tự lấy cột name + dungtich1 của tab Nước Hoa (sửa được)
 * - Dữ liệu cần chuẩn hóa: tự lấy cột Sản phẩm + Dung tích của tab Nhập, xếp đúng theo số dòng trên Sheet
 *   (dòng trống giữ nguyên) để Copy cột kết quả dán thẳng vào dòng 2 trên Sheet Nhập
 * - Mọi ô nhập đều sửa được, tự lưu; nút Nạp lại lấy lại dữ liệu gốc (ghi đè phần đã sửa)
 * - Dòng chưa khớp tên / thiếu số ml: chữ đỏ + viền đỏ cả dòng; chưa khớp thì Tên chuẩn trả y nguyên tên Sản phẩm
 */
(function () {
  const { showToast } = ToolShell;

  const STORAGE_KEYS = {
    master: "nameNormalizerMaster",
    rows: "nameNormalizerRows",
    minWords: "nameNormalizerMinWords",
    showMaster: "nameNormalizerShowMaster",
    largeImage: "nameNormalizerShowLargeImage"
  };
  const MIN_ROWS = 25;
  const DEFAULT_MIN_WORDS = 2;

  const dbStatusBadge = document.getElementById("dbStatusBadge");
  const dbCountText = document.getElementById("dbCountText");
  const rowSummary = document.getElementById("rowSummary");
  const minWordsInput = document.getElementById("minWordsInput");
  const filterSelect = document.getElementById("filterSelect");
  const btnToggleMaster = document.getElementById("btnToggleMaster");
  const btnReload = document.getElementById("btnReload");
  const btnClearAll = document.getElementById("btnClearAll");
  const masterPane = document.getElementById("masterPane");
  const masterTableBody = document.getElementById("masterTableBody");
  const rowsTableBody = document.getElementById("rowsTableBody");
  const spreadsheetContainer = document.getElementById("spreadsheetContainer");

  let master = [];       // [{ name, volume }]
  let rows = [];         // [{ product, capacity }] - vị trí i tương ứng dòng i + 2 trên Sheet Nhập
  let results = [];      // Kết quả từng dòng (null = dòng trống)
  let masterItems = [];  // Danh mục đã tách từ khóa sẵn để so khớp
  let imageByName = new Map(); // tên chai (chữ thường) -> ảnh, lấy từ tab Nước Hoa
  let rowInfo = [];      // [{ date, price }] cột Ngày / Giá chỉ để xem, lấy từ tab Nhập theo số dòng Sheet (không lưu)
  let saveTimer = null;
  let recomputeTimer = null;
  // Lọc dòng theo màu kết quả (Tất Cả / Đã Đúng / Cần Xem Xét / Cần Sửa), dùng chung ToolShell
  const applyFilterToRow = ToolShell.initRowFilter(filterSelect, rowsTableBody);

  document.addEventListener("DOMContentLoaded", init);

  async function init() {
    ToolShell.initThemeToggle(document.getElementById("btnToggleTheme"), document.getElementById("themeIcon"));
    ToolShell.initImagePreview(spreadsheetContainer, document.getElementById("btnTogglePreview"), STORAGE_KEYS.largeImage);
    bindEvents();

    const [savedMaster, savedRows, savedMinWords, showMaster] = await Promise.all([
      StorageHelper.get(STORAGE_KEYS.master, null),
      StorageHelper.get(STORAGE_KEYS.rows, null),
      StorageHelper.get(STORAGE_KEYS.minWords, DEFAULT_MIN_WORDS),
      StorageHelper.get(STORAGE_KEYS.showMaster, false)
    ]);
    minWordsInput.value = savedMinWords;
    setMasterVisible(showMaster);

    // Có dữ liệu đã lưu (kể cả phần người dùng đã sửa) thì dùng lại; chưa có thì nạp từ tab Nước Hoa + Nhập
    if (Array.isArray(savedMaster) && Array.isArray(savedRows) && (savedMaster.length > 0 || savedRows.length > 0)) {
      master = savedMaster;
      rows = savedRows;
      const [products, importItems] = await Promise.all([
        ToolShell.loadProducts().catch(() => []),
        ToolShell.loadImportRows().catch(() => [])
      ]);
      buildImageIndex(products);
      buildRowInfo(importItems);
    } else {
      await loadFromSources();
    }
    renderAll();
  }

  // Nạp dữ liệu gốc: danh mục từ tab Nước Hoa, dòng cần chuẩn hóa từ tab Nhập
  async function loadFromSources() {
    dbCountText.innerText = "Đang nạp dữ liệu...";
    let products = [];
    let importItems = [];
    try {
      [products, importItems] = await Promise.all([ToolShell.loadProducts(), ToolShell.loadImportRows()]);
    } catch (e) {
      showToast("⚠️ Không tải được dữ liệu. Kiểm tra kết nối rồi bấm Nạp lại.", 4000);
    }

    buildImageIndex(products);
    buildRowInfo(importItems);
    master = products
      .map(p => ({ name: cleanString(p.name), volume: (cleanString(p.dungtich1).match(/\d+/) || [""])[0] }))
      .filter(m => m.name && m.name !== "-");

    const maxRow = importItems.reduce((max, it) => Math.max(max, parseInt(it._row, 10) || 0), 0);
    rows = Array.from({ length: Math.max(0, maxRow - 1) }, () => ({ product: "", capacity: "" }));
    importItems.forEach(it => {
      const idx = (parseInt(it._row, 10) || 0) - 2;
      if (idx >= 0) rows[idx] = { product: cleanString(it.ten), capacity: cleanString(it.dung_tich) };
    });

    if (importItems.length === 0) {
      showToast("⚠️ Chưa có dữ liệu tab Nhập (cần đăng nhập Quản trị và mở tab Nhập ít nhất 1 lần).", 5000);
    }
    scheduleSave();
  }

  function buildImageIndex(products) {
    imageByName = new Map();
    products.forEach(p => {
      const name = cleanString(p.name).toLowerCase();
      const img = cleanString(p.img);
      if (name && img.startsWith("http") && !imageByName.has(name)) imageByName.set(name, img);
    });
  }

  function buildRowInfo(importItems) {
    rowInfo = [];
    importItems.forEach(it => {
      const idx = (parseInt(it._row, 10) || 0) - 2;
      if (idx >= 0) rowInfo[idx] = { date: cleanString(it.ngay), price: cleanString(it.gia) };
    });
  }

  // ---------- Render ----------
  function renderAll() {
    masterItems = NameNormalizerParser.prepareMaster(master);
    renderMasterTable();
    renderRowsTable();
    recomputeAll();
    updateDbStatus();
  }

  function cellTextarea(rowIdx, col, value) {
    return `<td class="td-edit"><div class="cell-flex-wrap"><textarea class="excel-cell-textarea" data-row="${rowIdx}" data-col="${col}" rows="1" spellcheck="false">${escHtml(value)}</textarea></div></td>`;
  }

  function padTo(arr, size, makeEmpty) {
    while (arr.length < size) arr.push(makeEmpty());
  }

  function renderMasterTable() {
    padTo(master, MIN_ROWS, () => ({ name: "", volume: "" }));
    masterTableBody.innerHTML = master.map((m, i) =>
      `<tr class="excel-row"><td class="td-num">${i + 1}</td>${cellTextarea(i, "name", m.name)}${cellTextarea(i, "vol", m.volume)}</tr>`
    ).join("");
  }

  function renderRowsTable() {
    padTo(rows, MIN_ROWS, () => ({ product: "", capacity: "" }));
    // Cột: # · Ngày · Hình · Sản phẩm → Tên chuẩn · Dung tích → Loại & Dung tích · Giá · Khớp
    rowsTableBody.innerHTML = rows.map((r, i) => {
      const info = rowInfo[i] || { date: "", price: "" };
      return `<tr class="excel-row"><td class="td-num">${i + 2}</td>` +
        `<td class="td-text td-date">${escHtml(info.date)}</td><td class="td-thumb"></td>` +
        `${ToolShell.stackedCellHtml(i, "product", r.product)}${ToolShell.stackedCellHtml(i, "capacity", r.capacity)}` +
        `<td class="td-text td-price">${escHtml(info.price)}</td><td class="td-text td-match"></td></tr>`;
    }).join("");
  }

  // ---------- Đối chiếu ----------
  function getMinWords() {
    return parseInt(minWordsInput.value, 10) || DEFAULT_MIN_WORDS;
  }

  function recomputeRow(i) {
    const r = rows[i];
    results[i] = NameNormalizerParser.normalizeRow(r.product, r.capacity, masterItems, getMinWords());
    paintRow(i);
  }

  function recomputeAll() {
    results = [];
    rows.forEach((_, i) => recomputeRow(i));
    updateSummary();
  }

  function scheduleRecomputeAll() {
    clearTimeout(recomputeTimer);
    recomputeTimer = setTimeout(() => {
      masterItems = NameNormalizerParser.prepareMaster(master);
      recomputeAll();
      updateDbStatus();
    }, 300);
  }

  function paintRow(i) {
    const tr = rowsTableBody.rows[i];
    if (!tr) return;
    const res = results[i];
    const [, , thumbCell, nameCell, capacityCell, , matchCell] = tr.cells;
    const nameResult = nameCell.querySelector(".cell-result");
    const comboResult = capacityCell.querySelector(".cell-result");
    const img = res && res.isSuccess ? (imageByName.get(res.matchedName.toLowerCase()) || "") : "";

    // Hàng dưới: Tên chuẩn (chưa khớp -> y nguyên tên Sản phẩm, chữ đỏ) và Loại & Dung tích (thiếu số ml -> chữ đỏ).
    // Kết quả trùng 100% từng ký tự với hàng trên (đã chuẩn sẵn, không cần sửa) -> chữ xanh lá.
    const isSame = (a, b) => String(a || "").trim().replace(/\s+/g, " ") === String(b || "").trim().replace(/\s+/g, " ");
    const r = rows[i];
    nameResult.innerText = res ? res.outputName : "";
    nameResult.classList.toggle("is-alert", Boolean(res && !res.isSuccess));
    nameResult.classList.toggle("is-same", Boolean(res && res.isSuccess && isSame(res.outputName, r.product)));
    nameResult.title = res && res.commonWords.length ? `Từ trùng: ${res.commonWords.join(", ")}` : "";
    comboResult.innerText = res ? res.combo : "";
    comboResult.classList.toggle("is-alert", Boolean(res && res.missingVolume));
    comboResult.classList.toggle("is-same", Boolean(res && !res.missingVolume && res.combo && isSame(res.combo, r.capacity)));
    thumbCell.innerHTML = ToolShell.thumbHtml(img);
    tr.dataset.img = img;
    matchCell.innerText = res ? (res.isSuccess ? `${res.matchCount} từ` : "✕") : "";
    matchCell.className = `td-text td-match${res ? (res.isSuccess ? " is-matched" : " is-unmatched") : ""}`;

    // Chưa khớp tên hoặc thiếu số ml -> viền đỏ cả dòng
    const needsReview = Boolean(res && (!res.isSuccess || res.missingVolume));
    tr.classList.toggle("row-alert", needsReview);
    applyFilterToRow(tr);
  }

  // Đếm Tất Cả / Đã Đúng / Cần Xem Xét / Cần Sửa (dùng chung ToolShell, khớp bộ lọc)
  function updateSummary() {
    ToolShell.renderRowSummary(rowSummary, rowsTableBody);
  }

  function updateDbStatus() {
    const masterCount = master.filter(m => m.name.trim()).length;
    const rowCount = rows.filter(r => r.product.trim() || r.capacity.trim()).length;
    btnToggleMaster.innerText = `Danh mục chuẩn (${masterCount.toLocaleString("vi-VN")})`;
    ToolShell.setDbStatus(dbStatusBadge, dbCountText, masterCount > 0 && rowCount > 0,
      `${masterCount.toLocaleString("vi-VN")} tên chuẩn • ${rowCount.toLocaleString("vi-VN")} dòng nhập`);
  }

  // ---------- Lưu trữ ----------
  function trimTrailingEmpty(arr, isEmpty) {
    let end = arr.length;
    while (end > 0 && isEmpty(arr[end - 1])) end--;
    return arr.slice(0, end);
  }

  function scheduleSave() {
    clearTimeout(saveTimer);
    saveTimer = setTimeout(() => {
      StorageHelper.set(STORAGE_KEYS.master, trimTrailingEmpty(master, m => !m.name.trim() && !m.volume.trim()));
      StorageHelper.set(STORAGE_KEYS.rows, trimTrailingEmpty(rows, r => !r.product.trim() && !r.capacity.trim()));
    }, 300);
  }

  // ---------- Sự kiện ----------
  const ROW_FIELDS = { product: "product", capacity: "capacity" };
  const MASTER_FIELDS = { name: "name", vol: "volume" };

  function bindEvents() {
    rowsTableBody.addEventListener("input", (e) => {
      const { row, col } = e.target.dataset;
      if (!ROW_FIELDS[col]) return;
      rows[row][ROW_FIELDS[col]] = e.target.value;
      recomputeRow(Number(row));
      updateSummary();
      updateDbStatus();
      scheduleSave();
    });

    masterTableBody.addEventListener("input", (e) => {
      const { row, col } = e.target.dataset;
      if (!MASTER_FIELDS[col]) return;
      master[row][MASTER_FIELDS[col]] = e.target.value;
      scheduleRecomputeAll();
      scheduleSave();
    });

    rowsTableBody.addEventListener("paste", (e) => pasteIntoColumn(e, rows, ROW_FIELDS, () => ({ product: "", capacity: "" })));
    masterTableBody.addEventListener("paste", (e) => pasteIntoColumn(e, master, MASTER_FIELDS, () => ({ name: "", volume: "" })));

    // Ở dòng cuối bấm Enter / ↓: thêm 5 dòng trống rồi đi xuống
    ToolShell.bindColumnNavigation(rowsTableBody, (rowIdx) => {
      padTo(rows, rowIdx + 6, () => ({ product: "", capacity: "" }));
      renderRowsTable();
      recomputeAll();
    });
    ToolShell.bindColumnNavigation(masterTableBody, (rowIdx) => {
      padTo(master, rowIdx + 6, () => ({ name: "", volume: "" }));
      renderMasterTable();
    });

    minWordsInput.addEventListener("change", () => {
      StorageHelper.set(STORAGE_KEYS.minWords, getMinWords());
      recomputeAll();
    });

    btnToggleMaster.addEventListener("click", () => {
      const next = masterPane.style.display === "none";
      setMasterVisible(next);
      StorageHelper.set(STORAGE_KEYS.showMaster, next);
    });

    btnReload.addEventListener("click", async () => {
      if (!ToolShell.confirmByDoubleClick(btnReload, "Bấm lần nữa để ghi đè")) return;
      await loadFromSources();
      renderAll();
      showToast("🔄 Đã nạp lại dữ liệu từ tab Nước Hoa và tab Nhập!");
    });

    btnClearAll.addEventListener("click", () => {
      if (!ToolShell.confirmByDoubleClick(btnClearAll, "Bấm lần nữa để xóa")) return;
      master = [];
      rows = [];
      renderAll();
      scheduleSave();
      showToast("🗑️ Đã xóa trắng. Bấm Nạp lại để lấy lại dữ liệu.");
    });

    document.getElementById("btnCopyNames").addEventListener("click", () => copyResultColumn("outputName", "Tên chuẩn"));
    document.getElementById("btnCopyCombos").addEventListener("click", () => copyResultColumn("combo", "Loại & Dung tích"));
  }

  function setMasterVisible(isVisible) {
    masterPane.style.display = isVisible ? "" : "none";
    btnToggleMaster.classList.toggle("active", isVisible);
  }

  // Dán nhiều dòng vào 1 ô: ghi xuống cột đó từ dòng hiện tại trở xuống
  function pasteIntoColumn(e, arr, fields, makeEmpty) {
    const lines = ToolShell.readMultilinePaste(e);
    if (!lines) return;
    const { row, col } = e.target.dataset;
    const start = Number(row);
    padTo(arr, start + lines.length, makeEmpty);
    lines.forEach((line, j) => {
      arr[start + j][fields[col]] = line.trim();
    });
    renderAll();
    scheduleSave();
    showToast(`📋 Đã dán ${lines.length} dòng!`);
  }

  // Copy cột kết quả: số dòng khớp đúng thứ tự Sheet (dòng trống giữ nguyên) để dán vào dòng 2.
  // Cột Tên chuẩn: dòng chưa khớp ra y nguyên tên Sản phẩm (outputName)
  async function copyResultColumn(field, label) {
    const lastIdx = results.reduce((last, r, i) => (r ? i : last), -1);
    if (lastIdx < 0) {
      showToast(`⚠️ Cột ${label} chưa có dữ liệu!`);
      return;
    }
    const lines = results.slice(0, lastIdx + 1).map(r => (r ? r[field] : ""));
    await ToolShell.copyText(lines.join("\n"));
    showToast(`📋 Đã copy ${lines.length.toLocaleString("vi-VN")} dòng ${label}! Dán vào dòng 2 trên Sheet Nhập.`, 3500);
  }
})();
