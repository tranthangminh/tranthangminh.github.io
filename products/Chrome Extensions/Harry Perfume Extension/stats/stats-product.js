/**
 * Shared Product Statistics Module (Thống Kê Lịch Sử Sản Phẩm)
 * Hiển thị danh sách các chai nước hoa đã nhập từ "List-Sản phẩm" và gom nhóm lịch sử
 * Khi click vào 1 chai -> Truy xuất toàn bộ lịch sử các lần nhập gồm: Người gửi, Giá, Ngày
 * Định dạng: Số chấm không đơn vị (formatMoneyVND)
 */

let selectedProductName = null;       // Tên chai nước hoa đang xem chi tiết (null nếu ở danh sách tổng)
let productSearchQuery = "";          // Từ khóa tìm kiếm chai trong danh sách tổng
let productDetailSearchQuery = "";    // Từ khóa tìm kiếm trong lịch sử của 1 chai
let productSortMode = "recent";       // Sắp xếp danh sách tổng: "recent" (gần nhất), "count" (nhập nhiều nhất), "name" (A-Z), "price_desc" (giá cao nhất)
let productDetailSortMode = "recent"; // Sắp xếp lịch sử chi tiết: "recent" (mới nhất), "oldest" (cũ nhất), "price_desc" (giá cao nhất), "price_asc" (giá thấp nhất), "sender" (người gửi A-Z)
let isProductSortMenuOpen = false;
let isProductDetailSortMenuOpen = false;

// Khôi phục trạng thái sắp xếp cuối cùng từ bộ nhớ lưu trữ
try {
  const pMode = localStorage.getItem("statsProductSortMode");
  if (pMode) productSortMode = JSON.parse(pMode);
  const pdMode = localStorage.getItem("statsProductDetailSortMode");
  if (pdMode) productDetailSortMode = JSON.parse(pdMode);
} catch (e) {}

if (typeof StorageHelper !== "undefined") {
  StorageHelper.get("statsProductSortMode", productSortMode).then(val => {
    if (val) productSortMode = val;
  });
  StorageHelper.get("statsProductDetailSortMode", productDetailSortMode).then(val => {
    if (val) productDetailSortMode = val;
  });
}

// Lấy danh sách dòng nhập từ import module (Single Source of Truth)
function getProductRawData() {
  if (typeof window.getImportRawData === "function") {
    return window.getImportRawData() || [];
  }
  if (typeof importRawData !== "undefined" && Array.isArray(importRawData)) {
    return importRawData;
  }
  return [];
}

// Lấy danh sách sản phẩm chuẩn từ Dropdown Cache (Cột "List-Sản phẩm")
function getMasterProductDropdownList() {
  if (!window.cachedImportLists || typeof window.cachedImportLists !== "object") {
    return [];
  }
  // Tìm key khớp "List-Sản phẩm" không phân biệt hoa thường
  const keys = Object.keys(window.cachedImportLists);
  for (let i = 0; i < keys.length; i++) {
    const k = keys[i];
    if (removeAccents(k) === "list-san pham") {
      const list = window.cachedImportLists[k];
      if (Array.isArray(list)) return list;
    }
  }
  return [];
}

// Xác định lớp CSS cho badge trạng thái
function getProductItemStatusClass(status) {
  const s = removeAccents(status);
  if (s.includes("da nhan") || s.includes("da ve") || s.includes("hoan thanh")) return "status-done";
  if (s.includes("dang ve") || s.includes("order") || s.includes("cho")) return "status-pending";
  if (s.includes("hoan hang")) return "status-return";
  if (s.includes("hoi gia")) return "status-inquiry";
  return "status-default";
}

