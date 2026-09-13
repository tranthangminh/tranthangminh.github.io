// Cấu hình DOM của Nước Hoa (Perfume Tab)
const btnTogglePrice = document.getElementById("btnTogglePrice");



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

// Hàm ghép tên hiển thị dạng HTML (chứa icon SVG giới tính)
function getProductDisplayNameHTML(prod) {
  const genderIcon = getGenderIconHTML(prod.sex);
  const name = cleanString(prod.name);
  const shortName = cleanString(prod.tenrutgon);
  
  let displayName = name;
  if (shortName && shortName !== "-") {
    displayName += ` (${shortName})`;
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

// Hiển thị danh sách sản phẩm
function renderList(products) {
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
    
    const displayName = getProductDisplayName(prod);
    const stockInfo = getProductTotalStock(prod);
    const stockBadge = stockInfo.hasValid
      ? `<span class="item-stock${stockInfo.total === 0 ? ' item-stock-zero' : ''}">📦${stockInfo.total}</span>`
      : "";

    // Hàng giá nhỏ bên dưới tên — hiển thị đầy đủ chi tiết giống Giá bán nhanh
    const pillsHTML = [];

    // 1. Fullbox 1..5
    for (let i = 1; i <= 5; i++) {
      const p = cleanString(prod['giafull' + i]);
      const dt = cleanString(prod['dungtich' + i]);
      const st = cleanString(prod['tonkhofull' + i]);
      if (p && p !== "-") {
        const dtVal = formatDungTichValue(dt) || "Full";
        const shortPrice = formatPriceShort(p);
        let stockText = "";
        if (st && st !== "-") {
          stockText = ` <span class="${st === "0" ? "stock-zero" : "stock-positive"}">(${st === "0" ? "0" : st})</span>`;
        }
        pillsHTML.push(`<span class="item-price-pill item-price-full">${dtVal} - ${shortPrice}${stockText}</span>`);
      }
    }

    // 2. Tester 1..5
    for (let i = 1; i <= 5; i++) {
      const p = cleanString(prod['giatester' + i]);
      const dt = cleanString(prod['dungtich' + i]);
      if (p && p !== "-") {
        const dtVal = formatDungTichValue(dt) || "Tester";
        const shortPrice = formatPriceShort(p);
        pillsHTML.push(`<span class="item-price-pill item-price-tester">${dtVal} - ${shortPrice}</span>`);
      }
    }

    // 3. Chiết 5ml, 10ml, 20ml
    const chietKeys = ["5ml", "10ml", "20ml"];
    chietKeys.forEach(k => {
      const p = cleanString(prod['gia' + k]);
      if (p && p !== "-") {
        const shortPrice = formatPriceShort(p);
        pillsHTML.push(`<span class="item-price-pill item-price-chiet">${k} - ${shortPrice}</span>`);
      }
    });

    // 4. Gốc 1..5
    for (let i = 1; i <= 5; i++) {
      const p = cleanString(prod['giagoc' + i]);
      const dt = cleanString(prod['dungtichgoc' + i]);
      const st = cleanString(prod['tonkhogoc' + i]);
      if (p && p !== "-") {
        const dtVal = formatDungTichValue(dt);
        const label = dtVal || "Gốc";
        const shortPrice = formatPriceShort(p);
        let stockText = "";
        if (st && st !== "-") {
          stockText = ` <span class="${st === "0" ? "stock-zero" : "stock-positive"}">(${st === "0" ? "0" : st})</span>`;
        }
        pillsHTML.push(`<span class="item-price-pill item-price-goc">${label} - ${shortPrice}${stockText}</span>`);
      }
    }

    const priceRow = pillsHTML.length > 0 
      ? `<div class="item-prices">${pillsHTML.join("")}</div>` 
      : "";

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

// Các bộ lắng nghe sự kiện tìm kiếm và ẩn/hiện giá đã được chuyển sang perfume-search.js
