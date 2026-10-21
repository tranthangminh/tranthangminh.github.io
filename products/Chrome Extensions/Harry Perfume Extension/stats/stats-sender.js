/**
 * Shared Sender Statistics Module (Thống Kê Theo Người Gửi)
 * Hiển thị danh sách người gửi, tìm kiếm người gửi, và xem chi tiết toàn bộ các chai từng lấy của người đó
 * Quy tắc: Không kể trạng thái đơn hoàn thành hay chưa (gom toàn bộ lịch sử)
 * Định dạng: Số chấm không đơn vị (formatMoneyVND)
 */

let selectedSenderName = null;       // Tên người gửi đang xem chi tiết (null nếu xem danh sách tất cả)
let senderSearchQuery = "";          // Từ khóa tìm kiếm người gửi trong danh sách
let senderDetailSearchQuery = "";    // Từ khóa tìm kiếm chai trong chi tiết của 1 người gửi
let senderSortMode = "recent";       // Tiêu chí sắp xếp người gửi: "recent" (nhập gần nhất), "total" (theo tổng tiền), "name" (chữ cái A-Z)
let senderDetailSortMode = "recent"; // Tiêu chí sắp xếp chai: "recent" (nhập gần nhất), "oldest" (nhập cũ nhất), "name" (tên A-Z), "price_desc" (giá cao nhất)
let isSortMenuOpen = false;          // Trạng thái mở menu sắp xếp người gửi
let isDetailSortMenuOpen = false;    // Trạng thái mở menu sắp xếp chai trong chi tiết

// Khôi phục trạng thái sắp xếp cuối cùng từ bộ nhớ lưu trữ (Single Source of Truth)
try {
  const sMode = localStorage.getItem("statsSenderSortMode");
  if (sMode) senderSortMode = JSON.parse(sMode);
  const dMode = localStorage.getItem("statsSenderDetailSortMode");
  if (dMode) senderDetailSortMode = JSON.parse(dMode);
} catch (e) {}

if (typeof StorageHelper !== "undefined") {
  StorageHelper.get("statsSenderSortMode", senderSortMode).then(val => {
    if (val) senderSortMode = val;
  });
  StorageHelper.get("statsSenderDetailSortMode", senderDetailSortMode).then(val => {
    if (val) senderDetailSortMode = val;
  });
}

// Lấy danh sách dòng nhập từ import module (Single Source of Truth)
function getSenderRawData() {
  if (typeof window.getImportRawData === "function") {
    return window.getImportRawData() || [];
  }
  if (typeof importRawData !== "undefined" && Array.isArray(importRawData)) {
    return importRawData;
  }
  return [];
}

// Xác định lớp CSS cho badge trạng thái
function getSenderItemStatusClass(status) {
  const s = removeAccents(status);
  if (s.includes("da nhan") || s.includes("da ve") || s.includes("hoan thanh")) return "status-done";
  if (s.includes("dang ve") || s.includes("order") || s.includes("cho")) return "status-pending";
  if (s.includes("hoan hang")) return "status-return";
  if (s.includes("hoi gia")) return "status-inquiry";
  return "status-default";
}