// Gom nhóm dữ liệu sản phẩm theo danh sách chuẩn & các đơn đã nhập
function aggregateProductData(rawData) {
  const masterList = getMasterProductDropdownList();
  const productsMap = new Map();

  // 1. Khởi tạo các sản phẩm từ danh sách chuẩn "List-Sản phẩm"
  masterList.forEach((prodName) => {
    const trimmed = cleanString(prodName);
    if (!trimmed) return;
    const key = removeAccents(trimmed);
    if (!productsMap.has(key)) {
      productsMap.set(key, {
        name: trimmed,
        items: [],
        totalBottles: 0,
        latestDateTimestamp: 0,
        latestDate: "",
        latestPrice: 0,
        priceMin: 0,
        priceMax: 0,
        latestSender: ""
      });
    }
  });

  // 2. Gom toàn bộ các dòng nhập thực tế vào từng sản phẩm tương ứng
  if (Array.isArray(rawData)) {
    rawData.forEach((item) => {
      const rawName = cleanString(item.ten);
      if (!rawName) return;
      const key = removeAccents(rawName);

      if (!productsMap.has(key)) {
        // Nếu sản phẩm chưa có trong danh sách chuẩn "List-Sản phẩm", vẫn thêm vào để không sót dữ liệu
        productsMap.set(key, {
          name: rawName,
          items: [],
          totalBottles: 0,
          latestDateTimestamp: 0,
          latestDate: "",
          latestPrice: 0,
          priceMin: 0,
          priceMax: 0,
          latestSender: ""
        });
      }

      const prodObj = productsMap.get(key);
      prodObj.items.push(item);

      // Tính số lượng chai
      const qty = parseInt(String(item.sl || "1").replace(/\D/g, ""), 10) || 1;
      prodObj.totalBottles += qty;

      // Tính ngày nhập và giá
      const dateTs = typeof parseDateValue === "function" ? parseDateValue(item.ngay) : 0;
      if (dateTs >= prodObj.latestDateTimestamp) {
        prodObj.latestDateTimestamp = dateTs;
        prodObj.latestDate = cleanString(item.ngay);
        prodObj.latestSender = cleanString(item.nguoi_gui);
        const p = parseNumber(item.gia || item.thanh_tien, 0);
        if (p > 0) prodObj.latestPrice = p;
      }

      // Tính khoảng giá min/max
      const itemPrice = parseNumber(item.gia || item.thanh_tien, 0);
      if (itemPrice > 0) {
        if (prodObj.priceMin === 0 || itemPrice < prodObj.priceMin) {
          prodObj.priceMin = itemPrice;
        }
        if (itemPrice > prodObj.priceMax) {
          prodObj.priceMax = itemPrice;
        }
      }
    });
  }

  // Chuyển Map thành mảng
  const productList = Array.from(productsMap.values());

  // Đảm bảo các đơn nhập trong từng sản phẩm được sắp xếp mới nhất ở trên
  productList.forEach(prod => {
    prod.items.sort((a, b) => {
      const tsA = typeof parseDateValue === "function" ? parseDateValue(a.ngay) : 0;
      const tsB = typeof parseDateValue === "function" ? parseDateValue(b.ngay) : 0;
      return tsB - tsA;
    });
    // Nếu chưa có latestPrice từ loop trước (do ngày không thứ tự), lấy từ item đầu tiên
    if (prod.items.length > 0 && prod.latestPrice === 0) {
      prod.latestPrice = parseNumber(prod.items[0].gia || prod.items[0].thanh_tien, 0);
      prod.latestDate = cleanString(prod.items[0].ngay);
      prod.latestSender = cleanString(prod.items[0].nguoi_gui);
    }
  });

  // Sắp xếp danh sách sản phẩm theo tiêu chí đang chọn
  productList.sort((a, b) => {
    if (productSortMode === "count") {
      if (b.items.length !== a.items.length) {
        return b.items.length - a.items.length;
      }
      return b.totalBottles - a.totalBottles;
    } else if (productSortMode === "name") {
      return a.name.localeCompare(b.name, "vi");
    } else if (productSortMode === "price_desc") {
      return b.latestPrice - a.latestPrice;
    } else {
      // Mặc định: "recent" (Nhập gần nhất)
      if (b.latestDateTimestamp !== a.latestDateTimestamp) {
        return b.latestDateTimestamp - a.latestDateTimestamp;
      }
      return b.items.length - a.items.length;
    }
  });

  return productList;
}

