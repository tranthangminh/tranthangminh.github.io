// ==========================================================================
// MODULE QUẢN TRỊ NHẬP HÀNG (IMPORT MANAGEMENT MODULE)
// Chỉ tải dữ liệu khi đã đăng nhập Quản Trị Viên (Admin)
// Sắp xếp mặc định: Ngày mới nhất ở trên cùng
// ==========================================================================

const IMPORT_API_URL = "https://script.google.com/macros/s/AKfycby6OJtOZFpRldqw5oEZK318FsF-YV-gFZVPT2RycNdkezdpilFNGvhb-ax24ZFeD1pzOw/exec";

let importRawData = [];
let importGroupedData = [];
let importFilteredGroups = [];
let isImportLoading = false;
let importRenderLimit = 50;
let isImportEditMode = false;
let editedRowsMap = new Map();

// Khởi chạy khi DOM sẵn sàng
document.addEventListener("DOMContentLoaded", initImportModule);

async function initImportModule() {
  setupImportEventListeners();

  // BẢO MẬT: Chỉ tải dữ liệu khi đã đăng nhập Quản Trị Viên
  try {
    if (typeof StorageHelper !== "undefined") {
      const isAdmin = await StorageHelper.get("isAdminLoggedIn", false);
      if (!isAdmin) {
        return; // Chưa đăng nhập -> Không tải bất kỳ dữ liệu nào
      }

      const cached = await StorageHelper.get("cachedImportData", []);
      if (Array.isArray(cached) && cached.length > 0) {
        importRawData = sortImportData(cached);
        renderImportList();
      }
      fetchImportData(true);
    }
  } catch (e) {
    // Bỏ qua lỗi nạp storage
  }
}

// Chuyển chuỗi ngày (DD/MM/YYYY, DD/MM, YYYY-MM-DD...) thành timestamp để sort
function parseDateValue(dateStr) {
  if (!dateStr) return 0;
  const s = String(dateStr).trim();
  const m = s.match(/^(\d{1,2})[\/\-\.](\d{1,2})[\/\-\.](\d{4})(?:\s+(\d{1,2}):(\d{1,2})(?::(\d{1,2}))?)?/);
  if (m) {
    return new Date(
      parseInt(m[3], 10),
      parseInt(m[2], 10) - 1,
      parseInt(m[1], 10),
      m[4] ? parseInt(m[4], 10) : 0,
      m[5] ? parseInt(m[5], 10) : 0,
      m[6] ? parseInt(m[6], 10) : 0
    ).getTime();
  }
  const mIso = s.match(/^(\d{4})[\/\-\.](\d{1,2})[\/\-\.](\d{1,2})/);
  if (mIso) {
    return new Date(parseInt(mIso[1], 10), parseInt(mIso[2], 10) - 1, parseInt(mIso[3], 10)).getTime();
  }
  const mShort = s.match(/^(\d{1,2})[\/\-\.](\d{1,2})$/);
  if (mShort) {
    return new Date(new Date().getFullYear(), parseInt(mShort[2], 10) - 1, parseInt(mShort[1], 10)).getTime();
  }
  const t = Date.parse(s);
  return isNaN(t) ? 0 : t;
}

// Sắp xếp dữ liệu: Ngày mới nhất lên trên cùng
function sortImportData(items) {
  if (!Array.isArray(items)) return [];
  return [...items].sort((a, b) => parseDateValue(b.ngay) - parseDateValue(a.ngay));
}

// Định dạng tiền tệ VNĐ
function formatMoneyVND(val) {
  if (val === null || val === undefined || val === "") return "0đ";
  const num = typeof val === "number" ? val : parseInt(String(val).replace(/\D/g, ""), 10);
  if (isNaN(num)) return String(val);
  return num.toLocaleString("vi-VN") + "đ";
}

// Hiển thị thanh tiến trình đang tải danh sách Nhập
function showImportLoadingIndicator() {
  const bar = document.getElementById("importLoadingBar");
  if (bar) bar.style.display = "flex";
  const countEl = document.getElementById("importSummaryCount");
  if (countEl) countEl.innerText = "⏳ Đang đồng bộ...";
}

// Ẩn thanh tiến trình tải danh sách Nhập
function hideImportLoadingIndicator() {
  const bar = document.getElementById("importLoadingBar");
  if (bar) bar.style.display = "none";
}