// Gom nhóm dữ liệu theo từng người gửi (toàn bộ lịch sử, không phân biệt trạng thái)
function aggregateSenderData(rawData) {
  if (!Array.isArray(rawData) || rawData.length === 0) return [];

  const sendersMap = new Map();

  rawData.forEach((item) => {
    const rawSender = cleanString(item.nguoi_gui);
    const senderName = rawSender || "(Chưa rõ người gửi)";

    if (!sendersMap.has(senderName)) {
      sendersMap.set(senderName, {
        name: senderName,
        isUnknown: !rawSender,
        items: [],
        totalBottles: 0,
        totalSpent: 0,
        latestDateTimestamp: 0
      });
    }

    const senderObj = sendersMap.get(senderName);
    senderObj.items.push(item);

    // Tính ngày nhập gần nhất
    const dateTs = parseDateValue(item.ngay);
    if (dateTs > senderObj.latestDateTimestamp) {
      senderObj.latestDateTimestamp = dateTs;
    }

    // Tính số lượng chai
    const qty = parseInt(String(item.sl || "1").replace(/\D/g, ""), 10) || 1;
    senderObj.totalBottles += qty;

    // Tính tổng tiền
    const tt = parseNumber(item.thanh_tien, 0);
    const g = parseNumber(item.gia, 0);
    const amount = tt > 0 ? tt : (g * qty);
    senderObj.totalSpent += amount;
  });

  const sendersList = Array.from(sendersMap.values());

  // Sắp xếp danh sách người gửi theo tiêu chí đang chọn
  sendersList.sort((a, b) => {
    if (senderSortMode === "total") {
      if (b.totalSpent !== a.totalSpent) {
        return b.totalSpent - a.totalSpent;
      }
      return b.items.length - a.items.length;
    } else if (senderSortMode === "name") {
      return a.name.localeCompare(b.name, "vi");
    } else {
      // Mặc định: "recent" (Nhập gần nhất)
      if (b.latestDateTimestamp !== a.latestDateTimestamp) {
        return b.latestDateTimestamp - a.latestDateTimestamp;
      }
      return b.items.length - a.items.length;
    }
  });

  return sendersList;
}

// Khởi tạo và render giao diện Thống Kê Người Gửi
function renderSenderStatsView() {
  const container = document.getElementById("statsSenderPane");
  if (!container) return;

  const rawData = getSenderRawData();
  if (!rawData || rawData.length === 0) {
    container.innerHTML = `
      <div class="stats-empty-state">
        <span style="font-size: 26px;">👤</span>
        <strong>Chưa có dữ liệu nhập hàng</strong>
        <span>Dữ liệu thống kê người gửi sẽ tự động hiển thị khi danh sách nhập được tải.</span>
      </div>
    `;
    return;
  }

  const allSenders = aggregateSenderData(rawData);

  // Nếu đang chọn 1 người gửi cụ thể -> Render màn hình Chi Tiết người đó
  if (selectedSenderName) {
    const currentSender = allSenders.find(s => s.name === selectedSenderName);
    if (!currentSender) {
      selectedSenderName = null;
      renderSenderStatsView();
      return;
    }
    renderSenderDetailView(container, currentSender);
    return;
  }

  // Ngược lại -> Render danh sách toàn bộ người gửi
  renderSenderListView(container, allSenders);
}

