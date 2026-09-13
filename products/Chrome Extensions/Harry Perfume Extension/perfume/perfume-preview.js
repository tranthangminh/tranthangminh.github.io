// Cấu hình DOM Chi Tiết Sản Phẩm (Perfume Preview / Detail View)
const prodName = document.getElementById("prodName");
const prodMetaCountry = document.getElementById("prodMetaCountry");
const prodMetaYear = document.getElementById("prodMetaYear");
const prodImgContainer = document.getElementById("prodImgContainer");
const prodMetaTonKho = document.getElementById("prodMetaTonKho");

const scentMain = document.getElementById("scentMain");
const scentTop = document.getElementById("scentTop");
const scentMiddle = document.getElementById("scentMiddle");
const scentBase = document.getElementById("scentBase");

const rowScentMain = document.getElementById("rowScentMain");
const rowScentTop = document.getElementById("rowScentTop");
const rowScentMiddle = document.getElementById("rowScentMiddle");
const rowScentBase = document.getElementById("rowScentBase");

const similarBlock = document.getElementById("similarBlock");
const similarList = document.getElementById("similarList");

// Cấu hình cuộn lăn chuột & Kéo rê chuột (Mouse Drag Scroll) cho similarList
let isSimilarDragging = false;
let similarStartX = 0;
let similarScrollLeft = 0;
let hasSimilarDragged = false;

if (similarList) {
  // Ngăn chặn Native Drag Image (Ghost Image)
  similarList.addEventListener("dragstart", (e) => {
    e.preventDefault();
  });

  // 1. Cuộn ngang bằng con lăn chuột (Mouse Wheel)
  similarList.addEventListener("wheel", (e) => {
    if (e.deltaY !== 0) {
      e.preventDefault();
      similarList.scrollLeft += e.deltaY;
    }
  }, { passive: false });

  // 2. Kéo rê chuột (Mouse Drag)
  similarList.addEventListener("mousedown", (e) => {
    // Nếu click vào thanh cuộn scrollbar (nằm ở đáy clientHeight), cho phép tương tác scrollbar tự nhiên
    if (e.offsetY > similarList.clientHeight) return;

    isSimilarDragging = true;
    hasSimilarDragged = false;
    similarList.classList.add("dragging");
    similarStartX = e.pageX - similarList.offsetLeft;
    similarScrollLeft = similarList.scrollLeft;
  });

  similarList.addEventListener("mouseleave", () => {
    isSimilarDragging = false;
    similarList.classList.remove("dragging");
  });

  similarList.addEventListener("mouseup", () => {
    isSimilarDragging = false;
    similarList.classList.remove("dragging");
  });

  similarList.addEventListener("mousemove", (e) => {
    if (!isSimilarDragging) return;
    e.preventDefault();
    const x = e.pageX - similarList.offsetLeft;
    const walk = (x - similarStartX) * 1.5;
    if (Math.abs(walk) > 4) {
      hasSimilarDragged = true;
    }
    similarList.scrollLeft = similarScrollLeft - walk;
  });
}

// Hàm tìm kiếm sản phẩm theo tên chính xác hoặc mờ
function findProductByName(nameStr) {
  const target = cleanString(nameStr);
  if (!target || !Array.isArray(allProducts) || allProducts.length === 0) return null;
  
  const targetLower = target.toLowerCase();
  
  // 1. Khớp chính xác tên sản phẩm hoặc tên hiển thị
  let found = allProducts.find(p => {
    const fullName = cleanString(p.name).toLowerCase();
    const dispName = getProductDisplayName(p).toLowerCase();
    const shortName = cleanString(p.tenrutgon).toLowerCase();
    return fullName === targetLower || dispName === targetLower || (shortName && shortName === targetLower);
  });
  if (found) return found;

  // 2. Khớp theo không dấu (removeAccents)
  const targetNormalized = removeAccents(target);
  found = allProducts.find(p => {
    const normName = removeAccents(p.name);
    const normDisp = removeAccents(getProductDisplayName(p));
    const normShort = removeAccents(p.tenrutgon);
    return normName === targetNormalized || normDisp === targetNormalized || (normShort && normShort === targetNormalized);
  });
  if (found) return found;

  // 3. Khớp mờ theo tất cả các từ khóa
  const tokens = targetNormalized.split(/\s+/).filter(t => t.length > 0);
  if (tokens.length > 0) {
    found = allProducts.find(p => {
      const combined = `${removeAccents(p.name)} ${removeAccents(p.tenrutgon)} ${removeAccents(getProductDisplayName(p))}`;
      return tokens.every(token => combined.includes(token));
    });
  }

  return found || null;
}