// Khởi tạo và render giao diện Thống Kê Sản Phẩm
function renderProductStatsView() {
  const container = document.getElementById("statsProductPane");
  if (!container) return;

  const rawData = getProductRawData();
  const allProducts = aggregateProductData(rawData);

  if (allProducts.length === 0) {
    container.innerHTML = `
      <div class="stats-empty-state">
        <span style="font-size: 26px;">🧴</span>
        <strong>Chưa có dữ liệu sản phẩm</strong>
        <span>Dữ liệu sản phẩm sẽ tự động hiển thị khi danh sách nhập hoặc cột List-Sản phẩm được tải.</span>
      </div>
    `;
    return;
  }

  // Nếu đang chọn 1 sản phẩm cụ thể -> Render màn hình Lịch Sử Chi Tiết
  if (selectedProductName) {
    const currentProd = allProducts.find(p => p.name === selectedProductName || removeAccents(p.name) === removeAccents(selectedProductName));
    if (!currentProd) {
      selectedProductName = null;
      renderProductStatsView();
      return;
    }
    renderProductDetailView(container, currentProd);
    return;
  }

  // Ngược lại -> Render danh sách toàn bộ sản phẩm
  renderProductListView(container, allProducts);
}

// 1. MÀN HÌNH DANH SÁCH TẤT CẢ SẢN PHẨM
function renderProductListView(container, allProducts) {
  const cleanQuery = removeAccents(productSearchQuery);
  const filteredProducts = allProducts.filter(p => {
    if (!cleanQuery) return true;
    return removeAccents(p.name).includes(cleanQuery);
  });

  const totalAllProducts = allProducts.length;

  let sortLabel = "🗓️ Gần nhất";
  if (productSortMode === "count") sortLabel = "📦 Nhập nhiều";
  if (productSortMode === "name") sortLabel = "🔤 Chữ cái A-Z";
  if (productSortMode === "price_desc") sortLabel = "💵 Giá cao nhất";

  container.innerHTML = `
    <div class="product-container">
      <!-- 1. HÀNG TÌM KIẾM SẢN PHẨM KÈM NÚT SẮP XẾP -->
      <div class="product-search-row">
        <div class="product-search-wrapper">
          <input type="text" id="productSearchBox" class="product-search-input" placeholder="Tìm kiếm chai nước hoa..." value="${escAttr(productSearchQuery)}">
          <button type="button" id="productSearchClear" class="product-search-clear" style="${productSearchQuery ? 'display: block;' : 'display: none;'}">&times;</button>
        </div>

        <button type="button" id="btnProductSortToggle" class="btn-product-sort ${isProductSortMenuOpen ? 'active' : ''}" title="Sắp xếp sản phẩm: ${sortLabel}">
          <span class="icon-mask filter-svg" style="mask-image: url('svg/filter.svg'); -webkit-mask-image: url('svg/filter.svg');"></span>
        </button>

        <!-- Menu dropdown chọn tiêu chí sắp xếp -->
        <div id="productSortMenu" class="product-sort-menu" style="${isProductSortMenuOpen ? 'display: flex;' : 'display: none;'}">
          <div class="product-sort-item ${productSortMode === 'recent' ? 'active' : ''}" data-sort="recent">
            <span>🗓️ Nhập gần nhất</span>
            ${productSortMode === 'recent' ? '<span style="font-size: 11px;">✓</span>' : ''}
          </div>
          <div class="product-sort-item ${productSortMode === 'count' ? 'active' : ''}" data-sort="count">
            <span>📦 Nhập nhiều nhất</span>
            ${productSortMode === 'count' ? '<span style="font-size: 11px;">✓</span>' : ''}
          </div>
          <div class="product-sort-item ${productSortMode === 'name' ? 'active' : ''}" data-sort="name">
            <span>🔤 Theo chữ cái (A-Z)</span>
            ${productSortMode === 'name' ? '<span style="font-size: 11px;">✓</span>' : ''}
          </div>
          <div class="product-sort-item ${productSortMode === 'price_desc' ? 'active' : ''}" data-sort="price_desc">
            <span>💵 Theo giá mới nhất</span>
            ${productSortMode === 'price_desc' ? '<span style="font-size: 11px;">✓</span>' : ''}
          </div>
        </div>
      </div>

      <!-- 2. HEADER TỔNG KẾT SỐ LƯỢNG & TIÊU CHÍ SẮP XẾP -->
      <div class="product-summary-badge">
        <span>📦 SẢN PHẨM (${filteredProducts.length} / ${totalAllProducts})</span>
        <span>${sortLabel}</span>
      </div>

      <!-- 3. DANH SÁCH CÁC THẺ SẢN PHẨM -->
      <div class="product-list">
        ${filteredProducts.length === 0 ? `
          <div class="stats-empty-state">
            <span style="font-size: 24px;">🔍</span>
            <strong>Không tìm thấy chai nước hoa nào</strong>
            <span>Thử tìm với tên khác...</span>
          </div>
        ` : ""}
        ${filteredProducts.map(p => {
          const imgUrl = typeof getProductImageByName === "function" ? getProductImageByName(p.name) : "";
          const importCount = p.items.length;
          const subText = importCount > 0 
            ? `<span class="badge-count">${importCount} lần</span> • ${p.totalBottles} chai`
            : `Chưa có đơn nhập`;

          let priceDisplay = "—";
          if (p.latestPrice > 0) {
            priceDisplay = formatMoneyVND(p.latestPrice);
          }

          return `
            <div class="product-card" data-product="${escAttr(p.name)}">
              ${imgUrl 
                ? `<img src="${escAttr(imgUrl)}" class="product-card-thumb" alt="${escAttr(p.name)}" loading="lazy">` 
                : `<div class="product-card-avatar-fallback">🧴</div>`
              }
              <div class="product-card-info">
                <span class="product-card-name" title="${escAttr(p.name)}">${escHtml(p.name)}</span>
                <div class="product-card-sub">${subText}</div>
              </div>
              <div class="product-card-right">
                <div class="product-card-price-row">
                  <span class="product-card-price">${priceDisplay}</span>
                  <span class="product-card-arrow">›</span>
                </div>
                <span class="product-card-date">${p.latestDate ? "🗓️ " + escHtml(p.latestDate) : "—"}</span>
              </div>
            </div>
          `;
        }).join("")}
      </div>
    </div>
  `;

  // Gắn sự kiện cho màn hình Danh sách sản phẩm
  setupProductListEventListeners(container);
}

