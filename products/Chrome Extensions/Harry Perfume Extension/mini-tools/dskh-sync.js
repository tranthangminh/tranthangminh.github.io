/**
 * DSKH-SYNC.JS - Cửa sổ "(M) Đồng bộ DSKH"
 * - Tab nhập: 🛑DSKH (luôn có) + các tab chi nhánh "DSKH-<Tên>" (thêm bằng nút +, xóa bằng nút trên toolbar có popup xác nhận).
 *   Mỗi tab dán 1 bảng khách hàng (nút Dán hoặc Ctrl + V), thay toàn bộ dữ liệu cũ của tab đó. Bảng chỉ xem: # + 42 cột
 * - Tab Đồng bộ (chỉ xem, tự tính từ các tab nhập): # · Mã khách hàng · Nguồn · 🛑DSKH · DSKH-<chi nhánh>… · 41 cột còn lại.
 *   Danh sách dòng, thứ tự, mã ở từng tab, 41 ô đã gộp: DskhParser.buildSyncList. Ô mã tìm thấy -> bấm để nhảy tới dòng đó.
 *   Ô gộp ⁉️ (giá trị khác nhau): chữ vàng, mỗi giá trị 1 dòng kèm nguồn, ✓ ở giá trị được lấy, bấm dòng khác để chọn tay.
 *   Ô 💎 (khách mới, chỉ 1 giá trị): chữ xanh dương. Ô số căn phải; Điểm ⚠️ (nâng theo chi tiêu) chữ cam, ➕ (khác 🛑) chữ xanh lá
 * - Lưu trên máy (StorageHelper): tên các chi nhánh (dskhSyncBranches), dữ liệu dán mỗi tab (dskhSyncInput_<key>), tab đang chọn,
 *   lựa chọn tay ở ô ⁉️ (dskhSyncChoices: "<mã 🛑DSKH>|<tên cột>" -> giá trị; tự bỏ khi giá trị không còn trong ô)
 * - Bảng vài nghìn dòng: vẽ từng đợt BATCH_SIZE dòng, cuộn gần cuối mới vẽ tiếp
 * - Nút "Cố định" (giống Xem > Cố định của Google Sheet): chọn số cột đầu đứng yên khi cuộn ngang, lưu riêng cho tab nhập / tab Đồng bộ
 */