const tagsBlock = document.getElementById("tagsBlock");
const tagXuan  = document.getElementById("tagXuan");
const tagHa    = document.getElementById("tagHa");
const tagThu   = document.getElementById("tagThu");
const tagDong  = document.getElementById("tagDong");
const tagNgay  = document.getElementById("tagNgay");
const tagDem   = document.getElementById("tagDem");

// DOM cho dải tư vấn & giá bán
const rowPriceFull = document.getElementById("rowPriceFull");
const gridPriceFull = document.getElementById("gridPriceFull");
const rowPriceTester = document.getElementById("rowPriceTester");
const gridPriceTester = document.getElementById("gridPriceTester");
const rowPriceChiet = document.getElementById("rowPriceChiet");
const gridPriceChiet = document.getElementById("gridPriceChiet");
const rowPriceGoc = document.getElementById("rowPriceGoc");
const gridPriceGoc = document.getElementById("gridPriceGoc");

const priceConsultationArea = document.getElementById("priceConsultationArea");
const warningConsultation = document.getElementById("warningConsultation");
const titleConsultation = document.getElementById("titleConsultation");
const btnCopyConsultation = document.getElementById("btnCopyConsultation");
const boxConsultation = document.getElementById("boxConsultation");

// Biến lưu trữ nội dung tư vấn hiện tại đang chọn
let currentActiveConsultationText = "";
let currentActiveLabel = "";

// Các hàm định dạng dung tích và tạo text tư vấn đã được tách riêng ra file perfume-template.js

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