// Gắn sự kiện cho màn hình Danh sách sản phẩm
function setupProductListEventListeners(container) {
  const searchInput = container.querySelector("#productSearchBox");
  const clearBtn = container.querySelector("#productSearchClear");
  const btnSortToggle = container.querySelector("#btnProductSortToggle");
  const sortMenu = container.querySelector("#productSortMenu");

  if (searchInput) {
    searchInput.addEventListener("input", (e) => {
      productSearchQuery = e.target.value.trim();
      if (clearBtn) {
        clearBtn.style.display = productSearchQuery ? "block" : "none";
      }
      renderProductStatsView();
    });
  }

  if (clearBtn) {
    clearBtn.addEventListener("click", () => {
      productSearchQuery = "";
      renderProductStatsView();
    });
  }

  // Bật/tắt menu sắp xếp
  if (btnSortToggle) {
    btnSortToggle.addEventListener("click", (e) => {
      e.stopPropagation();
      isProductSortMenuOpen = !isProductSortMenuOpen;
      renderProductStatsView();
    });
  }

  // Chọn tiêu chí sắp xếp
  if (sortMenu) {
    const sortItems = sortMenu.querySelectorAll(".product-sort-item");
    sortItems.forEach(item => {
      item.addEventListener("click", (e) => {
        e.stopPropagation();
        const sortVal = item.getAttribute("data-sort");
        if (sortVal) {
          productSortMode = sortVal;
          if (typeof StorageHelper !== "undefined") {
            StorageHelper.set("statsProductSortMode", sortVal);
          }
          try {
            localStorage.setItem("statsProductSortMode", JSON.stringify(sortVal));
          } catch (err) {}
          isProductSortMenuOpen = false;
          renderProductStatsView();
        }
      });
    });
  }

  // Click vào thẻ sản phẩm để mở lịch sử chi tiết
  const cards = container.querySelectorAll(".product-card");
  cards.forEach(card => {
    card.addEventListener("click", () => {
      const prodName = card.getAttribute("data-product");
      if (prodName) {
        selectedProductName = prodName;
        productDetailSearchQuery = "";
        isProductDetailSortMenuOpen = false;
        renderProductStatsView();
      }
    });
  });
}