(function () {
  const { showToast } = ToolShell;
  const { COLUMNS, MASTER, BRANCH_LABEL_PREFIX } = DskhParser;
  const SYNC_TAB = "sync";
  const SOURCE_COLUMN = "Nguồn";
  const BATCH_SIZE = 200;
  const LOAD_MORE_GAP = 600; // px còn lại tới cuối bảng thì vẽ đợt tiếp
  const ACTIVE_TAB_KEY = "dskhSyncActiveTab";
  const BRANCHES_KEY = "dskhSyncBranches";
  const CHOICES_KEY = "dskhSyncChoices";
  const FREEZE_KEYS = { input: "dskhSyncFreezeInput", sync: "dskhSyncFreezeSync" };
  const DEFAULT_FREEZE = 1; // mặc định cố định cột Mã khách hàng
  const FREEZE_MAX_RATIO = 0.6; // vùng cố định (gồm cột #) không quá 60% bề ngang bảng
  const BACKUP_KEY = "dskhSyncMasterBackup"; // 🛑DSKH trước lần Nhập vào 🛑DSKH gần nhất (để Hoàn tác / Khôi phục)
  const FILTERS_KEY = "dskhSyncFilters";
  const UNDO_MS = 10000;
  // Bộ lọc tab Đồng bộ: dòng có ít nhất 1 điều kiện được tick
  const FILTER_DEFS = [
    { key: "changed", label: "⁉️ Thay đổi", title: "Có ô chữ có giá trị khác nhau giữa các nguồn (chữ vàng)" },
    { key: "new", label: "💎 Mới", title: "Có ô khách mới - chỉ chi nhánh có (chữ xanh dương)" },
    { key: "plus", label: "➕ Tăng", title: "Điểm hiện tại khác 🛑DSKH (chữ xanh lá)" },
    { key: "raised", label: "⚠️ Điều chỉnh", title: "Điểm hiện tại bị nâng theo Tổng chi tiêu (chữ cam)" },
    { key: "dup", label: "☎ Trùng SĐT", title: "Điện thoại trùng với khách khác (các dòng trùng xếp liền nhau)" }
  ];
  const inputKey = (key) => `dskhSyncInput_${key}`;

  // Độ rộng cột (px) = max(tiêu đề xuống 2 dòng, nội dung điển hình định dạng Sapo) + 12px đệm + 1px viền + dư 2px, làm tròn lên 5;
  // cột nội dung dài (tên, email, địa chỉ, ghi chú) có giới hạn, phần dư hiện "..." (rê chuột xem đủ)
  const NUM_COL_WIDTH = 44; // cột #
  const BRANCH_COL_WIDTH = 95; // cột mã của từng chi nhánh (DSKH-<Tên>) ở tab Đồng bộ
  const DEFAULT_COL_WIDTH = 100;
  const COL_WIDTHS = {
    "Mã khách hàng": 95,
    "Nguồn": 85,
    [MASTER.label]: 100,
    "Tên khách hàng *": 160,
    "Mã nhóm khách hàng": 90,
    "Điện thoại": 90,
    "Email": 170,
    "Giới tính": 40,
    "Ngày sinh": 80,
    "Áp dụng ưu đãi": 70,
    "Chiết khấu mặc định (%)": 100,
    "Phương thức thanh toán mặc định": 135,
    "Chính sách giá mặc định": 95,
    "Fax": 40,
    "Website": 70,
    "Mã số thuế": 90,
    "Tags": 80,
    "Ghi chú": 160,
    "Mô tả": 120,
    "Địa chỉ - Họ tên": 160,
    "Địa chỉ - SĐT": 90,
    "Địa chỉ - Email": 170,
    "Địa chỉ": 220,
    "Tỉnh thành": 100,
    "Quận huyện": 90,
    "Phường xã": 120,
    "Mã bưu điện": 65,
    "Người liên hệ": 95,
    "Người liên hệ - SĐT": 90,
    "Người liên hệ - Email": 150,
    "Người liên hệ - Chức vụ": 95,
    "Người liên hệ - Bộ phận": 95,
    "Nhân viên phụ trách": 110,
    "SĐT nhân viên phụ trách": 105,
    "Ngày tạo": 120,
    "Trạng thái": 100,
    "Nợ hiện tại": 65,
    "Điểm hiện tại": 65,
    "SL đơn hàng": 60,
    "Tổng chi tiêu": 85,
    "Tổng SL sản phẩm đã mua": 100,
    "Tổng SL sản phẩm hoàn trả": 110,
    "Ngày mua cuối cùng": 120,
    "Hạng thẻ hiện tại": 120
  };

  function colWidth(name) {
    if (COL_WIDTHS[name]) return COL_WIDTHS[name];
    return name.startsWith(BRANCH_LABEL_PREFIX) ? BRANCH_COL_WIDTH : DEFAULT_COL_WIDTH;
  }

  const sourceTabs = document.getElementById("sourceTabs");
  const tabSummary = document.getElementById("tabSummary");
  const missingNote = document.getElementById("missingNote");
  const btnPaste = document.getElementById("btnPaste");
  const btnClearTab = document.getElementById("btnClearTab");
  const btnRemoveBranch = document.getElementById("btnRemoveBranch");
  const spreadsheetContainer = document.getElementById("spreadsheetContainer");
  const emptyState = document.getElementById("emptyState");
  const sourceTable = document.getElementById("sourceTable");
  const tableHeadRow = document.getElementById("tableHeadRow");
  const rowsTableBody = document.getElementById("rowsTableBody");
  const btnFreeze = document.getElementById("btnFreeze");
  const freezeMenu = document.getElementById("freezeMenu");
  const syncFilters = document.getElementById("syncFilters");
  const btnImportMaster = document.getElementById("btnImportMaster");
  const btnRestoreMaster = document.getElementById("btnRestoreMaster");
  const undoBar = document.getElementById("undoBar");
  const undoBarMsg = document.getElementById("undoBarMsg");

  let branches = []; // DskhParser.branchFromName(...) theo thứ tự tạo
  const tables = {}; // key (MASTER.key / chi nhánh) -> kết quả DskhParser.parseTable
  let activeTab = MASTER.key;
  let addingBranch = false; // đang hiện ô nhập tên chi nhánh mới
  let choices = {}; // lựa chọn tay ở ô ⁉️ (CHOICES_KEY)
  let syncCache = null; // kết quả buildSyncList, tính lại khi dữ liệu / chi nhánh đổi (invalidateSync)
  let freeze = { input: DEFAULT_FREEZE, sync: DEFAULT_FREEZE }; // số cột cố định đã chọn (FREEZE_KEYS)
  let filters = {}; // key FILTER_DEFS -> đang tick
  let hasBackup = false; // có bản 🛑DSKH trước lần nhập (BACKUP_KEY)
  let undoTimer = null;
  let viewColumns = []; // tên cột của bảng đang xem
  let viewWidths = []; // độ rộng cột tương ứng (colWidth)
  let viewEmptyHtml = "";
  let viewRows = []; // các dòng (mảng ô) của tab đang xem
  let stickyLeft = []; // left (px) của từng cột cố định, null = không cố định (computeSticky)
  let frozenEdge = -1; // cột cố định cuối (có vạch ranh giới), -1 = chỉ cột #
  let renderedCount = 0;

  document.addEventListener("DOMContentLoaded", init);

  async function init() {
    ToolShell.initThemeToggle(document.getElementById("btnToggleTheme"), document.getElementById("themeIcon"));
    const names = await StorageHelper.get(BRANCHES_KEY, null);
    branches = (Array.isArray(names) ? names : DskhParser.DEFAULT_BRANCH_NAMES).map(DskhParser.branchFromName);
    for (const tab of inputTabs()) {
      tables[tab.key] = DskhParser.parseTable(await StorageHelper.get(inputKey(tab.key), ""));
    }
    const savedChoices = await StorageHelper.get(CHOICES_KEY, {});
    choices = savedChoices && typeof savedChoices === "object" ? savedChoices : {};
    for (const group of Object.keys(FREEZE_KEYS)) {
      const saved = await StorageHelper.get(FREEZE_KEYS[group], DEFAULT_FREEZE);
      freeze[group] = Number.isInteger(saved) && saved >= 0 ? saved : DEFAULT_FREEZE;
    }
    const savedFilters = await StorageHelper.get(FILTERS_KEY, {});
    FILTER_DEFS.forEach(f => { filters[f.key] = Boolean(savedFilters && savedFilters[f.key]); });
    hasBackup = (await StorageHelper.get(BACKUP_KEY, null)) !== null;
    const savedTab = await StorageHelper.get(ACTIVE_TAB_KEY, activeTab);
    if (savedTab === SYNC_TAB || findInputTab(savedTab)) activeTab = savedTab;
    bindEvents();
    renderTabs();
    renderActiveTab();
  }

  function inputTabs() {
    return [MASTER, ...branches];
  }

  function findInputTab(key) {
    return inputTabs().find(t => t.key === key);
  }

  function countText(n) {
    return n.toLocaleString("vi-VN");
  }

  function syncList() {
    if (!syncCache) syncCache = DskhParser.buildSyncList(tables, branches);
    return syncCache;
  }

  function invalidateSync() {
    syncCache = null;
  }

  // Nhãn nguồn trong ô ⁉️: 🛑 cho 🛑DSKH, chữ tiền tố cho chi nhánh (Q, H...)
  function sourceTag(key) {
    if (key === MASTER.key) return "🛑";
    return branches.find(b => b.key === key).prefix.replace(/-$/, "");
  }

  // ---------- Tab ----------
  function tabHtml(key, label, count, extraClass) {
    const badge = count ? `<span class="dskh-tab-count">${countText(count)}</span>` : "";
    return `<button type="button" class="dskh-tab${extraClass}${activeTab === key ? " active" : ""}" data-tab="${escAttr(key)}">${escHtml(label)}${badge}</button>`;
  }

  function addBranchHtml() {
    if (!addingBranch) {
      return `<button type="button" class="dskh-tab dskh-tab-add" id="btnAddBranch" title="Thêm tab chi nhánh DSKH-…">+</button>`;
    }
    return `<div class="dskh-new-tab"><span class="dskh-new-tab-prefix">${escHtml(BRANCH_LABEL_PREFIX)}</span>` +
      `<input type="text" id="newBranchInput" class="dskh-new-tab-input" placeholder="Tên chi nhánh" spellcheck="false" autocomplete="off">` +
      `<span class="dskh-new-tab-hint" id="newBranchHint">Enter tạo · Esc hủy</span></div>`;
  }

  function renderTabs() {
    sourceTabs.innerHTML = inputTabs().map(t => tabHtml(t.key, t.label, tables[t.key].rows.length, "")).join("") +
      addBranchHtml() + tabHtml(SYNC_TAB, "Đồng bộ", syncList().length, " dskh-tab-sync");
  }

  // Chọn tab (đóng luôn ô nhập tên chi nhánh nếu đang mở)
  function selectTab(key) {
    addingBranch = false;
    const changed = key !== activeTab;
    activeTab = key;
    if (changed) StorageHelper.set(ACTIVE_TAB_KEY, key);
    renderTabs();
    if (changed) renderActiveTab();
  }

  function renderActiveTab() {
    const isSync = activeTab === SYNC_TAB;
    btnPaste.style.display = isSync ? "none" : "";
    btnClearTab.style.display = isSync ? "none" : "";
    btnImportMaster.style.display = isSync ? "" : "none";
    btnRestoreMaster.style.display = activeTab === MASTER.key && hasBackup ? "" : "none";
    syncFilters.style.display = isSync ? "" : "none";
    btnRemoveBranch.style.display = isSync || activeTab === MASTER.key ? "none" : "";
    if (!isSync && activeTab !== MASTER.key) btnRemoveBranch.title = `Xóa tab ${findInputTab(activeTab).label}`;
    if (isSync) renderSyncView();
    else renderSourceView();
  }

  // ---------- Thêm / xóa chi nhánh ----------
  function openAddBranch() {
    addingBranch = true;
    renderTabs();
    document.getElementById("newBranchInput").focus();
  }

  function closeAddBranch() {
    if (!addingBranch) return;
    addingBranch = false;
    renderTabs();
  }

  // Xem trước tiền tố khi gõ tên; tên không hợp lệ thì hiện lý do (chữ đỏ)
  function updateAddBranchHint(input) {
    const hint = document.getElementById("newBranchHint");
    const name = input.value;
    if (!name.trim()) {
      hint.innerText = "Enter tạo · Esc hủy";
      hint.title = "";
      hint.classList.remove("is-alert");
      return;
    }
    const error = DskhParser.validateBranchName(name, branches);
    const b = DskhParser.branchFromName(name);
    hint.innerText = error || `${b.prefix} · ${b.crossPrefix}`;
    hint.title = error ? "" : `Tiền tố ở ${MASTER.label}: ${b.prefix} · Mã ở chi nhánh khác: ${b.crossPrefix}`;
    hint.classList.toggle("is-alert", Boolean(error));
  }

  function submitAddBranch(name) {
    const error = DskhParser.validateBranchName(name, branches);
    if (error) {
      showToast(`⚠️ ${error}`, 3000);
      return;
    }
    const branch = DskhParser.branchFromName(name);
    branches.push(branch);
    tables[branch.key] = DskhParser.parseTable("");
    invalidateSync();
    StorageHelper.set(BRANCHES_KEY, branches.map(b => b.name));
    selectTab(branch.key);
    showToast(`➕ Đã thêm tab ${branch.label} (tiền tố ${branch.prefix}, mã chéo ${branch.crossPrefix})`, 3000);
  }

  async function removeActiveBranch() {
    const branch = branches.find(b => b.key === activeTab);
    const count = tables[branch.key].rows.length;
    const dataNote = count ? ` và ${countText(count)} khách hàng đã dán` : "";
    const ok = await confirmAction(`Xóa tab ${branch.label}${dataNote}? Không hoàn tác được.`, "Xóa tab");
    if (!ok) return;
    branches = branches.filter(b => b.key !== branch.key);
    delete tables[branch.key];
    invalidateSync();
    await StorageHelper.set(BRANCHES_KEY, branches.map(b => b.name));
    await StorageHelper.remove(inputKey(branch.key));
    selectTab(MASTER.key);
    showToast(`🗑️ Đã xóa tab ${branch.label}.`);
  }

  // ---------- Tab nhập ----------
  function renderSourceView() {
    const table = tables[activeTab];
    const count = table.rows.length;
    tabSummary.innerText = count ? `${countText(count)} khách hàng` : "Chưa có dữ liệu";
    tabSummary.title = "";
    missingNote.innerText = count && table.missing.length ? `Thiếu ${table.missing.length} cột` : "";
    missingNote.title = count && table.missing.length ? `Không có trong dữ liệu dán: ${table.missing.join(", ")}` : "";
    renderTable(COLUMNS, table.rows,
      `Bấm <b>Dán</b> hoặc <b>Ctrl + V</b> để dán bảng <b>${escHtml(findInputTab(activeTab).label)}</b> (copy kèm dòng tiêu đề có cột Mã khách hàng)`);
  }

  // ---------- Tab Đồng bộ ----------
  // Ô mã ở 1 tab: tìm thấy -> bấm được (nhảy tới dòng), không thấy -> chữ mờ
  function refCell(tab, ref) {
    if (ref.row < 0) {
      return { kind: "ref", text: ref.code, cls: "dskh-ref is-missing", title: `Không có trong ${tab.label}` };
    }
    return {
      kind: "ref",
      text: ref.code,
      cls: "dskh-ref is-found",
      title: `Bấm để xem dòng ${countText(ref.row + 1)} ở ${tab.label}`,
      data: { tab: tab.key, row: ref.row }
    };
  }

  // Ô gộp (DskhParser.mergeText). Ô ⁉️ áp lựa chọn tay đã lưu; lựa chọn không còn hợp lệ / trùng lựa chọn công thức thì bỏ.
  // Trả về { cell, dirty } (dirty = choices vừa bị bỏ bớt)
  function mergeCell(masterCode, colName, merged) {
    if (merged.kind === "number") return { cell: merged, dirty: false };
    if (merged.flag === "new") return { cell: { kind: "new", text: merged.value }, dirty: false };
    if (merged.flag !== "changed") return { cell: merged.value, dirty: false };
    const key = `${masterCode}|${colName}`;
    let chosen = merged.pick;
    let dirty = false;
    if (Object.prototype.hasOwnProperty.call(choices, key)) {
      const idx = merged.options.findIndex(o => DskhParser.sameText(o.value, choices[key]));
      if (idx < 0 || idx === merged.pick) {
        delete choices[key];
        dirty = true;
      } else {
        chosen = idx;
      }
    }
    return { cell: { kind: "merge", key, options: merged.options, pick: merged.pick, chosen }, dirty };
  }

  // Giá trị đang lấy của 1 ô đã gộp (ô ⁉️: dòng đang ✓)
  function cellText(cell) {
    if (typeof cell === "string") return cell;
    if (cell.kind === "merge") return cell.options[cell.chosen].value;
    return cell.kind === "number" ? cell.value : cell.text;
  }

  // 41 ô đã gộp của 1 dòng (áp lựa chọn tay). Trả về { cells, dirty }
  function mergedCells(x) {
    let dirty = false;
    const cells = x.cells.map((m, i) => {
      const r = mergeCell(x.masterCode, COLUMNS[i + 1], m);
      if (r.dirty) dirty = true;
      return r.cell;
    });
    return { cells, dirty };
  }

  // Cờ của dòng cho bộ lọc (trừ dup - markDuplicatePhones)
  function rowFlags(merged) {
    const points = merged.find(c => c.kind === "number" && c.flag);
    return {
      changed: merged.some(c => c.kind === "merge"),
      new: merged.some(c => c.kind === "new"),
      plus: Boolean(points && points.flag === "plus"),
      raised: Boolean(points && points.flag === "raised"),
      dup: false
    };
  }

  // Dòng có Điện thoại (giá trị đang lấy, chuẩn hoá) trùng dòng khác: cờ dup, ô Điện thoại viền đỏ + ghi mã trùng
  function markDuplicatePhones(rows, phoneIdx) {
    const groups = new Map();
    rows.forEach(r => {
      r.phoneKey = DskhParser.normalizePhone(cellText(r[phoneIdx]));
      if (!r.phoneKey) return;
      if (!groups.has(r.phoneKey)) groups.set(r.phoneKey, []);
      groups.get(r.phoneKey).push(r);
    });
    groups.forEach(group => {
      if (group.length < 2) return;
      group.forEach(r => {
        r.flags.dup = true;
        const cell = r[phoneIdx];
        const others = group.filter(o => o !== r).map(o => o[0]);
        r[phoneIdx] = typeof cell === "string" ? { kind: "plain", text: cell, dupWith: others } : Object.assign(cell, { dupWith: others });
      });
    });
  }

  // Lọc theo ô tick (không tick ô nào = tất cả). Tick Trùng SĐT: các dòng trùng nhau xếp liền nhau
  function applyFilters(rows) {
    const active = FILTER_DEFS.filter(f => filters[f.key]).map(f => f.key);
    if (active.length === 0) return rows;
    const shown = rows.filter(r => active.some(k => r.flags[k]));
    if (!filters.dup) return shown;
    const firstNum = new Map();
    shown.forEach(r => { if (r.flags.dup && !firstNum.has(r.phoneKey)) firstNum.set(r.phoneKey, r.num); });
    const groupOf = r => (r.flags.dup ? firstNum.get(r.phoneKey) : r.num);
    return shown.slice().sort((a, b) => groupOf(a) - groupOf(b) || a.num - b.num);
  }

  function renderFilters(counts) {
    syncFilters.innerHTML = FILTER_DEFS.map(f => `<label class="dskh-filter${filters[f.key] ? " is-on" : ""}" title="${escAttr(f.title)}">` +
      `<input type="checkbox" data-filter="${f.key}"${filters[f.key] ? " checked" : ""}>` +
      `<span>${escHtml(f.label)}</span><span class="dskh-filter-count">${countText(counts[f.key])}</span></label>`).join("");
  }

  function renderSyncView() {
    const list = syncList();
    const tabs = inputTabs();
    const columns = [COLUMNS[0], SOURCE_COLUMN, ...tabs.map(t => t.label), ...COLUMNS.slice(1)];
    const phoneIdx = 2 + tabs.length + DskhParser.PHONE_COL - 1;
    let choicesDirty = false;
    const rows = list.map((x, i) => {
      const { cells: merged, dirty } = mergedCells(x);
      if (dirty) choicesDirty = true;
      const row = [x.code, x.source, ...tabs.map(t => refCell(t, x.refs[t.key])), ...merged];
      row.num = i + 1;
      row.flags = rowFlags(merged);
      return row;
    });
    if (choicesDirty) StorageHelper.set(CHOICES_KEY, choices);
    markDuplicatePhones(rows, phoneIdx);

    const counts = {};
    FILTER_DEFS.forEach(f => { counts[f.key] = rows.filter(r => r.flags[f.key]).length; });
    renderFilters(counts);
    const shown = applyFilters(rows);
    const perSource = branches.map(b => `${b.label} ${countText(list.filter(x => x.sourceKey === b.key).length)}`);
    tabSummary.innerText = !list.length ? "Chưa có dữ liệu"
      : shown.length === rows.length ? `${countText(list.length)} KH` : `Đang hiện ${countText(shown.length)} / ${countText(list.length)} KH`;
    tabSummary.title = list.length ? perSource.join(" · ") : "";
    missingNote.innerText = "";
    missingNote.title = "";
    const emptyHtml = !branches.length ? "Chưa có tab chi nhánh. Bấm <b>+</b> để thêm"
      : list.length ? "Không có dòng nào khớp bộ lọc"
        : `Dán dữ liệu vào các tab <b>${branches.map(b => escHtml(b.label)).join("</b>, <b>")}</b> trước`;
    renderTable(columns, shown, emptyHtml);
  }

  // Vẽ lại tab Đồng bộ (vd đổi ✓ ở cột Điện thoại làm thay đổi trùng SĐT), giữ số dòng đã vẽ + vị trí cuộn
  function refreshSyncKeepScroll() {
    const top = spreadsheetContainer.scrollTop;
    const left = spreadsheetContainer.scrollLeft;
    const count = renderedCount;
    renderSyncView();
    while (renderedCount < count && renderedCount < viewRows.length) appendNextBatch();
    spreadsheetContainer.scrollTop = top;
    spreadsheetContainer.scrollLeft = left;
  }

  // ---------- Nhập vào 🛑DSKH / Hoàn tác ----------
  // Xóa sạch 🛑DSKH, ghi toàn bộ tab Đồng bộ (không theo bộ lọc): Mã = mã cột 🛑DSKH, 41 cột = giá trị đang lấy.
  // Lưu bản 🛑DSKH cũ (BACKUP_KEY) để Hoàn tác (10 giây) / Khôi phục bản trước (tab 🛑DSKH)
  async function importToMaster() {
    const list = syncList();
    if (!list.length) {
      showToast("⚠️ Tab Đồng bộ chưa có khách hàng nào!");
      return;
    }
    const rows = list.map(x => [x.masterCode, ...mergedCells(x).cells.map(cellText)]);
    const syncCodes = new Set(list.map(x => x.masterCode.toUpperCase()));
    const oldRows = tables[MASTER.key].rows;
    const lost = oldRows.filter(r => !r[0] || !syncCodes.has(r[0].toUpperCase())).length;
    const lostNote = lost ? ` ${countText(lost)} khách chỉ có ở ${MASTER.label} sẽ bị xóa.` : "";
    const ok = await confirmAction(`Xóa sạch ${MASTER.label} hiện tại (${countText(oldRows.length)} khách) rồi ghi ${countText(rows.length)} khách từ tab Đồng bộ?${lostNote} Có thể khôi phục bản trước.`, "Nhập");
    if (!ok) return;
    await StorageHelper.set(BACKUP_KEY, await StorageHelper.get(inputKey(MASTER.key), ""));
    hasBackup = true;
    await StorageHelper.set(CHOICES_KEY, choices);
    const text = DskhParser.toTsv(rows);
    tables[MASTER.key] = DskhParser.parseTable(text);
    invalidateSync();
    await StorageHelper.set(inputKey(MASTER.key), text);
    renderTabs();
    renderActiveTab();
    showUndoBar(`📥 Đã nhập ${countText(rows.length)} khách vào ${MASTER.label}.`);
  }

  function showUndoBar(msg) {
    undoBarMsg.innerText = msg;
    undoBar.hidden = false;
    clearTimeout(undoTimer);
    undoTimer = setTimeout(() => { undoBar.hidden = true; }, UNDO_MS);
  }

  // Đưa 🛑DSKH về bản trước lần nhập; askFirst = hỏi lại bằng popup (nút trên tab 🛑DSKH)
  async function restoreMaster(askFirst) {
    const backup = await StorageHelper.get(BACKUP_KEY, null);
    if (backup === null) return;
    if (askFirst) {
      const backupCount = DskhParser.parseTable(backup).rows.length;
      const ok = await confirmAction(`Đưa ${MASTER.label} về bản trước lần nhập (${countText(backupCount)} khách)? Dữ liệu ${MASTER.label} hiện tại (${countText(tables[MASTER.key].rows.length)} khách) sẽ bị thay.`, "Khôi phục");
      if (!ok) return;
    }
    tables[MASTER.key] = DskhParser.parseTable(backup);
    invalidateSync();
    await StorageHelper.set(inputKey(MASTER.key), backup);
    await StorageHelper.remove(BACKUP_KEY);
    hasBackup = false;
    clearTimeout(undoTimer);
    undoBar.hidden = true;
    renderTabs();
    renderActiveTab();
    showToast(`↩️ Đã khôi phục ${MASTER.label} bản trước.`);
  }

  // ---------- Cố định cột (giống Xem > Cố định của Google Sheet) ----------
  // N cột đầu bảng đứng yên khi cuộn ngang; cột # và hàng tiêu đề luôn đứng yên.
  // Các tab nhập dùng chung 1 lựa chọn (cùng 42 cột), tab Đồng bộ lựa chọn riêng
  function freezeGroup() {
    return activeTab === SYNC_TAB ? "sync" : "input";
  }

  // Bề ngang vùng cố định khi cố định k cột (gồm cột #)
  function frozenWidth(k) {
    return NUM_COL_WIDTH + viewWidths.slice(0, k).reduce((a, b) => a + b, 0);
  }

  function freezeLimit() {
    return (spreadsheetContainer.clientWidth || window.innerWidth) * FREEZE_MAX_RATIO;
  }

  // Số cột cố định thật của bảng đang xem: lựa chọn đã lưu, tự lùi khi bảng ít cột hơn hoặc vùng cố định quá rộng
  function effectiveFreeze() {
    let k = Math.min(freeze[freezeGroup()], viewColumns.length);
    while (k > 0 && frozenWidth(k) > freezeLimit()) k--;
    return k;
  }

  // Vị trí left của từng cột cố định (null = không cố định); cột cố định cuối có vạch ranh giới (frozenEdge, -1 = cột #)
  function computeSticky() {
    const k = effectiveFreeze();
    stickyLeft = viewColumns.map((_, i) => (i < k ? frozenWidth(i) : null));
    frozenEdge = k - 1;
    btnFreeze.innerText = k ? `Cố định ${k} cột` : "Cố định";
    btnFreeze.title = k ? `Đang cố định ${k} cột đầu khi cuộn ngang (đến ${viewColumns[k - 1]})` : "Không cố định cột nào";
  }

  // class + style thêm cho ô ở cột colIdx khi cột đó cố định
  function stickyAttrs(colIdx) {
    const left = stickyLeft[colIdx];
    if (left === null || left === undefined) return { cls: "", style: "" };
    return { cls: ` dskh-sticky${colIdx === frozenEdge ? " dskh-freeze-edge" : ""}`, style: `left:${left}px;` };
  }

  function freezeLabel(k) {
    if (k === 0) return "Không có cột nào";
    return k === 1 ? `1 cột (${viewColumns[0]})` : `${k} cột (đến ${viewColumns[k - 1]})`;
  }

  // Menu: từ "Không có cột nào" tới số cột lớn nhất còn vừa; thêm 1 mục mờ đầu tiên quá rộng để biết giới hạn
  function renderFreezeMenu() {
    const current = effectiveFreeze();
    const limit = freezeLimit();
    const items = [];
    for (let k = 0; k <= viewColumns.length; k++) {
      const tooWide = frozenWidth(k) > limit;
      const picked = k === current;
      items.push(`<button type="button" class="dskh-freeze-item${picked ? " is-current" : ""}" data-freeze="${k}" role="menuitemradio" aria-checked="${picked}"` +
        `${tooWide ? ' disabled title="Vùng cố định quá rộng so với cửa sổ"' : ""}>` +
        `<span class="dskh-freeze-mark">${picked ? "✓" : ""}</span>${escHtml(freezeLabel(k))}</button>`);
      if (tooWide) break;
    }
    freezeMenu.innerHTML = items.join("");
  }

  function openFreezeMenu() {
    renderFreezeMenu();
    freezeMenu.hidden = false;
    btnFreeze.setAttribute("aria-expanded", "true");
  }

  function closeFreezeMenu() {
    freezeMenu.hidden = true;
    btnFreeze.setAttribute("aria-expanded", "false");
  }

  function setFreeze(k) {
    const group = freezeGroup();
    freeze[group] = k;
    StorageHelper.set(FREEZE_KEYS[group], k);
    closeFreezeMenu();
    redrawKeepScroll();
  }

  // Vẽ lại bảng đang xem (đổi cố định / đổi cỡ cửa sổ), giữ số dòng đã vẽ và vị trí cuộn
  function redrawKeepScroll() {
    const top = spreadsheetContainer.scrollTop;
    const left = spreadsheetContainer.scrollLeft;
    const count = renderedCount;
    renderTable(viewColumns, viewRows, viewEmptyHtml);
    while (renderedCount < count) appendNextBatch();
    spreadsheetContainer.scrollTop = top;
    spreadsheetContainer.scrollLeft = left;
  }

  // ---------- Bảng chung ----------
  // columns: tên cột (cột đầu là Mã khách hàng); rows: mảng ô theo columns; ô là chuỗi hoặc { kind: "ref" | "new" | "merge", ... } (cellHtml)
  function renderTable(columns, rows, emptyHtml) {
    viewColumns = columns;
    viewWidths = columns.map(colWidth);
    viewEmptyHtml = emptyHtml;
    computeSticky();
    sourceTable.style.width = (NUM_COL_WIDTH + viewWidths.reduce((a, b) => a + b, 0)) + "px";
    const numEdge = frozenEdge < 0 ? " dskh-freeze-edge" : "";
    tableHeadRow.innerHTML = `<th class="th-num dskh-sticky dskh-sticky-num${numEdge}" style="width:${NUM_COL_WIDTH}px">#</th>` +
      columns.map((name, i) => {
        const sticky = stickyAttrs(i);
        return `<th class="dskh-th${sticky.cls}" style="width:${viewWidths[i]}px;${sticky.style}" title="${escAttr(name)}"><span class="dskh-th-text">${escHtml(name)}</span></th>`;
      }).join("");

    viewRows = rows;
    rowsTableBody.innerHTML = "";
    renderedCount = 0;
    spreadsheetContainer.scrollTop = 0;
    spreadsheetContainer.scrollLeft = 0;
    sourceTable.style.display = rows.length ? "" : "none";
    emptyState.style.display = rows.length ? "none" : "flex";
    emptyState.innerHTML = emptyHtml;
    appendNextBatch();
  }

  function appendNextBatch() {
    if (renderedCount >= viewRows.length) return;
    const end = Math.min(viewRows.length, renderedCount + BATCH_SIZE);
    let html = "";
    for (let i = renderedCount; i < end; i++) html += rowHtml(viewRows[i], i);
    rowsTableBody.insertAdjacentHTML("beforeend", html);
    renderedCount = end;
  }

  // Ô ⁉️: mỗi giá trị 1 dòng "✓ nguồn giá trị"; data-r / data-c để bấm chọn biết ô nào
  function mergeCellHtml(cell, colIdx, rowIdx) {
    const manual = cell.chosen !== cell.pick;
    const lines = cell.options.map((o, k) => {
      const picked = k === cell.chosen;
      return `<div class="dskh-opt${picked ? " is-picked" : ""}" data-opt="${k}" title="${escAttr(o.value)}">` +
        `<span class="dskh-opt-mark">${picked ? "✓" : ""}</span>` +
        `<span class="dskh-opt-src">${escHtml(o.sources.map(sourceTag).join(" "))}</span>` +
        `<span class="dskh-opt-val">${escHtml(o.value)}</span></div>`;
    }).join("");
    const dup = dupInfo(cell);
    const title = (manual ? "Đã chọn tay. Bấm dòng khác để đổi" : "Giá trị khác nhau: bấm 1 dòng để chọn giá trị lấy") + dup.title;
    return tdHtml(`dskh-merge is-changed${manual ? " is-manual" : ""}${dup.cls}`, colIdx, title, ` data-r="${rowIdx}" data-c="${colIdx}"`, lines);
  }

  // Ô Điện thoại trùng khách khác (markDuplicatePhones): viền đỏ + ghi mã trùng khi rê chuột
  function dupInfo(cell) {
    if (!cell.dupWith) return { cls: "", title: "" };
    return { cls: " dskh-dup", title: `\nTrùng SĐT với: ${cell.dupWith.join(", ")}` };
  }

  // Thẻ td chung: thêm cố định cột (stickyAttrs), cột đầu (Mã khách hàng) chữ đậm
  function tdHtml(cls, colIdx, title, extraAttrs, innerHtml) {
    const sticky = stickyAttrs(colIdx);
    const classes = `td-text${cls ? ` ${cls}` : ""}${colIdx === 0 ? " dskh-code" : ""}${sticky.cls}`;
    const style = sticky.style ? ` style="${sticky.style}"` : "";
    return `<td class="${classes}"${style}${title ? ` title="${escAttr(title)}"` : ""}${extraAttrs}>${innerHtml}</td>`;
  }

  // Ô số (5 cột Điểm … Tổng SL hoàn trả): căn phải; Điểm ⚠️ (nâng theo chi tiêu) chữ cam, ➕ (khác 🛑) chữ xanh lá.
  // Rê chuột: giá trị ở từng nguồn -> kết quả gộp
  function numberCellHtml(cell, colIdx) {
    const fmt = n => (n === null ? "—" : n.toLocaleString("vi-VN"));
    const sourcesText = cell.sources.map(s => `${sourceTag(s.key)} ${fmt(s.num)}`).join(" · ");
    let title = `${sourcesText} → ${cell.value}`;
    if (cell.flag === "raised") {
      title = `Nâng theo Tổng chi tiêu ${fmt(cell.total)} → ${cell.value} điểm (gộp được ${fmt(cell.merged)})\n${sourcesText}`;
    }
    const flagCls = cell.flag ? ` is-${cell.flag}` : "";
    return tdHtml(`dskh-num${flagCls}`, colIdx, title, "", escHtml(cell.value));
  }

  function cellHtml(cell, colIdx, rowIdx) {
    if (typeof cell === "string") return tdHtml("", colIdx, cell, "", escHtml(cell));
    if (cell.kind === "number") return numberCellHtml(cell, colIdx);
    if (cell.kind === "merge") return mergeCellHtml(cell, colIdx, rowIdx);
    if (cell.kind === "new" || cell.kind === "plain") {
      const dup = dupInfo(cell);
      const isNew = cell.kind === "new";
      const title = (isNew ? `Khách mới: ${cell.text}` : cell.text) + dup.title;
      return tdHtml(`${isNew ? "dskh-merge is-new" : ""}${dup.cls}`.trim(), colIdx, title, "", escHtml(cell.text));
    }
    const data = cell.data ? ` data-tab="${escAttr(cell.data.tab)}" data-row="${cell.data.row}"` : "";
    return tdHtml(cell.cls, colIdx, cell.title, data, escHtml(cell.text));
  }

  function rowHtml(cells, i) {
    const numEdge = frozenEdge < 0 ? " dskh-freeze-edge" : "";
    const num = cells.num || i + 1; // tab Đồng bộ: số thứ tự gốc (giữ nguyên khi lọc)
    return `<tr class="excel-row"><td class="td-num dskh-sticky dskh-sticky-num${numEdge}">${num}</td>${cells.map((c, col) => cellHtml(c, col, i)).join("")}</tr>`;
  }

  // Bấm 1 dòng trong ô ⁉️: chọn giá trị đó (bấm dòng công thức chọn = bỏ chọn tay), lưu lại, vẽ lại riêng ô đó
  function pickOption(td, optIdx) {
    const rowIdx = Number(td.dataset.r);
    const colIdx = Number(td.dataset.c);
    const cell = viewRows[rowIdx][colIdx];
    if (optIdx === cell.chosen) return;
    cell.chosen = optIdx;
    if (optIdx === cell.pick) delete choices[cell.key];
    else choices[cell.key] = cell.options[optIdx].value;
    StorageHelper.set(CHOICES_KEY, choices);
    // Đổi ✓ ở cột Điện thoại làm thay đổi Trùng SĐT -> vẽ lại cả bảng; cột khác chỉ vẽ lại ô
    if (viewColumns[colIdx] === COLUMNS[DskhParser.PHONE_COL]) refreshSyncKeepScroll();
    else td.outerHTML = mergeCellHtml(cell, colIdx, rowIdx);
  }

  // Chuyển sang tab nhập, vẽ đủ tới dòng cần xem, cuộn tới và nháy sáng dòng đó
  function jumpToRow(tabKey, rowIdx) {
    selectTab(tabKey);
    while (renderedCount <= rowIdx && renderedCount < viewRows.length) appendNextBatch();
    const tr = rowsTableBody.rows[rowIdx];
    if (!tr) return;
    tr.scrollIntoView({ block: "center" });
    tr.classList.remove("dskh-row-flash");
    void tr.offsetWidth;
    tr.classList.add("dskh-row-flash");
  }

  // ---------- Dán / Xóa ----------
  async function pasteText(text) {
    if (activeTab === SYNC_TAB) {
      showToast("⚠️ Chọn tab DSKH cần dán trước!");
      return;
    }
    const parsed = DskhParser.parseTable(text);
    if (parsed.error === "empty") {
      showToast("⚠️ Clipboard đang trống!");
      return;
    }
    if (parsed.error === "no-header") {
      showToast("⚠️ Không thấy cột \"Mã khách hàng\". Copy kèm dòng tiêu đề rồi dán lại!", 4000);
      return;
    }
    tables[activeTab] = parsed;
    invalidateSync();
    await StorageHelper.set(inputKey(activeTab), text);
    renderTabs();
    renderSourceView();
    const missing = parsed.missing.length ? ` (thiếu ${parsed.missing.length} cột)` : "";
    showToast(`📋 Đã dán ${countText(parsed.rows.length)} khách hàng vào ${findInputTab(activeTab).label}${missing}!`, 3000);
  }

  function bindEvents() {
    sourceTabs.addEventListener("click", (e) => {
      if (e.target.closest("#btnAddBranch")) {
        openAddBranch();
        return;
      }
      const btn = e.target.closest(".dskh-tab");
      if (btn) selectTab(btn.dataset.tab);
    });

    sourceTabs.addEventListener("input", (e) => {
      if (e.target.id === "newBranchInput") updateAddBranchHint(e.target);
    });

    sourceTabs.addEventListener("keydown", (e) => {
      if (e.target.id !== "newBranchInput") return;
      if (e.key === "Enter") {
        e.preventDefault();
        submitAddBranch(e.target.value);
      } else if (e.key === "Escape") {
        e.preventDefault();
        closeAddBranch();
      }
    });

    // Bấm ra ngoài thanh tab = hủy nhập tên chi nhánh (bấm vào tab khác thì selectTab tự đóng)
    sourceTabs.addEventListener("focusout", (e) => {
      if (e.target.id !== "newBranchInput") return;
      if (e.relatedTarget && sourceTabs.contains(e.relatedTarget)) return;
      closeAddBranch();
    });

    btnPaste.addEventListener("click", async () => {
      let text = "";
      try {
        text = await navigator.clipboard.readText();
      } catch (e) {
        showToast("⚠️ Không đọc được clipboard, hãy bấm Ctrl + V trong cửa sổ này!");
        return;
      }
      pasteText(text);
    });

    // Ctrl + V ở bất kỳ đâu trong cửa sổ (trừ ô nhập liệu) = Dán vào tab đang chọn
    document.addEventListener("paste", (e) => {
      const tag = e.target && e.target.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return;
      e.preventDefault();
      pasteText(e.clipboardData ? e.clipboardData.getData("text") : "");
    });

    btnClearTab.addEventListener("click", async () => {
      const label = findInputTab(activeTab).label;
      if (!ToolShell.confirmByDoubleClick(btnClearTab, `Bấm lần nữa để xóa dữ liệu ${label}`)) return;
      tables[activeTab] = DskhParser.parseTable("");
      invalidateSync();
      await StorageHelper.remove(inputKey(activeTab));
      renderTabs();
      renderSourceView();
      showToast("🗑️ Đã xóa trắng.");
    });

    btnRemoveBranch.addEventListener("click", removeActiveBranch);
    btnImportMaster.addEventListener("click", importToMaster);
    btnRestoreMaster.addEventListener("click", () => restoreMaster(true));
    document.getElementById("btnUndoImport").addEventListener("click", () => restoreMaster(false));

    syncFilters.addEventListener("change", (e) => {
      const key = e.target.dataset.filter;
      if (!key) return;
      filters[key] = e.target.checked;
      StorageHelper.set(FILTERS_KEY, filters);
      renderSyncView();
    });

    rowsTableBody.addEventListener("click", (e) => {
      const opt = e.target.closest(".dskh-opt");
      if (opt) {
        pickOption(opt.closest("td"), Number(opt.dataset.opt));
        return;
      }
      const cell = e.target.closest(".dskh-ref.is-found");
      if (cell) jumpToRow(cell.dataset.tab, Number(cell.dataset.row));
    });

    btnFreeze.addEventListener("click", () => {
      if (freezeMenu.hidden) openFreezeMenu();
      else closeFreezeMenu();
    });

    freezeMenu.addEventListener("click", (e) => {
      const item = e.target.closest(".dskh-freeze-item");
      if (item && !item.disabled) setFreeze(Number(item.dataset.freeze));
    });

    // Bấm ra ngoài / Esc = đóng menu Cố định
    document.addEventListener("click", (e) => {
      if (!freezeMenu.hidden && !e.target.closest(".dskh-freeze")) closeFreezeMenu();
    });
    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape" && !freezeMenu.hidden) closeFreezeMenu();
    });

    // Đổi cỡ cửa sổ làm số cột cố định thật thay đổi (vượt 60%) thì vẽ lại
    let resizeTimer = null;
    window.addEventListener("resize", () => {
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(() => {
        if (effectiveFreeze() !== frozenEdge + 1) redrawKeepScroll();
      }, 150);
    });

    spreadsheetContainer.addEventListener("scroll", () => {
      const left = spreadsheetContainer.scrollHeight - spreadsheetContainer.scrollTop - spreadsheetContainer.clientHeight;
      if (left < LOAD_MORE_GAP) appendNextBatch();
    });
  }
})();
