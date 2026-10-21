/**
 * Shared Financial Statistics Module (Thống Kê Tổng Thành Tiền)
 * Hiển thị các dòng Năm dạng Collapsible (2023 -> 2026)
 * Khi mở rộng hiển thị:
 *   1. Biểu đồ cột đứng 12 tháng (Vertical Bar Chart)
 *   2. Lưới 3 cột × 4 hàng = 12 tháng (Month Grid)
 * Nút "Chi tiết" bật/tắt hiển thị số kiện, số chai và % cao điểm
 * Định dạng: Số chấm không đơn vị (formatMoneyVND)
 */

let isFinanceDetailMode = false;     // Trạng thái bật/tắt nút "Chi tiết" (mặc định tắt cho gọn)
let financeSortMode = "recent";      // Tiêu chí sắp xếp năm: "recent" (mới nhất), "oldest" (cũ nhất), "total" (theo tổng tiền)
let isFinanceSortMenuOpen = false;   // Trạng thái mở menu sắp xếp năm
let isFinanceInitialized = false;    // Đánh dấu đã mở tab lần đầu hay chưa
const expandedYearsSet = new Set();  // Set lưu danh sách các năm đang mở rộng (collapsible)

// Khôi phục trạng thái sắp xếp và chi tiết từ storage (Single Source of Truth)
try {
  const savedDetail = localStorage.getItem("statsFinanceDetailMode");
  if (savedDetail !== null) isFinanceDetailMode = JSON.parse(savedDetail);
  const savedSort = localStorage.getItem("statsFinanceSortMode");
  if (savedSort) financeSortMode = JSON.parse(savedSort);
} catch (e) {}

if (typeof StorageHelper !== "undefined") {
  StorageHelper.get("statsFinanceDetailMode", isFinanceDetailMode).then(val => {
    if (typeof val === "boolean") isFinanceDetailMode = val;
  });
  StorageHelper.get("statsFinanceSortMode", financeSortMode).then(val => {
    if (val) financeSortMode = val;
  });
}

// Kiểm tra trạng thái đơn không phát sinh chi phí thực tế (chỉ Hỏi Giá và Hoàn Hàng)
function isFinanceInactiveItem(status) {
  const s = removeAccents(status).trim();
  return s.includes("hoi gia") || s.includes("hoan hang");
}

// Trích xuất ngày tháng năm từ chuỗi ngày DD/MM/YYYY
function parseFinanceItemDate(dateStr) {
  if (!dateStr) return { day: 0, month: 0, year: 0, valid: false };
  const s = String(dateStr).trim();
  const m = s.match(/^(\d{1,2})[\/\-\.](\d{1,2})[\/\-\.](\d{4})/);
  if (m) {
    return {
      day: parseInt(m[1], 10),
      month: parseInt(m[2], 10),
      year: parseInt(m[3], 10),
      valid: true
    };
  }
  const mIso = s.match(/^(\d{4})[\/\-\.](\d{1,2})[\/\-\.](\d{1,2})/);
  if (mIso) {
    return {
      day: parseInt(mIso[3], 10),
      month: parseInt(mIso[2], 10),
      year: parseInt(mIso[1], 10),
      valid: true
    };
  }
  return { day: 0, month: 0, year: 0, valid: false };
}

// Tính thành tiền của 1 dòng sản phẩm
function getFinanceItemAmount(item) {
  if (isFinanceInactiveItem(item.tinh_trang)) return 0;
  const tt = parseNumber(item.thanh_tien, 0);
  if (tt > 0) return tt;
  const g = parseNumber(item.gia, 0);
  const q = parseInt(String(item.sl || "1").replace(/\D/g, ""), 10) || 1;
  return g * q;
}

// Lấy danh sách dòng nhập từ import module (Single Source of Truth)
function getFinanceRawData() {
  if (typeof window.getImportRawData === "function") {
    return window.getImportRawData() || [];
  }
  if (typeof importRawData !== "undefined" && Array.isArray(importRawData)) {
    return importRawData;
  }
  return [];
}