// 2. MÀN HÌNH CHI TIẾT LỊCH SỬ CỦA 1 SẢN PHẨM
function renderProductDetailView(container, product) {
  const imgUrl = typeof getProductImageByName === "function" ? getProductImageByName(product.name) : "";

  // Tạo bản sao các đơn nhập để sắp xếp và lọc
  const itemsList = [...product.items];

  // Sắp xếp danh sách lịch sử
  itemsList.sort((a, b) => {
    if (productDetailSortMode === "oldest") {
      const tsA = typeof parseDateValue === "function" ? parseDateValue(a.ngay) : 0;
      const tsB = typeof parseDateValue === "function" ? parseDateValue(b.ngay) : 0;
      return tsA - tsB;
    } else if (productDetailSortMode === "price_desc") {
      const priceA = parseNumber(a.gia || a.thanh_tien, 0);
      const priceB = parseNumber(b.gia || b.thanh_tien, 0);
      return priceB - priceA;
    } else if (productDetailSortMode === "price_asc") {
      const priceA = parseNumber(a.gia || a.thanh_tien, 0);
      const priceB = parseNumber(b.gia || b.thanh_tien, 0);
      return priceA - priceB;
    } else if (productDetailSortMode === "sender") {
      const sA = cleanString(a.nguoi_gui);
      const sB = cleanString(b.nguoi_gui);
      return sA.localeCompare(sB, "vi");
    } else {
      // Mặc định: "recent" (ngày nhập mới nhất lên trước)
      const tsA = typeof parseDateValue === "function" ? parseDateValue(a.ngay) : 0;
      const tsB = typeof parseDateValue === "function" ? parseDateValue(b.ngay) : 0;
      return tsB - tsA;
    }
  });

  // Lọc theo từ khóa tìm kiếm trong chi tiết (người gửi, ngày, ghi chú, dung tích)
  const cleanDetailQuery = removeAccents(productDetailSearchQuery);
  const filteredItems = itemsList.filter(it => {
    if (!cleanDetailQuery) return true;
    const strSender = removeAccents(it.nguoi_gui);
    const strDate = removeAccents(it.ngay);
    const strNote = removeAccents(it.ghi_chu);
    const strCap = removeAccents(it.dung_tich);
    return strSender.includes(cleanDetailQuery) || strDate.includes(cleanDetailQuery) || strNote.includes(cleanDetailQuery) || strCap.includes(cleanDetailQuery);
  });

  let detailSortLabel = "🗓️ Mới nhất";
  if (productDetailSortMode === "oldest") detailSortLabel = "🗓️ Cũ nhất";
  if (productDetailSortMode === "price_desc") detailSortLabel = "💵 Giá cao";
  if (productDetailSortMode === "price_asc") detailSortLabel = "💵 Giá thấp";
  if (productDetailSortMode === "sender") detailSortLabel = "👤 Người gửi";

  container.innerHTML = `
    <div class="product-container">
      <!-- 1. HEADER CHI TIẾT SẢN PHẨM & NÚT TRỞ VỀ -->
      <div class="product-detail-header-card">
        <div class="product-detail-top-bar">
          <button type="button" id="btnBackToProductList" class="btn-product-back" title="Trở về danh sách sản phẩm">
            <span>←</span>
            <span>Trở về</span>
          </button>
          <div class="product-detail-title-group">
            ${imgUrl ? `<img src="${escAttr(imgUrl)}" class="product-detail-thumb" alt="${escAttr(product.name)}">` : ""}
            <span class="product-detail-title" title="${escAttr(product.name)}">${escHtml(product.name)}</span>
          </div>
        </div>

        <div class="product-detail-stats-bar">
          <span class="product-detail-stat-item">Đã nhập: <strong>${product.items.length.toLocaleString("vi-VN")} lần</strong></span>
          <span>•</span>
          <span class="product-detail-stat-item">Tổng: <strong>${product.totalBottles.toLocaleString("vi-VN")} chai</strong></span>
          <span>•</span>
          <span class="product-detail-stat-item highlight">Giá mới nhất: <strong>${product.latestPrice > 0 ? formatMoneyVND(product.latestPrice) : "—"}</strong></span>
          ${product.priceMin > 0 && product.priceMax > 0 && product.priceMin !== product.priceMax ? `
            <span>•</span>
            <span class="product-detail-stat-item">Khoảng giá: <strong>${formatMoneyVND(product.priceMin)} ~ ${formatMoneyVND(product.priceMax)}</strong></span>
          ` : ""}
        </div>
      </div>

      <!-- 2. THANH TÌM KIẾM TRONG LỊCH SỬ KÈM NÚT SẮP XẾP -->
      <div class="product-search-row">
        <div class="product-search-wrapper">
          <input type="text" id="productItemSearchBox" class="product-search-input" placeholder="Tìm theo người gửi, ngày, dung tích..." value="${escAttr(productDetailSearchQuery)}">
          <button type="button" id="productItemSearchClear" class="product-search-clear" style="${productDetailSearchQuery ? 'display: block;' : 'display: none;'}">&times;</button>
        </div>

        <button type="button" id="btnProductDetailSortToggle" class="btn-product-sort ${isProductDetailSortMenuOpen ? 'active' : ''}" title="Sắp xếp lịch sử: ${detailSortLabel}">
          <span class="icon-mask filter-svg" style="mask-image: url('svg/filter.svg'); -webkit-mask-image: url('svg/filter.svg');"></span>
        </button>

        <!-- Menu dropdown chọn tiêu chí sắp xếp lịch sử -->
        <div id="productDetailSortMenu" class="product-sort-menu" style="${isProductDetailSortMenuOpen ? 'display: flex;' : 'display: none;'}">
          <div class="product-sort-item ${productDetailSortMode === 'recent' ? 'active' : ''}" data-sort="recent">
            <span>🗓️ Ngày nhập mới nhất</span>
            ${productDetailSortMode === 'recent' ? '<span style="font-size: 11px;">✓</span>' : ''}
          </div>
          <div class="product-sort-item ${productDetailSortMode === 'oldest' ? 'active' : ''}" data-sort="oldest">
            <span>🗓️ Ngày nhập cũ nhất</span>
            ${productDetailSortMode === 'oldest' ? '<span style="font-size: 11px;">✓</span>' : ''}
          </div>
          <div class="product-sort-item ${productDetailSortMode === 'price_desc' ? 'active' : ''}" data-sort="price_desc">
            <span>💵 Giá nhập cao nhất</span>
            ${productDetailSortMode === 'price_desc' ? '<span style="font-size: 11px;">✓</span>' : ''}
          </div>
          <div class="product-sort-item ${productDetailSortMode === 'price_asc' ? 'active' : ''}" data-sort="price_asc">
            <span>💵 Giá nhập thấp nhất</span>
            ${productDetailSortMode === 'price_asc' ? '<span style="font-size: 11px;">✓</span>' : ''}
          </div>
          <div class="product-sort-item ${productDetailSortMode === 'sender' ? 'active' : ''}" data-sort="sender">
            <span>👤 Theo người gửi (A-Z)</span>
            ${productDetailSortMode === 'sender' ? '<span style="font-size: 11px;">✓</span>' : ''}
          </div>
        </div>
      </div>

      <!-- 3. DANH SÁCH LỊCH SỬ CÁC LẦN NHẬP -->
      <div class="product-summary-badge">
        <span>📋 LỊCH SỬ NHẬP HÀNG (${filteredItems.length} lần nhập)</span>
        <span>${productDetailSearchQuery ? "Đang lọc • " + detailSortLabel : detailSortLabel}</span>
      </div>

      <div class="product-history-list">
        ${filteredItems.length === 0 ? `
          <div class="stats-empty-state">
            <span style="font-size: 24px;">🔍</span>
            <strong>Không có lần nhập nào phù hợp</strong>
            <span>Thử tìm với từ khóa khác...</span>
          </div>
        ` : ""}
        ${filteredItems.map(it => {
          const capFormatted = cleanString(it.dung_tich);
          const statusClass = getProductItemStatusClass(it.tinh_trang);
          const qty = parseInt(String(it.sl || "1").replace(/\D/g, ""), 10) || 1;
          const priceVal = it.gia || it.thanh_tien;
          const senderName = cleanString(it.nguoi_gui) || "(Chưa rõ người gửi)";

          return `
            <div class="product-history-row">
              <!-- Hàng trên: Người gửi bên trái & Giá bên phải -->
              <div class="product-history-row-top">
                <span class="product-history-sender" title="Người gửi: ${escAttr(senderName)}">
                  👤 ${escHtml(senderName)}
                </span>
                <span class="product-history-price">${formatMoneyVND(priceVal)}</span>
              </div>

              <!-- Hàng dưới: Ngày, Dung tích, Số lượng, Tình trạng, Ghi chú -->
              <div class="product-history-row-bottom">
                <div class="product-history-tags">
                  <span class="product-history-date">🗓️ ${escHtml(it.ngay || "—")}</span>
                  ${capFormatted ? `<span class="product-history-badge capacity">${escHtml(capFormatted)}</span>` : ""}
                  ${qty > 1 ? `<span class="product-history-badge qty">SL: ${qty}</span>` : ""}
                  ${it.tinh_trang ? `<span class="product-history-badge ${statusClass}">${escHtml(it.tinh_trang)}</span>` : ""}
                  ${it.ghi_chu ? `<span class="product-history-note" title="${escAttr(it.ghi_chu)}">💬 ${escHtml(it.ghi_chu)}</span>` : ""}
                </div>
                ${qty > 1 && it.thanh_tien ? `<span class="product-history-total-sub">Tổng: ${formatMoneyVND(it.thanh_tien)}</span>` : ""}
              </div>
            </div>
          `;
        }).join("")}
      </div>
    </div>
  `;

  // Gắn sự kiện cho màn hình Chi tiết lịch sử sản phẩm
  setupProductDetailEventListeners(container);
}