// Hiển thị chi tiết nước hoa (Preview / Detail View)
async function showDetail(prod) {
  currentProduct = prod;
  searchResult.style.display = "none";
  detailView.style.display = "block";
  btnBack.style.display = "flex";
  if (typeof searchCountBar !== "undefined" && searchCountBar) {
    searchCountBar.style.display = "none";
  }
  scrollToTop();
  
  await saveToRecent(prod);
  await renderRecentBar();
  prodName.innerHTML = getProductDisplayNameHTML(prod);
  
  const quocgia = cleanString(prod.quocgia);
  const namramat = cleanString(prod.namramat);
  
  if (quocgia && quocgia !== "-") {
    prodMetaCountry.innerText = quocgia;
    prodMetaCountry.style.display = "inline-block";
  } else {
    prodMetaCountry.style.display = "none";
  }
  
  if (namramat && namramat !== "-") {
    prodMetaYear.innerText = namramat;
    prodMetaYear.style.display = "inline-block";
  } else {
    prodMetaYear.style.display = "none";
  }
  
  const imgUrl = cleanString(prod.img);
  if (imgUrl && imgUrl !== "-" && imgUrl.startsWith("http")) {
    prodImgContainer.innerHTML = `<img src="${imgUrl}" class="product-img" alt="${cleanString(prod.name)}" title="Click để copy hình ảnh" style="cursor: pointer;">`;
    const imgEl = prodImgContainer.querySelector(".product-img");
    imgEl.addEventListener("click", () => copyImage(imgUrl));
  } else {
    prodImgContainer.innerHTML = `<img src="svg/logo.svg" class="product-img product-img-placeholder" alt="${cleanString(prod.name)}">`;
  }
  
  renderScentRow(rowScentMain, scentMain, prod.huongchinh);
  renderScentRow(rowScentTop, scentTop, prod.huongdau);
  renderScentRow(rowScentMiddle, scentMiddle, prod.huonggiua);
  renderScentRow(rowScentBase, scentBase, prod.huongcuoi);
  
  const muituongtu = cleanString(prod.muituongtu);
  if (muituongtu && muituongtu !== "-") {
    const lines = muituongtu.split(/\r?\n/).map(l => cleanString(l)).filter(l => l.length > 0);
    if (lines.length > 0 && similarList) {
      similarList.innerHTML = "";
      lines.forEach(lineText => {
        const matchedProd = findProductByName(lineText);
        const itemEl = document.createElement("div");
        itemEl.className = "similar-item";
        
        let imgUrl = matchedProd ? cleanString(matchedProd.img) : "";
        let imgHTML = "";
        if (imgUrl && imgUrl !== "-" && imgUrl.startsWith("http")) {
          imgHTML = `<img src="${imgUrl}" class="similar-thumb" alt="${lineText}" loading="lazy" draggable="false">`;
        } else {
          imgHTML = `<img src="svg/logo.svg" class="similar-thumb similar-thumb-placeholder" alt="${lineText}" draggable="false">`;
        }

        let displayName = lineText;
        if (matchedProd) {
          const name = cleanString(matchedProd.name);
          const shortName = cleanString(matchedProd.tenrutgon);
          displayName = (shortName && shortName !== "-") ? `${name} (${shortName})` : name;
        }

        itemEl.innerHTML = `
          ${imgHTML}
          <span class="similar-name" title="${displayName}">${displayName}</span>
        `;

        itemEl.addEventListener("click", (e) => {
          if (hasSimilarDragged) {
            e.preventDefault();
            return;
          }
          if (matchedProd) {
            showDetail(matchedProd);
          }
        });

        similarList.appendChild(itemEl);
      });
      similarBlock.style.display = "block";
    } else {
      similarBlock.style.display = "none";
    }
  } else {
    similarBlock.style.display = "none";
  }

  // Tồn kho (Tổng của 5 dung tích Fullbox)
  const stockInfo = getProductTotalStock(prod);
  if (stockInfo.hasValid) {
    prodMetaTonKho.innerText = "📦Tồn kho: " + stockInfo.total;
    prodMetaTonKho.style.display = "inline-block";
    prodMetaTonKho.classList.toggle("meta-tonkho-zero", stockInfo.total === 0);
  } else {
    prodMetaTonKho.style.display = "none";
  }

  // Quản lý hiển thị hàng badge
  const metaRow = document.querySelector(".product-meta-row");
  const headerRow = document.querySelector(".product-header-row");
  if (metaRow) {
    const hasTonKho = stockInfo.hasValid;
    const hasCountry = (quocgia && quocgia !== "-");
    const hasYear = (namramat && namramat !== "-");
    const isVisible = (hasTonKho || hasCountry || hasYear);
    metaRow.style.display = isVisible ? "grid" : "none";
    if (headerRow) {
      headerRow.classList.toggle("no-border", isVisible);
    }
  }

  // Tags mùa & thời điểm
  function showTag(el, val) {
    const v = cleanString(val);
    const active = v && v !== "-" && v.toLowerCase() !== "0" && v !== "";
    el.classList.toggle("tag-dim", !active);
  }
  showTag(tagXuan, prod.xuan);
  showTag(tagHa,   prod.ha);
  showTag(tagThu,  prod.thu);
  showTag(tagDong, prod.dong);
  showTag(tagNgay, prod.ngay);
  showTag(tagDem,  prod.dem);
  
  // Tổng hợp danh sách biến thể dung tích & giá khả dụng
  const activeBadges = [];
  
  function addOption(type, dungtichRaw, priceRaw, key, stockRaw) {
    const price = cleanString(priceRaw);
    const dtVal = formatDungTichValue(dungtichRaw);
    const stock = cleanString(stockRaw);
    
    // Nếu không có giá thì không hiển thị nút này
    const hasPrice = (price && price !== "-");
    if (!hasPrice) return;
    
    let dungtichText = getDungTichText(type, dungtichRaw);
    let labelText = "";
    let group = type;
    
    if (type === "Full") {
      labelText = dtVal || "Full";
    } else if (type === "Tester") {
      labelText = dtVal || "Tester";
    } else if (type === "Gốc") {
      labelText = dtVal || "Gốc";
      group = "Gốc";
    } else {
      labelText = dungtichRaw;
      group = "Chiết";
    }

    const displayPrice = hasPrice ? price : "-";
    const text = generateConsultationText(prod, dungtichText, displayPrice);
    const isMissing = isConsultationMissingData(prod, dungtichText, displayPrice);

    activeBadges.push({
      key: key,
      type: type,
      group: group,
      label: labelText,
      price: displayPrice,
      text: text,
      isMissing: isMissing,
      stock: stock
    });
  }

  // 1. Fullbox 1..5
  for (let i = 1; i <= 5; i++) {
    const p = cleanString(prod['giafull' + i]);
    const dt = cleanString(prod['dungtich' + i]);
    const st = cleanString(prod['tonkhofull' + i]);
    addOption("Full", dt, p, `full_${i}`, st);
  }

  // 2. Tester 1..5
  for (let i = 1; i <= 5; i++) {
    const p = cleanString(prod['giatester' + i]);
    const dt = cleanString(prod['dungtich' + i]);
    addOption("Tester", dt, p, `tester_${i}`);
  }

  // 3. Chiết 5ml, 10ml, 20ml
  addOption("5ml", "5ml", prod.gia5ml, "5ml");
  addOption("10ml", "10ml", prod.gia10ml, "10ml");
  addOption("20ml", "20ml", prod.gia20ml, "20ml");

  // 4. Gốc 1..5
  for (let i = 1; i <= 5; i++) {
    const p = cleanString(prod['giagoc' + i]);
    const dt = cleanString(prod['dungtichgoc' + i]);
    const st = cleanString(prod['tonkhogoc' + i]);
    addOption("Gốc", dt, p, `goc_${i}`, st);
  }

  // Vẽ các nút giá linh hoạt vào 4 hàng (Full, Tester, Chiết, Gốc)
  if (gridPriceFull) gridPriceFull.innerHTML = "";
  if (gridPriceTester) gridPriceTester.innerHTML = "";
  if (gridPriceChiet) gridPriceChiet.innerHTML = "";
  if (gridPriceGoc) gridPriceGoc.innerHTML = "";

  if (rowPriceFull) rowPriceFull.style.display = "none";
  if (rowPriceTester) rowPriceTester.style.display = "none";
  if (rowPriceChiet) rowPriceChiet.style.display = "none";
  if (rowPriceGoc) rowPriceGoc.style.display = "none";

  // Hàm xử lý chọn thẻ giá (shouldCopy quyết định có tự động copy vào clipboard hay không)
  function selectBadge(badge, btn, shouldCopy) {
    const allBtns = document.querySelectorAll(".price-badge");
    allBtns.forEach(b => b.classList.remove("active"));
    btn.classList.add("active");

    currentActiveConsultationText = badge.text;
    currentActiveLabel = badge.group + " " + badge.label;

    if (titleConsultation) titleConsultation.innerText = `Nội dung ${badge.group} ${badge.label}`;
    if (boxConsultation) {
      boxConsultation.innerText = badge.text;
      boxConsultation.classList.toggle("warning", badge.isMissing);
    }
    if (warningConsultation) {
      warningConsultation.style.display = badge.isMissing ? "block" : "none";
    }
    if (priceConsultationArea) {
      priceConsultationArea.style.display = "block";
    }

    if (shouldCopy) {
      copyText(badge.text, `Nội dung ${badge.group} ${badge.label}`);
    }
  }

  let firstActiveBadge = null;
  let firstActiveBtn = null;

  activeBadges.forEach(badge => {
    const btn = document.createElement("button");
    btn.className = "price-badge";
    
    const hasPrice = badge.price && badge.price !== "-";
    if (!hasPrice) {
      btn.classList.add("no-price");
    }

    if (badge.group === "Full") {
      btn.classList.add("price-badge-full");
    } else if (badge.group === "Tester") {
      btn.classList.add("price-badge-tester");
    } else if (badge.group === "Chiết") {
      btn.classList.add("price-badge-chiet");
    } else if (badge.group === "Gốc") {
      btn.classList.add("price-badge-goc");
    }
    btn.type = "button";
    btn.title = `Copy ${badge.group} ${badge.label}`;
    const hasStock = badge.stock && badge.stock !== "-";
    if (hasStock) {
      btn.classList.add("has-stock");
      btn.innerHTML = `
        <div class="price-badge-left">
          <span class="price-label">${badge.label}</span>
          <span class="price-val">${formatPriceShort(badge.price)}</span>
        </div>
        <div class="price-badge-right">
          <span class="price-stock-icon">📦</span>
          <span class="price-stock-num ${badge.stock === "0" ? "out-of-stock" : ""}">${badge.stock === "0" ? "0" : badge.stock}</span>
        </div>
      `;
    } else {
      btn.innerHTML = `
        <span class="price-label">${badge.label}</span>
        <span class="price-val">${formatPriceShort(badge.price)}</span>
      `;
    }

    btn.addEventListener("click", () => {
      selectBadge(badge, btn, true); // Click thủ công -> Copy vào clipboard
    });

    // Thêm nút vào đúng dòng tương ứng và hiện dòng đó lên
    if (badge.group === "Full") {
      if (gridPriceFull) gridPriceFull.appendChild(btn);
      if (rowPriceFull) rowPriceFull.style.display = "flex";
    } else if (badge.group === "Tester") {
      if (gridPriceTester) gridPriceTester.appendChild(btn);
      if (rowPriceTester) rowPriceTester.style.display = "flex";
    } else if (badge.group === "Chiết") {
      if (gridPriceChiet) gridPriceChiet.appendChild(btn);
      if (rowPriceChiet) rowPriceChiet.style.display = "flex";
    } else if (badge.group === "Gốc") {
      if (gridPriceGoc) gridPriceGoc.appendChild(btn);
      if (rowPriceGoc) rowPriceGoc.style.display = "flex";
    }

    if (!firstActiveBadge) {
      firstActiveBadge = badge;
      firstActiveBtn = btn;
    }
  });

  // Mặc định chọn nút đầu tiên có dữ liệu (không tự động copy)
  if (firstActiveBtn && firstActiveBadge) {
    selectBadge(firstActiveBadge, firstActiveBtn, false);
  } else {
    if (priceConsultationArea) priceConsultationArea.style.display = "none";
  }
}

// Nút copy trong khu vực tư vấn
if (btnCopyConsultation) {
  btnCopyConsultation.addEventListener("click", () => {
    if (currentActiveConsultationText) {
      copyText(currentActiveConsultationText, `Nội dung ${currentActiveLabel || 'tư vấn'}`);
    }
  });
}
