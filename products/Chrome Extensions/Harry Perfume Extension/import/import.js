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
let activeEditingGroupId = null;
let editedRowsMap = new Map();
let activeImportFilter = "all";

const IMPORT_FILTER_LABELS = {
  all: "Tất cả đơn",
  unpaid: "⚠️ Chưa TT",
  missing_sender: "👤 Thiếu người gửi",
  missing_price: "🏷️ Có tên thiếu giá",
  missing_fund: "💳 Đã TT thiếu nguồn",
  missing_qty: "🔢 Thiếu số lượng",
  status_danhan: "✅ Đã Nhận",
  status_order: "⏳ Order",
  status_hoanhang: "↩️ Hoàn Hàng",
  status_hoigia: "❓ Hỏi Giá",
  status_chuaro: "⚪ Chưa Rõ Trạng Thái"
};

// Khởi chạy khi DOM sẵn sàng
document.addEventListener("DOMContentLoaded", initImportModule);

async function initImportModule() {
  setupImportEventListeners();

  // BẢO MẬT: Chỉ tải dữ liệu khi đã đăng nhập Quản Trị Viên
  try {
    const isAdmin = await checkIsAdminLoggedIn();
    if (!isAdmin) {
      return; // Chưa đăng nhập -> Không tải bất kỳ dữ liệu nào
    }

    // Khôi phục bộ lọc đã lưu từ phiên trước (nếu có)
    if (typeof StorageHelper !== "undefined") {
      try {
        const savedFilter = await StorageHelper.get("activeImportFilter", "all");
        if (savedFilter && IMPORT_FILTER_LABELS[savedFilter]) {
          activeImportFilter = savedFilter;
          applyImportFilterUI(activeImportFilter);
        }
      } catch (e) {}
    }

    if (typeof StorageHelper !== "undefined") {
      const cached = await StorageHelper.get("cachedImportData", []);
      if (Array.isArray(cached) && cached.length > 0) {
        importRawData = sortImportData(cached);
        renderImportList();
        if (typeof window.onImportDataUpdated === "function") {
          window.onImportDataUpdated();
        }
      }
      const cachedLists = await StorageHelper.get("cachedImportLists", null);
      if (cachedLists) {
        window.cachedImportLists = cachedLists;
      }
    }
    fetchImportData(true);
  } catch (e) {
    // Bỏ qua lỗi nạp storage
  }
}

// Sắp xếp dữ liệu: Ngày mới nhất lên trên cùng (dùng sortItemsByDateDesc từ common/date-helper.js)
function sortImportData(items) {
  return sortItemsByDateDesc(items, "ngay");
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
  const isAdmin = await checkIsAdminLoggedIn();
  if (!isAdmin) return;

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

    const rawItems = Array.isArray(data) ? data : (data.items || data.rows || data.data || []);

    if (rawItems.length > 0) {
      importRawData = sortImportData(rawItems);
      if (typeof StorageHelper !== "undefined") {
        await StorageHelper.set("cachedImportData", importRawData);
      }
      if (data && (data.lists || data.dropdowns)) {
        window.cachedImportLists = data.lists || data.dropdowns;
        if (typeof StorageHelper !== "undefined") {
          await StorageHelper.set("cachedImportLists", window.cachedImportLists);
        }
      }
      renderImportList();
      if (typeof window.onImportDataUpdated === "function") {
        window.onImportDataUpdated();
      }
      if (!silent) {
        showToast(`✨ Đã nạp ${importRawData.length.toLocaleString("vi-VN")} dòng nhập hàng!`);
      }
    } else {
      throw new Error(data?.error || "Dữ liệu trả về rỗng hoặc không hợp lệ");
    }
  } catch (err) {
    if (listContainer && importRawData.length === 0) {
      listContainer.innerHTML = `<div class="import-empty-state" style="color: var(--c-red);">⚠️ Lỗi tải dữ liệu: ${err.message}</div>`;
    }
    showToast(`⚠️ Không thể làm mới dữ liệu nhập. Đang giữ dữ liệu cũ!`);
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
  activeEditingGroupId = null;
  editedRowsMap.clear();
  hideImportLoadingIndicator();
  hideComboboxMenu();
  const listContainer = document.getElementById("importListContainer");
  if (listContainer) listContainer.innerHTML = "";
  const countEl = document.getElementById("importSummaryCount");
  if (countEl) {
    countEl.innerHTML = `<span class="import-count-current">0</span> / <span class="import-count-total">0</span> đơn`;
  }
  activeImportFilter = "all";
  applyImportFilterUI("all");
  const filterDropdown = document.getElementById("importFilterDropdown");
  if (filterDropdown) filterDropdown.style.display = "none";
  if (typeof window.clearStatsData === "function") {
    window.clearStatsData();
  }
}

