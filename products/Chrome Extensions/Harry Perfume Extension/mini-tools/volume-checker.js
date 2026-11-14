/**
 * VOLUME-CHECKER.JS - Cửa sổ "(M) Kiểm Tra Dung Tích"
 * - Dữ liệu gốc: tên chuẩn + dungtich1..5 của tab Nước Hoa
 * - Dữ liệu nhập: người dùng dán danh sách "Thương hiệu - Tên - Dung tích" (nút Dán hoặc Ctrl + V), thay toàn bộ dữ liệu cũ
 * - Bảng chỉ xem: # · Hình · Tên · DT1..DT5, mỗi ô 2 hàng (trên: gốc, dưới: nhập)
 * - Màu hàng dưới: xanh = tên trùng 100% / dung tích có trong gốc; đỏ = tên chưa có trong tên chuẩn / dung tích gốc chưa có;
 *   vàng = tên nhập gần giống (khác dấu, hoa thường, khoảng trắng); hàng trên hiện tên chuẩn đề xuất, giữ màu thường
 * Bóc tách + xếp cột: volume-checker-parser.js
 */
(function () {
  const { showToast } = ToolShell;
  const STORAGE_KEYS = {
    input: "volumeCheckerInput",
    largeImage: "volumeCheckerShowLargeImage"
  };

  const dbStatusBadge = document.getElementById("dbStatusBadge");
  const dbCountText = document.getElementById("dbCountText");
  const rowSummary = document.getElementById("rowSummary");
  const skipNote = document.getElementById("skipNote");
  const filterSelect = document.getElementById("filterSelect");
  const btnPaste = document.getElementById("btnPaste");
  const btnClearAll = document.getElementById("btnClearAll");
  const rowsTableBody = document.getElementById("rowsTableBody");
  const spreadsheetContainer = document.getElementById("spreadsheetContainer");

  let master = VolumeCheckerParser.prepareMaster([]);
  let masterCount = 0;
  let inputText = "";
  let built = { rows: [], skipped: { chiet: 0, goc: 0 } };
  const applyFilterToRow = ToolShell.initRowFilter(filterSelect, rowsTableBody);

  document.addEventListener("DOMContentLoaded", init);

  async function init() {
    ToolShell.initThemeToggle(document.getElementById("btnToggleTheme"), document.getElementById("themeIcon"));
    ToolShell.initImagePreview(spreadsheetContainer, document.getElementById("btnTogglePreview"), STORAGE_KEYS.largeImage);
    bindEvents();

    inputText = await StorageHelper.get(STORAGE_KEYS.input, "");
    let products = [];
    try {
      products = await ToolShell.loadProducts();
    } catch (e) {
      showToast("⚠️ Không tải được tab Nước Hoa. Kiểm tra kết nối rồi mở lại cửa sổ.", 4000);
    }
    master = VolumeCheckerParser.prepareMaster(products);
    masterCount = master.exact.size;
    render();
  }

  // ---------- Render ----------
  function render() {
    built = VolumeCheckerParser.buildRows(inputText, master);
    if (built.rows.length === 0) {
      rowsTableBody.innerHTML = `<tr><td class="vc-empty" colspan="8">Bấm <b>Dán</b> hoặc <b>Ctrl + V</b> để dán danh sách tên sản phẩm (Thương hiệu - Tên - Dung tích)</td></tr>`;
    } else {
      rowsTableBody.innerHTML = built.rows.map(rowHtml).join("");
      Array.from(rowsTableBody.rows).forEach(applyFilterToRow);
    }
    ToolShell.renderRowSummary(rowSummary, rowsTableBody);
    renderSkipNote();
    updateDbStatus();
  }

  function rowHtml(row, i) {
    const nameTop = row.match === "none" ? "" : row.masterName;
    const nameCls = row.match === "exact" ? "is-same" : (row.match === "near" ? "" : "is-alert");
    const nameTitle = row.match === "near" ? "Gần giống tên chuẩn (khác dấu / hoa thường / khoảng trắng): sửa cho trùng 100%" :
      (row.match === "none" ? "Tên chưa có trong tên chuẩn tab Nước Hoa" : "");
    const extra = row.overflow.length
      ? `<div class="cell-result is-alert vc-extra" title="Hết cột trống: dung tích chưa có trong gốc">${row.overflow.map(v => `+${escHtml(v)}ml`).join(" ")}</div>`
      : "";
    const nameCell = `<td class="vc-cell vc-name"><div class="vc-top">${escHtml(nameTop)}</div>` +
      `<div class="cell-result ${nameCls}" title="${escAttr(nameTitle)}">${escHtml(row.importName)}</div>${extra}</td>`;

    const volCells = row.top.map((top, slot) => {
      const b = row.bottom[slot];
      const cls = b ? (b.inMaster ? "is-same" : "is-alert") : "";
      const title = b && !b.inMaster ? "Dung tích chưa có trong gốc (dungtich1..5 tab Nước Hoa)" : "";
      return `<td class="vc-cell vc-vol"><div class="vc-top">${escHtml(top)}</div>` +
        `<div class="cell-result ${cls}" title="${escAttr(title)}">${b ? escHtml(b.value) : ""}</div></td>`;
    }).join("");

    const hasRed = row.match === "none" || row.overflow.length > 0 || row.bottom.some(b => b && !b.inMaster);
    return `<tr class="excel-row${hasRed ? " row-alert" : ""}" data-img="${escAttr(row.img)}">` +
      `<td class="td-num">${i + 1}</td><td class="td-thumb">${ToolShell.thumbHtml(row.img)}</td>${nameCell}${volCells}</tr>`;
  }

  function renderSkipNote() {
    const parts = [];
    if (built.skipped.chiet) parts.push(`${built.skipped.chiet.toLocaleString("vi-VN")} dòng Chiết`);
    if (built.skipped.goc) parts.push(`${built.skipped.goc.toLocaleString("vi-VN")} dòng Gốc`);
    skipNote.innerText = parts.length ? `Bỏ qua ${parts.join(", ")}` : "";
  }

  function updateDbStatus() {
    const lineCount = inputText.split(/\n/).filter(l => l.trim()).length;
    ToolShell.setDbStatus(dbStatusBadge, dbCountText, masterCount > 0,
      `${masterCount.toLocaleString("vi-VN")} tên chuẩn • ${lineCount.toLocaleString("vi-VN")} dòng dán`);
  }

  // ---------- Dán / Xóa ----------
  function setInput(text) {
    inputText = String(text || "").replace(/\r\n?/g, "\n");
    StorageHelper.set(STORAGE_KEYS.input, inputText);
    render();
  }

  function pasteText(text) {
    if (!text || !text.trim()) {
      showToast("⚠️ Clipboard đang trống!");
      return;
    }
    setInput(text);
    showToast(`📋 Đã dán ${built.rows.length.toLocaleString("vi-VN")} tên sản phẩm!`);
  }

  function bindEvents() {
    btnPaste.addEventListener("click", async () => {
      try {
        pasteText(await navigator.clipboard.readText());
      } catch (e) {
        showToast("⚠️ Không đọc được clipboard, hãy bấm Ctrl + V trong cửa sổ này!");
      }
    });

    // Ctrl + V ở bất kỳ đâu trong cửa sổ (trừ ô nhập liệu) = Dán
    document.addEventListener("paste", (e) => {
      const tag = e.target && e.target.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return;
      e.preventDefault();
      pasteText(e.clipboardData ? e.clipboardData.getData("text") : "");
    });

    btnClearAll.addEventListener("click", () => {
      if (!ToolShell.confirmByDoubleClick(btnClearAll, "Bấm lần nữa để xóa")) return;
      setInput("");
      showToast("🗑️ Đã xóa trắng.");
    });
  }
})();