// Khởi tạo và render giao diện Thống Kê Tổng Thành Tiền
function renderFinanceStatsView() {
  const container = document.getElementById("statsFinancePane");
  if (!container) return;

  const rawData = getFinanceRawData();
  if (!rawData || rawData.length === 0) {
    container.innerHTML = `
      <div class="stats-empty-state">
        <span style="font-size: 24px;">📦</span>
        <strong>Chưa có dữ liệu nhập hàng</strong>
        <span>Dữ liệu thống kê sẽ tự động hiển thị khi danh sách nhập được tải.</span>
      </div>
    `;
    return;
  }

  // 1. Quét và lọc các dòng sản phẩm hợp lệ (bỏ qua Hỏi Giá & Hoàn Hàng)
  const yearsSet = new Set();
  const validItems = [];

  rawData.forEach((item, idx) => {
    if (isFinanceInactiveItem(item.tinh_trang)) return;
    const dateObj = parseFinanceItemDate(item.ngay);
    if (!dateObj.valid) return;

    yearsSet.add(dateObj.year);
    validItems.push({
      item,
      date: dateObj,
      amount: getFinanceItemAmount(item),
      qty: parseInt(String(item.sl || "1").replace(/\D/g, ""), 10) || 1,
      idx
    });
  });

  // 2. Gom nhóm dữ liệu theo từng Năm và đủ 12 Tháng của năm đó
  const yearlyDataMap = new Map();

  yearsSet.forEach(year => {
    const months = [];
    for (let m = 1; m <= 12; m++) {
      months.push({
        month: m,
        total: 0,
        bottles: 0,
        packageKeys: new Set()
      });
    }
    yearlyDataMap.set(year, {
      year,
      total: 0,
      bottles: 0,
      packageKeys: new Set(),
      peakMonthTotal: 0,
      months
    });
  });

  validItems.forEach(v => {
    const yData = yearlyDataMap.get(v.date.year);
    if (!yData) return;

    // Cộng dồn vào Năm
    yData.total += v.amount;
    yData.bottles += v.qty;
    const pkgKey = `${v.date.day}/${v.date.month}/${v.date.year}___${cleanString(v.item.nguoi_gui) || v.idx}`;
    yData.packageKeys.add(pkgKey);

    // Cộng dồn vào Tháng tương ứng (Tháng 1 -> index 0)
    if (v.date.month >= 1 && v.date.month <= 12) {
      const mData = yData.months[v.date.month - 1];
      mData.total += v.amount;
      mData.bottles += v.qty;
      mData.packageKeys.add(pkgKey);
    }
  });

  // 3. Sắp xếp các năm theo tiêu chí financeSortMode
  const availableYears = Array.from(yearsSet).sort((a, b) => {
    if (financeSortMode === "oldest") {
      return a - b;
    } else if (financeSortMode === "total") {
      const totalA = (yearlyDataMap.get(a)?.total) || 0;
      const totalB = (yearlyDataMap.get(b)?.total) || 0;
      if (totalB !== totalA) return totalB - totalA;
      return b - a;
    } else {
      // Mặc định: "recent" (năm mới nhất)
      return b - a;
    }
  });

  // Mặc định lần đầu mở: tự động mở rộng năm gần nhất (chỉ chạy 1 lần duy nhất lúc khởi tạo)
  if (!isFinanceInitialized && availableYears.length > 0) {
    const newestYear = Math.max(...availableYears);
    expandedYearsSet.add(newestYear);
    isFinanceInitialized = true;
  }

  // 4. Tính mốc cao nhất để vẽ thanh tỷ lệ % (Năm cao nhất & Tháng cao nhất trong từng năm)
  let peakYearTotal = 1;
  yearlyDataMap.forEach(yData => {
    if (yData.total > peakYearTotal) peakYearTotal = yData.total;
    let peakM = 0;
    yData.months.forEach(mData => {
      if (mData.total > peakM) peakM = mData.total;
    });
    yData.peakMonthTotal = peakM > 0 ? peakM : 1;
  });

  const currentYear = new Date().getFullYear();

  // 5. Lưu vị trí cuộn hiện tại để giữ nguyên trải nghiệm khi đóng/mở thẻ
  const prevListEl = container.querySelector(".finance-years-list");
  const savedScrollTop = prevListEl ? prevListEl.scrollTop : 0;

  let sortLabel = "🗓️ Năm mới nhất";
  if (financeSortMode === "oldest") sortLabel = "🗓️ Năm cũ nhất";
  if (financeSortMode === "total") sortLabel = "💵 Theo tổng tiền";

  // Dựng giao diện HTML hoàn chỉnh
  container.innerHTML = `
    <div class="finance-container">
      <!-- 1. THANH TOOLBAR & NÚT SẮP XẾP + NÚT BẬT/TẮT CHI TIẾT -->
      <div class="finance-toolbar">
        <span class="finance-toolbar-title">💰 Tổng Thành Tiền Theo Năm</span>
        <div class="finance-toolbar-actions">
          <button type="button" id="btnFinanceSortToggle" class="btn-finance-sort ${isFinanceSortMenuOpen ? 'active' : ''}" title="Sắp xếp năm: ${sortLabel}">
            <span class="icon-mask filter-svg" style="mask-image: url('svg/filter.svg'); -webkit-mask-image: url('svg/filter.svg');"></span>
          </button>

          <!-- Dropdown sort menu cho finance -->
          <div id="financeSortMenu" class="finance-sort-menu" style="${isFinanceSortMenuOpen ? 'display: flex;' : 'display: none;'}">
            <div class="finance-sort-item ${financeSortMode === 'recent' ? 'active' : ''}" data-sort="recent">
              <span>🗓️ Năm mới nhất</span>
              ${financeSortMode === 'recent' ? '<span style="font-size: 11px;">✓</span>' : ''}
            </div>
            <div class="finance-sort-item ${financeSortMode === 'oldest' ? 'active' : ''}" data-sort="oldest">
              <span>🗓️ Năm cũ nhất</span>
              ${financeSortMode === 'oldest' ? '<span style="font-size: 11px;">✓</span>' : ''}
            </div>
            <div class="finance-sort-item ${financeSortMode === 'total' ? 'active' : ''}" data-sort="total">
              <span>💵 Theo tổng tiền</span>
              ${financeSortMode === 'total' ? '<span style="font-size: 11px;">✓</span>' : ''}
            </div>
          </div>

          <button type="button" id="btnFinanceDetailToggle" class="btn-finance-detail-toggle ${isFinanceDetailMode ? 'active' : ''}" title="Bật/Tắt hiển thị chi tiết số kiện, số chai, % cao điểm">
            <span>${isFinanceDetailMode ? '👁️ Đang hiện chi tiết' : '👁️ Chi tiết'}</span>
          </button>
        </div>
      </div>

      <!-- 2. DANH SÁCH CÁC DÒNG NĂM COLLAPSIBLE -->
      <div class="finance-years-list">
        ${availableYears.map(year => {
          const yData = yearlyDataMap.get(year);
          const isExpanded = expandedYearsSet.has(year);
          const yearPct = Math.max(3, Math.round((yData.total / peakYearTotal) * 100));
          const totalPackages = yData.packageKeys.size;
          const isCurrent = (year === currentYear);

          return `
            <div class="finance-year-card ${isExpanded ? 'is-expanded' : ''}" data-year="${year}">
              <!-- DÒNG TIÊU ĐỀ NĂM (BẤM MỞ / ĐÓNG) -->
              <div class="finance-year-header" data-year="${year}">
                <div class="finance-year-row-top">
                  <div class="finance-year-title-group">
                    <span class="finance-year-chevron">▶</span>
                    <span class="finance-year-name">Năm ${year}</span>
                    ${isCurrent ? '<span class="finance-year-badge-current">Năm nay</span>' : ''}
                  </div>
                  <span class="finance-year-total">${formatMoneyVND(yData.total)}</span>
                </div>

                ${isFinanceDetailMode ? `
                  <div class="finance-year-sub">
                    <span>${totalPackages.toLocaleString("vi-VN")} kiện</span>
                    <span>•</span>
                    <span>${yData.bottles.toLocaleString("vi-VN")} chai</span>
                    <span>•</span>
                    <span>${yearPct}% cao điểm</span>
                  </div>
                ` : ''}

                <!-- Thanh progress bar so sánh tỷ lệ giữa các năm -->
                <div class="finance-progress-track">
                  <div class="finance-progress-fill" style="width: ${yearPct}%;"></div>
                </div>
              </div>

              <!-- KHỐI MỞ RỘNG BÊN TRONG (BIỂU ĐỒ 12 THÁNG + LƯỚI 3x4) -->
              ${isExpanded ? `
                <div class="finance-year-body">
                  <!-- MỤC 1: BIỂU ĐỒ CỘT ĐỨNG 12 THÁNG -->
                  <div class="finance-chart-section">
                    <div class="finance-section-sub-title">📊 Biểu đồ doanh thu 12 tháng</div>
                    <div class="finance-bar-chart">
                      ${yData.months.map(m => {
                        const mPct = yData.peakMonthTotal > 0 ? Math.round((m.total / yData.peakMonthTotal) * 100) : 0;
                        const barHeight = m.total > 0 ? Math.max(6, mPct) : 2;
                        const isPeak = (m.total > 0 && m.total === yData.peakMonthTotal);
                        const detailTip = `Tháng ${m.month}/${year}: ${formatMoneyVND(m.total)} (${m.packageKeys.size} kiện • ${m.bottles} chai • ${mPct}% đỉnh)`;

                        return `
                          <div class="finance-bar-col ${isPeak ? 'is-peak' : ''}" title="${detailTip}">
                            <div class="finance-bar-track">
                              <div class="finance-bar-fill" style="height: ${barHeight}%;"></div>
                            </div>
                            <span class="finance-bar-label">T${m.month}</span>
                          </div>
                        `;
                      }).join("")}
                    </div>
                  </div>

                  <!-- MỤC 2: LƯỚI 3 CỘT × 4 HÀNG (12 THÁNG) -->
                  <div class="finance-grid-section">
                    <div class="finance-section-sub-title">🗓️ Chi tiết 12 tháng</div>
                    <div class="finance-month-grid">
                      ${yData.months.map(m => {
                        const mPct = yData.peakMonthTotal > 0 ? Math.round((m.total / yData.peakMonthTotal) * 100) : 0;
                        const isZero = (m.total === 0);
                        const isPeak = (!isZero && m.total === yData.peakMonthTotal);

                        return `
                          <div class="finance-month-cell ${isZero ? 'is-zero' : ''} ${isPeak ? 'is-peak' : ''}">
                            <div class="finance-month-cell-top">
                              <span class="finance-month-cell-name">Tháng ${m.month}</span>
                              ${isPeak ? '<span style="font-size: 9px;" title="Tháng cao điểm nhất năm">⭐</span>' : ''}
                            </div>
                            <div class="finance-month-cell-val">${formatMoneyVND(m.total)}</div>
                            ${isFinanceDetailMode ? `
                              <div class="finance-month-cell-sub">
                                ${isZero ? 'Chưa có đơn' : `${m.packageKeys.size} kiện • ${m.bottles} chai<br>${mPct}% cao điểm`}
                              </div>
                            ` : ''}
                          </div>
                        `;
                      }).join("")}
                    </div>
                  </div>
                </div>
              ` : ''}
            </div>
          `;
        }).join("")}
      </div>
    </div>
  `;

  // Khôi phục lại vị trí cuộn mượt mà
  const nextListEl = container.querySelector(".finance-years-list");
  if (nextListEl && savedScrollTop > 0) {
    nextListEl.scrollTop = savedScrollTop;
  }

  // Gắn sự kiện tương tác
  setupFinanceEventListeners(container);
}