// Gom các dòng nhập hàng theo Ngày + Người gửi + Trạng thái thành từng Kiện Hàng (Package)
function groupImportData(rawItems) {
  if (!Array.isArray(rawItems)) return [];

  const groupsMap = new Map();
  const groupsList = [];

  rawItems.forEach((item, idx) => {
    const dateVal = String(item.ngay || "").trim();
    const senderVal = String(item.nguoi_gui || "").trim();
    const cleanSender = (senderVal && senderVal !== "-") ? senderVal.toLowerCase() : "";

    // Phân tách trạng thái: Phân biệt rõ đơn thực tế (Đã Nhận, Đang Về) với đơn thăm dò (Hỏi Giá, Hoàn Hàng)
    const rawStatus = String(item.tinh_trang || "").trim();
    const isInactive = isInactiveStatus(rawStatus);
    const normStatus = removeAccents(rawStatus);
    const statusKey = isInactive ? `inactive_${normStatus}` : `active_${normStatus}`;

    // Nếu có người gửi hợp lệ: gom theo Ngày + Người gửi + Trạng thái
    // Nếu không có người gửi: để riêng từng thẻ độc lập
    const groupKey = cleanSender ? `${dateVal}___${cleanSender}___${statusKey}` : `single_${item._row || idx}`;

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

// Kiểm tra trạng thái không tính tiền / không có số lượng (Hỏi giá / Hoàn hàng)
function isInactiveStatus(status) {
  const s = removeAccents(status).trim();
  return s.includes("hoi gia") || s.includes("hoan hang");
}

// Cập nhật giao diện thẻ khi trạng thái chuyển sang / chuyển khỏi Hỏi giá / Hoàn hàng
function applyStatusToCardUI(card, statusVal) {
  if (!card) return;
  const isCardEditing = card.classList.contains("card-editable");
  const isInactive = isInactiveStatus(statusVal);
  const paidEl = card.querySelector('[data-field="da_thanh_toan"]');
  const fundEl = card.querySelector('[data-field="nguon_tien"]');
  const slEls = card.querySelectorAll('[data-field="sl"]');
  const totalEls = card.querySelectorAll('[data-field="thanh_tien"]');
  const groupTotalEl = card.querySelector(".import-group-total strong");

  // Cập nhật class theme màu tiêu đề theo trạng thái
  card.classList.remove("theme-status-done", "theme-status-pending", "theme-status-cancel", "theme-status-default", "theme-status-empty");
  const s = removeAccents(statusVal);
  if (!statusVal || statusVal === "—") {
    card.classList.add("theme-status-empty");
  } else if (s.includes("da ve") || s.includes("da nhan") || s.includes("hoan thanh") || s.includes("xong")) {
    card.classList.add("theme-status-done");
  } else if (s.includes("dang") || s.includes("cho") || s.includes("hoi")) {
    card.classList.add("theme-status-pending");
  } else if (s.includes("huy") || s.includes("hoan hang")) {
    card.classList.add("theme-status-cancel");
  } else {
    card.classList.add("theme-status-default");
  }

  if (isInactive) {
    card.classList.remove("theme-pay-paid", "theme-pay-unpaid");
    card.classList.add("theme-pay-none");
    if (paidEl) {
      if (paidEl.tagName === "SELECT") {
        paidEl.disabled = true;
        paidEl.innerHTML = '<option value="" selected>—</option>';
        paidEl.className = "import-badge badge-disabled import-val-locked";
      } else {
        paidEl.setAttribute("data-val", "");
        paidEl.innerText = "—";
        paidEl.className = "import-badge badge-disabled import-val-locked";
        paidEl.removeAttribute("contenteditable");
      }
    }
    if (fundEl) {
      if (fundEl.tagName === "SELECT") {
        fundEl.disabled = true;
        fundEl.innerHTML = '<option value="" selected>—</option>';
        fundEl.className = "import-badge badge-disabled import-val-locked";
      } else {
        fundEl.setAttribute("data-val", "");
        fundEl.innerText = "—";
        fundEl.className = "import-badge badge-disabled import-val-locked";
        fundEl.removeAttribute("contenteditable");
      }
    }
    slEls.forEach(el => {
      el.innerText = "—";
      el.classList.add("import-val-locked");
      el.removeAttribute("contenteditable");
    });
    totalEls.forEach(el => {
      el.innerText = "—";
    });
    if (groupTotalEl) groupTotalEl.innerText = "—";
  } else {
    if (paidEl) {
      if (paidEl.tagName === "SELECT") {
        if (paidEl.disabled || paidEl.classList.contains("badge-disabled")) {
          paidEl.disabled = false;
          paidEl.innerHTML = getPaymentSelectOptionsHtml("Đã TT", false);
          paidEl.value = "Đã TT";
          paidEl.className = "import-badge badge-paid-yes";
          card.classList.add("theme-pay-paid");
          card.classList.remove("theme-pay-unpaid");
        }
      } else if (paidEl.classList.contains("badge-disabled")) {
        paidEl.setAttribute("data-val", "0");
        paidEl.innerText = "Chưa TT";
        paidEl.className = "import-badge badge-paid-no";
        card.classList.add("theme-pay-unpaid");
        card.classList.remove("theme-pay-paid");
        if (isCardEditing) paidEl.setAttribute("contenteditable", "true");
      }
    }
    if (fundEl) {
      if (fundEl.tagName === "SELECT") {
        if (fundEl.disabled || fundEl.classList.contains("badge-disabled")) {
          fundEl.disabled = false;
          fundEl.innerHTML = getFundSelectOptionsHtml("", false);
          fundEl.value = "";
          fundEl.className = "import-badge badge-fund is-placeholder";
        }
      } else if (fundEl.classList.contains("badge-disabled")) {
        fundEl.setAttribute("data-val", "");
        fundEl.innerText = isCardEditing ? "💳 + Nguồn" : "💳 —";
        fundEl.className = isCardEditing ? "import-badge badge-fund is-placeholder" : "import-badge badge-fund badge-fund-empty";
        if (isCardEditing) fundEl.setAttribute("contenteditable", "true");
      }
    }
    slEls.forEach(el => {
      el.classList.remove("import-val-locked");
      if (el.innerText === "—") el.innerText = "1";
      if (isCardEditing) el.setAttribute("contenteditable", "true");
    });
    let gTot = 0;
    const pItems = card.querySelectorAll(".import-product-item");
    pItems.forEach(pItem => {
      const gEl = pItem.querySelector('[data-field="gia"]');
      const sEl = pItem.querySelector('[data-field="sl"]');
      const tEl = pItem.querySelector('[data-field="thanh_tien"]');
      const nGia = formatInputPrice(gEl ? gEl.innerText : "0");
      const nSl = parseInt((sEl ? sEl.innerText : "1").replace(/\D/g, ""), 10) || 1;
      const nTot = nGia * nSl;
      if (tEl) tEl.innerText = formatMoneyVND(nTot);
      gTot += nTot;
    });
    if (groupTotalEl) groupTotalEl.innerText = formatMoneyVND(gTot);
  }
}

// (Hàm getProductImageByName được nạp từ common/product-search.js - Single Source of Truth)

// Cập nhật ảnh thumbnail động cho dòng sản phẩm trên thẻ kiện hàng
function updateCardProductThumb(fieldEl, prodName) {
  const pItem = fieldEl.closest(".import-product-item");
  if (!pItem) return;
  const thumbCol = pItem.querySelector(".import-prod-col-thumb");
  let thumbImg = pItem.querySelector(".import-prod-thumb");
  const imgUrl = getProductImageByName(prodName);

  if (imgUrl) {
    if (!thumbImg) {
      thumbImg = document.createElement("img");
      thumbImg.className = "import-prod-thumb";
      thumbImg.loading = "lazy";
      if (thumbCol) {
        thumbCol.appendChild(thumbImg);
      } else {
        pItem.prepend(thumbImg);
      }
    }
    thumbImg.src = imgUrl;
    thumbImg.alt = prodName || "";
    thumbImg.style.display = "block";
    if (thumbCol) thumbCol.style.display = "";
  } else {
    if (thumbImg) {
      thumbImg.style.display = "none";
      thumbImg.src = "";
    }
    if (thumbCol) thumbCol.style.display = "none";
  }
}

// Tạo HTML cho từng thẻ kiện hàng (Gom các sản phẩm của cùng Người gửi trong Ngày)
function createImportCardHtml(group, idx = 0) {
  const esc = (txt) => escAttr(String(txt || ""));
  const cleanStr = (val) => cleanString(val);
  const strip = (s) => removeAccents(s);

  const groupId = group.id || `grp_${idx}`;
  const isCardEditing = (activeEditingGroupId !== null && activeEditingGroupId === groupId);
  const ce = isCardEditing ? 'contenteditable="true"' : "";

  // Nút hành động nổi trên góc thẻ: Sửa khi hover, hoặc Xong / Hủy khi đang sửa
  const actionsHtml = isCardEditing
    ? `<div class="import-card-actions">
        <button type="button" class="btn-card-save" title="Lưu thay đổi lên Google Sheet">✓ Xong</button>
        <button type="button" class="btn-card-cancel" title="Hủy bỏ">✕ Hủy</button>
      </div>`
    : `<div class="import-card-actions">
        <button type="button" class="btn-card-edit" title="Sửa kiện hàng này">✏️ Sửa</button>
      </div>`;

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

  // Hàng 4 (Dùng chung): Trạng thái
  let statusHtml = "";
  const ttRaw = cleanStr(group.tinh_trang);
  const statusVal = ttRaw; // Dữ liệu từ Sheet sao để nguyên vậy, tuyệt đối không tự ý gán nhãn ảo
  const isInactive = isInactiveStatus(statusVal);
  const s = strip(statusVal);
  let sClass = "badge-status-default";
  let statusThemeClass = "theme-status-default";
  if (!statusVal || statusVal === "—") {
    sClass = "badge-status-empty";
    statusThemeClass = "theme-status-empty";
  } else if (s.includes("da ve") || s.includes("da nhan") || s.includes("hoan thanh") || s.includes("xong")) {
    sClass = "badge-status-done";
    statusThemeClass = "theme-status-done";
  } else if (s.includes("dang") || s.includes("cho") || s.includes("hoi")) {
    sClass = "badge-status-pending";
    statusThemeClass = "theme-status-pending";
  } else if (s.includes("huy") || s.includes("hoan hang")) {
    sClass = "badge-status-cancel";
    statusThemeClass = "theme-status-cancel";
  }
  const displayStatus = statusVal || (isCardEditing ? "+ Trạng thái" : "—");
  const isPlaceholderClass = !statusVal ? " is-placeholder" : "";
  if (isCardEditing) {
    statusHtml = `<select class="import-badge ${sClass}" data-field="tinh_trang" title="Trạng thái kiện hàng">${getStatusSelectOptionsHtml(ttRaw)}</select>`;
  } else {
    statusHtml = `<span class="import-badge ${sClass}${isPlaceholderClass}" data-field="tinh_trang" data-val="${esc(ttRaw)}">${esc(displayStatus)}</span>`;
  }

  // Hàng 4 (Dùng chung): Đã thanh toán
  let paidHtml = "";
  let payThemeClass = "theme-pay-none";
  const ttPay = cleanStr(group.da_thanh_toan);
  const pPay = removeAccents(ttPay);
  const isPaid = ttPay && (pPay.includes("da") || pPay.includes("roi") || pPay.includes("yes") || pPay.includes("ok"));
  const isUnpaid = ttPay && (ttPay === "0" || pPay.includes("chua") || pPay === "no" || pPay === "false");

  if (isInactive) {
    payThemeClass = "theme-pay-none";
    if (isCardEditing) {
      paidHtml = `<select class="import-badge badge-disabled import-val-locked" data-field="da_thanh_toan" disabled title="Không áp dụng">${getPaymentSelectOptionsHtml(ttPay, true)}</select>`;
    } else {
      paidHtml = `<span class="import-badge badge-disabled import-val-locked" data-field="da_thanh_toan" data-val="" contenteditable="false" title="Không áp dụng">—</span>`;
    }
  } else {
    let badgeClass = "badge-paid-none";
    let displayPay = "—";
    let dataVal = "";

    if (isPaid) {
      payThemeClass = "theme-pay-paid";
      badgeClass = "badge-paid-yes";
      displayPay = "Đã TT";
      dataVal = "Đã TT";
    } else if (isUnpaid) {
      payThemeClass = "theme-pay-unpaid";
      badgeClass = "badge-paid-no";
      displayPay = "Chưa TT";
      dataVal = "Chưa TT";
    } else {
      payThemeClass = "theme-pay-none";
      badgeClass = "badge-paid-none";
      displayPay = isCardEditing ? "+ Thanh toán" : "—";
      dataVal = "";
    }

    if (isCardEditing) {
      paidHtml = `<select class="import-badge ${badgeClass}" data-field="da_thanh_toan" title="Tình trạng thanh toán">${getPaymentSelectOptionsHtml(ttPay, false)}</select>`;
    } else {
      paidHtml = `<span class="import-badge ${badgeClass}" data-field="da_thanh_toan" data-val="${dataVal}">${displayPay}</span>`;
    }
  }

  // Hàng 3 (Dùng chung): Người nhập
  let importerHtml = "";
  const ttImporter = cleanStr(group.nguoi_nhap);
  if (isCardEditing) {
    importerHtml = `<select class="import-badge badge-importer${!ttImporter ? ' is-placeholder' : ''}" data-field="nguoi_nhap" title="Người nhập">${getImporterSelectOptionsHtml(ttImporter)}</select>`;
  } else {
    if (ttImporter) {
      importerHtml = `<span class="import-badge badge-importer" data-field="nguoi_nhap" data-val="${esc(ttImporter)}" title="Người nhập: ${esc(ttImporter)}">👤 ${esc(ttImporter)}</span>`;
    } else {
      importerHtml = `<span class="import-badge badge-importer badge-importer-empty" data-val="" title="Chưa có người nhập">👤 —</span>`;
    }
  }

  // Hàng 4 (Dùng chung): Nguồn tiền
  let fundHtml = "";
  const ttFund = cleanStr(group.nguon_tien);
  if (isInactive) {
    if (isCardEditing) {
      fundHtml = `<select class="import-badge badge-disabled import-val-locked" data-field="nguon_tien" disabled title="Không áp dụng">${getFundSelectOptionsHtml(ttFund, true)}</select>`;
    } else {
      fundHtml = `<span class="import-badge badge-disabled import-val-locked" data-field="nguon_tien" data-val="" contenteditable="false" title="Không áp dụng">—</span>`;
    }
  } else {
    if (isCardEditing) {
      fundHtml = `<select class="import-badge badge-fund${!ttFund ? ' is-placeholder' : ''}" data-field="nguon_tien" title="Nguồn tiền / Quỹ">${getFundSelectOptionsHtml(ttFund, false)}</select>`;
    } else {
      if (ttFund) {
        fundHtml = `<span class="import-badge badge-fund" data-field="nguon_tien" data-val="${esc(ttFund)}" title="Nguồn tiền / Quỹ">💳 ${esc(ttFund)}</span>`;
      } else {
        fundHtml = `<span class="import-badge badge-fund badge-fund-empty" data-val="" title="Chưa có nguồn tiền">💳 —</span>`;
      }
    }
  }

  // Ghi chú (Dùng chung)
  let noteHtml = "";
  if (group.ghi_chu) {
    const cleanNote = String(group.ghi_chu).replace(/^[📝\s]+/, "").trim();
    noteHtml = `<div class="import-card-note" data-field="ghi_chu" ${ce}>${esc(cleanNote)}</div>`;
  } else if (isCardEditing) {
    noteHtml = `<div class="import-card-note is-placeholder" data-field="ghi_chu" contenteditable="true">+ Thêm ghi chú...</div>`;
  }

  // Danh sách sản phẩm riêng biệt trong kiện
  const productsHtml = group.items.map((item, pIdx) => {
    const rowId = item._row !== undefined ? String(item._row) : `idx_${pIdx}`;
    let sizeHtml = "";
    if (item.dung_tich) {
      sizeHtml = `<span class="import-badge-size" data-field="dung_tich" ${ce}>${esc(item.dung_tich)}</span>`;
    } else if (isCardEditing) {
      sizeHtml = `<span class="import-badge-size is-placeholder" data-field="dung_tich" contenteditable="true">+ Dung tích</span>`;
    }

    const showNum = group.items.length > 1;
    const rawGia = formatInputPrice(item.gia);
    const hasGia = rawGia > 0;
    const giaText = hasGia ? formatMoneyVND(rawGia) : (isCardEditing ? "+ Giá" : "0");
    const giaPlaceholderClass = (!hasGia && isCardEditing) ? "is-placeholder" : "";

    const rawSl = parseInt(String(item.sl || "").replace(/\D/g, ""), 10);
    const hasSl = !isNaN(rawSl) && rawSl > 0;
    const slDisplay = isInactive ? "—" : (hasSl ? String(rawSl) : (isCardEditing ? "+ SL" : "1"));
    const slCe = (isCardEditing && !isInactive) ? 'contenteditable="true"' : 'contenteditable="false"';
    const slLockedClass = isInactive ? "import-val-locked" : "";
    const slPlaceholderClass = (!hasSl && !isInactive && isCardEditing) ? "is-placeholder" : "";

    const itemTotal = item.thanh_tien ? formatMoneyVND(item.thanh_tien) : (hasGia && hasSl ? formatMoneyVND(rawGia * rawSl) : (hasGia ? formatMoneyVND(rawGia) : "0"));
    const totalDisplay = isInactive ? "—" : itemTotal;

    const prodNameText = item.ten || (isCardEditing ? "+ Tên sản phẩm" : "Chưa có tên");
    const prodNamePlaceholderClass = (!item.ten && isCardEditing) ? "is-placeholder" : "";

    // Tìm ảnh chai nước hoa tương ứng nếu có
    const prodImgUrl = getProductImageByName(item.ten);
    const imgHtml = `<img src="${esc(prodImgUrl)}" class="import-prod-thumb" style="${prodImgUrl ? 'display: block;' : 'display: none;'}" alt="${esc(item.ten || '')}" loading="lazy">`;

    return `
      <div class="import-product-item" data-row-id="${rowId}">
        <!-- Cột 1: Ảnh sản phẩm -->
        <div class="import-prod-col-thumb" style="${prodImgUrl ? '' : 'display: none;'}">
          ${imgHtml}
        </div>

        <!-- Cột 2: Thông tin sản phẩm (STT, Tên, Dung tích, Giá, SL, Thành tiền) -->
        <div class="import-prod-col-main">
          <!-- Tên sản phẩm và Dung tích -->
          <div class="import-card-row-title">
            <div class="import-prod-title">
              ${showNum ? `<span class="import-prod-num">${pIdx + 1}.</span>` : ""}
              <div class="import-prod-text-flow">
                <span class="import-card-name ${prodNamePlaceholderClass}" data-field="ten" ${ce} title="${esc(item.ten || '')}">${esc(prodNameText)}</span>
                ${sizeHtml}
              </div>
            </div>
          </div>

          <!-- 3 cột Giá, SL và Tổng -->
          <div class="import-card-pricing">
            <div class="import-price-col import-col-price">
              <span class="import-label">Giá:</span>
              <span class="import-val-price ${giaPlaceholderClass}" data-field="gia" ${ce}>${giaText}</span>
            </div>
            <div class="import-price-col import-col-qty">
              <span class="import-label">SL:</span>
              <span class="import-val-bold ${slLockedClass} ${slPlaceholderClass}" data-field="sl" ${slCe}>${slDisplay}</span>
            </div>
            <div class="import-price-col import-col-total">
              <span class="import-label">💵</span>
              <span class="import-val-total import-val-locked" data-field="thanh_tien" contenteditable="false" title="${isInactive ? 'Không áp dụng tổng tiền' : 'Tổng tiền tự động tính theo Giá × SL'}">${totalDisplay}</span>
            </div>
          </div>
        </div>
      </div>
    `;
  }).join("");

  // Dòng tóm tắt tổng cả đơn hàng (nếu có từ 2 sản phẩm trở lên)
  const groupSummaryHtml = group.items.length > 1 ? `
    <div class="import-card-group-summary">
      <span>Đơn hàng: <strong>${group.items.length} món</strong>${isInactive ? "" : ` (${groupQty} chai)`}</span>
      <span class="import-group-total">💵 <strong>${isInactive ? "—" : formatMoneyVND(groupTotal)}</strong></span>
    </div>
  ` : "";

  return `
    <div class="import-card ${statusThemeClass} ${payThemeClass} ${isCardEditing ? "card-editable" : ""}" data-group-id="${groupId}" data-index="${idx}">
      ${actionsHtml}
      <!-- Hàng 1: Tiêu đề 3 cột x 2 hàng (DÙNG CHUNG) -->
      <div class="import-card-row-top">
        <!-- Cột 1: Ngày và người gửi -->
        <div class="import-top-col import-top-col-1">
          <div class="import-top-cell">
            <span>📅</span>
            ${isCardEditing 
              ? `<select class="import-top-val" data-field="ngay" title="Ngày nhập">${getDateSelectOptionsHtml(group.ngay)}</select>`
              : `<span class="import-top-val" data-field="ngay">${esc(group.ngay || "--/--/----")}</span>`
            }
          </div>
          <div class="import-top-cell">
            <span>👤</span>
            <span class="import-top-val ${(!group.nguoi_gui && isCardEditing) ? 'is-placeholder' : ''}" data-field="nguoi_gui" ${ce} title="Người gửi: ${esc(group.nguoi_gui || '')}">${esc(group.nguoi_gui || (isCardEditing ? "+ Người gửi" : "—"))}</span>
          </div>
        </div>

        <!-- Cột 2: Trạng thái và đã thanh toán -->
        <div class="import-top-col import-top-col-2">
          <div class="import-top-cell">${statusHtml}</div>
          <div class="import-top-cell">${paidHtml}</div>
        </div>

        <!-- Cột 3: Người nhập và nguồn tiền -->
        <div class="import-top-col import-top-col-3">
          <div class="import-top-cell">${importerHtml}</div>
          <div class="import-top-cell">${fundHtml}</div>
        </div>
      </div>

      <!-- Danh sách sản phẩm riêng biệt trong kiện -->
      <div class="import-products-list">
        ${productsHtml}
      </div>

      ${(noteHtml || groupSummaryHtml) ? `
        <div class="import-card-footer">
          ${noteHtml}
          ${groupSummaryHtml}
        </div>
      ` : ""}
    </div>
  `;
}

// Tạo HTML cho dải phân cách ngày và thẻ kiện hàng
function renderGroupWithDateSeparator(group, globalIdx, allGroups) {
  const currentDate = (group.ngay || "").trim() || "Chưa rõ ngày";
  const prevGroup = globalIdx > 0 ? allGroups[globalIdx - 1] : null;
  const prevDate = prevGroup ? ((prevGroup.ngay || "").trim() || "Chưa rõ ngày") : null;

  let separatorHtml = "";
  // Hiển thị đường phân chia khi bắt đầu một ngày mới (hoặc ngày đầu tiên)
  if (currentDate !== prevDate) {
    separatorHtml = `
      <div class="import-date-divider">
        <span class="import-date-divider-line"></span>
        <span class="import-date-divider-text">📅 ${escHtml(currentDate)}</span>
        <span class="import-date-divider-line"></span>
      </div>
    `;
  }

  return separatorHtml + createImportCardHtml(group, globalIdx);
}

// Phân loại trạng thái kiện hàng cho bộ lọc (5 nhóm chuẩn)
function getPackageStatusCategory(statusRaw) {
  const s = removeAccents(statusRaw).trim();
  if (!s || s === "-" || s === "—") return "status_chuaro";
  if (s.includes("da nhan") || s.includes("da ve") || s.includes("hoan thanh") || s.includes("xong")) {
    return "status_danhan";
  }
  if (s.includes("order") || s.includes("dang ve") || s.includes("dang") || s.includes("cho")) {
    return "status_order";
  }
  if (s.includes("hoan hang") || s.includes("huy")) {
    return "status_hoanhang";
  }
  if (s.includes("hoi gia") || s.includes("hoi")) {
    return "status_hoigia";
  }
  return "status_chuaro";
}

// Kiểm tra kiện hàng có thỏa mãn tiêu chí bộ lọc không
function matchesImportFilter(grp, filterType) {
  if (!filterType || filterType === "all") return true;

  const isInactive = isInactiveStatus(grp.tinh_trang);

  switch (filterType) {
    case "unpaid": {
      // 1. Đơn chưa thanh toán: Đơn thực tế và được đánh dấu Chưa TT
      if (isInactive) return false;
      const ttPay = cleanString(grp.da_thanh_toan);
      const pPay = removeAccents(ttPay);
      const isUnpaid = ttPay && (ttPay === "0" || pPay.includes("chua") || pPay === "no" || pPay === "false");
      return isUnpaid;
    }
    case "missing_sender": {
      // 2. Đơn thiếu người gửi: Ô người gửi trống hoặc "-"
      const sender = cleanString(grp.nguoi_gui);
      return !sender || sender === "-";
    }
    case "missing_price": {
      // 3. Đơn có tên nhưng thiếu giá (trừ đơn Hỏi Giá/Hoàn Hàng)
      if (isInactive) return false;
      return (grp.items || []).some((it) => {
        const name = cleanString(it.ten);
        if (!name) return false;
        const price = formatInputPrice(it.gia);
        return price <= 0;
      });
    }
    case "missing_fund": {
      // 4. Đã TT nhưng thiếu nguồn tiền
      if (isInactive) return false;
      const ttPay = cleanString(grp.da_thanh_toan);
      const pPay = removeAccents(ttPay);
      const isPaid = ttPay && (pPay.includes("da") || pPay.includes("roi") || pPay.includes("yes") || pPay.includes("ok"));
      if (!isPaid) return false;
      const fund = cleanString(grp.nguon_tien);
      return !fund || fund === "-" || fund === "—";
    }
    case "missing_qty": {
      // 5. Đơn thiếu số lượng: Có tên nhưng SL <= 0
      if (isInactive) return false;
      return (grp.items || []).some((it) => {
        const name = cleanString(it.ten);
        if (!name) return false;
        const rawSl = String(it.sl || "").replace(/\D/g, "");
        const slNum = parseInt(rawSl, 10);
        return isNaN(slNum) || slNum <= 0;
      });
    }
    case "status_danhan": {
      // 6. Đã Nhận
      return getPackageStatusCategory(grp.tinh_trang) === "status_danhan";
    }
    case "status_order": {
      // 7. Order
      return getPackageStatusCategory(grp.tinh_trang) === "status_order";
    }
    case "status_hoanhang": {
      // 8. Hoàn Hàng
      return getPackageStatusCategory(grp.tinh_trang) === "status_hoanhang";
    }
    case "status_hoigia": {
      // 9. Hỏi Giá
      return getPackageStatusCategory(grp.tinh_trang) === "status_hoigia";
    }
    case "status_chuaro": {
      // 10. Chưa Rõ Trạng Thái
      return getPackageStatusCategory(grp.tinh_trang) === "status_chuaro";
    }
    default:
      return true;
  }
}

// Cập nhật số đếm thống kê cho từng tiêu chí trong Dropdown bộ lọc
function updateImportFilterCounts() {
  if (!Array.isArray(importGroupedData)) return;

  const counts = {
    all: importGroupedData.length,
    unpaid: 0,
    missing_sender: 0,
    missing_price: 0,
    missing_fund: 0,
    missing_qty: 0,
    status_danhan: 0,
    status_order: 0,
    status_hoanhang: 0,
    status_hoigia: 0,
    status_chuaro: 0
  };

  importGroupedData.forEach((grp) => {
    if (matchesImportFilter(grp, "unpaid")) counts.unpaid++;
    if (matchesImportFilter(grp, "missing_sender")) counts.missing_sender++;
    if (matchesImportFilter(grp, "missing_price")) counts.missing_price++;
    if (matchesImportFilter(grp, "missing_fund")) counts.missing_fund++;
    if (matchesImportFilter(grp, "missing_qty")) counts.missing_qty++;
    if (matchesImportFilter(grp, "status_danhan")) counts.status_danhan++;
    if (matchesImportFilter(grp, "status_order")) counts.status_order++;
    if (matchesImportFilter(grp, "status_hoanhang")) counts.status_hoanhang++;
    if (matchesImportFilter(grp, "status_hoigia")) counts.status_hoigia++;
    if (matchesImportFilter(grp, "status_chuaro")) counts.status_chuaro++;
  });

  const setBadge = (id, count, isIssue = false) => {
    const el = document.getElementById(id);
    if (!el) return;
    el.innerText = count.toLocaleString("vi-VN");
    const parent = el.closest(".import-filter-item");
    if (parent && isIssue) {
      if (count > 0) {
        parent.classList.add("has-issues");
      } else {
        parent.classList.remove("has-issues");
      }
    }
  };

  setBadge("filterCountAll", counts.all);
  setBadge("filterCountUnpaid", counts.unpaid, true);
  setBadge("filterCountMissingSender", counts.missing_sender, true);
  setBadge("filterCountMissingPrice", counts.missing_price, true);
  setBadge("filterCountMissingFund", counts.missing_fund, true);
  setBadge("filterCountMissingQty", counts.missing_qty, true);
  setBadge("filterCountDaNhan", counts.status_danhan);
  setBadge("filterCountOrder", counts.status_order);
  setBadge("filterCountHoanHang", counts.status_hoanhang);
  setBadge("filterCountHoiGia", counts.status_hoigia);
  setBadge("filterCountChuaRo", counts.status_chuaro);

  // Cập nhật chấm đỏ trên nút filter nếu đang có bộ lọc active
  const filterDot = document.getElementById("importFilterDot");
  if (filterDot) {
    const isFiltered = (activeImportFilter && activeImportFilter !== "all");
    filterDot.style.display = isFiltered ? "block" : "none";
  }
}

// Cập nhật trạng thái giao diện của nút và badge theo bộ lọc đang chọn
function applyImportFilterUI(filterKey) {
  const isFiltered = (filterKey && filterKey !== "all");

  // 1. Cập nhật item active trong dropdown
  const items = document.querySelectorAll("#importFilterDropdown .import-filter-item");
  items.forEach((it) => {
    if (it.getAttribute("data-filter") === filterKey) {
      it.classList.add("active");
    } else {
      it.classList.remove("active");
    }
  });

  // 2. Cập nhật nút Filter Toggle trên toolbar
  const btnToggle = document.getElementById("btnImportFilterToggle");
  const filterDot = document.getElementById("importFilterDot");
  if (btnToggle) {
    if (isFiltered) {
      btnToggle.classList.add("active");
    } else {
      btnToggle.classList.remove("active");
    }
  }
  if (filterDot) {
    filterDot.style.display = isFiltered ? "block" : "none";
  }

  // 3. Cập nhật badge tóm tắt trên import-summary-bar
  const badgeWrap = document.getElementById("importActiveFilterBadge");
  const badgeText = document.getElementById("importActiveFilterText");
  if (badgeWrap && badgeText) {
    if (isFiltered) {
      badgeText.innerText = IMPORT_FILTER_LABELS[filterKey] || filterKey;
      badgeWrap.style.display = "inline-flex";
    } else {
      badgeWrap.style.display = "none";
    }
  }
}

// Đặt tiêu chí lọc mới và render lại danh sách
async function setImportFilter(filterKey, saveState = true) {
  activeImportFilter = filterKey || "all";
  applyImportFilterUI(activeImportFilter);

  // Đóng dropdown menu
  const filterDropdown = document.getElementById("importFilterDropdown");
  if (filterDropdown) filterDropdown.style.display = "none";

  // Lưu trạng thái người dùng (Rule 6.2 - SSOT)
  if (saveState && typeof StorageHelper !== "undefined") {
    try {
      await StorageHelper.set("activeImportFilter", activeImportFilter);
    } catch (e) {}
  }

  // Render lại danh sách đã lọc
  renderImportList(true);
}

// Hiển thị danh sách nhập hàng theo từng kiện & thanh tóm tắt
function renderImportList(resetLimit = true) {
  const listContainer = document.getElementById("importListContainer");
  const countEl = document.getElementById("importSummaryCount");
  const searchInput = document.getElementById("importSearchBox");

  if (!listContainer) return;

  if (resetLimit) {
    importRenderLimit = 50;
    listContainer.scrollTop = 0;
  }

  // Gom nhóm dữ liệu thô theo Ngày + Người gửi
  importGroupedData = groupImportData(importRawData);

  // Cập nhật số đếm thống kê cho các mục trong dropdown bộ lọc
  updateImportFilterCounts();

  const query = (searchInput?.value || "").trim().toLowerCase();
  importFilteredGroups = importGroupedData.filter((grp) => {
    // 1. Kiểm tra tiêu chí bộ lọc (Data Quality / Status)
    if (activeImportFilter && activeImportFilter !== "all") {
      if (!matchesImportFilter(grp, activeImportFilter)) {
        return false;
      }
    }

    // 2. Tìm kiếm theo từ khóa
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

  // Đếm tổng số lượng sản phẩm (đơn)
  let totalItemsCount = 0;
  importFilteredGroups.forEach((grp) => {
    totalItemsCount += grp.items.length;
  });

  if (countEl) {
    const totalAllItems = (importRawData || []).length;
    countEl.innerHTML = `<span class="import-count-current">${totalItemsCount.toLocaleString("vi-VN")}</span> / <span class="import-count-total">${totalAllItems.toLocaleString("vi-VN")}</span> đơn`;
  }

  if (importFilteredGroups.length === 0) {
    listContainer.innerHTML = isImportLoading
      ? `<div class="import-empty-state">⏳ Đang tải dữ liệu từ Google Sheet...</div>`
      : `<div class="import-empty-state">Không có dữ liệu nhập hàng nào.</div>`;
    return;
  }

  const batch = importFilteredGroups.slice(0, importRenderLimit);
  listContainer.innerHTML = batch.map((group, idx) => renderGroupWithDateSeparator(group, idx, importFilteredGroups)).join("");
}

// ==========================================================================
// CÁC HÀM TẠO TỪ ĐIỂN VÀ GỢI Ý (SUGGESTION DICTIONARIES)
// ==========================================================================

// (escHtml, escAttr, formatMoneyVND, formatInputPrice nạp từ common/formatters.js - Single Source of Truth)

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
    const cleanName = removeAccents(currentProductName).trim();
    currentProd = allProducts.find(p => {
      if (!p || !p.name) return false;
      const n = removeAccents(p.name).trim();
      return n === cleanName;
    });
  }

  if (currentProd) {
    // Lấy biến thể Full, Tester theo dungtich1..dungtich5 của chính sản phẩm đó
    for (let i = 1; i <= 5; i++) {
      const rawDt = currentProd['dungtich' + i];
      if (rawDt && rawDt !== "-") {
        const dtVal = formatDungTichValue(rawDt);
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
            const dt = formatDungTichValue(raw);
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

// 3. Toàn bộ gợi ý các trường Người gửi, Người nhập, Tình trạng, Nguồn tiền, Ghi chú
// Nạp trực tiếp 100% từ các cột dropdown của Google Sheet, không qua khâu xử lý biến tấu/xào nấu
const IMPORT_LIST_COLUMN_KEYS = {
  nguoi_nhap: "List-Người Nhập",
  nguon_tien: "List-Nguồn Tiền",
  tinh_trang: "List-Tình Trạng",
  nguoi_gui:  "List-Người gửi",
  ghi_chu:    "List-Ghi chú",
  dung_tich:  "List-Dung tích",
  san_pham:   "List-Sản phẩm",
  ten:        "List-Sản phẩm"
};

function getDropdownListByField(fieldName) {
  const colKey = IMPORT_LIST_COLUMN_KEYS[fieldName] || fieldName;
  if (window.cachedImportLists && typeof window.cachedImportLists === "object") {
    if (Array.isArray(window.cachedImportLists[colKey])) {
      return window.cachedImportLists[colKey];
    }
    // Fallback tìm key không phân biệt hoa thường
    const targetNorm = typeof removeAccents === "function" ? removeAccents(colKey) : colKey.toLowerCase();
    for (const k in window.cachedImportLists) {
      const kNorm = typeof removeAccents === "function" ? removeAccents(k) : k.toLowerCase();
      if (kNorm === targetNorm && Array.isArray(window.cachedImportLists[k])) {
        return window.cachedImportLists[k];
      }
    }
  }
  return [];
}

// 4. Gợi ý trạng thái thanh toán chuẩn: "Đã TT", "Chưa TT" và Để trống
function getPaymentSuggestions(card) {
  return [
    { label: "Đã TT", val: "Đã TT" },
    { label: "Chưa TT", val: "Chưa TT" },
    { label: "— (Để trống)", val: "" }
  ];
}

// 5. Gợi ý thông minh cho trường NGÀY:
// - Hôm nay (DD/MM/YYYY)
// - Hôm qua (DD/MM/YYYY)
// - Hôm kia (DD/MM/YYYY)
function getDateSuggestions() {
  const now = new Date();

  function formatDDMMYYYY(d) {
    const day = String(d.getDate()).padStart(2, "0");
    const month = String(d.getMonth() + 1).padStart(2, "0");
    const year = d.getFullYear();
    return `${day}/${month}/${year}`;
  }

  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  const dayBeforeYesterday = new Date(today);
  dayBeforeYesterday.setDate(dayBeforeYesterday.getDate() - 2);

  const todayStr = formatDDMMYYYY(today);
  const yesterdayStr = formatDDMMYYYY(yesterday);
  const dayBeforeYesterdayStr = formatDDMMYYYY(dayBeforeYesterday);

  return [
    { label: `Hôm nay (${todayStr})`, val: todayStr },
    { label: `Hôm qua (${yesterdayStr})`, val: yesterdayStr },
    { label: `Hôm kia (${dayBeforeYesterdayStr})`, val: dayBeforeYesterdayStr }
  ];
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

// ==========================================================================
// TẠO NỘI DUNG OPTION CHO DROPDOWN SELECT MẶC ĐỊNH (NGÀY, TRẠNG THÁI, THANH TOÁN, NGƯỜI NHẬP, NGUỒN TIỀN)
// ==========================================================================

function getDateSelectOptionsHtml(selectedVal = "") {
  const esc = (s) => escAttr(String(s || ""));
  const dates = getDateSuggestions();
  let found = false;
  let html = dates.map(d => {
    const isSel = (d.val === selectedVal);
    if (isSel) found = true;
    return `<option value="${esc(d.val)}" ${isSel ? "selected" : ""}>${esc(d.label)}</option>`;
  }).join("");

  if (selectedVal && !found && selectedVal !== "+ Ngày" && selectedVal !== "--/--/----") {
    html += `<option value="${esc(selectedVal)}" selected>📅 ${esc(selectedVal)}</option>`;
  }
  return html;
}

function getStatusSelectOptionsHtml(selectedVal = "") {
  const esc = (s) => escAttr(String(s || ""));
  const list = getDropdownListByField("tinh_trang");
  const candidates = (Array.isArray(list) && list.length > 0) ? list : ["Đã Nhận", "Đang Về", "Hỏi Giá", "Hoàn Hàng"];
  let found = false;
  let html = `<option value="" ${(!selectedVal || selectedVal === "—") ? "selected" : ""}>— (Trống)</option>`;
  html += candidates.map(st => {
    const isSel = (st === selectedVal);
    if (isSel) found = true;
    return `<option value="${esc(st)}" ${isSel ? "selected" : ""}>${esc(st)}</option>`;
  }).join("");

  if (selectedVal && !found && selectedVal !== "+ Trạng thái" && selectedVal !== "—") {
    html += `<option value="${esc(selectedVal)}" selected>${esc(selectedVal)}</option>`;
  }
  return html;
}

function getPaymentSelectOptionsHtml(selectedVal = "", isInactive = false) {
  if (isInactive) {
    return `<option value="" selected>—</option>`;
  }
  const ttPay = cleanString(selectedVal);
  const pPay = removeAccents(ttPay);
  const isPaid = ttPay && (pPay.includes("da") || pPay.includes("roi") || pPay.includes("yes") || pPay.includes("ok"));
  const isUnpaid = ttPay && (ttPay === "0" || pPay.includes("chua") || pPay === "no" || pPay === "false");
  const isEmptyPay = !isPaid && !isUnpaid;

  return `
    <option value="Đã TT" ${isPaid ? "selected" : ""}>Đã TT</option>
    <option value="Chưa TT" ${isUnpaid ? "selected" : ""}>Chưa TT</option>
    <option value="" ${isEmptyPay ? "selected" : ""}>— (Trống)</option>
  `;
}

function getImporterSelectOptionsHtml(selectedVal = "") {
  const esc = (s) => escAttr(String(s || ""));
  const list = getDropdownListByField("nguoi_nhap");
  let found = false;
  let optionsHtml = (Array.isArray(list) ? list : []).map(name => {
    const isSel = (name === selectedVal);
    if (isSel) found = true;
    return `<option value="${esc(name)}" ${isSel ? "selected" : ""}>👤 ${esc(name)}</option>`;
  }).join("");

  if (selectedVal && !found && selectedVal !== "+ Người" && selectedVal !== "—") {
    optionsHtml = `<option value="${esc(selectedVal)}" selected>👤 ${esc(selectedVal)}</option>` + optionsHtml;
    found = true;
  }

  return `<option value="" ${!selectedVal ? "selected" : ""}>👤 + Người</option>` + optionsHtml;
}

function getFundSelectOptionsHtml(selectedVal = "", isInactive = false) {
  if (isInactive) {
    return `<option value="" selected>—</option>`;
  }
  const esc = (s) => escAttr(String(s || ""));
  const list = getDropdownListByField("nguon_tien");
  let found = false;
  let optionsHtml = (Array.isArray(list) ? list : []).map(f => {
    const isSel = (f === selectedVal);
    if (isSel) found = true;
    return `<option value="${esc(f)}" ${isSel ? "selected" : ""}>💳 ${esc(f)}</option>`;
  }).join("");

  if (selectedVal && !found && selectedVal !== "+ Nguồn" && selectedVal !== "—") {
    optionsHtml = `<option value="${esc(selectedVal)}" selected>💳 ${esc(selectedVal)}</option>` + optionsHtml;
    found = true;
  }

  return `<option value="" ${!selectedVal ? "selected" : ""}>💳 + Nguồn</option>` + optionsHtml;
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

  if (fieldName === "tinh_trang") {
    target.innerText = val;
    const s = removeAccents(val);
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
    if (card) {
      applyStatusToCardUI(card, val);
    }
  } else if (fieldName === "nguon_tien") {
    if (val) {
      target.innerText = `💳 ${val}`;
      target.className = "import-badge badge-fund";
    } else {
      target.innerText = "💳 + Nguồn";
      target.className = "import-badge badge-fund is-placeholder";
    }
  } else if (fieldName === "nguoi_nhap") {
    if (val) {
      target.innerText = `👤 ${val}`;
      target.className = "import-badge badge-importer";
    } else {
      target.innerText = "👤 + Người";
      target.className = "import-badge badge-importer is-placeholder";
    }
  } else if (fieldName === "da_thanh_toan") {
    const pVal = removeAccents(val);
    const isPaid = val && (pVal.includes("da") || pVal.includes("roi") || pVal.includes("yes") || pVal.includes("ok"));
    const isUnpaid = val && (val === "0" || pVal.includes("chua") || pVal === "no" || pVal === "false");
    if (isPaid) {
      target.setAttribute("data-val", "Đã TT");
      target.innerText = "Đã TT";
      target.className = "import-badge badge-paid-yes";
      if (card) {
        card.classList.add("theme-pay-paid");
        card.classList.remove("theme-pay-unpaid", "theme-pay-none");
      }
    } else if (isUnpaid) {
      target.setAttribute("data-val", "Chưa TT");
      target.innerText = "Chưa TT";
      target.className = "import-badge badge-paid-no";
      if (card) {
        card.classList.add("theme-pay-unpaid");
        card.classList.remove("theme-pay-paid", "theme-pay-none");
      }
    } else {
      target.setAttribute("data-val", "");
      target.innerText = "—";
      target.className = "import-badge badge-paid-none";
      if (card) {
        card.classList.add("theme-pay-none");
        card.classList.remove("theme-pay-paid", "theme-pay-unpaid");
      }
    }
  } else {
    target.innerText = val;
  }
  target.classList.remove("is-placeholder");

  if (fieldName === "ten") {
    updateCardProductThumb(target, val);
    const pItem = target.closest(".import-product-item");
    if (pItem) {
      const sizeEl = pItem.querySelector('[data-field="dung_tich"]');
      if (sizeEl && (sizeEl.classList.contains("is-placeholder") || !sizeEl.innerText.trim() || sizeEl.innerText.trim() === "+ Dung tích")) {
        const caps = getCapacitySuggestions(val);
        if (caps.length > 0) {
          const firstCap = caps[0].val || caps[0];
          sizeEl.innerText = firstCap;
          sizeEl.classList.remove("is-placeholder");
        }
      }
    }
  }

  hideComboboxMenu();

  if (card) {
    updateCardLiveTotal(card);
  }
}

function openComboboxForField(fieldEl, isUserTyping = false) {
  if (!fieldEl || fieldEl.tagName === "SELECT") {
    hideComboboxMenu();
    return;
  }
  const card = fieldEl.closest(".import-card.card-editable");
  if (!card) return;
  const fieldName = fieldEl.getAttribute("data-field");
  if (fieldName === "gia" || fieldName === "sl" || fieldName === "thanh_tien" || fieldEl.classList.contains("import-val-locked") || fieldEl.classList.contains("badge-disabled")) {
    hideComboboxMenu();
    return;
  }

  activeComboboxTarget = fieldEl;
  renderComboboxList(isUserTyping);
}

function renderComboboxList(isUserTyping = false) {
  if (!activeComboboxTarget) return;
  const fieldEl = activeComboboxTarget;
  const menu = getOrCreateComboboxMenu();

  const fieldName = fieldEl.getAttribute("data-field");
  const card = fieldEl.closest(".import-card");

  let rawQuery = "";
  if (isUserTyping) {
    rawQuery = fieldEl.innerText.trim();
    rawQuery = rawQuery.replace(/^[📝📦💳✓✗👤\s]+/, "").trim();
    if (fieldEl.classList.contains("is-placeholder") || rawQuery.startsWith("+") || rawQuery === "—" || rawQuery === "--/--/----" || rawQuery === "Chưa có tên") {
      rawQuery = "";
    }
  }

  let rawCandidates = [];
  if (fieldName === "ten") {
    if (rawQuery && typeof allProducts !== "undefined") {
      const matched = searchProducts(rawQuery, allProducts, { limit: 50 });
      rawCandidates = matched.map(p => ({
        val: p.name,
        label: p.name,
        img: (p.img && p.img !== "-" && String(p.img).startsWith("http")) ? p.img : "",
        short: p.tenrutgon || ""
      }));
    } else {
      rawCandidates = getProductSuggestions();
    }
  } else if (fieldName === "dung_tich") {
    const pItem = fieldEl.closest(".import-product-item");
    const prodNameEl = pItem ? pItem.querySelector('[data-field="ten"]') : (card ? card.querySelector('[data-field="ten"]') : null);
    const prodName = prodNameEl ? prodNameEl.innerText.trim() : "";
    rawCandidates = getCapacitySuggestions(prodName);
  } else if (fieldName === "da_thanh_toan") {
    rawCandidates = getPaymentSuggestions(card);
  } else if (fieldName === "ngay") {
    rawCandidates = getDateSuggestions();
  } else {
    rawCandidates = getDropdownListByField(fieldName);
  }

  const candidates = normalizeCandidates(rawCandidates);

  if (candidates.length === 0 && !rawQuery) {
    hideComboboxMenu();
    return;
  }

  let filtered = candidates;

  // Lọc cho các trường khác (dung tích, người gửi, nguồn tiền...) khi gõ
  if (fieldName !== "ten" && isUserTyping && rawQuery) {
    const normQuery = removeAccents(rawQuery);
    if (candidates.length > 10 && normQuery) {
      const qWords = normQuery.split(/\s+/).filter(Boolean);
      filtered = candidates.filter(item => {
        const normLabel = removeAccents(item.label);
        const normVal = removeAccents(item.val);
        return qWords.every(w => normLabel.includes(w) || normVal.includes(w));
      });
    }
  }

  if (candidates.length <= 10 && fieldName !== "ten") {
    filtered = candidates;
  }

  activeComboboxItems = filtered;
  activeComboboxIndex = filtered.length > 0 ? 0 : -1;

  const displayItems = filtered.slice(0, 50);

  if (displayItems.length === 0) {
    menu.innerHTML = `<div class="import-combo-empty">Không tìm thấy gợi ý cho: <strong>"${escHtml(rawQuery)}"</strong></div>`;
  } else {
    menu.innerHTML = displayItems.map((item, idx) => {
      const isSelected = idx === activeComboboxIndex;
      const imgUrl = item.img || getProductImageByName(item.val);
      const imgHtml = imgUrl 
        ? `<img src="${escHtml(imgUrl)}" class="import-combo-thumb" alt="" loading="lazy">`
        : "";
      return `<div class="import-combo-item ${isSelected ? "is-selected" : ""}" data-val="${escHtml(item.val)}" data-idx="${idx}">${imgHtml}<span class="import-combo-text">${escHtml(item.label)}</span></div>`;
    }).join("");
  }

  const rect = fieldEl.getBoundingClientRect();
  const menuWidth = Math.max(rect.width, 220);
  let top = rect.bottom + window.scrollY + 4;
  let left = rect.left + window.scrollX;

  if (left + menuWidth > window.innerWidth - 10) {
    left = Math.max(10, window.innerWidth - menuWidth - 10);
  }

  const estimatedHeight = Math.min(displayItems.length * 34 + 10, 220);
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

// Bắt đầu chỉnh sửa một thẻ kiện hàng duy nhất
function startEditingCard(groupId) {
  if (activeEditingGroupId && activeEditingGroupId !== groupId) {
    showToast("⚠️ Vui lòng hoàn tất hoặc hủy kiện đang sửa trước.");
    return;
  }
  activeEditingGroupId = groupId;
  hideComboboxMenu();
  renderImportList(false);
  showToast("✏️ Đang chỉnh sửa kiện hàng này.");
}

// Hủy chỉnh sửa thẻ kiện hàng hiện tại (Phục hồi dữ liệu cũ, không dùng popup confirm)
function cancelEditingCard() {
  activeEditingGroupId = null;
  hideComboboxMenu();
  renderImportList(false);
  showToast("Đã hủy chỉnh sửa.");
}

// Cập nhật tổng tiền tức thì trên thẻ (tính theo Giá × SL của từng món)
function updateCardLiveTotal(card) {
  if (!card) return;
  const statusEl = card.querySelector('[data-field="tinh_trang"]');
  const isInactive = isInactiveStatus(statusEl ? (statusEl.getAttribute("data-val") || statusEl.innerText) : "");

  let gTot = 0;
  const pItems = card.querySelectorAll(".import-product-item");
  pItems.forEach(pItem => {
    const gEl = pItem.querySelector('[data-field="gia"]');
    const sEl = pItem.querySelector('[data-field="sl"]');
    const tEl = pItem.querySelector('[data-field="thanh_tien"]');
    if (isInactive) {
      if (tEl) tEl.innerText = "—";
    } else {
      const nGia = formatInputPrice(gEl ? gEl.innerText : "0");
      const nSl = parseInt((sEl ? sEl.innerText : "1").replace(/\D/g, ""), 10) || 1;
      const nTot = nGia * nSl;
      if (tEl) tEl.innerText = formatMoneyVND(nTot);
      gTot += nTot;
    }
  });

  const summaryTotalEl = card.querySelector(".import-card-group-summary .import-group-total strong");
  if (summaryTotalEl) {
    summaryTotalEl.innerText = isInactive ? "—" : formatMoneyVND(gTot);
  }
}

// Lưu một kiện hàng duy nhất lên Google Sheet
async function handleSaveSingleCard(card, btnSave) {
  if (!card) return;
  const clean = (val) => String(val || "").trim();

  // Đọc các trường dùng chung ở cấp kiện (Header & Footer)
  const readShared = (f) => {
    const el = card.querySelector(`.import-card-row-top [data-field="${f}"], .import-card-footer [data-field="${f}"]`);
    if (!el) return "";
    if (el.tagName === "SELECT") {
      const v = el.value.trim();
      if (!v || v.startsWith("+") || v === "—" || v === "--/--/----") return "";
      return v;
    }
    if (el.classList.contains("is-placeholder")) return "";
    if (f === "da_thanh_toan") {
      let v = "";
      if (el.tagName === "SELECT") {
        v = el.value.trim();
      } else {
        const stored = el.getAttribute("data-val");
        v = stored !== null && stored !== undefined ? stored.trim() : el.innerText.trim();
      }
      if (!v || v === "—" || v === "+ Thanh toán") return "";
      const p = removeAccents(v);
      if (p.includes("da") || p.includes("roi") || p.includes("yes") || p.includes("ok")) return "Đã TT";
      if (v === "0" || p.includes("chua") || p === "no" || p === "false") return "Chưa TT";
      return "";
    }
    if (f === "tinh_trang" || f === "nguon_tien" || f === "nguoi_nhap") {
      const stored = el.getAttribute("data-val");
      if (stored !== null && stored !== undefined) return clean(stored);
    }
    let txt = el.innerText.trim().replace(/^[📝📦💳✓✗👤\s]+/, "").trim();
    if (txt.startsWith("+") || txt === "—" || txt === "--/--/----") return "";
    return txt;
  };

  const sharedNgay = readShared("ngay");
  const sharedNguoiGui = readShared("nguoi_gui");
  const sharedNguoiNhap = readShared("nguoi_nhap");
  const sharedTinhTrang = readShared("tinh_trang");
  const isInactive = isInactiveStatus(sharedTinhTrang);
  const sharedDaThanhToan = isInactive ? "" : readShared("da_thanh_toan");
  const sharedNguonTien = isInactive ? "" : readShared("nguon_tien");
  const sharedGhiChu = readShared("ghi_chu");

  const readItemField = (pItem, f) => {
    const el = pItem.querySelector(`[data-field="${f}"]`);
    if (!el) return "";
    if (el.classList.contains("is-placeholder")) return "";
    let txt = el.innerText.trim().replace(/^[📝📦💳✓✗👤\s]+/, "").trim();
    if (txt.startsWith("+") || txt === "—" || txt === "Chưa có tên") return "";
    return txt;
  };

  const isPayEqual = (a, b) => {
    const normPay = (val) => {
      if (!val || val === "—") return "";
      const p = removeAccents(val);
      if (p.includes("da") || p.includes("roi") || p.includes("yes") || p.includes("ok")) return "Đã TT";
      if (val === "0" || p.includes("chua") || p === "no" || p === "false") return "Chưa TT";
      return "";
    };
    return normPay(a) === normPay(b);
  };

  const isStatusEqual = (a, b) => {
    const ca = clean(a);
    const cb = clean(b);
    if (ca === cb) return true;
    if ((!ca || ca === "—") && (!cb || cb === "—")) return true;
    return false;
  };

  const prodItems = card.querySelectorAll(".import-product-item");
  const rowsToSave = [];

  prodItems.forEach((pItem) => {
    const rowId = pItem.getAttribute("data-row-id");
    const original = importRawData.find(it => String(it._row) === String(rowId)) || {};

    const ten = readItemField(pItem, "ten");
    const dungTich = readItemField(pItem, "dung_tich");
    const numGia = formatInputPrice(readItemField(pItem, "gia"));
    const numSl = isInactive ? "" : (parseInt(readItemField(pItem, "sl").replace(/\D/g, ""), 10) || 1);
    const numTotal = isInactive ? 0 : (numGia * (parseInt(numSl, 10) || 1));

    const origGia = formatInputPrice(original.gia);
    const origSl = parseInt(String(original.sl || "1").replace(/\D/g, ""), 10) || 1;

    const isItemChanged =
      clean(sharedNgay) !== clean(original.ngay) ||
      clean(sharedNguoiGui) !== clean(original.nguoi_gui) ||
      clean(sharedNguoiNhap) !== clean(original.nguoi_nhap) ||
      clean(ten) !== clean(original.ten) ||
      clean(dungTich) !== clean(original.dung_tich) ||
      numGia !== origGia ||
      (isInactive ? clean(original.sl) !== "" : numSl !== origSl) ||
      !isStatusEqual(sharedTinhTrang, original.tinh_trang) ||
      (isInactive ? clean(original.da_thanh_toan) !== "" : !isPayEqual(sharedDaThanhToan, original.da_thanh_toan)) ||
      (isInactive ? clean(original.nguon_tien) !== "" : clean(sharedNguonTien) !== clean(original.nguon_tien)) ||
      clean(sharedGhiChu) !== clean(original.ghi_chu);

    if (isItemChanged) {
      const updatedItem = {
        ...original,
        _row: original._row !== undefined ? original._row : rowId,
        ngay: sharedNgay || original.ngay,
        nguoi_gui: sharedNguoiGui,
        nguoi_nhap: sharedNguoiNhap,
        ten: ten,
        dung_tich: dungTich,
        gia: numGia > 0 ? numGia.toLocaleString("vi-VN") : readItemField(pItem, "gia"),
        sl: isInactive ? "" : String(numSl),
        thanh_tien: (isInactive || numTotal === 0) ? "" : numTotal.toLocaleString("vi-VN"),
        tinh_trang: sharedTinhTrang,
        da_thanh_toan: isInactive ? "" : sharedDaThanhToan,
        nguon_tien: isInactive ? "" : sharedNguonTien,
        ghi_chu: sharedGhiChu
      };
      rowsToSave.push(updatedItem);
    }
  });

  if (rowsToSave.length === 0) {
    activeEditingGroupId = null;
    hideComboboxMenu();
    renderImportList(false);
    showToast("Không có thay đổi nào cần lưu.");
    return;
  }

  if (btnSave) {
    btnSave.disabled = true;
    btnSave.innerText = "⏳ Đang lưu...";
  }

  try {
    const response = await fetch(IMPORT_API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "text/plain;charset=utf-8"
      },
      body: JSON.stringify({
        action: "update_import_rows",
        rows: rowsToSave
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
    rowsToSave.forEach((updatedItem) => {
      const idx = importRawData.findIndex(it => (it._row && it._row === updatedItem._row) || (it.ten === updatedItem.ten && it.ngay === updatedItem.ngay));
      if (idx !== -1) {
        importRawData[idx] = { ...importRawData[idx], ...updatedItem };
      }
    });

    if (typeof StorageHelper !== "undefined") {
      await StorageHelper.set("cachedImportData", importRawData);
    }

    showToast(`✨ Đã lưu kiện hàng lên Google Sheet thành công!`);

    activeEditingGroupId = null;
    hideComboboxMenu();
    renderImportList(false);
    if (typeof window.onImportDataUpdated === "function") {
      window.onImportDataUpdated();
    }

  } catch (err) {
    showToast(`❌ Lỗi lưu Google Sheet: ${err.message}`, true, 6000);
    if (btnSave) {
      btnSave.disabled = false;
      btnSave.innerText = "✓ Xong";
    }
  }
}

// Kiểm tra một ô đang hiển thị placeholder text
function isFieldPlaceholder(el) {
  if (!el) return false;
  if (el.classList.contains("is-placeholder")) return true;
  const txt = el.innerText.trim();
  return txt.startsWith("+") || txt.startsWith("💳 +") || txt.startsWith("👤 +") || txt === "--/--/----" || txt === "—" || txt === "💳 —" || txt === "👤 —" || txt === "Chưa có tên";
}

// Gắn các bộ lắng nghe sự kiện chỉnh sửa trực tiếp trên thẻ kiện hàng (.import-card.card-editable)
// Dùng chung 100% logic giữa các thẻ bên ngoài danh sách và thẻ trong modal "+ Thêm Đơn"
function bindCardEditableEvents(containerEl, isModal = false) {
  if (!containerEl) return;

  // 1. Click
  containerEl.addEventListener("click", (e) => {
    if (!isModal) {
      const btnEdit = e.target.closest(".btn-card-edit");
      if (btnEdit) {
        const card = btnEdit.closest(".import-card");
        if (card) {
          const groupId = card.getAttribute("data-group-id");
          startEditingCard(groupId);
        }
        return;
      }

      const btnSave = e.target.closest(".btn-card-save");
      if (btnSave) {
        const card = btnSave.closest(".import-card");
        if (card) {
          handleSaveSingleCard(card, btnSave);
        }
        return;
      }

      const btnCancel = e.target.closest(".btn-card-cancel");
      if (btnCancel) {
        cancelEditingCard();
        return;
      }
    } else {
      const btnRemove = e.target.closest(".btn-remove-prod-row");
      if (btnRemove) {
        const row = btnRemove.closest(".add-product-row-item");
        if (row) {
          const allRows = containerEl.querySelectorAll(".add-product-row-item");
          if (allRows.length > 1) {
            row.remove();
          } else {
            // Dòng duy nhất: xóa trắng về placeholder
            const nameEl = row.querySelector('[data-field="ten"]');
            if (nameEl) {
              nameEl.innerText = "+ Tên sản phẩm";
              nameEl.classList.add("is-placeholder");
              updateCardProductThumb(nameEl, "");
            }
            const capEl = row.querySelector('[data-field="dung_tich"]');
            if (capEl) {
              capEl.innerText = "+ Dung tích";
              capEl.classList.add("is-placeholder");
            }
            const giaEl = row.querySelector('[data-field="gia"]');
            if (giaEl) {
              giaEl.innerText = "+ Giá";
              giaEl.classList.add("is-placeholder");
            }
            const slEl = row.querySelector('[data-field="sl"]');
            if (slEl) {
              slEl.innerText = "1";
            }
            const totEl = row.querySelector('[data-field="thanh_tien"]');
            if (totEl) {
              totEl.innerText = "0";
            }
          }
          reindexAddProductRows();
          const modalCard = document.getElementById("addImportCard");
          if (modalCard) updateCardLiveTotal(modalCard);
        }
        return;
      }
    }

    // Click vào một ô trường dữ liệu trên thẻ đang sửa -> Mở dropdown gợi ý (nếu không phải thẻ SELECT mặc định)
    const target = e.target.closest("[data-field]");
    if (target && target.tagName !== "SELECT") {
      const card = target.closest(".import-card.card-editable");
      if (card) {
        const fieldName = target.getAttribute("data-field");
        if (fieldName !== "thanh_tien" && fieldName !== "gia" && fieldName !== "sl" && !target.classList.contains("import-val-locked") && !target.classList.contains("badge-disabled")) {
          openComboboxForField(target, false);
        }
      }
    }
  });

  // 1b. Change: Lắng nghe sự kiện đổi giá trị trên các dropdown select mặc định
  containerEl.addEventListener("change", (e) => {
    const selectEl = e.target.closest("select[data-field]");
    if (!selectEl) return;
    const card = selectEl.closest(".import-card");
    if (!card) return;
    const fieldName = selectEl.getAttribute("data-field");
    const val = selectEl.value;

    if (fieldName === "tinh_trang") {
      selectEl.setAttribute("data-val", val);
      const s = removeAccents(val);
      selectEl.className = "import-badge";
      if (!val || val === "—") {
        selectEl.classList.add("badge-status-empty");
      } else if (s.includes("da ve") || s.includes("da nhan") || s.includes("hoan thanh") || s.includes("xong")) {
        selectEl.classList.add("badge-status-done");
      } else if (s.includes("dang") || s.includes("cho") || s.includes("hoi")) {
        selectEl.classList.add("badge-status-pending");
      } else if (s.includes("huy") || s.includes("hoan hang")) {
        selectEl.classList.add("badge-status-cancel");
      } else {
        selectEl.classList.add("badge-status-default");
      }
      applyStatusToCardUI(card, val);
    } else if (fieldName === "da_thanh_toan") {
      const pVal = removeAccents(val);
      const isPaid = val && (pVal.includes("da") || pVal.includes("roi") || pVal.includes("yes") || pVal.includes("ok"));
      const isUnpaid = val && (val === "0" || pVal.includes("chua") || pVal === "no" || pVal === "false");
      if (isPaid) {
        selectEl.value = "Đã TT";
        selectEl.setAttribute("data-val", "Đã TT");
        selectEl.className = "import-badge badge-paid-yes";
        if (card) {
          card.classList.add("theme-pay-paid");
          card.classList.remove("theme-pay-unpaid", "theme-pay-none");
        }
      } else if (isUnpaid) {
        selectEl.value = "Chưa TT";
        selectEl.setAttribute("data-val", "Chưa TT");
        selectEl.className = "import-badge badge-paid-no";
        if (card) {
          card.classList.add("theme-pay-unpaid");
          card.classList.remove("theme-pay-paid", "theme-pay-none");
        }
      } else {
        selectEl.value = "";
        selectEl.setAttribute("data-val", "");
        selectEl.className = "import-badge badge-paid-none";
        if (card) {
          card.classList.add("theme-pay-none");
          card.classList.remove("theme-pay-paid", "theme-pay-unpaid");
        }
      }
    } else if (fieldName === "nguoi_nhap") {
      selectEl.setAttribute("data-val", val);
      if (val) {
        selectEl.classList.remove("is-placeholder");
      } else {
        selectEl.classList.add("is-placeholder");
      }
    } else if (fieldName === "nguon_tien") {
      selectEl.setAttribute("data-val", val);
      if (val) {
        selectEl.classList.remove("is-placeholder");
      } else {
        selectEl.classList.add("is-placeholder");
      }
    } else if (fieldName === "ngay") {
      selectEl.setAttribute("data-val", val);
    }
  });

  // 2. Mousedown: xóa placeholder ngay lập tức
  containerEl.addEventListener("mousedown", (e) => {
    const card = e.target.closest(".import-card.card-editable");
    if (!card) return;
    const target = e.target.closest("[data-field]");
    if (!target || target.tagName === "SELECT") return;
    const fieldName = target.getAttribute("data-field");
    if (fieldName === "thanh_tien" || target.classList.contains("import-val-locked") || target.classList.contains("badge-disabled")) return;

    if (isFieldPlaceholder(target)) {
      target.innerText = "";
      target.classList.remove("is-placeholder");
    }
  });

  // 3. Focusin
  containerEl.addEventListener("focusin", (e) => {
    const card = e.target.closest(".import-card.card-editable");
    if (!card) return;
    const target = e.target.closest("[data-field]");
    if (!target || target.tagName === "SELECT") return;

    const fieldName = target.getAttribute("data-field");
    if (fieldName === "thanh_tien" || target.classList.contains("import-val-locked") || target.classList.contains("badge-disabled")) {
      hideComboboxMenu();
      return;
    }

    if (isFieldPlaceholder(target)) {
      target.innerText = "";
      target.classList.remove("is-placeholder");
    }

    if (fieldName === "gia") {
      hideComboboxMenu();
      const rawDigits = target.innerText.replace(/\D/g, "");
      if (rawDigits) {
        target.innerText = rawDigits;
      }
      const range = document.createRange();
      range.selectNodeContents(target);
      const sel = window.getSelection();
      sel.removeAllRanges();
      sel.addRange(range);
      return;
    }

    if (fieldName === "sl") {
      hideComboboxMenu();
      const range = document.createRange();
      range.selectNodeContents(target);
      const sel = window.getSelection();
      sel.removeAllRanges();
      sel.addRange(range);
      return;
    }

    openComboboxForField(target, false);
  });

  // 4. Focusout
  containerEl.addEventListener("focusout", (e) => {
    const card = e.target.closest(".import-card.card-editable");
    if (!card) return;
    const target = e.target.closest("[data-field]");
    if (!target || target.tagName === "SELECT") return;

    const fieldName = target.getAttribute("data-field");

    if (fieldName === "gia") {
      const numGia = formatInputPrice(target.innerText);
      if (numGia > 0) {
        target.innerText = numGia.toLocaleString("vi-VN");
        target.classList.remove("is-placeholder");
      } else {
        target.innerText = "+ Giá";
        target.classList.add("is-placeholder");
      }
      updateCardLiveTotal(card);
    } else if (fieldName === "sl") {
      const statusEl = card.querySelector('[data-field="tinh_trang"]');
      const isInactive = isInactiveStatus(statusEl ? (statusEl.getAttribute("data-val") || statusEl.innerText) : "");
      if (isInactive) {
        target.innerText = "—";
      } else {
        const rawSl = parseInt(target.innerText.replace(/\D/g, ""), 10);
        if (rawSl > 0) {
          target.innerText = String(rawSl);
          target.classList.remove("is-placeholder");
        } else {
          target.innerText = "+ SL";
          target.classList.add("is-placeholder");
        }
      }
      updateCardLiveTotal(card);
    } else if (fieldName === "da_thanh_toan") {
      setTimeout(() => {
        let rawTxt = target.innerText.trim().replace(/^[✓✗\s]+/, "").trim();
        const p = removeAccents(rawTxt);
        const isPaid = rawTxt && (p.includes("da") || p.includes("roi") || p.includes("yes") || p.includes("ok"));
        const isUnpaid = rawTxt && (rawTxt === "0" || p.includes("chua") || p === "no" || p === "false");

        if (isPaid) {
          target.setAttribute("data-val", "Đã TT");
          target.innerText = "Đã TT";
          target.className = "import-badge badge-paid-yes";
          if (card) {
            card.classList.add("theme-pay-paid");
            card.classList.remove("theme-pay-unpaid", "theme-pay-none");
          }
        } else if (isUnpaid) {
          target.setAttribute("data-val", "Chưa TT");
          target.innerText = "Chưa TT";
          target.className = "import-badge badge-paid-no";
          if (card) {
            card.classList.add("theme-pay-unpaid");
            card.classList.remove("theme-pay-paid", "theme-pay-none");
          }
        } else {
          target.setAttribute("data-val", "");
          target.innerText = "—";
          target.className = "import-badge badge-paid-none";
          if (card) {
            card.classList.add("theme-pay-none");
            card.classList.remove("theme-pay-paid", "theme-pay-unpaid");
          }
        }
        if (activeComboboxTarget === target) hideComboboxMenu();
      }, 150);
    } else if (fieldName === "tinh_trang") {
      setTimeout(() => {
        let val = target.innerText.replace(/^[📦\s]+/, "").trim() || target.getAttribute("data-val") || "Đã Nhận";
        target.setAttribute("data-val", val);
        target.innerText = val;

        const s = removeAccents(val);
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
        applyStatusToCardUI(card, val);
        if (activeComboboxTarget === target) hideComboboxMenu();
      }, 150);
    } else if (fieldName === "nguon_tien") {
      setTimeout(() => {
        let val = target.innerText.replace(/^[💳\s]+/, "").trim();
        if (val === "+ Nguồn" || val === "—") val = "";
        target.setAttribute("data-val", val);
        if (val) {
          target.innerText = `💳 ${val}`;
          target.className = "import-badge badge-fund";
        } else {
          target.innerText = "💳 + Nguồn";
          target.className = "import-badge badge-fund is-placeholder";
        }
        if (activeComboboxTarget === target) hideComboboxMenu();
      }, 150);
    } else if (fieldName === "nguoi_nhap") {
      setTimeout(() => {
        let val = target.innerText.replace(/^[👤\s]+/, "").trim();
        if (val === "+ Người" || val === "+ Người nhập" || val === "—") val = "";
        target.setAttribute("data-val", val);
        if (val) {
          target.innerText = `👤 ${val}`;
          target.className = "import-badge badge-importer";
        } else {
          target.innerText = "👤 + Người";
          target.className = "import-badge badge-importer is-placeholder";
        }
        if (activeComboboxTarget === target) hideComboboxMenu();
      }, 150);
    } else {
      setTimeout(() => {
        if (activeComboboxTarget === target) hideComboboxMenu();
        const raw = target.innerText.trim();
        if (fieldName === "ngay" && (!raw || raw === "+ Ngày")) {
          target.innerText = "+ Ngày";
          target.classList.add("is-placeholder");
        } else if (fieldName === "nguoi_gui" && (!raw || raw === "+ Người gửi")) {
          target.innerText = "+ Người gửi";
          target.classList.add("is-placeholder");
        } else if (fieldName === "ten") {
          if (!raw || raw === "+ Tên sản phẩm") {
            target.innerText = "+ Tên sản phẩm";
            target.classList.add("is-placeholder");
            updateCardProductThumb(target, "");
          } else {
            target.classList.remove("is-placeholder");
            updateCardProductThumb(target, raw);
          }
        } else if (fieldName === "dung_tich" && (!raw || raw === "+ Dung tích")) {
          target.innerText = "+ Dung tích";
          target.classList.add("is-placeholder");
        } else if (fieldName === "ghi_chu") {
          if (!raw || raw === "+ Thêm ghi chú...") {
            target.innerText = "+ Thêm ghi chú...";
            target.classList.add("is-placeholder");
          } else {
            target.classList.remove("is-placeholder");
          }
        } else if (raw) {
          target.classList.remove("is-placeholder");
        }
      }, 150);
    }
  });

  // 5. Input
  containerEl.addEventListener("input", (e) => {
    const card = e.target.closest(".import-card.card-editable");
    if (!card) return;
    const fieldEl = e.target.closest("[data-field]");
    if (!fieldEl || fieldEl.tagName === "SELECT") return;
    fieldEl.classList.remove("is-placeholder");

    const fieldName = fieldEl.getAttribute("data-field");

    if (fieldName === "gia" || fieldName === "sl") {
      const currentText = fieldEl.innerText;
      const cleanDigits = currentText.replace(/\D/g, "");
      if (currentText !== cleanDigits) {
        fieldEl.innerText = cleanDigits;
        const range = document.createRange();
        range.selectNodeContents(fieldEl);
        range.collapse(false);
        const sel = window.getSelection();
        sel.removeAllRanges();
        sel.addRange(range);
      }

      updateCardLiveTotal(card);
    } else {
      if (activeComboboxTarget === fieldEl) {
        renderComboboxList(true);
      }
      if (fieldName === "ten") {
        const currentText = fieldEl.innerText.trim();
        const pItem = fieldEl.closest(".import-product-item");
        const thumbImg = pItem ? pItem.querySelector(".import-prod-thumb") : null;
        const matchedImg = getProductImageByName(currentText);
        if (thumbImg) {
          if (!matchedImg) {
            thumbImg.style.display = "none";
            thumbImg.src = "";
          } else {
            thumbImg.src = matchedImg;
            thumbImg.style.display = "block";
          }
        }
      }
    }
  });

  // 6. Keydown
  containerEl.addEventListener("keydown", (e) => {
    const card = e.target.closest(".import-card.card-editable");
    if (!card) return;
    const fieldEl = e.target.closest("[data-field]");
    if (!fieldEl || fieldEl.tagName === "SELECT") return;

    const fieldName = fieldEl.getAttribute("data-field");

    if (fieldName === "gia" || fieldName === "sl") {
      if (e.ctrlKey || e.metaKey) return;
      const allowedSpecialKeys = [
        "Backspace", "Delete", "Tab", "Escape", "Enter",
        "ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown",
        "Home", "End"
      ];
      if (allowedSpecialKeys.includes(e.key)) {
        if (e.key === "Enter") {
          e.preventDefault();
          fieldEl.blur();
        }
        return;
      }
      if (!/^[0-9]$/.test(e.key)) {
        e.preventDefault();
        return;
      }
    }

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

    if (e.key === "Enter") {
      e.preventDefault();
      fieldEl.blur();
    }
  });
}

// Thiết lập các bộ lắng nghe sự kiện
function setupImportEventListeners() {
  const searchInput = document.getElementById("importSearchBox");
  const searchClear = document.getElementById("importSearchClear");
  const listContainer = document.getElementById("importListContainer");
  const addImportCard = document.getElementById("addImportCard");

  if (listContainer) {
    bindCardEditableEvents(listContainer, false);

    listContainer.addEventListener("scroll", () => {
      hideComboboxMenu();
      if (listContainer.scrollTop + listContainer.clientHeight >= listContainer.scrollHeight - 300) {
        if (importRenderLimit < importFilteredGroups.length) {
          const startIndex = importRenderLimit;
          const nextBatch = importFilteredGroups.slice(importRenderLimit, importRenderLimit + 50);
          importRenderLimit += 50;
          const fragment = document.createRange().createContextualFragment(
            nextBatch.map((group, i) => renderGroupWithDateSeparator(group, startIndex + i, importFilteredGroups)).join("")
          );
          listContainer.appendChild(fragment);
        }
      }
    });
  }

  if (addImportCard) {
    bindCardEditableEvents(addImportCard, true);
  }

  const modalAddBody = document.querySelector(".modal-add-import-body");
  if (modalAddBody) {
    modalAddBody.addEventListener("scroll", hideComboboxMenu);
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

  // Nút mở/đóng Dropdown Bộ Lọc Nhập Hàng
  const btnFilterToggle = document.getElementById("btnImportFilterToggle");
  const filterDropdown = document.getElementById("importFilterDropdown");
  if (btnFilterToggle && filterDropdown) {
    btnFilterToggle.addEventListener("click", (e) => {
      e.stopPropagation();
      const isVisible = filterDropdown.style.display === "flex";
      filterDropdown.style.display = isVisible ? "none" : "flex";
    });
  }

  // Đóng Dropdown Bộ Lọc khi click ra ngoài hoặc nhấn phím Escape
  document.addEventListener("click", (e) => {
    if (filterDropdown && filterDropdown.style.display !== "none") {
      if (!filterDropdown.contains(e.target) && !btnFilterToggle.contains(e.target)) {
        filterDropdown.style.display = "none";
      }
    }
  });

  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && filterDropdown && filterDropdown.style.display !== "none") {
      filterDropdown.style.display = "none";
    }
  });

  // Chọn tiêu chí lọc trong Dropdown
  if (filterDropdown) {
    filterDropdown.addEventListener("click", (e) => {
      const item = e.target.closest(".import-filter-item");
      if (!item) return;
      const filterKey = item.getAttribute("data-filter");
      if (filterKey) {
        setImportFilter(filterKey);
      }
    });
  }

  // Nút xóa nhanh bộ lọc trên badge thanh tóm tắt
  const btnClearFilterBadge = document.getElementById("btnClearImportFilterBadge");
  if (btnClearFilterBadge) {
    btnClearFilterBadge.addEventListener("click", (e) => {
      e.stopPropagation();
      setImportFilter("all");
    });
  }

  // Nút mở nhanh file Google Sheet Nhập Hàng
  const btnOpenSheet = document.getElementById("btnOpenImportSheet");
  if (btnOpenSheet) {
    btnOpenSheet.addEventListener("click", () => {
      const sheetUrl = "https://docs.google.com/spreadsheets/d/1jrlUYUTx2qlVw1URIbRCMLpxo6zA_HNXE7PeY86O3qA/edit?usp=sharing";
      if (typeof chrome !== "undefined" && chrome.tabs && chrome.tabs.create) {
        chrome.tabs.create({ url: sheetUrl });
      } else {
        window.open(sheetUrl, "_blank");
      }
    });
  }

  // Các nút điều khiển Modal Thêm mới kiện hàng
  const btnOpenAdd = document.getElementById("btnOpenAddImportModal");
  if (btnOpenAdd) {
    btnOpenAdd.addEventListener("click", openAddImportModal);
  }
  const btnCloseAdd = document.getElementById("btnCloseAddImportModal");
  if (btnCloseAdd) {
    btnCloseAdd.addEventListener("click", closeAddImportModal);
  }
  const btnCancelAdd = document.getElementById("btnCancelAddImportModal");
  if (btnCancelAdd) {
    btnCancelAdd.addEventListener("click", closeAddImportModal);
  }
  const btnAddRow = document.getElementById("btnAddImportProductRow");
  if (btnAddRow) {
    btnAddRow.addEventListener("click", renderAddProductRow);
  }
  const btnSubmitAdd = document.getElementById("btnSubmitAddImport");
  if (btnSubmitAdd) {
    btnSubmitAdd.addEventListener("click", handleSaveNewImport);
  }
  const modalAdd = document.getElementById("modalAddImport");
  if (modalAdd) {
    modalAdd.addEventListener("click", (e) => {
      if (e.target === modalAdd) {
        closeAddImportModal();
      }
    });
  }
}

// ==========================================================================
// TÍNH NĂNG THÊM MỚI KIỆN HÀNG (ADD NEW IMPORT PACKAGE)
// ==========================================================================

let addImportRowCount = 0;

// Mở modal Thêm kiện hàng mới
async function openAddImportModal() {
  const modal = document.getElementById("modalAddImport");
  const card = document.getElementById("addImportCard");
  if (!modal || !card) return;

  const todayStr = getTodayDateStr();

  // 1. Ngày hôm nay (DD/MM/YYYY)
  const elNgay = document.getElementById("addImportNgay");
  if (elNgay) {
    if (elNgay.tagName === "SELECT") {
      elNgay.innerHTML = getDateSelectOptionsHtml(todayStr);
      elNgay.value = todayStr;
    } else {
      elNgay.innerText = todayStr;
      elNgay.classList.remove("is-placeholder");
    }
  }

  // 2. Người nhập (tên tài khoản Admin đang đăng nhập)
  const elNguoiNhap = document.getElementById("addImportNguoiNhap");
  const adminUser = await getCurrentAdminUser();
  if (elNguoiNhap) {
    if (elNguoiNhap.tagName === "SELECT") {
      elNguoiNhap.innerHTML = getImporterSelectOptionsHtml(adminUser || "");
      elNguoiNhap.value = adminUser || "";
      if (adminUser) {
        elNguoiNhap.classList.remove("is-placeholder");
      } else {
        elNguoiNhap.classList.add("is-placeholder");
      }
    } else {
      if (adminUser) {
        elNguoiNhap.setAttribute("data-val", adminUser);
        elNguoiNhap.innerText = `👤 ${adminUser}`;
        elNguoiNhap.className = "import-badge badge-importer";
      } else {
        elNguoiNhap.setAttribute("data-val", "");
        elNguoiNhap.innerText = "👤 + Người";
        elNguoiNhap.className = "import-badge badge-importer is-placeholder";
      }
    }
  }

  // 3. Người gửi
  const elNguoiGui = document.getElementById("addImportNguoiGui");
  if (elNguoiGui) {
    elNguoiGui.innerText = "+ Người gửi";
    elNguoiGui.classList.add("is-placeholder");
  }

  // 4. Trạng thái (Mặc định: giá trị đầu tiên của List-Tình Trạng hoặc Đã Nhận)
  const elTinhTrang = document.getElementById("addImportTinhTrang");
  const statuses = getDropdownListByField("tinh_trang");
  const defaultStatus = (statuses.length > 0) ? statuses[0] : "Đã Nhận";
  if (elTinhTrang) {
    if (elTinhTrang.tagName === "SELECT") {
      elTinhTrang.innerHTML = getStatusSelectOptionsHtml(defaultStatus);
      elTinhTrang.value = defaultStatus;
      const s = removeAccents(defaultStatus);
      elTinhTrang.className = "import-badge";
      if (s.includes("da ve") || s.includes("da nhan") || s.includes("hoan thanh") || s.includes("xong")) {
        elTinhTrang.classList.add("badge-status-done");
      } else if (s.includes("dang") || s.includes("cho") || s.includes("hoi")) {
        elTinhTrang.classList.add("badge-status-pending");
      } else if (s.includes("huy") || s.includes("hoan hang")) {
        elTinhTrang.classList.add("badge-status-cancel");
      } else {
        elTinhTrang.classList.add("badge-status-default");
      }
    } else {
      elTinhTrang.setAttribute("data-val", defaultStatus);
      elTinhTrang.innerText = defaultStatus;
    }
  }

  // 5. Thanh toán (Mặc định: Đã TT)
  const elDaThanhToan = document.getElementById("addImportDaThanhToan");
  if (elDaThanhToan) {
    if (elDaThanhToan.tagName === "SELECT") {
      elDaThanhToan.disabled = false;
      elDaThanhToan.innerHTML = getPaymentSelectOptionsHtml("Đã TT", false);
      elDaThanhToan.value = "Đã TT";
      elDaThanhToan.className = "import-badge badge-paid-yes";
    } else {
      elDaThanhToan.setAttribute("data-val", "Đã TT");
      elDaThanhToan.innerText = "Đã TT";
      elDaThanhToan.className = "import-badge badge-paid-yes";
      elDaThanhToan.setAttribute("contenteditable", "true");
    }
  }

  // 6. Nguồn tiền & Ghi chú
  const elNguonTien = document.getElementById("addImportNguonTien");
  if (elNguonTien) {
    if (elNguonTien.tagName === "SELECT") {
      elNguonTien.disabled = false;
      elNguonTien.innerHTML = getFundSelectOptionsHtml("", false);
      elNguonTien.value = "";
      elNguonTien.className = "import-badge badge-fund is-placeholder";
    } else {
      elNguonTien.setAttribute("data-val", "");
      elNguonTien.innerText = "💳 + Nguồn";
      elNguonTien.className = "import-badge badge-fund is-placeholder";
      elNguonTien.setAttribute("contenteditable", "true");
    }
  }
  const elGhiChu = document.getElementById("addImportGhiChu");
  if (elGhiChu) {
    elGhiChu.innerText = "+ Thêm ghi chú...";
    elGhiChu.classList.add("is-placeholder");
  }

  // 7. Reset theme thẻ
  card.className = "import-card card-editable add-import-card theme-status-done theme-pay-paid";
  applyStatusToCardUI(card, defaultStatus);

  // 8. Làm mới danh sách sản phẩm (Bắt đầu với 1 dòng)
  const container = document.getElementById("addImportProductsList");
  if (container) {
    container.innerHTML = "";
    addImportRowCount = 0;
    renderAddProductRow();
  }

  updateCardLiveTotal(card);
  openModal(modal);
}

// Đóng modal Thêm kiện hàng
function closeAddImportModal() {
  closeModal("modalAddImport");
}

// Tạo 1 dòng sản phẩm trong modal thêm (Chuẩn bố cục 2 cột như .import-card)
function renderAddProductRow() {
  const container = document.getElementById("addImportProductsList");
  if (!container) return;

  const rowIdx = addImportRowCount++;
  const rowNum = container.children.length + 1;
  const rowEl = document.createElement("div");
  rowEl.className = "import-product-item add-product-row-item";
  rowEl.setAttribute("data-row-idx", String(rowIdx));

  rowEl.innerHTML = `
    <!-- Cột 1: Ảnh sản phẩm -->
    <div class="import-prod-col-thumb" style="display: none;">
      <img src="" class="import-prod-thumb" style="display: none;" alt="" loading="lazy">
    </div>

    <!-- Cột 2: Thông tin sản phẩm -->
    <div class="import-prod-col-main">
      <div class="import-card-row-title">
        <div class="import-prod-title">
          <span class="import-prod-num add-product-row-num">${rowNum}.</span>
          <div class="import-prod-text-flow">
            <span class="import-card-name is-placeholder" data-field="ten" contenteditable="true" title="Tên sản phẩm">+ Tên sản phẩm</span>
            <span class="import-badge-size is-placeholder" data-field="dung_tich" contenteditable="true" title="Dung tích">+ Dung tích</span>
          </div>
          <button type="button" class="btn-remove-prod-row" title="Xóa món này">✕</button>
        </div>
      </div>
      <div class="import-card-pricing">
        <div class="import-price-col import-col-price">
          <span class="import-label">Giá:</span>
          <span class="import-val-price is-placeholder" data-field="gia" contenteditable="true">+ Giá</span>
        </div>
        <div class="import-price-col import-col-qty">
          <span class="import-label">SL:</span>
          <span class="import-val-bold" data-field="sl" contenteditable="true">1</span>
        </div>
        <div class="import-price-col import-col-total">
          <span class="import-label">💵</span>
          <span class="import-val-total import-val-locked" data-field="thanh_tien" contenteditable="false" title="Tổng tiền tự động tính">0</span>
        </div>
      </div>
    </div>
  `;

  container.appendChild(rowEl);
  reindexAddProductRows();

  const nameSpan = rowEl.querySelector('[data-field="ten"]');
  if (nameSpan) {
    nameSpan.focus();
  }
}

// Đánh lại số thứ tự các dòng sản phẩm và quản lý nút xóa
function reindexAddProductRows() {
  const container = document.getElementById("addImportProductsList");
  if (!container) return;
  const rows = container.querySelectorAll(".add-product-row-item");
  rows.forEach((r, i) => {
    const numEl = r.querySelector(".add-product-row-num");
    if (numEl) numEl.innerText = `${i + 1}.`;
    const btnRemove = r.querySelector(".btn-remove-prod-row");
    if (btnRemove) {
      if (rows.length === 1) {
        btnRemove.style.opacity = "0.35";
        btnRemove.title = "Xóa trắng dòng này";
      } else {
        btnRemove.style.opacity = "1";
        btnRemove.title = "Xóa món này";
      }
    }
  });
  const countEl = document.getElementById("addImportItemsCount");
  if (countEl) countEl.innerText = `${rows.length} món`;
}

// Tính toán trực tiếp tổng tiền của modal Thêm
function updateAddImportLiveTotal() {
  const card = document.getElementById("addImportCard");
  if (card) {
    updateCardLiveTotal(card);
    reindexAddProductRows();
  }
}

// Lưu kiện hàng mới lên Google Sheet
async function handleSaveNewImport() {
  const card = document.getElementById("addImportCard");
  const btnSubmit = document.getElementById("btnSubmitAddImport");
  if (!card) return;

  const readField = (el) => {
    if (!el) return "";
    if (el.tagName === "SELECT") {
      const v = el.value.trim();
      if (!v || v.startsWith("+") || v === "—" || v === "--/--/----" || v === "Chưa có tên") return "";
      return v;
    }
    if (el.classList.contains("is-placeholder")) return "";
    const stored = el.getAttribute("data-val");
    if (stored !== null && stored !== undefined && stored !== "") {
      return stored.trim();
    }
    let txt = el.innerText.trim().replace(/^[📝📦💳✓✗👤\s]+/, "").trim();
    if (txt.startsWith("+") || txt === "—" || txt === "--/--/----" || txt === "Chưa có tên") return "";
    return txt;
  };

  const rawNgay = readField(card.querySelector('#addImportNgay'));
  const rawNguoiNhap = readField(card.querySelector('#addImportNguoiNhap'));
  const rawNguoiGui = readField(card.querySelector('#addImportNguoiGui'));
  const rawTinhTrang = readField(card.querySelector('#addImportTinhTrang'));
  const isInactive = isInactiveStatus(rawTinhTrang);
  const rawDaThanhToanVal = readField(card.querySelector('#addImportDaThanhToan'));
  let rawDaThanhToan = "";
  if (!isInactive && rawDaThanhToanVal) {
    const pModal = removeAccents(rawDaThanhToanVal);
    if (pModal.includes("da") || pModal.includes("roi") || pModal.includes("yes") || pModal.includes("ok")) {
      rawDaThanhToan = "Đã TT";
    } else if (rawDaThanhToanVal === "0" || pModal.includes("chua") || pModal.includes("no") || pModal.includes("false")) {
      rawDaThanhToan = "Chưa TT";
    }
  }
  const rawNguonTien = isInactive ? "" : readField(card.querySelector('#addImportNguonTien'));
  const rawGhiChu = readField(card.querySelector('#addImportGhiChu'));

  // Thu thập danh sách sản phẩm hợp lệ (có tên)
  const rowsToSend = [];
  const rowsEls = card.querySelectorAll(".add-product-row-item");
  rowsEls.forEach(row => {
    const nameEl = row.querySelector('[data-field="ten"]');
    const capEl = row.querySelector('[data-field="dung_tich"]');
    const priceEl = row.querySelector('[data-field="gia"]');
    const qtyEl = row.querySelector('[data-field="sl"]');

    const ten = readField(nameEl);
    if (!ten) return; // Bỏ qua dòng chưa có tên

    const dungTich = readField(capEl);
    const numGia = formatInputPrice(readField(priceEl));
    const numSl = isInactive ? "" : (parseInt(readField(qtyEl).replace(/\D/g, ""), 10) || 1);
    const numTotal = isInactive ? 0 : (numGia * (parseInt(numSl, 10) || 1));

    rowsToSend.push({
      ngay: rawNgay,
      nguoi_gui: rawNguoiGui,
      nguoi_nhap: rawNguoiNhap,
      ten: ten,
      dung_tich: dungTich,
      gia: numGia > 0 ? numGia.toLocaleString("vi-VN") : "",
      sl: isInactive ? "" : String(numSl),
      thanh_tien: (isInactive || numTotal === 0) ? "" : numTotal.toLocaleString("vi-VN"),
      tinh_trang: rawTinhTrang,
      da_thanh_toan: rawDaThanhToan,
      nguon_tien: rawNguonTien,
      ghi_chu: rawGhiChu
    });
  });

  if (rowsToSend.length === 0) {
    showToast("⚠️ Vui lòng nhập tên ít nhất một sản phẩm!", true);
    return;
  }

  if (btnSubmit) {
    btnSubmit.disabled = true;
    btnSubmit.innerText = "⏳ Đang ghi vào Sheet...";
  }

  try {
    const response = await fetch(IMPORT_API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "text/plain;charset=utf-8"
      },
      body: JSON.stringify({
        action: "add_import_rows",
        rows: rowsToSend
      })
    });

    const resText = await response.text();
    let resJson = null;
    try {
      resJson = JSON.parse(resText);
    } catch (e) {
      if (resText.includes("doPost") || resText.includes("Không tìm thấy hàm")) {
        throw new Error("Google Apps Script chưa triển khai action add_import_rows. Vui lòng cập nhật script mới!");
      }
      throw new Error("Phản hồi từ Google Apps Script không hợp lệ.");
    }

    if (resJson.error) {
      throw new Error(resJson.error);
    }

    if (!resJson.addedCount && resJson.updatedCount !== undefined) {
      throw new Error("Google Apps Script trên Google Sheet chưa được Deploy phiên bản mới (New Version). Vui lòng cập nhật script và Deploy lại!");
    }

    // Ghi nhận thành công vào RAM
    const addedRows = resJson.addedRows || rowsToSend;
    importRawData.unshift(...addedRows);
    importRawData = sortImportData(importRawData);

    if (typeof StorageHelper !== "undefined") {
      await StorageHelper.set("cachedImportData", importRawData);
    }

    closeAddImportModal();

    // Re-render: Sẽ tự động MERGE vào kiện cũ nếu trùng Ngày + Người gửi + Trạng thái!
    renderImportList(true);
    if (typeof window.onImportDataUpdated === "function") {
      window.onImportDataUpdated();
    }
    showToast(`✨ Đã thêm kiện hàng mới (${rowsToSend.length} món) lên Google Sheet thành công!`);

  } catch (err) {
    showToast(`❌ Lỗi thêm mới: ${err.message}`, true, 6000);
  } finally {
    if (btnSubmit) {
      btnSubmit.disabled = false;
      btnSubmit.innerText = "Lưu lên Google Sheet";
    }
  }
}

if (typeof window !== "undefined") {
  window.refreshImportView = renderImportList;
  window.fetchImportData = fetchImportData;
  window.clearImportData = clearImportData;
  window.hasImportData = () => importRawData.length;
  window.getImportRawData = () => importRawData;
  window.showImportLoadingIndicator = showImportLoadingIndicator;
  window.hideImportLoadingIndicator = hideImportLoadingIndicator;
}
