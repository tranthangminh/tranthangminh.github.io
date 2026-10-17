// Cấu hình DOM của Nước Hoa (Perfume Tab)
const btnTogglePrice = document.getElementById("btnTogglePrice");
window.isCostPriceMode = false;
window.currentPerfumeList = [];



// Hàm tạo icon giới tính từ file SVG (Nam -> male.svg, Nữ -> female.svg, Unisex -> unisex.svg)
function getGenderIconHTML(rawSex) {
  const sex = cleanString(rawSex).trim().toLowerCase();
  if (sex === "nam") {
    return `<img src="svg/male.svg" class="gender-icon" alt="Nam" title="Nam">`;
  }
  if (sex === "nữ" || sex === "nu") {
    return `<img src="svg/female.svg" class="gender-icon" alt="Nữ" title="Nữ">`;
  }
  if (sex === "unisex") {
    return `<img src="svg/unisex.svg" class="gender-icon" alt="Unisex" title="Unisex">`;
  }
  if (rawSex && rawSex !== "-") {
    return `<span class="gender-text">${cleanString(rawSex)}</span>`;
  }
  return "";
}

// Hàm ghép tên hiển thị đầy đủ của sản phẩm (dạng text cho tìm kiếm)
function getProductDisplayName(prod) {
  const sex = cleanString(prod.sex);
  const name = cleanString(prod.name);
  const shortName = cleanString(prod.tenrutgon);
  
  let displayName = name;
  if (sex && sex !== "-") {
    displayName = sex + " " + displayName;
  }
  if (shortName && shortName !== "-") {
    displayName += ` (${shortName})`;
  }
  return displayName;
}

// Hàm ghép tên hiển thị dạng HTML (chứa icon SVG giới tính, chống XSS)
function getProductDisplayNameHTML(prod) {
  const genderIcon = getGenderIconHTML(prod.sex);
  const name = cleanString(prod.name);
  const shortName = cleanString(prod.tenrutgon);
  
  const safeName = typeof escAttr === "function" ? escAttr(name) : name;
  let displayName = safeName;
  if (shortName && shortName !== "-") {
    const safeShort = typeof escAttr === "function" ? escAttr(shortName) : shortName;
    displayName += ` (${safeShort})`;
  }
  
  return genderIcon ? `${genderIcon}${displayName}` : displayName;
}

const searchCountBar = document.getElementById("searchCountBar");
const countCurrent = document.getElementById("countCurrent");
const countTotal = document.getElementById("countTotal");

function updateProductCount(visibleCount, totalCount) {
  if (countCurrent) countCurrent.innerText = visibleCount;
  if (countTotal) countTotal.innerText = totalCount;
  if (searchCountBar) searchCountBar.style.display = totalCount > 0 ? "flex" : "none";
}

// Hàm dựng bảng hiển thị giá 3 cột chuẩn thống nhất (Loại | Giá | Tồn Kho) dùng chung cho cả Giá Bán và Giá Vốn
function renderProductPriceTable(prod, isCost) {
  const rows = [];

  // 1. Fullbox 1..5
  for (let i = 1; i <= 5; i++) {
    const p = cleanString(isCost ? prod['giavonfull' + i] : prod['giafull' + i]);
    const dt = cleanString(prod['dungtich' + i]);
    const st = cleanString(prod['tonkhofull' + i]);
    if (p && p !== "-") {
      const dtVal = formatDungTichValue(dt);
      const typeName = dtVal ? (dtVal.toLowerCase().startsWith("full") ? dtVal : `Full ${dtVal}`) : "Full";
      const shortPrice = formatPriceShort(p);
      const stockHTML = (st && st !== "-")
        ? `<span class="price-col-stock ${st === "0" ? "stock-zero" : "stock-positive"}">(${st === "0" ? "0" : st})</span>`
        : `<span class="price-col-stock stock-empty">-</span>`;
      const rowClass = isCost ? "product-price-row price-row-full-cost" : "product-price-row price-row-full";
      rows.push(`
        <div class="${rowClass}">
          <span class="price-col-type">${typeName}</span>
          <span class="price-col-val">${shortPrice}</span>
          ${stockHTML}
        </div>
      `);
    }
  }

  // 2. Tester 1..5
  for (let i = 1; i <= 5; i++) {
    const p = cleanString(isCost ? prod['giavontest' + i] : prod['giatester' + i]);
    const dt = cleanString(prod['dungtich' + i]);
    if (p && p !== "-") {
      const dtVal = formatDungTichValue(dt);
      const typeName = dtVal ? (dtVal.toLowerCase().startsWith("tester") ? dtVal : `Tester ${dtVal}`) : "Tester";
      const shortPrice = formatPriceShort(p);
      rows.push(`
        <div class="product-price-row price-row-tester">
          <span class="price-col-type">${typeName}</span>
          <span class="price-col-val">${shortPrice}</span>
          <span class="price-col-stock stock-empty">-</span>
        </div>
      `);
    }
  }

  // 3. Chiết 5ml, 10ml, 20ml
  const chietKeys = ["5ml", "10ml", "20ml"];
  chietKeys.forEach(k => {
    const p = cleanString(isCost ? prod['giavon' + k] : prod['gia' + k]);
    if (p && p !== "-") {
      const shortPrice = formatPriceShort(p);
      rows.push(`
        <div class="product-price-row price-row-chiet">
          <span class="price-col-type">${k}</span>
          <span class="price-col-val">${shortPrice}</span>
          <span class="price-col-stock stock-empty">-</span>
        </div>
      `);
    }
  });

  // 4. Gốc 1..5 (Chỉ hiển thị ở chế độ Giá Bán vì không có cột giá vốn gốc)
  if (!isCost) {
    for (let i = 1; i <= 5; i++) {
      const p = cleanString(prod['giagoc' + i]);
      const dt = cleanString(prod['dungtichgoc' + i]);
      const st = cleanString(prod['tonkhogoc' + i]);
      if (p && p !== "-") {
        const dtVal = formatDungTichValue(dt);
        const typeName = dtVal ? (dtVal.toLowerCase().startsWith("gốc") || dtVal.toLowerCase().startsWith("goc") ? dtVal : `Gốc ${dtVal}`) : "Gốc";
        const shortPrice = formatPriceShort(p);
        const stockHTML = (st && st !== "-")
          ? `<span class="price-col-stock ${st === "0" ? "stock-zero" : "stock-positive"}">(${st === "0" ? "0" : st})</span>`
          : `<span class="price-col-stock stock-empty">-</span>`;
        rows.push(`
          <div class="product-price-row price-row-goc">
            <span class="price-col-type">${typeName}</span>
            <span class="price-col-val">${shortPrice}</span>
            ${stockHTML}
          </div>
        `);
      }
    }
  }

  if (rows.length === 0) return "";
  return `<div class="product-price-table ${isCost ? 'price-table-cost' : 'price-table-sell'}">${rows.join("")}</div>`;
}