// Gắn sự kiện cho các thành phần giao diện Tài chính
function setupFinanceEventListeners(container) {
  // 1. Nút Bật/Tắt chế độ Chi tiết
  const btnDetailToggle = container.querySelector("#btnFinanceDetailToggle");
  if (btnDetailToggle) {
    btnDetailToggle.addEventListener("click", () => {
      isFinanceDetailMode = !isFinanceDetailMode;
      if (typeof StorageHelper !== "undefined") {
        StorageHelper.set("statsFinanceDetailMode", isFinanceDetailMode);
      }
      renderFinanceStatsView();
    });
  }

  // 2. Nút Bật/Tắt menu sắp xếp năm
  const btnSortToggle = container.querySelector("#btnFinanceSortToggle");
  const sortMenu = container.querySelector("#financeSortMenu");

  if (btnSortToggle) {
    btnSortToggle.addEventListener("click", (e) => {
      e.stopPropagation();
      isFinanceSortMenuOpen = !isFinanceSortMenuOpen;
      renderFinanceStatsView();
    });
  }

  if (sortMenu) {
    const sortItems = sortMenu.querySelectorAll(".finance-sort-item");
    sortItems.forEach(item => {
      item.addEventListener("click", (e) => {
        e.stopPropagation();
        const sortVal = item.getAttribute("data-sort");
        if (sortVal) {
          financeSortMode = sortVal;
          if (typeof StorageHelper !== "undefined") {
            StorageHelper.set("statsFinanceSortMode", sortVal);
          }
          isFinanceSortMenuOpen = false;
          renderFinanceStatsView();
        }
      });
    });
  }

  // 3. Click vào tiêu đề Năm để Mở rộng / Thu gọn (Collapsible)
  const yearHeaders = container.querySelectorAll(".finance-year-header");
  yearHeaders.forEach(header => {
    header.addEventListener("click", () => {
      const year = parseInt(header.getAttribute("data-year"), 10);
      if (!isNaN(year)) {
        if (expandedYearsSet.has(year)) {
          expandedYearsSet.delete(year);
        } else {
          expandedYearsSet.add(year);
        }
        renderFinanceStatsView();
      }
    });
  });
}

// Đóng menu sắp xếp năm khi click ra ngoài
if (typeof document !== "undefined") {
  document.addEventListener("click", (e) => {
    if (isFinanceSortMenuOpen && !e.target.closest("#btnFinanceSortToggle") && !e.target.closest("#financeSortMenu")) {
      isFinanceSortMenuOpen = false;
      renderFinanceStatsView();
    }
  });
}

// Reset dữ liệu về mặc định khi Đăng xuất Quản trị (giữ nguyên tùy chọn sort/detail mode của người dùng)
function resetFinanceFilters() {
  expandedYearsSet.clear();
  isFinanceInitialized = false;
  isFinanceSortMenuOpen = false;
}

if (typeof window !== "undefined") {
  window.renderFinanceStatsView = renderFinanceStatsView;
  window.resetFinanceFilters = resetFinanceFilters;
}