// Tải dữ liệu từ Google Apps Script (Chỉ khi đã đăng nhập Admin)
async function fetchImportData(silent = false) {
  if (isImportLoading) return;

  // BẢO MẬT: Xác thực lại quyền Quản trị trước khi gọi mạng
  if (typeof StorageHelper !== "undefined") {
    const isAdmin = await StorageHelper.get("isAdminLoggedIn", false);
    if (!isAdmin) return;
  }

  isImportLoading = true;
  if (!silent) {
    showImportLoadingIndicator();
  }

  const listContainer = document.getElementById("importListContainer");

  // Chỉ hiển thị placeholder đang tải nếu trước đó chưa có dữ liệu nào trong RAM
  if (!silent && listContainer && importRawData.length === 0) {
    listContainer.innerHTML = `<div class="import-empty-state">⏳ Đang tải dữ liệu từ Google Sheet...</div>`;
  }

  try {
    const res = await fetch(`${IMPORT_API_URL}?t=${Date.now()}`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();

    if (Array.isArray(data) && data.length > 0) {
      importRawData = sortImportData(data);
      if (typeof StorageHelper !== "undefined") {
        await StorageHelper.set("cachedImportData", importRawData);
      }
      renderImportList();
      if (!silent && typeof showToast === "function") {
        showToast(`✨ Đã nạp ${importRawData.length.toLocaleString("vi-VN")} dòng nhập hàng!`);
      }
    } else {
      throw new Error(data?.error || "Dữ liệu trả về rỗng hoặc không hợp lệ");
    }
  } catch (err) {
    if (listContainer && importRawData.length === 0) {
      listContainer.innerHTML = `<div class="import-empty-state" style="color: var(--c-red);">⚠️ Lỗi tải dữ liệu: ${err.message}</div>`;
    }
    if (typeof showToast === "function") {
      showToast(`⚠️ Không thể làm mới dữ liệu nhập. Đang giữ dữ liệu cũ!`);
    }
  } finally {
    isImportLoading = false;
    if (!silent) {
      hideImportLoadingIndicator();
    }
  }
}

// Dọn sạch dữ liệu khi Quản Trị Viên đăng xuất
function clearImportData() {
  importRawData = [];
  importGroupedData = [];
  importFilteredGroups = [];
  isImportEditMode = false;
  editedRowsMap.clear();
  hideImportLoadingIndicator();
  toggleImportEditMode(false);
  const listContainer = document.getElementById("importListContainer");
  if (listContainer) listContainer.innerHTML = "";
  const countEl = document.getElementById("importSummaryCount");
  const totalEl = document.getElementById("importSummaryTotal");
  if (countEl) countEl.innerText = "0 mục";
  if (totalEl) totalEl.innerText = "Tổng: 0đ";
}

// Gom các dòng nhập hàng theo Ngày + Người gửi thành từng Kiện Hàng (Package)
function groupImportData(rawItems) {
  if (!Array.isArray(rawItems)) return [];

  const groupsMap = new Map();
  const groupsList = [];

  rawItems.forEach((item, idx) => {
    const dateVal = String(item.ngay || "").trim();
    const senderVal = String(item.nguoi_gui || "").trim();
    const cleanSender = (senderVal && senderVal !== "-") ? senderVal.toLowerCase() : "";

    // Nếu có người gửi hợp lệ: gom theo Ngày + Người gửi
    // Nếu không có người gửi: để riêng từng thẻ độc lập
    const groupKey = cleanSender ? `${dateVal}___${cleanSender}` : `single_${item._row || idx}`;

    if (!groupsMap.has(groupKey)) {
      const group = {
        id: groupKey,
        ngay: item.ngay || "",
        nguoi_gui: item.nguoi_gui || "",
        nguoi_nhap: item.nguoi_nhap || "",
        tinh_trang: item.tinh_trang || "",
        da_thanh_toan: item.da_thanh_toan || "",
        nguon_tien: item.nguon_tien || "",
        ghi_chu: item.ghi_chu || "",
        items: []
      };
      groupsMap.set(groupKey, group);
      groupsList.push(group);
    }

    const grp = groupsMap.get(groupKey);
    // Kế thừa các thông số chung nếu dòng hiện tại có thông tin bổ sung
    if (!grp.nguoi_nhap && item.nguoi_nhap) grp.nguoi_nhap = item.nguoi_nhap;
    if (!grp.tinh_trang && item.tinh_trang) grp.tinh_trang = item.tinh_trang;
    if (!grp.da_thanh_toan && item.da_thanh_toan) grp.da_thanh_toan = item.da_thanh_toan;
    if (!grp.nguon_tien && item.nguon_tien) grp.nguon_tien = item.nguon_tien;
    if (!grp.ghi_chu && item.ghi_chu) grp.ghi_chu = item.ghi_chu;

    grp.items.push(item);
  });

  return groupsList;
}

// Tạo HTML cho từng thẻ kiện hàng (Gom các sản phẩm của cùng Người gửi trong Ngày)
function createImportCardHtml(group, idx = 0) {
  const esc = (txt) => (typeof escAttr === "function" ? escAttr(String(txt || "")) : String(txt || ""));
  const cleanStr = (val) => (val === undefined || val === null ? "" : String(val).trim());
  const strip = (s) => (typeof removeAccents === "function" ? removeAccents(s) : String(s || "").toLowerCase());

  const groupId = group.id || `grp_${idx}`;
  const isDirty = group.items.some(it => editedRowsMap.has(String(it._row)));
  const ce = isImportEditMode ? 'contenteditable="true"' : "";

  // Tính tổng tiền & số lượng sản phẩm trong kiện
  let groupTotal = 0;
  let groupQty = 0;
  group.items.forEach(it => {
    const rawGia = formatInputPrice(it.gia);
    const rawSl = parseInt(String(it.sl || "1").replace(/\D/g, ""), 10) || 1;
    const rawTotal = it.thanh_tien ? parseInt(String(it.thanh_tien).replace(/\D/g, ""), 10) : 0;
    groupTotal += (rawTotal > 0 ? rawTotal : (rawGia * rawSl));
    groupQty += rawSl;
  });

  // Hàng 4 (Dùng chung): Trạng thái (Đã nhận...)
  let statusHtml = "";
  const ttRaw = cleanStr(group.tinh_trang);
  const statusVal = ttRaw || (isImportEditMode ? "Đã Nhận" : "Chưa nhận");
  const s = strip(statusVal);
  let sClass = "badge-status-default";
  if (s.includes("da ve") || s.includes("da nhan") || s.includes("hoan thanh") || s.includes("xong")) {
    sClass = "badge-status-done";
  } else if (s.includes("dang") || s.includes("cho") || s.includes("hoi")) {
    sClass = "badge-status-pending";
  } else if (s.includes("huy") || s.includes("hoan hang")) {
    sClass = "badge-status-cancel";
  }
  statusHtml = `<span class="import-badge ${sClass}" data-field="tinh_trang" data-val="${esc(statusVal)}" ${ce}>📦 ${esc(statusVal)}</span>`;

  // Hàng 4 (Dùng chung): Đã thanh toán (View: gọn gàng chữ "Đã Thanh Toán" hoặc "Chưa Thanh Toán", Edit: click vào hiện con số)
  let paidHtml = "";
  const ttPay = cleanStr(group.da_thanh_toan);
  const numPay = parseInt(ttPay.replace(/\D/g, ""), 10) || 0;
  const pPay = strip(ttPay);
  const isUnpaid = ttPay === "0" || pPay.includes("chua") || pPay === "no" || pPay === "false";
  const isPaid = !isUnpaid && (numPay > 0 || pPay.includes("roi") || pPay.includes("da") || pPay.includes("yes") || pPay.includes("ok"));

  const storedPayVal = isPaid ? (numPay > 0 ? numPay.toLocaleString("vi-VN") : (groupTotal > 0 ? groupTotal.toLocaleString("vi-VN") : (ttPay || "Đã TT"))) : "0";
  if (isPaid) {
    paidHtml = `<span class="import-badge badge-paid-yes" data-field="da_thanh_toan" data-val="${esc(storedPayVal)}" ${ce}>✓ Đã Thanh Toán</span>`;
  } else {
    paidHtml = `<span class="import-badge badge-paid-no" data-field="da_thanh_toan" data-val="0" ${ce}>✗ Chưa Thanh Toán</span>`;
  }

  // Hàng 4 (Dùng chung): Nguồn tiền
  let fundHtml = "";
  const ttFund = cleanStr(group.nguon_tien);
  if (ttFund) {
    fundHtml = `<span class="import-badge badge-fund" data-field="nguon_tien" data-val="${esc(ttFund)}" ${ce} title="Nguồn tiền / Quỹ">💳 ${esc(ttFund)}</span>`;
  } else if (isImportEditMode) {
    fundHtml = `<span class="import-badge badge-fund is-placeholder" data-field="nguon_tien" data-val="" contenteditable="true" title="Thêm nguồn tiền">💳 + Nguồn</span>`;
  } else {
    fundHtml = `<span class="import-badge badge-fund badge-fund-empty" data-val="" title="Chưa có nguồn tiền">💳 —</span>`;
  }

  // Ghi chú (Dùng chung)
  let noteHtml = "";
  if (group.ghi_chu) {
    noteHtml = `<div class="import-card-note" data-field="ghi_chu" ${ce}>📝 ${esc(group.ghi_chu)}</div>`;
  } else if (isImportEditMode) {
    noteHtml = `<div class="import-card-note is-placeholder" data-field="ghi_chu" contenteditable="true">📝 + Thêm ghi chú...</div>`;
  }

  // Danh sách sản phẩm riêng biệt trong kiện
  const productsHtml = group.items.map((item, pIdx) => {
    const rowId = item._row !== undefined ? String(item._row) : `idx_${pIdx}`;
    let sizeHtml = "";
    if (item.dung_tich) {
      sizeHtml = `<span class="import-badge-size" data-field="dung_tich" ${ce}>${esc(item.dung_tich)}</span>`;
    } else if (isImportEditMode) {
      sizeHtml = `<span class="import-badge-size is-placeholder" data-field="dung_tich" contenteditable="true">+ Dung tích</span>`;
    }

    const showNum = group.items.length > 1;
    const rawGia = formatInputPrice(item.gia);
    const rawSl = parseInt(String(item.sl || "1").replace(/\D/g, ""), 10) || 1;
    const itemTotal = item.thanh_tien ? formatMoneyVND(item.thanh_tien) : formatMoneyVND(rawGia * rawSl);

    return `
      <div class="import-product-item" data-row-id="${rowId}">
        <!-- Tên sản phẩm bên trái, Dung tích bên phải -->
        <div class="import-card-row-title">
          <div class="import-prod-title">
            ${showNum ? `<span class="import-prod-num">${pIdx + 1}.</span>` : ""}
            <span class="import-card-name" data-field="ten" ${ce} title="${esc(item.ten || '')}">${esc(item.ten || (isImportEditMode ? "Chưa có tên" : ""))}</span>
          </div>
          ${sizeHtml}
        </div>

        <!-- 3 cột Giá, SL và Tổng -->
        <div class="import-card-pricing">
          <div class="import-price-col import-col-price">
            <span class="import-label">Giá:</span>
            <span class="import-val-price" data-field="gia" ${ce}>${formatMoneyVND(item.gia)}</span>
          </div>
          <div class="import-price-col import-col-qty">
            <span class="import-label">SL:</span>
            <span class="import-val-bold" data-field="sl" ${ce}>${esc(item.sl || "1")}</span>
          </div>
          <div class="import-price-col import-col-total">
            <span class="import-label">Tổng:</span>
            <span class="import-val-total import-val-locked" data-field="thanh_tien" contenteditable="false" title="Tổng tiền tự động tính theo Giá × SL">${itemTotal}</span>
          </div>
        </div>
      </div>
    `;
  }).join("");

  // Dòng tóm tắt tổng cả kiện hàng (nếu có từ 2 sản phẩm trở lên)
  const groupSummaryHtml = group.items.length > 1 ? `
    <div class="import-card-group-summary">
      <span>Kiện hàng: <strong>${group.items.length} món</strong> (${groupQty} chai)</span>
      <span class="import-group-total">Tổng kiện: <strong>${formatMoneyVND(groupTotal)}</strong></span>
    </div>
  ` : "";

  return `
    <div class="import-card ${isImportEditMode ? "card-editable" : ""} ${isDirty ? "card-dirty" : ""}" data-group-id="${groupId}" data-index="${idx}">
      <!-- Hàng 1: Tiêu đề 3 cột Ngày tháng, Người gửi, Người nhập (DÙNG CHUNG) -->
      <div class="import-card-row-top">
        <div class="import-top-col import-top-date">
          <span class="import-top-val" data-field="ngay" ${ce}>${esc(group.ngay || (isImportEditMode ? "--/--/----" : ""))}</span>
        </div>
        <div class="import-top-col import-top-sender">
          <span class="import-top-val" data-field="nguoi_gui" ${ce} title="Người gửi: ${esc(group.nguoi_gui || '')}">${esc(group.nguoi_gui || (isImportEditMode ? "—" : ""))}</span>
        </div>
        <div class="import-top-col import-top-receiver">
          <span class="import-top-val" data-field="nguoi_nhap" ${ce} title="Người nhập: ${esc(group.nguoi_nhap || '')}">${esc(group.nguoi_nhap || (isImportEditMode ? "—" : ""))}</span>
        </div>
      </div>

      <!-- Danh sách sản phẩm riêng biệt trong kiện -->
      <div class="import-products-list">
        ${productsHtml}
      </div>

      <!-- Hàng 4: Trạng thái, Thanh toán, Nguồn tiền và Ghi chú (DÙNG CHUNG) -->
      <div class="import-card-footer">
        <div class="import-footer-badges">
          ${statusHtml}
          ${paidHtml}
          ${fundHtml}
        </div>
        ${noteHtml}
        ${groupSummaryHtml}
      </div>
    </div>
  `;
}

// Hiển thị danh sách nhập hàng theo từng kiện & thanh tóm tắt
function renderImportList(resetLimit = true) {
  const listContainer = document.getElementById("importListContainer");
  const countEl = document.getElementById("importSummaryCount");
  const totalEl = document.getElementById("importSummaryTotal");
  const searchInput = document.getElementById("importSearchBox");

  if (!listContainer) return;

  if (resetLimit) {
    importRenderLimit = 50;
    listContainer.scrollTop = 0;
  }

  // Gom nhóm dữ liệu thô theo Ngày + Người gửi
  importGroupedData = groupImportData(importRawData);

  const query = (searchInput?.value || "").trim().toLowerCase();
  importFilteredGroups = importGroupedData.filter((grp) => {
    if (!query) return true;
    // Tìm kiếm ở cấp thông tin chung của kiện
    if (
      (grp.ngay && grp.ngay.includes(query)) ||
      (grp.nguoi_gui && grp.nguoi_gui.toLowerCase().includes(query)) ||
      (grp.nguoi_nhap && grp.nguoi_nhap.toLowerCase().includes(query)) ||
      (grp.tinh_trang && grp.tinh_trang.toLowerCase().includes(query)) ||
      (grp.nguon_tien && grp.nguon_tien.toLowerCase().includes(query)) ||
      (grp.ghi_chu && grp.ghi_chu.toLowerCase().includes(query))
    ) {
      return true;
    }
    // Tìm kiếm ở cấp từng sản phẩm bên trong kiện
    return grp.items.some((it) =>
      (it.ten && it.ten.toLowerCase().includes(query)) ||
      (it.dung_tich && it.dung_tich.toLowerCase().includes(query)) ||
      (it.gia && String(it.gia).includes(query))
    );
  });

  // Tính tổng tiền và tổng sản phẩm
  let sumMoney = 0;
  let totalItemsCount = 0;
  importFilteredGroups.forEach((grp) => {
    grp.items.forEach((it) => {
      totalItemsCount++;
      const raw = String(it.thanh_tien || it.gia || "").replace(/\D/g, "");
      const val = parseInt(raw, 10);
      if (!isNaN(val)) sumMoney += val;
    });
  });

  if (countEl) {
    countEl.innerText = `${importFilteredGroups.length.toLocaleString("vi-VN")} kiện (${totalItemsCount.toLocaleString("vi-VN")} món)`;
  }
  if (totalEl) {
    totalEl.innerText = `Tổng: ${formatMoneyVND(sumMoney)}`;
  }

  if (importFilteredGroups.length === 0) {
    listContainer.innerHTML = isImportLoading
      ? `<div class="import-empty-state">⏳ Đang tải dữ liệu từ Google Sheet...</div>`
      : `<div class="import-empty-state">Không có dữ liệu nhập hàng nào.</div>`;
    return;
  }

  const batch = importFilteredGroups.slice(0, importRenderLimit);
  listContainer.innerHTML = batch.map((group, idx) => createImportCardHtml(group, idx)).join("");
}

// ==========================================================================
// CÁC HÀM TẠO TỪ ĐIỂN VÀ GỢI Ý (SUGGESTION DICTIONARIES)
// ==========================================================================

// Chuẩn hóa HTML an toàn
function escHtml(str) {
  if (str === undefined || str === null) return "";
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

// 1. Tên sản phẩm: CHỈ lấy danh sách nước hoa hiện tại (allProducts), KHÔNG lấy từ lịch sử 2.587 dòng nhập
function getProductSuggestions() {
  if (typeof allProducts === "undefined" || !Array.isArray(allProducts)) return [];
  const set = new Set();
  allProducts.forEach(p => {
    const name = (p && p.name) ? String(p.name).trim() : "";
    if (name && name !== "-") set.add(name);
  });
  return Array.from(set).sort((a, b) => a.localeCompare(b, "vi"));
}

// 2. Dung tích: Hiển thị biến thể Full, Tester theo 5 cột dungtich1..dungtich5 của sản phẩm hiện tại, chiết mặc định 5, 10, 20ml
function getCapacitySuggestions(currentProductName) {
  const results = [];
  const added = new Set();
  function add(val) {
    if (!val) return;
    const v = String(val).trim();
    if (v && !added.has(v)) {
      added.add(v);
      results.push(v);
    }
  }

  // Tìm sản phẩm trong danh mục hiện tại allProducts
  let currentProd = null;
  if (currentProductName && typeof allProducts !== "undefined" && Array.isArray(allProducts)) {
    const cleanName = typeof removeAccents === "function" ? removeAccents(currentProductName) : currentProductName.toLowerCase().trim();
    currentProd = allProducts.find(p => {
      if (!p || !p.name) return false;
      const n = typeof removeAccents === "function" ? removeAccents(p.name) : p.name.toLowerCase().trim();
      return n === cleanName;
    });
  }

  if (currentProd) {
    // Lấy biến thể Full, Tester theo dungtich1..dungtich5 của chính sản phẩm đó
    for (let i = 1; i <= 5; i++) {
      const rawDt = currentProd['dungtich' + i];
      if (rawDt && rawDt !== "-") {
        const dtVal = typeof formatDungTichValue === "function" ? formatDungTichValue(rawDt) : (String(rawDt).replace(/ml$/i, "").trim() + "ml");
        if (dtVal) {
          const fullVal = dtVal.toLowerCase().startsWith("full") ? dtVal : `Full ${dtVal}`;
          const testerVal = dtVal.toLowerCase().startsWith("tester") ? dtVal : `Tester ${dtVal}`;
          add(fullVal);
          add(testerVal);
        }
      }
    }
  } else {
    // Fallback: nếu chưa chọn sản phẩm hoặc không tìm thấy, gợi ý các dung tích chuẩn từ allProducts
    if (typeof allProducts !== "undefined" && Array.isArray(allProducts)) {
      const allDt = new Set();
      allProducts.forEach(p => {
        for (let i = 1; i <= 5; i++) {
          const raw = p['dungtich' + i];
          if (raw && raw !== "-") {
            const dt = typeof formatDungTichValue === "function" ? formatDungTichValue(raw) : (String(raw).replace(/ml$/i, "").trim() + "ml");
            if (dt) allDt.add(dt);
          }
        }
      });
      ["100ml", "50ml", "75ml", "90ml", "125ml", "30ml"].forEach(dt => {
        if (allDt.has(dt)) {
          add(`Full ${dt}`);
          add(`Tester ${dt}`);
        }
      });
      allDt.forEach(dt => {
        add(`Full ${dt}`);
        add(`Tester ${dt}`);
      });
    }
  }

  // Chiết mặc định: 5ml, 10ml, 20ml
  ["5ml", "10ml", "20ml"].forEach(add);

  return results;
}

// 3. Toàn bộ gợi ý các trường khác: Người gửi, Người nhập, Trạng thái, Nguồn tiền, Ghi chú
// CHỈ dựa theo dữ liệu lịch sử 2.587 dòng nhập, KHÔNG tự ý thêm giá trị ảo (như Tiền mặt...)
function getHistoryFieldSuggestions(fieldName) {
  if (!Array.isArray(importRawData)) return [];
  const set = new Set();
  importRawData.forEach(item => {
    let val = item[fieldName];
    if (val !== undefined && val !== null) {
      let s = String(val).trim();
      if (s && s !== "-" && s !== "null" && s !== "undefined") {
        set.add(s);
      }
    }
  });
  return Array.from(set).sort((a, b) => a.localeCompare(b, "vi"));
}

// 4. Gợi ý thông minh cho trường ĐÃ THANH TOÁN:
// - Lấy chính xác Tổng tiền của thẻ hiện tại
// - Gợi ý: "Đã Thanh Toán (<Tổng tiền>)" (click vào hiện số) và "Chưa Thanh Toán (0)"
function getPaymentSuggestions(card) {
  let cardTotal = 0;
  if (card) {
    const prodItems = card.querySelectorAll(".import-product-item");
    if (prodItems.length > 0) {
      prodItems.forEach(pItem => {
        const totalEl = pItem.querySelector('[data-field="thanh_tien"]');
        let itemTotal = 0;
        if (totalEl && totalEl.innerText) {
          itemTotal = parseInt(totalEl.innerText.replace(/\D/g, ""), 10) || 0;
        }
        if (itemTotal === 0) {
          const giaEl = pItem.querySelector('[data-field="gia"]');
          const slEl = pItem.querySelector('[data-field="sl"]');
          const numGia = formatInputPrice(giaEl ? giaEl.innerText : "0");
          const numSl = parseInt((slEl ? slEl.innerText : "1").replace(/\D/g, ""), 10) || 1;
          itemTotal = numGia * numSl;
        }
        cardTotal += itemTotal;
      });
    } else {
      const totalEl = card.querySelector('[data-field="thanh_tien"]');
      if (totalEl && totalEl.innerText) {
        cardTotal = parseInt(totalEl.innerText.replace(/\D/g, ""), 10) || 0;
      }
    }
  }

  const items = [];
  if (cardTotal > 0) {
    items.push({
      label: `Đã Thanh Toán (${cardTotal.toLocaleString("vi-VN")}đ)`,
      val: cardTotal.toLocaleString("vi-VN")
    });
  } else {
    items.push({
      label: "Đã Thanh Toán",
      val: "Đã TT"
    });
  }

  items.push({
    label: "Chưa Thanh Toán (0)",
    val: "0"
  });

  return items;
}

// Chuẩn hóa mảng gợi ý về cấu trúc thống nhất { label, val }
function normalizeCandidates(arr) {
  if (!Array.isArray(arr)) return [];
  return arr.map(item => {
    if (typeof item === "object" && item !== null && item.label && item.val !== undefined) {
      return item;
    }
    return { label: String(item), val: String(item) };
  });
}

// 5. Định dạng và xử lý giá tiền tự động điền 3 số 0 và thêm đ ở sau
// Thí dụ: nhập 2500 -> 2.500.000đ, nhập 350 -> 350.000đ, nhập 2500000 -> 2.500.000đ
function formatInputPrice(rawStr) {
  const digits = String(rawStr || "").replace(/\D/g, "");
  let num = parseInt(digits, 10);
  if (isNaN(num) || num <= 0) return 0;
  // Nếu nhập dạng rút gọn (< 100.000, tự động điền 3 số 0)
  if (num < 100000) {
    num = num * 1000;
  }
  return num;
}

// ==========================================================================
// BỘ ĐIỀU KHIỂN DROPDOWN COMBOBOX GỢI Ý TRỰC TIẾP TRÊN THẺ
// ==========================================================================

let activeComboboxTarget = null;
let activeComboboxItems = [];
let activeComboboxIndex = -1;
let comboboxMenuEl = null;

function getOrCreateComboboxMenu() {
  if (!comboboxMenuEl) {
    comboboxMenuEl = document.createElement("div");
    comboboxMenuEl.id = "importComboboxMenu";
    comboboxMenuEl.className = "import-combobox-menu";
    comboboxMenuEl.style.display = "none";
    document.body.appendChild(comboboxMenuEl);

    comboboxMenuEl.addEventListener("mousedown", (e) => {
      const itemEl = e.target.closest(".import-combo-item");
      if (!itemEl) return;
      e.preventDefault();
      const val = itemEl.getAttribute("data-val");
      selectComboboxValue(val);
    });
  }
  return comboboxMenuEl;
}

function hideComboboxMenu() {
  if (comboboxMenuEl) {
    comboboxMenuEl.style.display = "none";
    comboboxMenuEl.innerHTML = "";
  }
  activeComboboxTarget = null;
  activeComboboxItems = [];
  activeComboboxIndex = -1;
}

function selectComboboxValue(val) {
  if (!activeComboboxTarget) return;
  const target = activeComboboxTarget;
  const fieldName = target.getAttribute("data-field");
  const card = target.closest(".import-card");

  target.setAttribute("data-val", val);

  // Khi click chọn trong dropdown:
  // - Ô hiện con số/chữ thuần túy trong lúc sửa (không dính icon)
  if (fieldName === "tinh_trang") {
    target.innerText = val;
  } else if (fieldName === "nguon_tien") {
    target.innerText = val;
  } else if (fieldName === "da_thanh_toan") {
    target.innerText = val; // Hiện con số thuần túy (VD: 2.500.000 hoặc 0)
  } else if (fieldName === "ghi_chu") {
    target.innerText = val;
  } else {
    target.innerText = val;
  }
  target.classList.remove("is-placeholder");

  hideComboboxMenu();

  if (card) {
    recordCardChange(card);
  }
}

function openComboboxForField(fieldEl, isUserTyping = false) {
  if (!isImportEditMode) return;
  const fieldName = fieldEl.getAttribute("data-field");
  if (fieldName === "ngay" || fieldName === "gia" || fieldName === "sl" || fieldName === "thanh_tien") {
    hideComboboxMenu();
    return;
  }

  const card = fieldEl.closest(".import-card");
  if (!card) return;

  activeComboboxTarget = fieldEl;
  renderComboboxList(isUserTyping);
}

function renderComboboxList(isUserTyping = false) {
  if (!activeComboboxTarget) return;
  const fieldEl = activeComboboxTarget;
  const fieldName = fieldEl.getAttribute("data-field");
  const card = fieldEl.closest(".import-card");
  const menu = getOrCreateComboboxMenu();

  let rawCandidates = [];
  if (fieldName === "ten") {
    rawCandidates = getProductSuggestions();
  } else if (fieldName === "dung_tich") {
    const pItem = fieldEl.closest(".import-product-item");
    const prodNameEl = pItem ? pItem.querySelector('[data-field="ten"]') : card.querySelector('[data-field="ten"]');
    const prodName = prodNameEl ? prodNameEl.innerText.trim() : "";
    rawCandidates = getCapacitySuggestions(prodName);
  } else if (fieldName === "da_thanh_toan") {
    rawCandidates = getPaymentSuggestions(card);
  } else {
    rawCandidates = getHistoryFieldSuggestions(fieldName);
  }

  const candidates = normalizeCandidates(rawCandidates);

  if (candidates.length === 0) {
    hideComboboxMenu();
    return;
  }

  // Xử lý bộ lọc tìm kiếm
  let filtered = candidates;
  let rawQuery = "";

  if (isUserTyping) {
    rawQuery = fieldEl.innerText.trim();
    rawQuery = rawQuery.replace(/^[📝📦💳✓✗\s]+/, "").trim();
    if (fieldEl.classList.contains("is-placeholder") || rawQuery.startsWith("+") || rawQuery === "—" || rawQuery === "--/--/----" || rawQuery === "Chưa có tên") {
      rawQuery = "";
    }

    const normQuery = typeof removeAccents === "function" ? removeAccents(rawQuery) : rawQuery.toLowerCase();

    // Nếu danh sách > 10 mục và đang gõ: lọc gần đúng
    if (candidates.length > 10 && normQuery) {
      filtered = candidates.filter(item => {
        const normLabel = typeof removeAccents === "function" ? removeAccents(item.label) : item.label.toLowerCase();
        const normVal = typeof removeAccents === "function" ? removeAccents(item.val) : item.val.toLowerCase();
        return normLabel.includes(normQuery) || normVal.includes(normQuery);
      });
    }
  }

  // ĐẶC BIỆT: Trường hợp danh sách có <= 10 mục thì LUÔN LUÔN hiện hết tất cả các mục
  if (candidates.length <= 10) {
    filtered = candidates;
  }

  activeComboboxItems = filtered;
  activeComboboxIndex = filtered.length > 0 ? 0 : -1;

  const displayItems = filtered.slice(0, 50);

  if (displayItems.length === 0) {
    menu.innerHTML = `<div class="import-combo-empty">Không có gợi ý có sẵn. Nhấn Enter hoặc click ra ngoài để lưu giá trị mới: <strong>"${escHtml(rawQuery)}"</strong></div>`;
  } else {
    menu.innerHTML = displayItems.map((item, idx) => {
      const isSelected = idx === activeComboboxIndex;
      let displayLabel = escHtml(item.label);
      if (isUserTyping && rawQuery && candidates.length > 10) {
        const normQuery = typeof removeAccents === "function" ? removeAccents(rawQuery) : rawQuery.toLowerCase();
        const normLabel = typeof removeAccents === "function" ? removeAccents(item.label) : item.label.toLowerCase();
        const matchIdx = normLabel.indexOf(normQuery);
        if (matchIdx !== -1) {
          const origMatch = item.label.substring(matchIdx, matchIdx + rawQuery.length);
          displayLabel = `${escHtml(item.label.substring(0, matchIdx))}<mark class="combo-highlight">${escHtml(origMatch)}</mark>${escHtml(item.label.substring(matchIdx + rawQuery.length))}`;
        }
      }
      return `<div class="import-combo-item ${isSelected ? "is-selected" : ""}" data-val="${escHtml(item.val)}" data-idx="${idx}">${displayLabel}</div>`;
    }).join("");
  }

  const rect = fieldEl.getBoundingClientRect();
  const menuWidth = Math.max(rect.width + 20, 200);
  let top = rect.bottom + window.scrollY + 4;
  let left = rect.left + window.scrollX;

  if (left + menuWidth > window.innerWidth - 10) {
    left = Math.max(10, window.innerWidth - menuWidth - 10);
  }

  const estimatedHeight = Math.min(displayItems.length * 32 + 10, 220);
  if (rect.bottom + estimatedHeight > window.innerHeight && rect.top > estimatedHeight) {
    top = rect.top + window.scrollY - estimatedHeight - 4;
  }

  menu.style.top = `${top}px`;
  menu.style.left = `${left}px`;
  menu.style.minWidth = `${menuWidth}px`;
  menu.style.display = "block";
}

function updateComboboxSelectionUI() {
  if (!comboboxMenuEl) return;
  const items = comboboxMenuEl.querySelectorAll(".import-combo-item");
  items.forEach((item, idx) => {
    if (idx === activeComboboxIndex) {
      item.classList.add("is-selected");
      item.scrollIntoView({ block: "nearest" });
    } else {
      item.classList.remove("is-selected");
    }
  });

}

// Bật/Tắt chế độ chỉnh sửa
function toggleImportEditMode(enable) {
  isImportEditMode = typeof enable === "boolean" ? enable : !isImportEditMode;
  const btnEdit = document.getElementById("btnImportEdit");
  const btnCancel = document.getElementById("btnImportCancelEdit");
  const editLabel = btnEdit ? btnEdit.querySelector(".import-edit-label") : null;
  const editIcon = btnEdit ? btnEdit.querySelector(".import-edit-icon") : null;

  if (isImportEditMode) {
    if (btnEdit) {
      btnEdit.classList.add("is-editing");
      btnEdit.title = "Lưu và đẩy thay đổi lên Google Sheet";
    }
    const dirtyCardsCount = document.querySelectorAll(".import-card.card-dirty").length;
    if (editLabel) {
      editLabel.style.display = "inline";
      editLabel.innerText = dirtyCardsCount > 0 ? `Xong (${dirtyCardsCount} kiện)` : "Xong";
    }
    if (editIcon) editIcon.innerText = "✓";
    if (btnCancel) btnCancel.style.display = "flex";
  } else {
    hideComboboxMenu();
    if (btnEdit) {
      btnEdit.classList.remove("is-editing");
      btnEdit.title = "Chế độ chỉnh sửa nhanh";
    }
    if (editLabel) {
      editLabel.style.display = "none";
      editLabel.innerText = "Xong";
    }
    if (editIcon) editIcon.innerText = "✏️";
    if (btnCancel) btnCancel.style.display = "none";
  }

  renderImportList(false);
}

// Ghi nhận thay đổi của một thẻ kiện hàng
function recordCardChange(card) {
  if (!card) return;

  // Đọc các trường dùng chung ở cấp kiện (Header & Footer)
  const readShared = (f) => {
    const el = card.querySelector(`.import-card-row-top [data-field="${f}"], .import-card-footer [data-field="${f}"]`);
    if (!el) return "";
    if (f === "da_thanh_toan" || f === "tinh_trang" || f === "nguon_tien") {
      const stored = el.getAttribute("data-val");
      if (stored !== null && stored !== undefined && stored !== "") return stored;
    }
    let txt = el.innerText.trim();
    txt = txt.replace(/^[📝📦💳✓✗\s]+/, "").trim();
    if (txt.startsWith("+ ") || txt === "—" || txt === "--/--/----" || txt === "+ Nguồn" || txt === "+ Thêm ghi chú...") return "";
    return txt;
  };

  const sharedNgay = readShared("ngay");
  const sharedNguoiGui = readShared("nguoi_gui");
  const sharedNguoiNhap = readShared("nguoi_nhap");
  const sharedTinhTrang = readShared("tinh_trang");
  const sharedDaThanhToan = readShared("da_thanh_toan");
  const sharedNguonTien = readShared("nguon_tien");
  const sharedGhiChu = readShared("ghi_chu");

  // Đọc các trường riêng của từng sản phẩm trong kiện
  const readItemField = (pItem, f) => {
    const el = pItem.querySelector(`[data-field="${f}"]`);
    if (!el) return "";
    let txt = el.innerText.trim();
    txt = txt.replace(/^[📝📦💳✓✗\s]+/, "").trim();
    if (txt.startsWith("+ ") || txt === "—" || txt === "Chưa có tên" || txt === "+ Dung tích") return "";
    return txt;
  };

  const prodItems = card.querySelectorAll(".import-product-item");
  let cardGrandTotal = 0;

  prodItems.forEach((pItem) => {
    const rowId = pItem.getAttribute("data-row-id");
    const original = importRawData.find(it => String(it._row) === String(rowId)) || {};

    const ten = readItemField(pItem, "ten");
    const dungTich = readItemField(pItem, "dung_tich");
    const numGia = formatInputPrice(readItemField(pItem, "gia"));
    const numSl = parseInt(readItemField(pItem, "sl").replace(/\D/g, ""), 10) || 1;
    const numTotal = numGia * numSl;

    cardGrandTotal += numTotal;

    const updatedItem = {
      ...original,
      _row: original._row !== undefined ? original._row : rowId,
      ngay: sharedNgay || original.ngay,
      nguoi_gui: sharedNguoiGui,
      nguoi_nhap: sharedNguoiNhap,
      ten: ten,
      dung_tich: dungTich,
      gia: numGia > 0 ? numGia.toLocaleString("vi-VN") : readItemField(pItem, "gia"),
      sl: String(numSl),
      thanh_tien: numTotal > 0 ? numTotal.toLocaleString("vi-VN") : "",
      tinh_trang: sharedTinhTrang,
      da_thanh_toan: sharedDaThanhToan,
      nguon_tien: sharedNguonTien,
      ghi_chu: sharedGhiChu
    };

    editedRowsMap.set(String(rowId), updatedItem);
  });

  card.classList.add("card-dirty");

  // Cập nhật dòng tóm tắt tổng kiện nếu có
  const summaryTotalEl = card.querySelector(".import-card-group-summary .import-group-total strong");
  if (summaryTotalEl) {
    summaryTotalEl.innerText = formatMoneyVND(cardGrandTotal);
  }

  const dirtyCardsCount = document.querySelectorAll(".import-card.card-dirty").length;
  const btnEdit = document.getElementById("btnImportEdit");
  const editLabel = btnEdit ? btnEdit.querySelector(".import-edit-label") : null;
  if (editLabel) {
    editLabel.innerText = dirtyCardsCount > 0 ? `Xong (${dirtyCardsCount} kiện)` : "Xong";
  }
}

// Lưu các thay đổi lên Google Sheet (Gửi POST)
async function handleSaveImportChanges() {
  if (editedRowsMap.size === 0) {
    toggleImportEditMode(false);
    if (typeof showToast === "function") {
      showToast("Không có thay đổi nào cần lưu.");
    }
    return;
  }

  const btnEdit = document.getElementById("btnImportEdit");
  const editLabel = btnEdit ? btnEdit.querySelector(".import-edit-label") : null;
  const editIcon = btnEdit ? btnEdit.querySelector(".import-edit-icon") : null;

  if (btnEdit) {
    btnEdit.disabled = true;
    if (editLabel) editLabel.innerText = "Đang lưu...";
    if (editIcon) editIcon.innerText = "⏳";
  }

  try {
    const rowsToSend = Array.from(editedRowsMap.values());
    const response = await fetch(IMPORT_API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "text/plain;charset=utf-8"
      },
      body: JSON.stringify({
        action: "update_import_rows",
        rows: rowsToSend
      })
    });

    const resText = await response.text();
    let resJson = null;
    try {
      resJson = JSON.parse(resText);
    } catch (e) {
      if (resText.includes("doPost") || resText.includes("Không tìm thấy hàm")) {
        throw new Error("Google Apps Script chưa triển khai hàm doPost. Vui lòng cập nhật script mới!");
      }
      throw new Error("Phản hồi từ Google Apps Script không hợp lệ.");
    }

    if (resJson.error) {
      throw new Error(resJson.error);
    }

    // Cập nhật thành công: Cập nhật lại trong RAM và cache
    rowsToSend.forEach((updatedItem) => {
      const idx = importRawData.findIndex(it => (it._row && it._row === updatedItem._row) || (it.ten === updatedItem.ten && it.ngay === updatedItem.ngay));
      if (idx !== -1) {
        importRawData[idx] = { ...importRawData[idx], ...updatedItem };
      }
    });

    if (typeof StorageHelper !== "undefined") {
      await StorageHelper.set("cachedImportData", importRawData);
    }

    const count = resJson.updatedCount || rowsToSend.length;
    if (typeof showToast === "function") {
      showToast(`✨ Đã đẩy thành công ${count} mục lên Google Sheet!`);
    }

    editedRowsMap.clear();
    toggleImportEditMode(false);
    renderImportList(false);

  } catch (err) {
    if (typeof showToast === "function") {
      showToast(`❌ Lỗi lưu Google Sheet: ${err.message}`, true, 6000);
    }
  } finally {
    if (btnEdit) {
      btnEdit.disabled = false;
      if (isImportEditMode) {
        if (editLabel) editLabel.innerText = editedRowsMap.size > 0 ? `Xong (${editedRowsMap.size})` : "Xong";
        if (editIcon) editIcon.innerText = "✓";
      }
    }
  }
}