// 1. MÀN HÌNH DANH SÁCH TẤT CẢ NGƯỜI GỬI
function renderSenderListView(container, allSenders) {
  // Lọc theo từ khóa tìm kiếm người gửi
  const cleanQuery = removeAccents(senderSearchQuery);
  const filteredSenders = allSenders.filter(s => {
    if (!cleanQuery) return true;
    return removeAccents(s.name).includes(cleanQuery);
  });

  const totalAllSenders = allSenders.length;

  let sortLabel = "🗓️ Gần nhất";
  if (senderSortMode === "total") sortLabel = "💵 Tổng tiền";
  if (senderSortMode === "name") sortLabel = "🔤 Chữ cái A-Z";

  container.innerHTML = `
    <div class="sender-container">
      <!-- 1. HÀNG TÌM KIẾM NGƯỜI GỬI KÈM NÚT FILTER -->
      <div class="sender-search-row">
        <div class="sender-search-wrapper">
          <input type="text" id="senderSearchBox" class="sender-search-input" placeholder="Tìm kiếm người gửi (tên, shop)..." value="${escAttr(senderSearchQuery)}">
          <button type="button" id="senderSearchClear" class="sender-search-clear" style="${senderSearchQuery ? 'display: block;' : 'display: none;'}">&times;</button>
        </div>

        <button type="button" id="btnSenderSortToggle" class="btn-sender-sort ${isSortMenuOpen ? 'active' : ''}" title="Sắp xếp người gửi: ${sortLabel}">
          <span class="icon-mask filter-svg" style="mask-image: url('svg/filter.svg'); -webkit-mask-image: url('svg/filter.svg');"></span>
        </button>

        <!-- Menu dropdown chọn tiêu chí sắp xếp -->
        <div id="senderSortMenu" class="sender-sort-menu" style="${isSortMenuOpen ? 'display: flex;' : 'display: none;'}">
          <div class="sender-sort-item ${senderSortMode === 'recent' ? 'active' : ''}" data-sort="recent">
            <span>🗓️ Nhập gần nhất</span>
            ${senderSortMode === 'recent' ? '<span style="font-size: 11px;">✓</span>' : ''}
          </div>
          <div class="sender-sort-item ${senderSortMode === 'total' ? 'active' : ''}" data-sort="total">
            <span>💵 Theo tổng tiền</span>
            ${senderSortMode === 'total' ? '<span style="font-size: 11px;">✓</span>' : ''}
          </div>
          <div class="sender-sort-item ${senderSortMode === 'name' ? 'active' : ''}" data-sort="name">
            <span>🔤 Theo chữ cái (A-Z)</span>
            ${senderSortMode === 'name' ? '<span style="font-size: 11px;">✓</span>' : ''}
          </div>
        </div>
      </div>

      <!-- 2. HEADER TỔNG KẾT SỐ LƯỢNG & TIÊU CHÍ SẮP XẾP -->
      <div class="sender-summary-badge">
        <span>👤 NGƯỜI GỬI (${filteredSenders.length} / ${totalAllSenders})</span>
        <span>${sortLabel}</span>
      </div>

      <!-- 3. DANH SÁCH CÁC THẺ NGƯỜI GỬI -->
      <div class="sender-list">
        ${filteredSenders.length === 0 ? `
          <div class="stats-empty-state">
            <span style="font-size: 24px;">🔍</span>
            <strong>Không tìm thấy người gửi phù hợp</strong>
            <span>Thử tìm với từ khóa khác...</span>
          </div>
        ` : ""}
        ${filteredSenders.map(s => {
          const firstChar = s.name.charAt(0).toUpperCase() || "👤";
          return `
            <div class="sender-card" data-sender="${escAttr(s.name)}">
              <div class="sender-card-avatar">${s.isUnknown ? "❓" : firstChar}</div>
              <div class="sender-card-info">
                <span class="sender-card-name">${escHtml(s.name)}</span>
                <span class="sender-card-sub">${s.items.length.toLocaleString("vi-VN")} món • ${s.totalBottles.toLocaleString("vi-VN")} chai</span>
              </div>
              <div class="sender-card-right">
                <span class="sender-card-total">${formatMoneyVND(s.totalSpent)}</span>
                <span class="sender-card-arrow">›</span>
              </div>
            </div>
          `;
        }).join("")}
      </div>
    </div>
  `;

  // Gắn sự kiện tìm kiếm, sắp xếp và click thẻ người gửi
  setupSenderListEventListeners(container);
}

// Gắn sự kiện cho màn hình Danh sách người gửi
function setupSenderListEventListeners(container) {
  const searchInput = container.querySelector("#senderSearchBox");
  const clearBtn = container.querySelector("#senderSearchClear");
  const btnSortToggle = container.querySelector("#btnSenderSortToggle");
  const sortMenu = container.querySelector("#senderSortMenu");

  if (searchInput) {
    searchInput.addEventListener("input", (e) => {
      senderSearchQuery = e.target.value.trim();
      if (clearBtn) {
        clearBtn.style.display = senderSearchQuery ? "block" : "none";
      }
      renderSenderStatsView();
    });
  }

  if (clearBtn) {
    clearBtn.addEventListener("click", () => {
      senderSearchQuery = "";
      renderSenderStatsView();
    });
  }

  // Bật/tắt menu sắp xếp
  if (btnSortToggle) {
    btnSortToggle.addEventListener("click", (e) => {
      e.stopPropagation();
      isSortMenuOpen = !isSortMenuOpen;
      renderSenderStatsView();
    });
  }

  // Chọn tiêu chí sắp xếp
  if (sortMenu) {
    const sortItems = sortMenu.querySelectorAll(".sender-sort-item");
    sortItems.forEach(item => {
      item.addEventListener("click", (e) => {
        e.stopPropagation();
        const sortVal = item.getAttribute("data-sort");
        if (sortVal) {
          senderSortMode = sortVal;
          if (typeof StorageHelper !== "undefined") {
            StorageHelper.set("statsSenderSortMode", sortVal);
          }
          isSortMenuOpen = false;
          renderSenderStatsView();
        }
      });
    });
  }

  // Click vào thẻ người gửi -> Chuyển sang xem chi tiết
  const cards = container.querySelectorAll(".sender-card");
  cards.forEach(card => {
    card.addEventListener("click", () => {
      const senderName = card.getAttribute("data-sender");
      if (senderName) {
        selectedSenderName = senderName;
        senderDetailSearchQuery = "";
        isSortMenuOpen = false;
        isDetailSortMenuOpen = false;
        renderSenderStatsView();
      }
    });
  });
}