// Hiển thị danh sách sản phẩm
function renderList(products) {
  window.currentPerfumeList = products;
  searchResult.innerHTML = "";
  
  updateProductCount(products.length, allProducts.length);
  
  if (products.length === 0) {
    searchResult.innerHTML = `
      <div class="empty-state">
        <span class="empty-icon">🔍</span>
        <p>Không tìm thấy sản phẩm nào khớp</p>
      </div>
    `;
    return;
  }
  
  const isCost = !!window.isCostPriceMode;

  products.forEach(prod => {
    const item = document.createElement("div");
    item.className = "search-item";
    
    const imgUrl = cleanString(prod.img);
    let imgHTML = "";
    if (imgUrl && imgUrl !== "-" && imgUrl.startsWith("http")) {
      imgHTML = `<img src="${imgUrl}" class="item-thumb" alt="${cleanString(prod.name)}" loading="lazy">`;
    } else {
      imgHTML = `<img src="svg/logo.svg" class="item-thumb item-thumb-placeholder" alt="${cleanString(prod.name)}">`;
    }
    
    const stockInfo = getProductTotalStock(prod);
    const stockBadge = stockInfo.hasValid
      ? `<span class="item-stock${stockInfo.total === 0 ? ' item-stock-zero' : ''}">📦${stockInfo.total}</span>`
      : "";

    const priceRow = renderProductPriceTable(prod, isCost);

    item.innerHTML = `
      ${imgHTML}
      <div class="item-info">
        <div class="item-name-row">
          <span class="item-text">${getProductDisplayNameHTML(prod)}</span>
          ${stockBadge}
        </div>
        ${priceRow}
      </div>
    `;
    item.addEventListener("click", () => showDetail(prod));
    searchResult.appendChild(item);
  });
}

// Hàm performSearch đã được chuyển sang perfume-search.js

// Ẩn hiện các hàng thông tin hương thơm
function renderScentRow(rowEl, valEl, rawValue) {
  const value = cleanString(rawValue);
  if (value && value !== "-") {
    valEl.innerText = value;
    rowEl.style.display = "block";
  } else {
    rowEl.style.display = "none";
  }
}

// Hàm cuộn wrapper nội dung lên trên cùng
function scrollToTop() {
  const el = document.querySelector(".perfume-scroll-wrapper");
  if (el) el.scrollTop = 0;
}

// Lịch sử xem gần đây -> Đã được tách riêng ra file perfume-recent.js

// Cập nhật hiển thị tồn kho sau khi auto-fetch
function refreshStockDisplay() {
  if (searchResult && searchResult.style.display !== "none") {
    performSearch(searchBox ? searchBox.value : "");
  }
  
  if (detailView && detailView.style.display !== "none" && currentProduct) {
    const updated = allProducts.find(p => p.name === currentProduct.name);
    if (updated) {
      currentProduct = updated;
      const stockInfo = getProductTotalStock(updated);
      if (prodMetaTonKho) {
        if (stockInfo.hasValid) {
          prodMetaTonKho.innerText = "📦Tồn kho: " + stockInfo.total;
          prodMetaTonKho.style.display = "inline-block";
          prodMetaTonKho.classList.toggle("meta-tonkho-zero", stockInfo.total === 0);
        } else {
          prodMetaTonKho.style.display = "none";
        }
      }
    }
  }
}

// Chi tiết sản phẩm đã được di chuyển hoàn toàn sang perfume-preview.js

// Hàm làm mới lại hiển thị Tab Nước hoa khi chuyển đổi trạng thái (Giá Vốn / Giá Bán)
window.refreshPerfumeView = function() {
  if (typeof detailView !== "undefined" && detailView && detailView.style.display !== "none" && typeof currentProduct !== "undefined" && currentProduct && typeof showDetail === "function") {
    showDetail(currentProduct);
  } else if (typeof searchResult !== "undefined" && searchResult && searchResult.style.display !== "none") {
    const listToRender = (window.currentPerfumeList && window.currentPerfumeList.length > 0) ? window.currentPerfumeList : allProducts;
    renderList(listToRender);
  }
};


// Các bộ lắng nghe sự kiện tìm kiếm và ẩn/hiện giá đã được chuyển sang perfume-search.js