// Thiết lập các bộ lắng nghe sự kiện
function setupImportEventListeners() {
  const searchInput = document.getElementById("importSearchBox");
  const searchClear = document.getElementById("importSearchClear");
  const listContainer = document.getElementById("importListContainer");
  const btnEdit = document.getElementById("btnImportEdit");
  const btnCancel = document.getElementById("btnImportCancelEdit");

  // Nút Sửa / Xong
  if (btnEdit) {
    btnEdit.addEventListener("click", () => {
      if (!isImportEditMode) {
        toggleImportEditMode(true);
        if (typeof showToast === "function") {
          showToast("✏️ Đang ở chế độ sửa. Bấm trực tiếp vào các mục trên thẻ để chỉnh sửa!");
        }
      } else {
        handleSaveImportChanges();
      }
    });
  }

  // Nút Hủy chế độ sửa
  if (btnCancel) {
    btnCancel.addEventListener("click", () => {
      if (editedRowsMap.size > 0) {
        if (!confirm("Hủy bỏ tất cả các chỉnh sửa chưa lưu?")) return;
      }
      editedRowsMap.clear();
      hideComboboxMenu();
      toggleImportEditMode(false);
      if (typeof showToast === "function") {
        showToast("Đã hủy các chỉnh sửa.");
      }
    });
  }

  // Cuộn để tải thêm thẻ (Infinite scroll mượt mà) -> Đóng combobox nếu đang mở
  if (listContainer) {
    listContainer.addEventListener("scroll", () => {
      hideComboboxMenu();
      if (listContainer.scrollTop + listContainer.clientHeight >= listContainer.scrollHeight - 300) {
        if (importRenderLimit < importFilteredGroups.length) {
          const startIndex = importRenderLimit;
          const nextBatch = importFilteredGroups.slice(importRenderLimit, importRenderLimit + 50);
          importRenderLimit += 50;
          const fragment = document.createRange().createContextualFragment(
            nextBatch.map((group, i) => createImportCardHtml(group, startIndex + i)).join("")
          );
          listContainer.appendChild(fragment);
        }
      }
    });

    // Khi focusin vào một ô trên thẻ
    listContainer.addEventListener("focusin", (e) => {
      if (!isImportEditMode) return;
      const target = e.target.closest("[data-field]");
      if (!target) return;

      // Xóa placeholder nếu có
      if (target.classList && target.classList.contains("is-placeholder")) {
        target.setAttribute("data-prev-placeholder", target.innerText);
        target.innerText = "";
        target.classList.remove("is-placeholder");
      }

      const fieldName = target.getAttribute("data-field");

      // 1. Ô Giá: chuyển sang số nguyên hoặc rút gọn và bôi đen để tiện gõ đè
      if (fieldName === "gia") {
        const rawNum = formatInputPrice(target.innerText);
        if (rawNum > 0) {
          if (rawNum % 1000 === 0) {
            target.innerText = String(rawNum / 1000);
          } else {
            target.innerText = String(rawNum);
          }
        }
        const range = document.createRange();
        range.selectNodeContents(target);
        const sel = window.getSelection();
        sel.removeAllRanges();
        sel.addRange(range);
        hideComboboxMenu();
        return;
      }

      // 2. Ô ĐÃ THANH TOÁN: Mất icon, hiển thị con số thuần túy để sửa
      if (fieldName === "da_thanh_toan") {
        const stored = target.getAttribute("data-val");
        target.innerText = (stored !== null && stored !== undefined && stored !== "") ? stored : "0";
        openComboboxForField(target, false);
        return;
      }

      // 3. Ô TRẠNG THÁI: Mất icon 📦
      if (fieldName === "tinh_trang") {
        const stored = target.getAttribute("data-val");
        target.innerText = stored ? stored : target.innerText.replace(/^[📦\s]+/, "").trim();
        openComboboxForField(target, false);
        return;
      }

      // 4. Ô NGUỒN TIỀN: Mất icon 💳
      if (fieldName === "nguon_tien") {
        const stored = target.getAttribute("data-val");
        target.innerText = stored ? stored : target.innerText.replace(/^[💳\s]+/, "").trim();
        openComboboxForField(target, false);
        return;
      }

      // Các trường combobox khác (Tên, Dung tích, Người gửi, Người nhập...)
      openComboboxForField(target, false);
    });

    // Khi focusout khỏi một ô trên thẻ
    listContainer.addEventListener("focusout", (e) => {
      if (!isImportEditMode) return;
      const target = e.target.closest("[data-field]");
      if (!target) return;
      const card = target.closest(".import-card");
      if (!card) return;

      const fieldName = target.getAttribute("data-field");

      // Khôi phục placeholder nếu bỏ trống
      if (!target.innerText.trim() && target.hasAttribute("data-prev-placeholder")) {
        target.innerText = target.getAttribute("data-prev-placeholder");
        target.classList.add("is-placeholder");
      }

      // 1. Ô Giá
      if (fieldName === "gia") {
        const numGia = formatInputPrice(target.innerText);
        target.innerText = numGia > 0 ? numGia.toLocaleString("vi-VN") + "đ" : "0đ";
        
        const pItem = target.closest(".import-product-item");
        const slEl = pItem ? pItem.querySelector('[data-field="sl"]') : card.querySelector('[data-field="sl"]');
        const totalEl = pItem ? pItem.querySelector('[data-field="thanh_tien"]') : card.querySelector('[data-field="thanh_tien"]');
        const rawSl = parseInt((slEl ? slEl.innerText : "1").replace(/\D/g, ""), 10) || 1;
        if (totalEl) {
          totalEl.innerText = formatMoneyVND(numGia * rawSl);
        }
        recordCardChange(card);
      } else if (fieldName === "sl") {
        const rawSl = parseInt(target.innerText.replace(/\D/g, ""), 10) || 1;
        target.innerText = String(rawSl);
        const pItem = target.closest(".import-product-item");
        const giaEl = pItem ? pItem.querySelector('[data-field="gia"]') : card.querySelector('[data-field="gia"]');
        const totalEl = pItem ? pItem.querySelector('[data-field="thanh_tien"]') : card.querySelector('[data-field="thanh_tien"]');
        const numGia = formatInputPrice(giaEl ? giaEl.innerText : "0");
        if (totalEl) {
          totalEl.innerText = formatMoneyVND(numGia * rawSl);
        }
        recordCardChange(card);
      } else if (fieldName === "da_thanh_toan") {
        // ĐÃ THANH TOÁN: View mode hiện Đã Thanh Toán cho gọn, lưu data-val là số
        setTimeout(() => {
          let rawTxt = target.innerText.trim().replace(/^[✓✗\s]+/, "").trim();
          const num = parseInt(rawTxt.replace(/\D/g, ""), 10);
          const p = typeof removeAccents === "function" ? removeAccents(rawTxt) : rawTxt.toLowerCase();
          const isUnpaid = rawTxt === "0" || p.includes("chua") || p === "no" || p === "false";
          const isPaid = !isUnpaid && ((num > 0) || p.includes("da") || p.includes("roi") || p.includes("ok"));

          if (isPaid) {
            const numStr = num > 0 ? num.toLocaleString("vi-VN") : (rawTxt || "Đã TT");
            target.setAttribute("data-val", numStr);
            target.innerText = "✓ Đã Thanh Toán";
            target.className = "import-badge badge-paid-yes";
          } else {
            target.setAttribute("data-val", "0");
            target.innerText = "✗ Chưa Thanh Toán";
            target.className = "import-badge badge-paid-no";
          }
          if (activeComboboxTarget === target) hideComboboxMenu();
          recordCardChange(card);
        }, 150);
      } else if (fieldName === "tinh_trang") {
        // TRẠNG THÁI: Gắn lại icon 📦 và màu badge
        setTimeout(() => {
          let val = target.innerText.replace(/^[📦\s]+/, "").trim() || "Đã Nhận";
          target.setAttribute("data-val", val);
          target.innerText = `📦 ${val}`;
          
          const s = typeof removeAccents === "function" ? removeAccents(val) : val.toLowerCase();
          target.className = "import-badge";
          if (s.includes("da ve") || s.includes("da nhan") || s.includes("hoan thanh") || s.includes("xong")) {
            target.classList.add("badge-status-done");
          } else if (s.includes("dang") || s.includes("cho") || s.includes("hoi")) {
            target.classList.add("badge-status-pending");
          } else if (s.includes("huy") || s.includes("hoan hang")) {
            target.classList.add("badge-status-cancel");
          } else {
            target.classList.add("badge-status-default");
          }
          if (activeComboboxTarget === target) hideComboboxMenu();
          recordCardChange(card);
        }, 150);
      } else if (fieldName === "nguon_tien") {
        // NGUỒN TIỀN: Gắn lại icon 💳
        setTimeout(() => {
          let val = target.innerText.replace(/^[💳\s]+/, "").trim();
          target.setAttribute("data-val", val);
          if (val) {
            target.innerText = `💳 ${val}`;
            target.className = "import-badge badge-fund";
          } else {
            target.innerText = "💳 + Nguồn";
            target.className = "import-badge badge-fund is-placeholder";
          }
          if (activeComboboxTarget === target) hideComboboxMenu();
          recordCardChange(card);
        }, 150);
      } else {
        // Với các ô combobox: nếu click ra ngoài, đóng menu và lưu giá trị tự gõ
        setTimeout(() => {
          if (activeComboboxTarget === target) {
            hideComboboxMenu();
            recordCardChange(card);
          }
        }, 150);
      }
    });

    // Gõ phím trên thẻ (input event)
    listContainer.addEventListener("input", (e) => {
      if (!isImportEditMode) return;
      const fieldEl = e.target.closest("[data-field]");
      if (!fieldEl) return;
      const card = fieldEl.closest(".import-card");
      if (!card) return;

      const fieldName = fieldEl.getAttribute("data-field");

      // Nếu sửa Giá hoặc SL -> Xem trước Tổng tiền
      if (fieldName === "gia" || fieldName === "sl") {
        const pItem = fieldEl.closest(".import-product-item");
        const giaEl = pItem ? pItem.querySelector('[data-field="gia"]') : card.querySelector('[data-field="gia"]');
        const slEl = pItem ? pItem.querySelector('[data-field="sl"]') : card.querySelector('[data-field="sl"]');
        const totalEl = pItem ? pItem.querySelector('[data-field="thanh_tien"]') : card.querySelector('[data-field="thanh_tien"]');

        if (giaEl && slEl && totalEl) {
          const rawGia = formatInputPrice(giaEl.innerText);
          const rawSl = parseInt(slEl.innerText.replace(/\D/g, ""), 10) || 1;
          totalEl.innerText = formatMoneyVND(rawGia * rawSl);
        }
      } else {
        // Cập nhật tìm kiếm gần đúng khi gõ
        if (activeComboboxTarget === fieldEl) {
          renderComboboxList(true);
        }
      }

      recordCardChange(card);
    });

    // Điều hướng phím: Mũi tên lên/xuống, Enter, Escape
    listContainer.addEventListener("keydown", (e) => {
      if (!isImportEditMode) return;
      const fieldEl = e.target.closest("[data-field]");
      if (!fieldEl) return;

      // Nếu menu combobox đang mở
      if (comboboxMenuEl && comboboxMenuEl.style.display !== "none") {
        if (e.key === "ArrowDown") {
          e.preventDefault();
          if (activeComboboxItems.length > 0) {
            const maxCount = Math.min(activeComboboxItems.length, 50);
            activeComboboxIndex = (activeComboboxIndex + 1) % maxCount;
            updateComboboxSelectionUI();
          }
          return;
        }
        if (e.key === "ArrowUp") {
          e.preventDefault();
          if (activeComboboxItems.length > 0) {
            const maxCount = Math.min(activeComboboxItems.length, 50);
            activeComboboxIndex = (activeComboboxIndex - 1 + maxCount) % maxCount;
            updateComboboxSelectionUI();
          }
          return;
        }
        if (e.key === "Enter") {
          e.preventDefault();
          if (activeComboboxIndex >= 0 && activeComboboxIndex < activeComboboxItems.length) {
            const chosenItem = activeComboboxItems[activeComboboxIndex];
            const chosenVal = typeof chosenItem === "object" ? chosenItem.val : chosenItem;
            selectComboboxValue(chosenVal);
          } else {
            hideComboboxMenu();
            fieldEl.blur();
          }
          return;
        }
        if (e.key === "Escape") {
          e.preventDefault();
          hideComboboxMenu();
          return;
        }
      }

      // Ngăn Enter tạo dòng mới trong contenteditable
      if (e.key === "Enter") {
        e.preventDefault();
        fieldEl.blur();
      }
    });
  }

  // Đóng combobox khi click ra ngoài
  document.addEventListener("mousedown", (e) => {
    if (comboboxMenuEl && comboboxMenuEl.style.display !== "none") {
      if (!comboboxMenuEl.contains(e.target) && (!activeComboboxTarget || !activeComboboxTarget.contains(e.target))) {
        hideComboboxMenu();
      }
    }
  });

  // Tìm kiếm
  if (searchInput) {
    searchInput.addEventListener("input", () => {
      const q = searchInput.value.trim();
      if (searchClear) searchClear.style.display = q ? "block" : "none";
      renderImportList();
    });
  }

  // Xóa tìm kiếm
  if (searchClear && searchInput) {
    searchClear.addEventListener("click", () => {
      searchInput.value = "";
      searchClear.style.display = "none";
      renderImportList();
      searchInput.focus();
    });
  }
}

if (typeof window !== "undefined") {
  window.refreshImportView = renderImportList;
  window.fetchImportData = fetchImportData;
  window.clearImportData = clearImportData;
  window.hasImportData = () => importRawData.length;
  window.showImportLoadingIndicator = showImportLoadingIndicator;
  window.hideImportLoadingIndicator = hideImportLoadingIndicator;
}