// 2. MÀN HÌNH CHI TIẾT TỪNG NGƯỜI GỬI
function renderSenderDetailView(container, sender) {
  // Sắp xếp các sản phẩm của người này theo tiêu chí senderDetailSortMode
  const itemsCopy = [...(sender.items || [])];
  itemsCopy.sort((a, b) => {
    if (senderDetailSortMode === "name") {
      const nameA = a.ten || "";
      const nameB = b.ten || "";
      return nameA.localeCompare(nameB, "vi");
    } else if (senderDetailSortMode === "oldest") {
      return parseDateValue(a.ngay) - parseDateValue(b.ngay);
    } else if (senderDetailSortMode === "price_desc") {
      const priceA = parseNumber(a.gia || a.thanh_tien, 0);
      const priceB = parseNumber(b.gia || b.thanh_tien, 0);
      return priceB - priceA;
    } else {
      // Mặc định: "recent" (ngày nhập mới nhất lên trước)
      return parseDateValue(b.ngay) - parseDateValue(a.ngay);
    }
  });

  // Lọc sản phẩm theo từ khóa tìm kiếm trong chi tiết (nếu có)
  const cleanDetailQuery = removeAccents(senderDetailSearchQuery);
  const filteredItems = itemsCopy.filter(it => {
    if (!cleanDetailQuery) return true;
    const nameMatch = removeAccents(it.ten).includes(cleanDetailQuery);
    const capacityMatch = removeAccents(it.dung_tich).includes(cleanDetailQuery);
    const dateMatch = cleanString(it.ngay).includes(cleanDetailQuery);
    return nameMatch || capacityMatch || dateMatch;
  });

  let detailSortLabel = "🗓️ Ngày gần nhất";
  if (senderDetailSortMode === "oldest") detailSortLabel = "🗓️ Ngày cũ nhất";
  if (senderDetailSortMode === "name") detailSortLabel = "🔤 Tên chai (A-Z)";
  if (senderDetailSortMode === "price_desc") detailSortLabel = "💵 Giá cao nhất";

  container.innerHTML = `
    <div class="sender-container">
      <!-- 1. THẺ HEADER THÔNG TIN NGƯỜI GỬI & NÚT TRỞ VỀ -->
      <div class="sender-detail-header-card">
        <div class="sender-detail-top-bar">
          <button type="button" id="btnBackToSenderList" class="btn-sender-back" title="Quay lại danh sách người gửi">
            <span>←</span> <span>Trở về</span>
          </button>
          <div class="sender-detail-title-group">
            <span class="sender-detail-title">👤 ${escHtml(sender.name)}</span>
          </div>
        </div>

        <div class="sender-detail-stats-bar">
          <span class="sender-detail-stat-item">Đã lấy: <strong>${sender.items.length.toLocaleString("vi-VN")} món</strong></span>
          <span>•</span>
          <span class="sender-detail-stat-item">Tổng: <strong>${sender.totalBottles.toLocaleString("vi-VN")} chai</strong></span>
          <span>•</span>
          <span class="sender-detail-stat-item highlight">Tổng tiền: <strong>${formatMoneyVND(sender.totalSpent)}</strong></span>
        </div>
      </div>

      <!-- 2. THANH TÌM KIẾM CHAI CỦA NGƯỜI GỬI NÀY KÈM NÚT SẮP XẾP -->
      <div class="sender-search-row">
        <div class="sender-search-wrapper">
          <input type="text" id="senderItemSearchBox" class="sender-search-input" placeholder="Tìm chai trong danh sách của ${escAttr(sender.name)}..." value="${escAttr(senderDetailSearchQuery)}">
          <button type="button" id="senderItemSearchClear" class="sender-search-clear" style="${senderDetailSearchQuery ? 'display: block;' : 'display: none;'}">&times;</button>
        </div>

        <button type="button" id="btnSenderDetailSortToggle" class="btn-sender-sort ${isDetailSortMenuOpen ? 'active' : ''}" title="Sắp xếp danh sách chai: ${detailSortLabel}">
          <span class="icon-mask filter-svg" style="mask-image: url('svg/filter.svg'); -webkit-mask-image: url('svg/filter.svg');"></span>
        </button>

        <!-- Menu dropdown chọn tiêu chí sắp xếp chai -->
        <div id="senderDetailSortMenu" class="sender-sort-menu" style="${isDetailSortMenuOpen ? 'display: flex;' : 'display: none;'}">
          <div class="sender-sort-item ${senderDetailSortMode === 'recent' ? 'active' : ''}" data-sort="recent">
            <span>🗓️ Ngày nhập mới nhất</span>
            ${senderDetailSortMode === 'recent' ? '<span style="font-size: 11px;">✓</span>' : ''}
          </div>
          <div class="sender-sort-item ${senderDetailSortMode === 'oldest' ? 'active' : ''}" data-sort="oldest">
            <span>🗓️ Ngày nhập cũ nhất</span>
            ${senderDetailSortMode === 'oldest' ? '<span style="font-size: 11px;">✓</span>' : ''}
          </div>
          <div class="sender-sort-item ${senderDetailSortMode === 'name' ? 'active' : ''}" data-sort="name">
            <span>🔤 Theo tên chai (A-Z)</span>
            ${senderDetailSortMode === 'name' ? '<span style="font-size: 11px;">✓</span>' : ''}
          </div>
          <div class="sender-sort-item ${senderDetailSortMode === 'price_desc' ? 'active' : ''}" data-sort="price_desc">
            <span>💵 Theo giá cao nhất</span>
            ${senderDetailSortMode === 'price_desc' ? '<span style="font-size: 11px;">✓</span>' : ''}
          </div>
        </div>
      </div>

      <!-- 3. DANH SÁCH CÁC CHAI CỦA NGƯỜI GỬI -->
      <div class="sender-summary-badge">
        <span>📦 DANH SÁCH CHAI (${filteredItems.length} sản phẩm)</span>
        <span>${senderDetailSearchQuery ? "Đang lọc • " + detailSortLabel : detailSortLabel}</span>
      </div>

      <div class="sender-items-list">
        ${filteredItems.length === 0 ? `
          <div class="stats-empty-state">
            <span style="font-size: 24px;">🔍</span>
            <strong>Không tìm thấy chai nước hoa nào</strong>
            <span>Thử tìm với tên hoặc dung tích khác...</span>
          </div>
        ` : ""}
        ${filteredItems.map(it => {
          const capFormatted = cleanString(it.dung_tich);
          const statusClass = getSenderItemStatusClass(it.tinh_trang);
          const qty = parseInt(String(it.sl || "1").replace(/\D/g, ""), 10) || 1;
          const prodImgUrl = getProductImageByName(it.ten);

          return `
            <div class="sender-item-row">
              ${prodImgUrl ? `<img src="${escAttr(prodImgUrl)}" class="sender-item-thumb" alt="${escAttr(it.ten || '')}" loading="lazy">` : ""}
              <div class="sender-item-body">
                <!-- Hàng trên: Tên chai và Dung tích nằm liền kề bên trái -->
                <div class="sender-item-row-top">
                  <span class="sender-item-name" title="${escAttr(it.ten || '')}">${escHtml(it.ten || "(Chưa đặt tên)")}</span>
                  ${capFormatted ? `<span class="sender-item-badge capacity">${escHtml(capFormatted)}</span>` : ""}
                </div>

                <!-- Hàng dưới: Các thẻ bên trái và Giá tiền bên phải -->
                <div class="sender-item-row-bottom">
                  <div class="sender-item-tags">
                    <span class="sender-item-date">🗓️ ${escHtml(it.ngay || "—")}</span>
                    ${qty > 1 ? `<span class="sender-item-badge qty">SL: ${qty}</span>` : ""}
                    ${it.tinh_trang ? `<span class="sender-item-badge ${statusClass}">${escHtml(it.tinh_trang)}</span>` : ""}
                  </div>
                  <div class="sender-item-price">${formatMoneyVND(it.gia || it.thanh_tien)}</div>
                </div>
              </div>
            </div>
          `;
        }).join("")}
      </div>
    </div>
  `;

  // Gắn sự kiện cho màn hình chi tiết người gửi
  setupSenderDetailEventListeners(container);
}