// Gắn sự kiện cho màn hình Chi tiết lịch sử sản phẩm
function setupProductDetailEventListeners(container) {
  const btnBack = container.querySelector("#btnBackToProductList");
  const searchInput = container.querySelector("#productItemSearchBox");
  const clearBtn = container.querySelector("#productItemSearchClear");
  const btnSortToggle = container.querySelector("#btnProductDetailSortToggle");
  const sortMenu = container.querySelector("#productDetailSortMenu");

  if (btnBack) {
    btnBack.addEventListener("click", () => {
      selectedProductName = null;
      productDetailSearchQuery = "";
      isProductDetailSortMenuOpen = false;
      renderProductStatsView();
    });
  }

  if (searchInput) {
    searchInput.addEventListener("input", (e) => {
      productDetailSearchQuery = e.target.value.trim();
      if (clearBtn) {
        clearBtn.style.display = productDetailSearchQuery ? "block" : "none";
      }
      renderProductStatsView();
    });
  }

  if (clearBtn) {
    clearBtn.addEventListener("click", () => {
      productDetailSearchQuery = "";
      renderProductStatsView();
    });
  }

  // Bật/tắt menu sắp xếp lịch sử
  if (btnSortToggle) {
    btnSortToggle.addEventListener("click", (e) => {
      e.stopPropagation();
      isProductDetailSortMenuOpen = !isProductDetailSortMenuOpen;
      renderProductStatsView();
    });
  }

  // Chọn tiêu chí sắp xếp lịch sử
  if (sortMenu) {
    const sortItems = sortMenu.querySelectorAll(".product-sort-item");
    sortItems.forEach(item => {
      item.addEventListener("click", (e) => {
        e.stopPropagation();
        const sortVal = item.getAttribute("data-sort");
        if (sortVal) {
          productDetailSortMode = sortVal;
          if (typeof StorageHelper !== "undefined") {
            StorageHelper.set("statsProductDetailSortMode", sortVal);
          }
          try {
            localStorage.setItem("statsProductDetailSortMode", JSON.stringify(sortVal));
          } catch (err) {}
          isProductDetailSortMenuOpen = false;
          renderProductStatsView();
        }
      });
    });
  }
}

// Đóng menu khi click ra ngoài
if (typeof document !== "undefined") {
  document.addEventListener("click", (e) => {
    let needsRerender = false;
    if (isProductSortMenuOpen && !e.target.closest("#btnProductSortToggle") && !e.target.closest("#productSortMenu")) {
      isProductSortMenuOpen = false;
      needsRerender = true;
    }
    if (isProductDetailSortMenuOpen && !e.target.closest("#btnProductDetailSortToggle") && !e.target.closest("#productDetailSortMenu")) {
      isProductDetailSortMenuOpen = false;
      needsRerender = true;
    }
    if (needsRerender) {
      renderProductStatsView();
    }
  });
}

// Dọn dẹp dữ liệu sản phẩm khi Đăng xuất Quản trị
function clearProductStatsData() {
  selectedProductName = null;
  productSearchQuery = "";
  productDetailSearchQuery = "";
  isProductSortMenuOpen = false;
  isProductDetailSortMenuOpen = false;
  const container = document.getElementById("statsProductPane");
  if (container) container.innerHTML = "";
}

if (typeof window !== "undefined") {
  window.renderProductStatsView = renderProductStatsView;
  window.clearProductStatsData = clearProductStatsData;
}