// Gắn sự kiện cho màn hình Chi tiết người gửi
function setupSenderDetailEventListeners(container) {
  const btnBack = container.querySelector("#btnBackToSenderList");
  const searchInput = container.querySelector("#senderItemSearchBox");
  const clearBtn = container.querySelector("#senderItemSearchClear");
  const btnSortToggle = container.querySelector("#btnSenderDetailSortToggle");
  const sortMenu = container.querySelector("#senderDetailSortMenu");

  if (btnBack) {
    btnBack.addEventListener("click", () => {
      selectedSenderName = null;
      senderDetailSearchQuery = "";
      isDetailSortMenuOpen = false;
      renderSenderStatsView();
    });
  }

  if (searchInput) {
    searchInput.addEventListener("input", (e) => {
      senderDetailSearchQuery = e.target.value.trim();
      if (clearBtn) {
        clearBtn.style.display = senderDetailSearchQuery ? "block" : "none";
      }
      renderSenderStatsView();
    });
  }

  if (clearBtn) {
    clearBtn.addEventListener("click", () => {
      senderDetailSearchQuery = "";
      renderSenderStatsView();
    });
  }

  // Bật/tắt menu sắp xếp chai trong chi tiết
  if (btnSortToggle) {
    btnSortToggle.addEventListener("click", (e) => {
      e.stopPropagation();
      isDetailSortMenuOpen = !isDetailSortMenuOpen;
      renderSenderStatsView();
    });
  }

  // Chọn tiêu chí sắp xếp chai
  if (sortMenu) {
    const sortItems = sortMenu.querySelectorAll(".sender-sort-item");
    sortItems.forEach(item => {
      item.addEventListener("click", (e) => {
        e.stopPropagation();
        const sortVal = item.getAttribute("data-sort");
        if (sortVal) {
          senderDetailSortMode = sortVal;
          if (typeof StorageHelper !== "undefined") {
            StorageHelper.set("statsSenderDetailSortMode", sortVal);
          }
          isDetailSortMenuOpen = false;
          renderSenderStatsView();
        }
      });
    });
  }
}

// Đóng menu khi click ra ngoài (áp dụng chung cho cả menu người gửi và menu chai)
if (typeof document !== "undefined") {
  document.addEventListener("click", (e) => {
    let needsRerender = false;
    if (isSortMenuOpen && !e.target.closest("#btnSenderSortToggle") && !e.target.closest("#senderSortMenu")) {
      isSortMenuOpen = false;
      needsRerender = true;
    }
    if (isDetailSortMenuOpen && !e.target.closest("#btnSenderDetailSortToggle") && !e.target.closest("#senderDetailSortMenu")) {
      isDetailSortMenuOpen = false;
      needsRerender = true;
    }
    if (needsRerender) {
      renderSenderStatsView();
    }
  });
}

// Dọn dẹp dữ liệu người gửi khi Đăng xuất Quản trị (giữ nguyên tùy chọn sort đã lưu của người dùng)
function clearSenderStatsData() {
  selectedSenderName = null;
  senderSearchQuery = "";
  senderDetailSearchQuery = "";
  isSortMenuOpen = false;
  isDetailSortMenuOpen = false;
  const container = document.getElementById("statsSenderPane");
  if (container) container.innerHTML = "";
}

if (typeof window !== "undefined") {
  window.renderSenderStatsView = renderSenderStatsView;
  window.clearSenderStatsData = clearSenderStatsData;
}
